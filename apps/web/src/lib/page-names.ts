/**
 * Ελληνικά ονόματα σελίδων για τον πίνακα διαχειριστή.
 *
 * ΓΙΑΤΙ: το ιστορικό έδειχνε ωμές διαδρομές («/dashboard/interests») και ο
 * ιδιοκτήτης δεν αναγνώριζε τι είναι. Υπάρχουν 171 διαφορετικές διαδρομές στη
 * ζωντανή βάση· οι παρακάτω είναι οι πραγματικές κορυφαίες, μετρημένες.
 *
 * ΚΑΝΟΝΑΣ: ό,τι ΔΕΝ αναγνωρίζεται επιστρέφει τη διαδρομή όπως είναι.
 * Δεν κρύβουμε ποτέ πληροφορία επειδή δεν την ξέρουμε.
 */

const EXACT: Record<string, string> = {
  '/': 'Αρχική σελίδα',

  // ---- Χρήστης ----
  '/dashboard': 'Πίνακας ελέγχου',
  '/dashboard/discover': 'Εύρεση (κάρτες)',
  '/dashboard/matches': 'Ταιριάσματα',
  '/dashboard/messages': 'Μηνύματα',
  '/dashboard/profile': 'Το προφίλ μου',
  '/dashboard/view-profile': 'Προεπισκόπηση προφίλ',
  '/dashboard/jobs': 'Οι αγγελίες μου',
  '/dashboard/jobs/edit': 'Επεξεργασία αγγελίας',
  '/dashboard/jobs/shift': 'Έκτακτη βάρδια',
  '/dashboard/interests': 'Ενδιαφέροντα',
  '/dashboard/billing': 'Συνδρομή & χρεώσεις',
  '/dashboard/settings': 'Ρυθμίσεις',
  '/dashboard/verification': 'Επαλήθευση λογαριασμού',
  '/dashboard/hires': 'Προσλήψεις',
  '/dashboard/ratings': 'Αξιολογήσεις',
  '/dashboard/boost': 'Προβολή αγγελίας',

  // ---- Είσοδος / εγγραφή ----
  '/auth/login': 'Σύνδεση',
  '/auth/register': 'Εγγραφή',
  '/auth/forgot-password': 'Ξέχασα τον κωδικό',
  '/auth/reset-password': 'Νέος κωδικός',
  '/auth/google-callback': 'Σύνδεση με Google',

  // ---- Δημόσιες ----
  '/how-it-works': 'Πώς λειτουργεί',
  '/for-businesses': 'Για επιχειρήσεις',
  '/for-workers': 'Για εργαζόμενους',
  '/find-job': 'Βρες δουλειά',
  '/find-staff': 'Βρες προσωπικό',
  '/pricing': 'Τιμές',
  '/categories': 'Κατηγορίες',
  '/about': 'Σχετικά',
  '/contact': 'Επικοινωνία',
  '/help': 'Βοήθεια',
  '/faq': 'Συχνές ερωτήσεις',
  '/blog': 'Άρθρα',
  '/careers': 'Καριέρα',
  '/press': 'Τύπος',
  '/terms': 'Όροι χρήσης',
  '/privacy': 'Απόρρητο',
  '/cookies': 'Cookies',

  // ---- Διαχειριστής ----
  '/admin': 'Διαχείριση',
  '/admin/overview': 'Διαχείριση · Επισκόπηση',
  '/admin/users': 'Διαχείριση · Χρήστες',
  '/admin/users/timeline': 'Διαχείριση · Ιστορικό χρήστη',
  '/admin/workers': 'Διαχείριση · Εργαζόμενοι',
  '/admin/employers': 'Διαχείριση · Επιχειρήσεις',
  '/admin/jobs': 'Διαχείριση · Αγγελίες',
  '/admin/interests': 'Διαχείριση · Αιτήματα',
  '/admin/matches': 'Διαχείριση · Ταιριάσματα',
  '/admin/messages': 'Διαχείριση · Μηνύματα',
  '/admin/hires': 'Διαχείριση · Προσλήψεις',
  '/admin/ratings': 'Διαχείριση · Αξιολογήσεις',
  '/admin/verifications': 'Διαχείριση · Επαληθεύσεις',
  '/admin/emails': 'Διαχείριση · Δείγματα email',
  '/admin/reports': 'Διαχείριση · Αναφορές',
  '/admin/security': 'Διαχείριση · Ασφάλεια',
  '/admin/notifications': 'Διαχείριση · Ειδοποιήσεις',
  '/admin/audit-log': 'Διαχείριση · Αρχείο ενεργειών',
  '/admin/data-changes': 'Διαχείριση · Αλλαγές δεδομένων',
  '/admin/analytics': 'Διαχείριση · Στατιστικά',
  '/admin/subscriptions': 'Διαχείριση · Συνδρομές',
  '/admin/payments': 'Διαχείριση · Πληρωμές',
  '/admin/settings': 'Διαχείριση · Ρυθμίσεις',
  '/admin/admin-users': 'Διαχείριση · Διαχειριστές',
  '/admin/blog': 'Διαχείριση · Άρθρα',

  // ---- Μακέτες / δοκιμές (δεν τις βλέπει πελάτης) ----
  '/app': 'Δοκιμαστική εφαρμογή',
  '/app/browse': 'Δοκιμαστική · Περιήγηση',
};

/**
 * Διαδρομές με μεταβλητό κομμάτι στο τέλος (αγγελία, εργαζόμενος, δείγμα email).
 * Ο έλεγχος γίνεται με τη σειρά, πρώτο που ταιριάζει κερδίζει.
 */
const PREFIXES: Array<[string, string]> = [
  ['/jobs/', 'Αγγελία'],
  ['/workers/', 'Προφίλ εργαζόμενου'],
  ['/businesses/', 'Προφίλ επιχείρησης'],
  ['/blog/', 'Άρθρο'],
  ['/emails/', 'Δείγμα email'],
  ['/app2/', 'Μακέτα (δοκιμαστική)'],
  ['/app/', 'Δοκιμαστική εφαρμογή'],
];

/**
 * Το ελληνικό όνομα μιας σελίδας, ή η ίδια η διαδρομή αν δεν την ξέρουμε.
 */
export function pageName(path: string | null | undefined): string {
  if (!path) return '—';

  // Τα query params δεν αλλάζουν ποια σελίδα είναι.
  const clean = path.split('?')[0]?.replace(/\/+$/, '') || '/';

  const exact = EXACT[clean];
  if (exact) return exact;

  for (const [prefix, label] of PREFIXES) {
    if (clean.startsWith(prefix)) {
      const rest = clean.slice(prefix.length);
      // Το ωμό αναγνωριστικό (jl_37ynd…) δεν λέει τίποτα σε άνθρωπο· το κρύβω
      // μόνο όταν είναι προφανώς αναγνωριστικό, αλλιώς το δείχνω.
      const isId = /^(jl_|usr_|biz_)/.test(rest) || rest.length > 40;
      return isId ? label : `${label}: ${decodeURIComponent(rest)}`;
    }
  }

  return clean;
}

/** Είναι σελίδα που ο ίδιος ο χρήστης δεν θα δει ποτέ (μακέτα/δοκιμή); */
export function isMockPage(path: string | null | undefined): boolean {
  if (!path) return false;
  return path.startsWith('/app2/');
}
