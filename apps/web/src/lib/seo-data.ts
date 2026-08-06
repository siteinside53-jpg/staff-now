import { WORKER_JOB_ROLE_LABELS_EL } from '@staffnow/config';
import { API_URL } from './config';

export type PublicJob = {
  id: string;
  title: string;
  description?: string;
  city?: string;
  region?: string;
  company_name?: string;
  display_company_name?: string;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_type?: string;
  employment_type?: string;
  housing_provided?: number | boolean;
  meals_provided?: number | boolean;
  created_at?: string;
  company_logo?: string | null;
  roles?: string[];
};

export type PublicWorker = {
  user_id: string;
  full_name?: string;
  city?: string;
  region?: string;
  years_of_experience?: number;
  verified?: number | boolean;
  roles?: string[];
  availability?: string;
  photo_url?: string | null;
};

/**
 * Build-time fetchers για τις δημόσιες λίστες. Χρησιμοποιούνται από:
 *  - generateStaticParams (να φτιαχτούν οι σελίδες κάθε αγγελίας/εργαζομένου)
 *  - generateMetadata + το ίδιο το page
 *  - το sitemap.ts
 *
 * Με output: 'export' τρέχουν στο build. force-cache ώστε το ίδιο URL να
 * γίνεται fetch μία φορά σε όλο το build (dedup).
 */
export async function fetchAllJobs(): Promise<PublicJob[]> {
  try {
    const res = await fetch(`${API_URL}/public/jobs?limit=500`, { cache: 'force-cache' });
    if (!res.ok) return [];
    const d = (await res.json()) as { data?: PublicJob[] };
    return Array.isArray(d?.data) ? d.data : [];
  } catch {
    return [];
  }
}

export async function fetchAllWorkers(): Promise<PublicWorker[]> {
  try {
    const res = await fetch(`${API_URL}/public/workers?limit=500`, { cache: 'force-cache' });
    if (!res.ok) return [];
    const d = (await res.json()) as { data?: PublicWorker[] };
    return Array.isArray(d?.data) ? d.data : [];
  } catch {
    return [];
  }
}

// ── helpers ──

export function jobLocation(j: PublicJob): string {
  return (j.city || j.region || 'Ελλάδα').toString().trim();
}

export function jobCompany(j: PublicJob): string {
  return (j.display_company_name || j.company_name || 'Επιχείρηση').toString().trim();
}

const EMPLOYMENT_SCHEMA: Record<string, string> = {
  full_time: 'FULL_TIME',
  part_time: 'PART_TIME',
  seasonal: 'SEASONAL',
  freelance: 'CONTRACTOR',
};

export function employmentSchemaType(t?: string): string {
  return EMPLOYMENT_SCHEMA[t || 'full_time'] ?? 'OTHER';
}

const EMPLOYMENT_GREEK: Record<string, string> = {
  full_time: 'Πλήρης απασχόληση',
  part_time: 'Μερική απασχόληση',
  seasonal: 'Εποχιακή',
  freelance: 'Freelance',
};

export function employmentGreek(t?: string): string {
  return EMPLOYMENT_GREEK[t || 'full_time'] ?? (t || '');
}

/**
 * Οι ειδικότητες βγαίνουν από τον κεντρικό κατάλογο (256 στα ελληνικά). Εδώ
 * υπήρχε τοπικό λεξικό με ~24 εγγραφές, οπότε οι σελίδες εργαζομένων που
 * διαβάζει η Google έδειχναν αγγλικά κλειδιά τύπου «warehouse_worker».
 */
export function roleLabel(key?: string): string {
  if (!key) return 'Εργαζόμενος/η';
  return WORKER_JOB_ROLE_LABELS_EL[key] ?? key;
}

// «Μαρία Καρατζά» -> «Μαρία Κ.»
export function workerDisplayName(fullName?: string): string {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Εργαζόμενος/η';
  const first = parts[0] ?? '';
  if (parts.length === 1) return first;
  const last = parts[parts.length - 1] ?? '';
  return `${first} ${last.charAt(0).toUpperCase()}.`;
}
