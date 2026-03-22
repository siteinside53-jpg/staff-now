import type { WorkerJobRole } from './worker';

export type JobStatus = 'draft' | 'published' | 'archived' | 'filled';

export interface JobListing {
  id: string;
  businessId: string;
  title: string;
  description: string;
  roles: WorkerJobRole[];
  region?: string;
  city?: string;
  employmentType: 'full_time' | 'part_time' | 'seasonal';
  salaryMin?: number;
  salaryMax?: number;
  salaryType: 'hourly' | 'monthly';
  housingProvided: boolean;
  mealsProvided: boolean;
  startDate?: string;
  endDate?: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
}

export type JobCard = Pick<
  JobListing,
  'id' | 'title' | 'roles' | 'region' | 'city' | 'employmentType' | 'salaryMin' | 'salaryMax' | 'salaryType' | 'housingProvided' | 'mealsProvided' | 'status'
> & {
  companyName?: string;
  businessType?: string;
  logoUrl?: string;
  businessVerified?: boolean;
};
