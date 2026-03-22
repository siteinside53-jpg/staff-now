export type PlanId = 'business_basic' | 'business_pro' | 'worker_premium';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';

export interface Subscription {
  id: string;
  userId: string;
  planId: PlanId;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  status: SubscriptionStatus;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlanFeatures {
  maxSwipesPerMonth: number | null;
  maxActiveMatches: number | null;
  advancedFilters: boolean;
  boostedVisibility: boolean;
  verifiedBadge: boolean;
  favoriteLists: boolean;
  prioritySupport: boolean;
}

export interface Plan {
  id: PlanId;
  name: string;
  nameEl: string;
  priceMonthly: number;
  priceYearly: number;
  features: PlanFeatures;
}
