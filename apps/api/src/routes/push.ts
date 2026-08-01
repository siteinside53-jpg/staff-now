import { Hono } from 'hono';
import type { Env, AuthUser } from '../types';
import { requireAuth } from '../middleware/auth';
import { success, error } from '../lib/response';
import { generateId } from '../lib/id';

/**
 * Web Push subscription management. The browser subscribes via the Push API and
 * POSTs the resulting subscription here so the API can deliver off-site
 * notifications (see lib/notify.ts). Endpoints are per-user and idempotent on
 * the unique `endpoint`.
 */
const push = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

interface SubscribeBody {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}

// POST /push/subscribe — register (or refresh) a browser push subscription.
push.post('/subscribe', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json<SubscribeBody>().catch(() => null);

  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    return error(c, 'Λείπουν στοιχεία εγγραφής push', 400);
  }

  const userAgent = c.req.header('User-Agent') || null;

  // Upsert on the unique endpoint: if this browser already registered (possibly
  // under another user), re-point it to the current user and refresh the keys.
  await c.env.DB.prepare(
    `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, user_agent, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(endpoint) DO UPDATE SET
       user_id = excluded.user_id,
       p256dh = excluded.p256dh,
       auth = excluded.auth,
       user_agent = excluded.user_agent`,
  )
    .bind(generateId('ps'), user.id, endpoint, p256dh, auth, userAgent)
    .run();

  return success(c, { subscribed: true });
});

// POST /push/unsubscribe — remove a subscription (on logout / opt-out).
push.post('/unsubscribe', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ endpoint?: string }>().catch(() => null);
  const endpoint = body?.endpoint;

  if (!endpoint) {
    return error(c, 'Λείπει το endpoint', 400);
  }

  await c.env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?')
    .bind(endpoint, user.id)
    .run();

  return success(c, { unsubscribed: true });
});

export default push;
