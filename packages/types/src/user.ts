export type UserRole = 'worker' | 'business' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'pending_verification' | 'deleted';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser extends User {
  sessionId?: string;
}
