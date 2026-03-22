export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export interface VerificationRequest {
  id: string;
  userId: string;
  documentUrl: string;
  documentType: string;
  status: VerificationStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

export type ReportReason = 'inappropriate_content' | 'fake_profile' | 'harassment' | 'spam' | 'other';

export interface Report {
  id: string;
  reporterId: string;
  targetUserId: string;
  reason: ReportReason;
  description?: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}
