/**
 * StaffNow activity tracking helpers.
 *
 * Two roles:
 *  1. `recordActivity()` — append a single user_activity_log row + update
 *     users.last_seen_at + extend the active session.
 *  2. `startSession()` / `endSession()` — manage the user_sessions table.
 *
 * Designed to be cheap (3-4 small writes) and resilient (catch all errors so
 * tracking failures never break the user's actual request).
 */

import type { Env } from '../types';
import { generateId } from './id';

export interface GeoInfo {
  country?: string | null;
  city?: string | null;
  region?: string | null;
  timezone?: string | null;
}

export interface ActivityEntry {
  userId: string;
  type: string; // 'login' | 'logout' | 'register' | 'page_view' | 'swipe_like' | 'swipe_skip' | 'match' | 'message_send' | 'profile_update' | 'job_post' | 'job_pause'
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
  geo?: GeoInfo | null;
}

/** Pull geo info from a Cloudflare-fronted request. Returns null on non-Cloudflare runtimes. */
export function getGeoFromRequest(c: any): GeoInfo {
  // Hono on Cloudflare exposes the original Request via c.req.raw, with .cf populated by CF.
  const cf = c?.req?.raw?.cf as any;
  const headers = c?.req || null;
  const country =
    (typeof cf?.country === 'string' ? cf.country : null) ||
    headers?.header?.('CF-IPCountry') ||
    null;
  const city = typeof cf?.city === 'string' ? cf.city : null;
  const region =
    (typeof cf?.region === 'string' ? cf.region : null) ||
    (typeof cf?.regionCode === 'string' ? cf.regionCode : null) ||
    null;
  const timezone = typeof cf?.timezone === 'string' ? cf.timezone : null;
  return { country, city, region, timezone };
}

export async function recordActivity(env: Env, entry: ActivityEntry): Promise<void> {
  const now = new Date().toISOString();
  const id = generateId('act');
  const geo = entry.geo || {};
  try {
    await env.DB.prepare(
      `INSERT INTO user_activity_log
        (id, user_id, activity_type, entity_type, entity_id, metadata, ip_address, user_agent,
         country, city, region, timezone, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        entry.userId,
        entry.type,
        entry.entityType || null,
        entry.entityId || null,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
        entry.ip || null,
        entry.userAgent || null,
        geo.country || null,
        geo.city || null,
        geo.region || null,
        geo.timezone || null,
        now,
      )
      .run();
  } catch (err) {
    // tracking failure should never break the request
    console.warn('[activity] insert failed', err);
  }

  // Best-effort touch of last_seen_at + active session
  try {
    await env.DB.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?')
      .bind(now, entry.userId)
      .run();
  } catch {}

  try {
    await env.DB.prepare(
      `UPDATE user_sessions SET last_activity_at = ?
       WHERE user_id = ? AND is_active = 1
       ORDER BY started_at DESC
       LIMIT 1`,
    )
      .bind(now, entry.userId)
      .run();
  } catch {
    // SQLite/D1 doesn't support ORDER+LIMIT in UPDATE without ROW_NUMBER.
    // Fallback: simple update of all active rows (there should be at most one).
    try {
      await env.DB.prepare(
        `UPDATE user_sessions SET last_activity_at = ?
         WHERE user_id = ? AND is_active = 1`,
      )
        .bind(now, entry.userId)
        .run();
    } catch {}
  }
}

export async function startSession(
  env: Env,
  args: {
    userId: string;
    ip?: string | null;
    userAgent?: string | null;
    geo?: GeoInfo | null;
  },
): Promise<string> {
  const id = generateId('sess');
  const now = new Date().toISOString();
  const geo = args.geo || {};

  // End any previous active sessions for this user (single-active model)
  try {
    await env.DB.prepare(
      `UPDATE user_sessions
       SET is_active = 0, ended_at = ?
       WHERE user_id = ? AND is_active = 1`,
    )
      .bind(now, args.userId)
      .run();
  } catch {}

  try {
    await env.DB.prepare(
      `INSERT INTO user_sessions
         (id, user_id, started_at, last_activity_at, is_active, ip_address, user_agent,
          country, city, region, timezone, created_at)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        args.userId,
        now,
        now,
        args.ip || null,
        args.userAgent || null,
        geo.country || null,
        geo.city || null,
        geo.region || null,
        geo.timezone || null,
        now,
      )
      .run();
  } catch (err) {
    console.warn('[activity] startSession failed', err);
  }

  return id;
}

export async function endSession(env: Env, userId: string): Promise<void> {
  const now = new Date().toISOString();
  try {
    await env.DB.prepare(
      `UPDATE user_sessions
       SET is_active = 0, ended_at = ?
       WHERE user_id = ? AND is_active = 1`,
    )
      .bind(now, userId)
      .run();
  } catch {}
}

export function getRequestIp(c: { req: { header: (k: string) => string | undefined } }): string | null {
  return (
    c.req.header('CF-Connecting-IP') ||
    c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ||
    null
  );
}

// =====================================================================
// data_changes — forensic / Trust & Safety log
// =====================================================================

export type DataChangeAction =
  | 'file_upload'
  | 'profile_update'
  | 'job_create'
  | 'job_update'
  | 'job_delete'
  | 'branch_create'
  | 'branch_update'
  | 'branch_delete'
  | 'admin_action';

export interface DataChangeEntry {
  actorUserId?: string | null;
  actorRole?: string | null;        // 'worker' | 'business' | 'admin' | 'system'
  actorEmail?: string | null;
  actorName?: string | null;
  action: DataChangeAction | string;
  entityType?: string | null;
  entityId?: string | null;
  entityOwnerId?: string | null;
  fieldChanges?: Record<string, { before: any; after: any }> | null;
  metadata?: Record<string, any> | null;
  ip?: string | null;
  userAgent?: string | null;
  geo?: GeoInfo | null;
}

/**
 * Compute a shallow diff between two row-shaped objects.
 * Returns `{ field: { before, after } }` for every key whose value changed.
 * Skips internal columns ("updated_at", embedding) by default.
 */
export function computeDiff(
  before: Record<string, any> | null | undefined,
  after: Record<string, any> | null | undefined,
  ignored: string[] = ['updated_at', 'embedding'],
): Record<string, { before: any; after: any }> {
  const diff: Record<string, { before: any; after: any }> = {};
  if (!before && !after) return diff;
  const keys = new Set<string>([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);
  for (const k of keys) {
    if (ignored.includes(k)) continue;
    const a = before ? before[k] : undefined;
    const b = after ? after[k] : undefined;
    // Coerce to JSON-serialisable comparison; treat null/undefined as equal
    const aS = a === undefined ? null : a;
    const bS = b === undefined ? null : b;
    if (JSON.stringify(aS) !== JSON.stringify(bS)) {
      diff[k] = { before: aS, after: bS };
    }
  }
  return diff;
}

export async function recordDataChange(env: Env, entry: DataChangeEntry): Promise<void> {
  // Skip empty diffs unless metadata is supplied (uploads have no diff)
  if (
    !entry.metadata &&
    (!entry.fieldChanges || Object.keys(entry.fieldChanges).length === 0)
  ) {
    return;
  }
  const id = generateId('dc');
  const now = new Date().toISOString();
  const geo = entry.geo || {};
  try {
    await env.DB.prepare(
      `INSERT INTO data_changes
        (id, actor_user_id, actor_role, actor_email, actor_name,
         action, entity_type, entity_id, entity_owner_id,
         field_changes, metadata,
         ip_address, user_agent, country, city, region, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        entry.actorUserId || null,
        entry.actorRole || null,
        entry.actorEmail || null,
        entry.actorName || null,
        entry.action,
        entry.entityType || null,
        entry.entityId || null,
        entry.entityOwnerId || null,
        entry.fieldChanges ? JSON.stringify(entry.fieldChanges) : null,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
        entry.ip || null,
        entry.userAgent || null,
        geo.country || null,
        geo.city || null,
        geo.region || null,
        now,
      )
      .run();
  } catch (err) {
    console.warn('[data_changes] insert failed', err);
  }
}

/**
 * One-shot helper: build the standard `{ ip, userAgent, geo }` triplet from a Hono context.
 * Use this in routes so each call site stays a single line.
 */
export function getRequestContext(c: any): { ip: string | null; userAgent: string | null; geo: GeoInfo } {
  return {
    ip: getRequestIp(c),
    userAgent: c.req.header('User-Agent') || null,
    geo: getGeoFromRequest(c),
  };
}
