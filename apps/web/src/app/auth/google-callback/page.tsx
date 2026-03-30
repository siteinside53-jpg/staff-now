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
      window.location.href = '/dashboard';
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
