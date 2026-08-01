/**
 * Off-site notification dispatch (Web Push + Email).
 *
 * The in-app `notifications` table is still written inline at each call site
 * (unchanged). This helper adds the OFF-SITE channels on top: it looks up the
 * user's push subscriptions + email and delivers a copy so the user is alerted
 * even when StaffNow is not open.
 *
 * Everything here is best-effort and swallows its own errors — a failed push or
 * email must never break the underlying action (match, message, job post).
 * Call it via `c.executionCtx.waitUntil(notifyUser(...))`.
 */

import type { Env } from '../types';
import { sendWebPush, type VapidConfig, type PushSubscriptionKeys } from './webpush';
import { sendEmail, emailLayout, type EmailConfig } from './email';

const WEB_ORIGIN = 'https://staffnow.gr';

export interface NotifyInput {
  userId: string;
  title: string;
  body: string;
  /** Relative in-app path to open on click, e.g. "/dashboard/messages". */
  url?: string;
  /** CTA label for the email button. */
  ctaText?: string;
  /**
   * Throttle key for the EMAIL channel only (push is always instant). When set
   * together with `emailCooldownMinutes`, the email is skipped if another email
   * of the same category was already sent to this user within the cooldown
   * window. Opaque string, e.g. "interest", "match", or "msg:<conversationId>".
   */
  emailCategory?: string;
  /** Minimum minutes between emails of the same `emailCategory` to this user. */
  emailCooldownMinutes?: number;
}

function vapidFrom(env: Env): VapidConfig | null {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return null;
  return {
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
    subject: env.VAPID_SUBJECT || 'mailto:no-reply@staffnow.gr',
  };
}

function emailCfgFrom(env: Env): EmailConfig | null {
  if (!env.EMAIL_API_KEY) return null;
  return { apiKey: env.EMAIL_API_KEY, from: env.EMAIL_FROM || 'StaffNow <no-reply@staffnow.gr>' };
}

/**
 * Picks a hero icon + soft colour tint for the email based on the notification
 * type. Primary signal is the `emailCategory`; if that is missing/unknown we
 * fall back to the leading emoji already baked into the title, else a bell.
 */
function heroFor(category: string, title: string): { icon: string; tint: string } {
  const key = category.startsWith('msg:') ? 'msg' : category;
  switch (key) {
    case 'msg':
      return { icon: '💬', tint: '#dbeafe' }; // message — blue
    case 'interest':
      return { icon: '❤️', tint: '#ffe4e6' }; // interest — rose
    case 'match':
      return { icon: '🎉', tint: '#dcfce7' }; // match — green
    case 'new_worker':
      return { icon: '👤', tint: '#e0e7ff' }; // new worker — indigo
    case 'new_job':
      return { icon: '💼', tint: '#fef3c7' }; // new job — amber
  }
  // Fallback: read the emoji the title already carries.
  const lead = title.trim().match(/^\p{Extended_Pictographic}(?:\uFE0F)?/u)?.[0];
  if (lead === '💬') return { icon: '💬', tint: '#dbeafe' };
  if (lead === '❤️' || lead === '❤') return { icon: '❤️', tint: '#ffe4e6' };
  if (lead === '🎉') return { icon: '🎉', tint: '#dcfce7' };
  if (lead) return { icon: lead, tint: '#dbeafe' };
  return { icon: '🔔', tint: '#dbeafe' };
}

async function dispatchPush(env: Env, input: NotifyInput, path: string): Promise<void> {
  const vapid = vapidFrom(env);
  if (!vapid) return;
  const subs = await env.DB.prepare(
    'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?',
  )
    .bind(input.userId)
    .all<PushSubscriptionKeys>();

  const rows = subs.results || [];
  if (rows.length === 0) return;

  const message = JSON.stringify({ title: input.title, body: input.body, url: path });

  await Promise.allSettled(
    rows.map(async (sub) => {
      try {
        const res = await sendWebPush(vapid, sub, message);
        if (res.expired) {
          await env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?')
            .bind(sub.endpoint)
            .run();
        }
      } catch {
        /* ignore individual subscription failures */
      }
    }),
  );
}

/**
 * Returns true when an email of this category was sent to the user recently
 * enough that we should skip sending another (cooldown still active). Fails
 * open: any error means "don't throttle" so a broken log never silences alerts.
 */
async function emailInCooldown(
  env: Env,
  userId: string,
  category: string,
  cooldownMinutes: number,
): Promise<boolean> {
  if (!category || cooldownMinutes <= 0) return false;
  try {
    const row = await env.DB.prepare(
      'SELECT last_sent_at FROM notification_email_log WHERE user_id = ? AND category = ?',
    )
      .bind(userId, category)
      .first<{ last_sent_at: string }>();
    if (row?.last_sent_at) {
      const last = Date.parse(row.last_sent_at);
      if (!Number.isNaN(last) && Date.now() - last < cooldownMinutes * 60_000) {
        return true;
      }
    }
  } catch {
    /* fail open */
  }
  return false;
}

/** Record that an email of this category was just sent to the user. */
async function markEmailSent(env: Env, userId: string, category: string): Promise<void> {
  if (!category) return;
  try {
    await env.DB.prepare(
      `INSERT INTO notification_email_log (user_id, category, last_sent_at)
       VALUES (?, ?, ?)
       ON CONFLICT(user_id, category) DO UPDATE SET last_sent_at = excluded.last_sent_at`,
    )
      .bind(userId, category, new Date().toISOString())
      .run();
  } catch {
    /* best-effort */
  }
}

async function dispatchEmail(env: Env, input: NotifyInput, path: string): Promise<void> {
  const cfg = emailCfgFrom(env);
  if (!cfg) return;

  const category = input.emailCategory || '';
  const cooldown = input.emailCooldownMinutes || 0;
  if (await emailInCooldown(env, input.userId, category, cooldown)) return;

  const user = await env.DB.prepare('SELECT email FROM users WHERE id = ?')
    .bind(input.userId)
    .first<{ email: string }>();
  if (!user?.email) return;

  const { icon, tint } = heroFor(category, input.title);
  const html = emailLayout({
    title: input.title,
    body: input.body,
    ctaText: input.ctaText || 'Άνοιγμα StaffNow',
    ctaUrl: `${WEB_ORIGIN}${path}`,
    icon,
    tint,
  });
  const ok = await sendEmail(cfg, { to: user.email, subject: input.title, html });
  if (ok && category && cooldown > 0) {
    await markEmailSent(env, input.userId, category);
  }
}

/** Deliver an off-site notification to a single user across all channels. */
export async function notifyUser(env: Env, input: NotifyInput): Promise<void> {
  const path = input.url || '/dashboard';
  await Promise.allSettled([
    dispatchPush(env, input, path).catch(() => {}),
    dispatchEmail(env, input, path).catch(() => {}),
  ]);
}
