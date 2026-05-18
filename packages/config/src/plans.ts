/**
 * StaffNow plan catalogue.
 *
 * Pricing strategy (Phase 1 — startup launch):
 *   - Free  ─ acquisition funnel
 *   - Starter 29€  ─ entry tier, single-location small businesses
 *   - Pro 79€      ─ "popular" anchor, mid-size hospitality
 *   - Elite 149€   ─ chains, restaurant groups, enterprise
 *
 * Yearly = monthly × 9 (i.e. -25% / 3 months free) → drives commitment, kills churn.
 *
 * The frontend reads from this file. The Stripe Price IDs are env-driven:
 *   STRIPE_PRICE_BUSINESS_BASIC_MONTHLY / _YEARLY
 *   STRIPE_PRICE_BUSINESS_PRO_MONTHLY   / _YEARLY
 *   STRIPE_PRICE_BUSINESS_ELITE_MONTHLY / _YEARLY
 */
export const PLANS = {
  business_basic: {
    id: 'business_basic' as const,
    name: 'Business Basic',
    nameEl: 'Starter',
    priceMonthly: 29,
    priceYearly: 261, // -25%
    badge: null,
    features: {
      maxJobListings: 3,
      monthlyCredits: 30,
      maxSwipesPerMonth: null, // unlimited
      maxActiveMatches: 30,
      advancedFilters: false,
      boostedVisibility: false,
      verifiedBadge: false,
      favoriteLists: false,
      prioritySupport: false,
      aiShortlist: true,
      aiHiringChat: false,
      apiAccess: false,
    },
  },
  founding_pro: {
    id: 'founding_pro' as const,
    name: 'Founding Pro',
    nameEl: 'Pro (Founding)',
    priceMonthly: 39,
    priceYearly: 351, // -25%
    badge: 'founding' as const,
    /**
     * Identical features to business_pro — the only difference is the
     * grandfathered price (39€ vs 79€) for the first 100 customers.
     */
    features: {
      maxJobListings: 10,
      monthlyCredits: 100,
      maxSwipesPerMonth: null,
      maxActiveMatches: 100,
      advancedFilters: true,
      boostedVisibility: true,
      verifiedBadge: true,
      favoriteLists: true,
      prioritySupport: true,
      aiShortlist: true,
      aiHiringChat: true,
      apiAccess: false,
    },
  },
  business_pro: {
    id: 'business_pro' as const,
    name: 'Business Pro',
    nameEl: 'Pro',
    priceMonthly: 79,
    priceYearly: 711, // -25%
    badge: 'popular' as const,
    features: {
      maxJobListings: 10,
      monthlyCredits: 100,
      maxSwipesPerMonth: null,
      maxActiveMatches: 100,
      advancedFilters: true,
      boostedVisibility: true,
      verifiedBadge: true,
      favoriteLists: true,
      prioritySupport: true,
      aiShortlist: true,
      aiHiringChat: true,
      apiAccess: false,
    },
  },
  business_elite: {
    id: 'business_elite' as const,
    name: 'Business Elite',
    nameEl: 'Elite',
    priceMonthly: 149,
    priceYearly: 1341, // -25%
    badge: null,
    features: {
      maxJobListings: null, // unlimited
      monthlyCredits: 500,
      maxSwipesPerMonth: null,
      maxActiveMatches: null,
      advancedFilters: true,
      boostedVisibility: true,
      verifiedBadge: true,
      favoriteLists: true,
      prioritySupport: true,
      aiShortlist: true,
      aiHiringChat: true,
      apiAccess: true,
    },
  },
  worker_premium: {
    id: 'worker_premium' as const,
    name: 'Worker Premium',
    nameEl: 'Εργαζόμενος Premium',
    priceMonthly: 4.99,
    priceYearly: 44.99, // -25%
    badge: null,
    features: {
      premiumTick: true,
      monthlyCreditsBonus: 30,
      unlimitedBoosts: true,
      advancedFilters: true,
      profileViewsStats: true,
      readReceipts: true,
    },
  },
} as const;

export type PlanId = keyof typeof PLANS;
export const PLAN_IDS = Object.keys(PLANS) as PlanId[];

/** Convenience: plans available to businesses, in display order. */
export const BUSINESS_PLAN_IDS: PlanId[] = ['business_basic', 'business_pro', 'business_elite'];

/**
 * Founding-Members early-bird configuration.
 * First 100 paying customers grandfather into Pro at 39€/μήνα for life.
 */
export const FOUNDING_MEMBER_TOTAL_SPOTS = 100;
export const FOUNDING_PLAN_ID: PlanId = 'founding_pro';
