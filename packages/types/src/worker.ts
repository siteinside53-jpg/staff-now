export type WorkerJobRole =
  | 'waiter' | 'barista' | 'chef' | 'maid' | 'receptionist'
  | 'bartender' | 'cleaner' | 'kitchen_assistant' | 'lifeguard'
  | 'tour_guide' | 'driver' | 'host' | 'sommelier' | 'dj' | 'animator' | 'other';

export type AvailabilityType = 'immediate' | 'within_7_days' | 'seasonal' | 'part_time' | 'full_time';

export interface WorkerProfile {
  id: string;
  userId: string;
  fullName: string;
  photoUrl?: string;
  city?: string;
  region?: string;
  willingToRelocate: boolean;
  jobRoles: WorkerJobRole[];
  yearsOfExperience: number;
  languages: string[];
  expectedHourlyRate?: number;
  expectedMonthlySalary?: number;
  availability?: AvailabilityType;
  bio?: string;
  verified: boolean;
  profileCompleteness: number;
  badges: string[];
  createdAt: string;
  updatedAt: string;
}

export type WorkerCard = Pick<
  WorkerProfile,
  'id' | 'userId' | 'fullName' | 'photoUrl' | 'city' | 'region' | 'jobRoles' | 'yearsOfExperience' | 'languages' | 'expectedMonthlySalary' | 'availability' | 'bio' | 'verified' | 'profileCompleteness'
>;
