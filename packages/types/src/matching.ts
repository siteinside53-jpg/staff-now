export type SwipeDirection = 'like' | 'skip';
export type SwipeType = 'worker_to_job' | 'business_to_worker';

export interface Swipe {
  id: string;
  swiperId: string;
  targetId: string;
  targetType: 'worker' | 'job';
  direction: SwipeDirection;
  createdAt: string;
}

export type MatchStatus = 'active' | 'archived' | 'expired';

export interface Match {
  id: string;
  workerId: string;
  businessId: string;
  jobId?: string;
  status: MatchStatus;
  matchedAt: string;
  archivedAt?: string;
}

export type FavoriteType = 'worker' | 'job';

export interface Favorite {
  id: string;
  userId: string;
  targetId: string;
  targetType: FavoriteType;
  createdAt: string;
}
