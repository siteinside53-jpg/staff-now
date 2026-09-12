'use client';

import { useEffect } from 'react';
import { useT } from '@/i18n/locale-provider';

/**
 * Legacy /auth/login route.
 *
 * Login is now a popup modal overlaid on the marketing landing page.
 * Direct visits to this URL redirect to `/?login=1`, which the landing page
 * picks up to auto-open the login modal. Keeps bookmarks / old links working.
 */
export default function LegacyLoginRedirect() {
  const t = useT();
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Κρατάμε το ?error= (π.χ. από τη σύνδεση Google) για να το δείξει το παράθυρο.
      const err = new URL(window.location.href).searchParams.get('error');
      window.location.replace(err ? `/?login=1&error=${encodeURIComponent(err)}` : '/?login=1');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
        <p className="mt-4 text-sm font-medium">{t('authPages.loginRedirect.opening')}</p>
      </div>
    </div>
  );
}
