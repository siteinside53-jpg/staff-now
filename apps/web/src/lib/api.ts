import { ApiClient, StaffNowApi } from '@staffnow/api-client';
import { trackError } from '@/lib/track-activity';

const apiClient = new ApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787',
  getToken: async () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('staffnow_token');
  },
  // Το ανώνυμο αναγνωριστικό επισκέπτη (αν συμφώνησε στα cookies) ταξιδεύει
  // μαζί με κάθε κλήση, ώστε στην εγγραφή να δένει το «από πού ήρθε» με τον
  // νέο λογαριασμό. Μόνο το αναγνωριστικό — τίποτα άλλο.
  // Και η γλώσσα του επισκέπτη (X-Locale): στα αγγλικά ο server στέλνει τις
  // αγγελίες με μεταφρασμένο τίτλο και περιγραφή.
  getHeaders: (): Record<string, string> => {
    if (typeof window === 'undefined') return {};
    const h: Record<string, string> = {};
    try {
      const v = localStorage.getItem('staffnow_visitor_id');
      if (v) h['X-Visitor-Id'] = v;
      h['X-Locale'] = localStorage.getItem('staffnow_locale') === 'en' ? 'en' : 'el';
    } catch {
      /* χωρίς localStorage: ελληνικά */
    }
    return h;
  },
  // Κάθε αποτυχημένη κλήση γράφεται στο ιστορικό του χρήστη, ώστε στον πίνακα
  // διαχειριστή να φαίνεται ΤΙ σφάλμα είδε πριν φύγει. Το ίδιο το σφάλμα
  // συνεχίζει κανονικά τον δρόμο του — δεν αλλάζει καμία συμπεριφορά.
  onError: ({ status, message, path, code }) => {
    // 401 χωρίς token = ανώνυμος επισκέπτης, όχι σφάλμα. Καταγράφεται μόνο όταν
    // υπήρχε σύνδεση και χάθηκε (ληγμένο/άκυρο token).
    if (status === 401) {
      let hadToken = false;
      try { hadToken = !!localStorage.getItem('staffnow_token'); } catch { /* χωρίς storage */ }
      if (!hadToken) return;
    }
    trackError(status === 401 ? 'auth' : 'api', message, { status, endpoint: path, code });
  },
  onUnauthorized: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('staffnow_token');
      // Only redirect to login if on a protected route (dashboard)
      if (window.location.pathname.startsWith('/dashboard')) {
        window.location.href = '/auth/login';
      }
    }
  },
});

export const api = new StaffNowApi(apiClient);

/** Για τις λίγες κλήσεις που γίνονται με σκέτο fetch(): η ίδια κεφαλίδα γλώσσας. */
export function localeHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    return { 'X-Locale': localStorage.getItem('staffnow_locale') === 'en' ? 'en' : 'el' };
  } catch {
    return {};
  }
}
export { apiClient };