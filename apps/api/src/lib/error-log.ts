/**
 * Server-side error capture.
 *
 * `recordError()` is called from the global error-handler middleware.
 * It is best-effort: any failure to persist must NOT break the user
 * request (the original error has already been turned into a JSON
 * response by the time we get here).
 */

import type { Context } from 'hono';
import type { Env } from '../types';
import { generateId } from './id';
import { getRequestIp, getGeoFromRequest } from './activity';

const MAX_STACK = 4_000;
const MAX_BODY  = 500;

// Best-effort secret masking for the captured request body.
const SECRET_KEYS = /(password|token|secret|api[_-]?key|authorization|cookie)/i;

function maskSecrets(input: string): string {
  // We're not parsing JSON here on purpose — body might already be malformed.
  // Replace `"key":"value"` and `key=value` style occurrences.
  return input
    .replace(/"([^"\\]+)":\s*"([^"\\]*)"/g, (m, k) =>
      SECRET_KEYS.test(k) ? `"${k}":"***"` : m,
    )
    .replace(/([?&][a-zA-Z0-9_\-]+)=([^&\s]+)/g, (m, k) =>
      SECRET_KEYS.test(k) ? `${k}=***` : m,
    );
}

async function readBodySnippet(c: any): Promise<string | null> {
  try {
    // c.req.text() consumes the stream — safe here because the route
    // already finished (we're inside the error handler).
    if (c?.req?.text) {
      const t = await c.req.text();
      if (!t) return null;
      const trimmed = t.length > MAX_BODY ? t.slice(0, MAX_BODY) + '…' : t;
      return maskSecrets(trimmed);
    }
  } catch {}
  return null;
}

export interface ErrorContext {
  level?: 'error' | 'warn' | 'fatal';
  code?: string | null;
  status?: number;
}

export async function recordError(
  env: Env,
  c: Context<{ Bindings: Env }>,
  err: Error,
  ctx: ErrorContext = {},
): Promise<void> {
  try {
    const id = generateId('err');
    const now = new Date().toISOString();

    // user is best-effort — auth middleware sets c.get('user') if logged in
    let user: any = null;
    try {
      user = (c as any).get?.('user') || null;
    } catch {}

    const ip = getRequestIp(c as any);
    const geo = getGeoFromRequest(c as any);

    const url = new URL(c.req.url);
    const stack = err.stack ? err.stack.slice(0, MAX_STACK) : null;
    const body = await readBodySnippet(c).catch(() => null);

    await env.DB.prepare(
      `INSERT INTO error_logs
        (id, level, code, message, stack, status_code,
         method, path, query, body_snippet,
         user_id, user_role, user_email,
         ip_address, user_agent, country, city, region,
         request_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        ctx.level || 'error',
        ctx.code || (err as any).code || null,
        err.message?.slice(0, 1000) || null,
        stack,
        ctx.status ?? null,
        c.req.method || null,
        url.pathname || null,
        url.search ? url.search.slice(1, 500) : null,
        body,
        user?.id || null,
        user?.role || null,
        user?.email || null,
        ip,
        c.req.header('User-Agent')?.slice(0, 500) || null,
        geo.country || null,
        geo.city || null,
        geo.region || null,
        c.req.header('CF-Ray') || c.req.header('X-Request-Id') || null,
        now,
      )
      .run();
  } catch (insertErr) {
    // Last resort — never break the request.
    // eslint-disable-next-line no-console
    console.warn('[error_log] insert failed', insertErr);
  }
}
