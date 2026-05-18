/**
 * Plan resolver — merges the static `PLANS` config (packages/config) with
 * DB-stored overrides (`plan_overrides` table) so the admin can change prices
 * and limits at runtime without redeploying the static export.
 *
 * Defaults from code remain the source of truth for *structure* (which plans
 * exist, which feature keys are recognized). Overrides only modify VALUES.
 */
import { PLANS, type PlanId } from '@staffnow/config';
import type { Env } from '../types';

type Override = Record<string, unknown> & { plan_id: string };

const COL_TO_FEATURE: Record<string, string> = {
  max_job_listings: 'maxJobListings',
  max_active_matches: 'maxActiveMatches',
  max_swipes_per_month: 'maxSwipesPerMonth',
  monthly_credits: 'monthlyCredits',
  advanced_filters: 'advancedFilters',
  boosted_visibility: 'boostedVisibility',
  verified_badge: 'verifiedBadge',
  favorite_lists: 'favoriteLists',
  priority_support: 'prioritySupport',
  ai_shortlist: 'aiShortlist',
  ai_hiring_chat: 'aiHiringChat',
  api_access: 'apiAccess',
  premium_tick: 'premiumTick',
  unlimited_boosts: 'unlimitedBoosts',
  profile_views_stats: 'profileViewsStats',
  read_receipts: 'readReceipts',
  monthly_credits_bonus: 'monthlyCreditsBonus',
};

const BOOL_COLS = new Set([
  'advanced_filters',
  'boosted_visibility',
  'verified_badge',
  'favorite_lists',
  'priority_support',
  'ai_shortlist',
  'ai_hiring_chat',
  'api_access',
  'premium_tick',
  'unlimited_boosts',
  'profile_views_stats',
  'read_receipts',
]);

export type ResolvedPlan = {
  id: string;
  name: string;
  nameEl: string;
  priceMonthly: number;
  priceYearly: number;
  badge: string | null;
  features: Record<string, unknown>;
};

function applyOverride(planId: PlanId, override: Override | null): ResolvedPlan {
  const base = PLANS[planId];
  const features: Record<string, unknown> = { ...(base.features as any) };
  let nameEl = base.nameEl;
  let priceMonthly = base.priceMonthly;
  let priceYearly = base.priceYearly;
  let badge: string | null = (base.badge as any) ?? null;

  if (override) {
    if (override.name_el != null) nameEl = String(override.name_el);
    if (override.price_monthly != null) priceMonthly = Number(override.price_monthly);
    if (override.price_yearly != null) priceYearly = Number(override.price_yearly);
    if (override.badge !== undefined) badge = (override.badge as any) ?? null;

    for (const [col, featureKey] of Object.entries(COL_TO_FEATURE)) {
      const v = override[col];
      if (v === undefined || v === null) continue;
      if (BOOL_COLS.has(col)) {
        features[featureKey] = Number(v) === 1;
      } else {
        features[featureKey] = Number(v);
      }
    }
  }

  return {
    id: base.id,
    name: base.name,
    nameEl,
    priceMonthly,
    priceYearly,
    badge,
    features,
  };
}

export async function resolvePlan(env: Env, planId: PlanId): Promise<ResolvedPlan> {
  const row = await env.DB
    .prepare('SELECT * FROM plan_overrides WHERE plan_id = ?')
    .bind(planId)
    .first<Override>();
  return applyOverride(planId, row);
}

export async function resolveAllPlans(env: Env): Promise<ResolvedPlan[]> {
  const rows = await env.DB.prepare('SELECT * FROM plan_overrides').all<Override>();
  const overrides = new Map((rows.results || []).map((r) => [r.plan_id, r]));
  return (Object.keys(PLANS) as PlanId[]).map((id) => applyOverride(id, overrides.get(id) || null));
}
