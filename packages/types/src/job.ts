import type { WorkerJobRole } from './worker';

export type JobStatus = 'draft' | 'published' | 'paused' | 'archived' | 'filled';

/**
 * 'job'   = μόνιμη αγγελία
 * 'shift' = έκτακτη βάρδια (μία βάρδια ή λίγες μέρες)
 */
export type ListingKind = 'job' | 'shift';

export interface JobListing {
  id: string;
  businessId: string;
  branchId?: string;
  title: string;
  description: string;
  roles: WorkerJobRole[];
  region?: string;
  city?: string;
  employmentType: 'full_time' | 'part_time' | 'seasonal';
  salaryMin?: number;
  salaryMax?: number;
  salaryType: 'hourly' | 'monthly' | 'daily' | 'negotiable';
  housingProvided: boolean;
  mealsProvided: boolean;
  hoursPerDay?: number;
  startDate?: string;
  endDate?: string;
  status: JobStatus;

  // -- Έκτακτη βάρδια -------------------------------------------------------
  listingKind: ListingKind;
  /** 'YYYY-MM-DD' σε τοπική ώρα Ελλάδας */
  shiftDate?: string;
  shiftDays?: number;
  /** 'HH:MM' */
  shiftStartTime?: string;
  /** 'HH:MM' — μπορεί να είναι μικρότερη της έναρξης (περνά μεσάνυχτα) */
  shiftEndTime?: string;
  shiftPositions?: number;
  /** Παράγωγο, UTC σε μορφή D1: 'YYYY-MM-DD HH:MM:SS' */
  shiftStartUtc?: string;

  createdAt: string;
  updatedAt: string;
}

export type JobCard = Pick<
  JobListing,
  'id' | 'title' | 'roles' | 'region' | 'city' | 'employmentType' | 'salaryMin' | 'salaryMax' | 'salaryType' | 'housingProvided' | 'mealsProvided' | 'status'
  | 'listingKind' | 'shiftDate' | 'shiftDays' | 'shiftStartTime' | 'shiftEndTime' | 'shiftPositions' | 'shiftStartUtc'
> & {
  companyName?: string;
  businessType?: string;
  logoUrl?: string;
  businessVerified?: boolean;
};
