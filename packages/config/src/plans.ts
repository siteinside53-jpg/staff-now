export const PLANS = {
  business_basic: {
    id: 'business_basic' as const,
    name: 'Business Basic',
    nameEl: 'Επιχείρηση Basic',
    priceMonthly: 29,
    priceYearly: 290,
    features: {
      maxSwipesPerMonth: 50,
      maxActiveMatches: 10,
      advancedFilters: false,
      boostedVisibility: false,
      verifiedBadge: false,
      favoriteLists: false,
      prioritySupport: false,
    },
  },
  business_pro: {
    id: 'business_pro' as const,
    name: 'Business Pro',
    nameEl: 'Επιχείρηση Pro',
    priceMonthly: 79,
    priceYearly: 790,
    features: {
      maxSwipesPerMonth: null, // unlimited
      maxActiveMatches: 100,
      advancedFilters: true,
      boostedVisibility: true,
      verifiedBadge: true,
      favoriteLists: true,
      prioritySupport: true,
    },
  },
  worker_premium: {
    id: 'worker_premium' as const,
    name: 'Worker Premium',
    nameEl: 'Εργαζόμενος Premium',
    priceMonthly: 9,
    priceYearly: 90,
    features: {
      maxSwipesPerMonth: null,
      maxActiveMatches: null,
      advancedFilters: true,
      boostedVisibility: true,
      verifiedBadge: true,
      favoriteLists: true,
      prioritySupport: false,
    },
  },
} as const;

export type PlanId = keyof typeof PLANS;
export const PLAN_IDS = Object.keys(PLANS) as PlanId[];
