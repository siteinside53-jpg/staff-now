export type NotificationType =
  | 'new_match' | 'new_message' | 'subscription_updated'
  | 'verification_approved' | 'verification_rejected' | 'profile_view' | 'system';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  data?: string;
  readAt?: string;
  createdAt: string;
}
