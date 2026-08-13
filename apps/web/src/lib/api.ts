import { ApiClient, StaffNowApi } from '@staffnow/api-client';
import { trackError } from '@/lib/track-activity';

const apiClient = new ApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787',
  getToken: async () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('staffnow_token');
  },
  // Κάθε αποτυχημένη κλήση γράφεται στο ιστορικό του χρήστη, ώστε στον πίνακα
  // διαχειριστή να φαίνεται ΤΙ σφάλμα είδε πριν φύγει. Το ίδιο το σφάλμα
  // συνεχίζει κανονικά τον δρόμο του — δεν αλλάζει καμία συμπεριφορά.
  onError: ({ status, message, path, code }) => {
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
export { apiClient };