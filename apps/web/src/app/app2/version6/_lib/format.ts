/** StaffNow v6 — formatting helpers shared by every page. */

const ROLE_LABELS: Record<string, string> = {
  waiter: 'Σερβιτόρος/α',
  chef: 'Σεφ',
  cook: 'Μάγειρας/ισσα',
  bartender: 'Bartender',
  receptionist: 'Ρεσεψιονίστ',
  housekeeper: 'Καμαριέρα',
  barista: 'Barista',
  driver: 'Οδηγός',
  sales: 'Πωλητής/τρια',
  warehouse: 'Αποθηκάριος',
  cleaner: 'Καθαριστής/τρια',
  hostess: 'Hostess',
  pool_attendant: 'Pool Attendant',
  porter: 'Porter',
  concierge: 'Concierge',
  beach_attendant: 'Beach Attendant',
  spa: 'Spa',
};

const AVAIL_LABELS: Record<string, string> = {
  immediate: 'Άμεσα διαθέσιμος',
  within_7_days: 'Σε 7 ημέρες',
  within_month: 'Εντός μήνα',
  seasonal: 'Σεζόν',
  full_time: 'Πλήρες',
  part_time: 'Μερικό',
};

const EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: 'Πλήρης',
  part_time: 'Μερική',
  seasonal: 'Σεζόν',
  freelance: 'Freelance',
  internship: 'Πρακτική',
};

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  hotel: 'Ξενοδοχείο',
  restaurant: 'Εστιατόριο',
  bar: 'Bar',
  cafe: 'Καφέ',
  beach_bar: 'Beach Bar',
  catering: 'Catering',
  bakery: 'Αρτοποιείο',
  retail: 'Λιανικό',
  cleaning: 'Καθαρισμοί',
  transport: 'Μεταφορές',
  other: 'Άλλο',
};

export function roleLabel(slug: string | undefined | null): string {
  if (!slug) return '';
  return ROLE_LABELS[slug] || slug;
}

export function availabilityLabel(slug: string | undefined | null): string {
  if (!slug) return '';
  return AVAIL_LABELS[slug] || slug;
}

export function employmentLabel(slug: string | undefined | null): string {
  if (!slug) return '';
  return EMPLOYMENT_LABELS[slug] || slug;
}

export function businessTypeLabel(slug: string | undefined | null): string {
  if (!slug) return '';
  return BUSINESS_TYPE_LABELS[slug] || slug;
}

export function formatSalary(min?: number | null, max?: number | null, type?: string): string {
  const suffix = type === 'hourly' ? '€/ώρα' : type === 'daily' ? '€/μέρα' : '€/μήνα';
  if (min && max && min !== max) return `${min.toLocaleString('el-GR')}–${max.toLocaleString('el-GR')} ${suffix}`;
  if (min) return `${min.toLocaleString('el-GR')} ${suffix}`;
  if (max) return `${max.toLocaleString('el-GR')} ${suffix}`;
  return 'Συμφωνία';
}

export function timeAgo(input: string | number | Date | undefined | null): string {
  if (!input) return '';
  const d = typeof input === 'string' || typeof input === 'number' ? new Date(input) : input;
  const ms = Date.now() - d.getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return 'τώρα';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} λ.`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ώρ.`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} ημ.`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week} εβδ.`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month} μήν.`;
  return d.toLocaleDateString('el-GR');
}

export function initials(name?: string | null): string {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || '')
    .join('');
}
