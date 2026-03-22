export type BusinessType =
  | 'hotel' | 'restaurant' | 'beach_bar' | 'cafe' | 'villa'
  | 'tourism_company' | 'bar' | 'resort' | 'cruise' | 'other';

export interface BusinessProfile {
  id: string;
  userId: string;
  companyName: string;
  businessType: BusinessType;
  region?: string;
  address?: string;
  phone?: string;
  website?: string;
  description?: string;
  logoUrl?: string;
  staffHousing: boolean;
  mealsProvided: boolean;
  transportationAssistance: boolean;
  salaryRangeMin?: number;
  salaryRangeMax?: number;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export type BusinessCard = Pick<
  BusinessProfile,
  'id' | 'userId' | 'companyName' | 'businessType' | 'region' | 'logoUrl' | 'staffHousing' | 'mealsProvided' | 'verified' | 'description'
>;
