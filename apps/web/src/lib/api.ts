import { ApiClient, StaffNowApi } from '@staffnow/api-client';

const apiClient = new ApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787',
  getToken: async () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('staffnow_token');
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