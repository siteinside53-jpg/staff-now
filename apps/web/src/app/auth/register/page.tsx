'use client';

import { useEffect } from 'react';

/**
 * Legacy /auth/register route.
 *
 * Registration is now a popup modal overlaid on the marketing landing page.
 * Direct visits to this URL redirect to `/?register=1`, which the landing page
 * picks up to auto-open the auth modal in register mode.
 */
export default function LegacyRegisterRedirect() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Preserve ?role=worker/business if present
      const url = new URL(window.location.href);
      const role = url.searchParams.get('role');
      const target = role ? `/?register=1&role=${role}` : '/?register=1';
      window.location.replace(target);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
        <p className="mt-4 text-sm font-medium">Άνοιγμα εγγραφής...</p>
      </div>
    </div>
  );
}
