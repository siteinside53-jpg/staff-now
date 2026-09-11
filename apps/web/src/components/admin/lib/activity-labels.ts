/** Ελληνικές ετικέτες για τα είδη κινήσεων των ημερολογίων. Ό,τι δεν ξέρουμε, βγαίνει όπως είναι. */
export const ACTIVITY_LABELS: Record<string, string> = {
  page_view: 'Προβολή σελίδας',
  heartbeat: 'Σημάδι ζωής',
  login: 'Σύνδεση',
  logout: 'Αποσύνδεση',
  register: 'Εγγραφή',
  signup: 'Εγγραφή',
  swipe: 'Swipe',
  swipe_like: 'Ενδιαφέρον',
  swipe_skip: 'Πέρασε',
  like: 'Ενδιαφέρον',
  skip: 'Πέρασε',
  match: 'Match',
  message_sent: 'Μήνυμα',
  message: 'Μήνυμα',
  job_created: 'Νέα αγγελία',
  job_published: 'Δημοσίευση αγγελίας',
  job_updated: 'Αλλαγή αγγελίας',
  profile_updated: 'Αλλαγή προφίλ',
  profile_view: 'Προβολή προφίλ',
  upload: 'Ανέβασμα αρχείου',
  hire_declared: 'Δήλωση πρόσληψης',
  hire_confirmed: 'Επιβεβαίωση πρόσληψης',
  rating: 'Αξιολόγηση',
  call_started: 'Κλήση',
  error_js: 'Σφάλμα σελίδας',
  error_api: 'Σφάλμα server',
  error_auth: 'Σφάλμα σύνδεσης',
  error_promise: 'Σφάλμα σελίδας',
  click: 'Κλικ',
  cta_click: 'Κλικ σε κουμπί',
  search: 'Αναζήτηση',
  filter: 'Φίλτρο',
};

export function activityLabel(type: string): string {
  return ACTIVITY_LABELS[type] || type.replace(/_/g, ' ');
}

export function activityIcon(type: string): string {
  if (type.startsWith('error')) return '🔴';
  if (type === 'page_view') return '📄';
  if (type.includes('message')) return '💬';
  if (type.includes('like') || type === 'swipe') return '👋';
  if (type.includes('job')) return '💼';
  if (type.includes('hire')) return '🤝';
  if (type.includes('login') || type.includes('signup') || type.includes('register')) return '🔑';
  if (type.includes('click')) return '🖱️';
  return '•';
}

export function fmtWhen(iso: string): string {
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('el-GR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function fmtDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  if (seconds < 60) return `${Math.round(seconds)} δευτ.`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m < 60) return s ? `${m} λεπ. ${s} δ.` : `${m} λεπ.`;
  const h = Math.floor(m / 60);
  return `${h} ώρ. ${m % 60} λεπ.`;
}

export const COUNTRY_FLAG = (cc?: string | null) =>
  cc && /^[A-Z]{2}$/i.test(cc)
    ? String.fromCodePoint(...cc.toUpperCase().split('').map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65))
    : '🌐';
