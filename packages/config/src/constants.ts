export const APP_NAME = 'StaffNow';
export const DOMAIN = 'staffnow.gr';
export const API_DOMAIN = 'api.staffnow.gr';

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
export const MAX_BIO_LENGTH = 1000;
export const MAX_JOB_DESCRIPTION_LENGTH = 5000;

export const REGIONS_GREECE = [
  'Αττική',
  'Θεσσαλονίκη',
  'Κρήτη',
  'Δωδεκάνησα',
  'Κυκλάδες',
  'Κέρκυρα',
  'Ζάκυνθος',
  'Χαλκιδική',
  'Πελοπόννησος',
  'Ιόνια Νησιά',
  'Βόρειο Αιγαίο',
  'Νότιο Αιγαίο',
  'Ήπειρος',
  'Θεσσαλία',
  'Στερεά Ελλάδα',
  'Δυτική Ελλάδα',
  'Δυτική Μακεδονία',
  'Ανατολική Μακεδονία και Θράκη',
] as const;

export const LANGUAGES_COMMON = [
  'Ελληνικά',
  'English',
  'Deutsch',
  'Français',
  'Italiano',
  'Español',
  'Русский',
  'العربية',
  '中文',
  'Shqip',
  'Български',
  'Română',
] as const;

export const WORKER_JOB_ROLES = [
  'waiter',
  'barista',
  'chef',
  'maid',
  'receptionist',
  'bartender',
  'cleaner',
  'kitchen_assistant',
  'lifeguard',
  'tour_guide',
  'driver',
  'host',
  'sommelier',
  'dj',
  'animator',
  'other',
] as const;

export const WORKER_JOB_ROLE_LABELS_EL: Record<string, string> = {
  waiter: 'Σερβιτόρος/α',
  barista: 'Barista',
  chef: 'Σεφ / Μάγειρας',
  maid: 'Καμαριέρα',
  receptionist: 'Ρεσεψιονίστ',
  bartender: 'Bartender',
  cleaner: 'Καθαριστής/ια',
  kitchen_assistant: 'Βοηθός Κουζίνας',
  lifeguard: 'Ναυαγοσώστης',
  tour_guide: 'Ξεναγός',
  driver: 'Οδηγός',
  host: 'Υπεύθυνος Υποδοχής',
  sommelier: 'Sommelier',
  dj: 'DJ',
  animator: 'Animator',
  other: 'Άλλο',
};

export const BUSINESS_TYPE_LABELS_EL: Record<string, string> = {
  hotel: 'Ξενοδοχείο',
  restaurant: 'Εστιατόριο',
  beach_bar: 'Beach Bar',
  cafe: 'Καφετέρια',
  villa: 'Βίλα',
  tourism_company: 'Τουριστική Εταιρεία',
  bar: 'Bar',
  resort: 'Resort',
  cruise: 'Κρουαζιέρα',
  other: 'Άλλο',
};

export const PAGINATION_DEFAULTS = {
  page: 1,
  perPage: 20,
  maxPerPage: 100,
} as const;
