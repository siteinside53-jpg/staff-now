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

const ROLE_LABELS: Record<string, string> = {
  waiter: 'Σερβιτόρος/α',
  barista: 'Barista',
  chef: 'Σεφ',
  cook: 'Μάγειρας',
  grill_cook: 'Ψήστης',
  maid: 'Καμαριέρα',
  housekeeper: 'Καμαριέρα',
  receptionist: 'Ρεσεψιονίστ',
  bartender: 'Bartender',
  cleaner: 'Καθαριστής',
  kitchen_assistant: 'Βοηθός Κουζίνας',
  lifeguard: 'Ναυαγοσώστης',
  tour_guide: 'Ξεναγός',
  driver: 'Οδηγός',
  host: 'Host',
  sommelier: 'Sommelier',
  dj: 'DJ',
  animator: 'Animator',
  sales: 'Πωλητής/τρια',
  warehouse: 'Αποθηκάριος',
  back_office_clerk: 'Υπάλληλος Back Office',
  call_center_agent: 'Call Center',
  collections_agent: 'Εισπράξεις',
  telephonist: 'Τηλεφωνητής/τρια',
};

export function roleLabel(key?: string): string {
  if (!key) return 'Εργαζόμενος/η';
  return ROLE_LABELS[key] ?? key;
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
