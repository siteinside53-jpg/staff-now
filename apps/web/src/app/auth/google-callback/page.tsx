'use client';

import { useEffect } from 'react';

export default function GoogleCallbackPage() {
  useEffect(() => {
    // Read token from URL hash (#token=xxx) or query param (?token=xxx)
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash || window.location.search);
    const token = params.get('token');
    const error = params.get('error');

    if (error) {
      window.location.href = `/auth/login?error=${error}`;
      return;
    }

    if (token) {
      localStorage.setItem('staffnow_token', token);
      // Check for a custom return_to (e.g. user came from /app2/version5)
      let returnTo: string | null = null;
      try {
        returnTo = sessionStorage.getItem('staffnow_return_to');
        if (returnTo) sessionStorage.removeItem('staffnow_return_to');
      } catch {}

      // Check role before redirecting
      (async () => {
        try {
          const API = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';
          const res = await fetch(`${API}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          const data = await res.json() as any;
          const role = data?.data?.user?.role;
          if (role === 'admin') {
            window.location.href = '/admin';
          } else if (returnTo && returnTo.startsWith('/')) {
            // Safe: only same-origin paths
            window.location.href = returnTo;
          } else {
            window.location.href = '/dashboard';
          }
        } catch {
          window.location.href = returnTo && returnTo.startsWith('/') ? returnTo : '/dashboard';
        }
      })();
    } else {
      window.location.href = '/auth/login?error=no_token';
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <p className="mt-4 text-gray-600">Σύνδεση μέσω Google...</p>
      </div>
    </div>
  );
}
