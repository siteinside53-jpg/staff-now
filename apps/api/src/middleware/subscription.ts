import { createMiddleware } from 'hono/factory';
import type { Env, AuthUser } from '../types';
import { PLANS, type PlanId } from '@staffnow/config';
import { resolvePlan } from '../lib/plans';

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

/**
 * Default tier-less ("free") limits for users with no active subscription.
 * Keep these in sync with the marketing copy on /pricing.
 */
const FREE_TIER_LIMITS = {
  maxJobListings: 1,
  maxActiveMatches: 5,
  // gated capabilities default to false unless plan grants them
} as const;

/**
 * Resolve the active plan for a user. Returns the plan object or `null` if the
 * user is on the free tier.
 */
async function getActivePlan(db: D1Database, userId: string) {
  const sub = await db
    .prepare("SELECT plan_id FROM subscriptions WHERE user_id = ? AND status IN ('active', 'trialing')")
    .bind(userId)
    .first<{ plan_id: string }>();
  const planId = sub?.plan_id as PlanId | undefined;
  if (!planId || !(planId in PLANS)) return null;
  // Pass through the resolver so DB overrides on price/limits/features
  // take effect immediately for active subscribers. resolvePlan only needs
  // env.DB so we wrap the bare D1 binding to satisfy its signature.
  return resolvePlan({ DB: db } as Env, planId);
}

/**
 * Check whether the business can publish another job listing.
 * `published` and `paused` count toward the limit (publicly visible vs paused-but-resumable).
 * Drafts, archived and filled jobs are not counted.
 */
export async function checkJobListingLimit(
  db: D1Database,
  userId: string,
): Promise<{ allowed: boolean; used: number; max: number | null; planId: string | null }> {
  const plan = await getActivePlan(db, userId);
  const planId = plan?.id ?? null;
  const features = (plan as any)?.features;
  const max: number | null =
    features && 'maxJobListings' in features
      ? (features.maxJobListings as number | null)
      : FREE_TIER_LIMITS.maxJobListings;

  // unlimited
  if (max === null) return { allowed: true, used: 0, max: null, planId };

  const bp = await db
    .prepare('SELECT id FROM business_profiles WHERE user_id = ?')
    .bind(userId)
    .first<{ id: string }>();
  if (!bp) return { allowed: true, used: 0, max, planId };

  const row = await db
    .prepare(
      `SELECT COUNT(*) as count FROM job_listings
        WHERE business_id = ? AND status IN ('published', 'paused')`,
    )
    .bind(bp.id)
    .first<{ count: number }>();
  const used = row?.count ?? 0;
  return { allowed: used < max, used, max, planId };
}

/**
 * Check whether the user can accept another active match.
 * Both workers and businesses are subject to their plan's `maxActiveMatches`.
 */
export async function checkActiveMatchesLimit(
  db: D1Database,
  userId: string,
): Promise<{ allowed: boolean; used: number; max: number | null; planId: string | null }> {
  const plan = await getActivePlan(db, userId);
  const planId = plan?.id ?? null;
  const features = (plan as any)?.features;
  const max: number | null =
    features && 'maxActiveMatches' in features
      ? (features.maxActiveMatches as number | null)
      : FREE_TIER_LIMITS.maxActiveMatches;

  if (max === null) return { allowed: true, used: 0, max: null, planId };

  const row = await db
    .prepare(
      `SELECT COUNT(*) as count FROM matches
        WHERE (worker_id = ? OR business_id = ?) AND status = 'active'`,
    )
    .bind(userId, userId)
    .first<{ count: number }>();
  const used = row?.count ?? 0;
  return { allowed: used < max, used, max, planId };
}

/**
 * Check whether the user has access to a boolean feature (e.g. boostedVisibility).
 * Returns true for admin and false for users without an active plan that grants it.
 */
export async function hasFeature(
  db: D1Database,
  userId: string,
  feature:
    | 'advancedFilters'
    | 'boostedVisibility'
    | 'verifiedBadge'
    | 'favoriteLists'
    | 'aiShortlist'
    | 'aiHiringChat'
    | 'apiAccess',
): Promise<boolean> {
  const plan = await getActivePlan(db, userId);
  const features = (plan as any)?.features;
  if (!features) return false;
  return Boolean(features[feature]);
}

export async function checkSwipeLimit(
  db: D1Database,
  userId: string,
): Promise<{ allowed: boolean; remaining: number }> {
  const sub = await db
    .prepare("SELECT plan_id FROM subscriptions WHERE user_id = ? AND status IN ('active', 'trialing')")
    .bind(userId)
    .first<{ plan_id: string }>();

  const planId = sub?.plan_id as PlanId | undefined;
  const plan = planId && planId in PLANS ? await resolvePlan({ DB: db } as Env, planId) : null;
  const features = plan?.features as Record<string, unknown> | undefined;
  const maxSwipes: number | null = features && 'maxSwipesPerMonth' in features
    ? ((features.maxSwipesPerMonth as number | null))
    : 5;

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
