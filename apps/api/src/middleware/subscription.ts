import { createMiddleware } from 'hono/factory';
import type { Env, AuthUser } from '../types';
import { PLANS } from '@staffnow/config';

export const requireSubscription = (...planIds: string[]) =>
  createMiddleware<{ Bindings: Env; Variables: { user: AuthUser } }>(async (c, next) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Δεν είστε συνδεδεμένος.' } }, 401);
    }
    if (user.role === 'admin') { await next(); return; }

    const sub = await c.env.DB.prepare(
      "SELECT plan_id, status FROM subscriptions WHERE user_id = ? AND status IN ('active', 'trialing')",
    ).bind(user.id).first<{ plan_id: string; status: string }>();

    if (!sub) {
      return c.json({ success: false, error: { code: 'SUBSCRIPTION_REQUIRED', message: 'Χρειάζεστε συνδρομή.' } }, 403);
    }
    if (planIds.length > 0 && !planIds.includes(sub.plan_id)) {
      return c.json({ success: false, error: { code: 'SUBSCRIPTION_REQUIRED', message: 'Αναβαθμίστε τη συνδρομή σας.' } }, 403);
    }
    await next();
  });

export async function checkSwipeLimit(
  db: D1Database,
  userId: string,
): Promise<{ allowed: boolean; remaining: number }> {
  const sub = await db
    .prepare("SELECT plan_id FROM subscriptions WHERE user_id = ? AND status IN ('active', 'trialing')")
    .bind(userId)
    .first<{ plan_id: string }>();

  const planId = sub?.plan_id as keyof typeof PLANS | undefined;
  const plan = planId ? PLANS[planId] : null;
  const maxSwipes = plan?.features.maxSwipesPerMonth ?? 5;

  if (maxSwipes === null) return { allowed: true, remaining: -1 };

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const result = await db
    .prepare("SELECT COUNT(*) as count FROM swipes WHERE swiper_id = ? AND direction = 'like' AND created_at >= ?")
    .bind(userId, monthStart.toISOString())
    .first<{ count: number }>();

  const used = result?.count ?? 0;
  const remaining = maxSwipes - used;
  return { allowed: remaining > 0, remaining: Math.max(0, remaining) };
}
