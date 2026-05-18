'use client';

import { useEffect } from 'react';

/**
 * Legacy /auth/login route.
 *
 * Login is now a popup modal overlaid on the marketing landing page.
 * Direct visits to this URL redirect to `/?login=1`, which the landing page
 * picks up to auto-open the login modal. Keeps bookmarks / old links working.
 */
export default function LegacyLoginRedirect() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.location.replace('/?login=1');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
        <p className="mt-4 text-sm font-medium">Άνοιγμα σύνδεσης...</p>
      </div>
    </div>
  );
}
