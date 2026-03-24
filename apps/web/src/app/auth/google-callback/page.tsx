'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function GoogleCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      router.push(`/auth/login?error=${error}`);
      return;
    }

    if (token) {
      // Save token and do full page reload so AuthProvider picks it up
      localStorage.setItem('staffnow_token', token);
      window.location.href = '/dashboard';
    } else {
      window.location.href = '/auth/login?error=no_token';
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <p className="mt-4 text-gray-600">Σύνδεση μέσω Google...</p>
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><p>Φόρτωση...</p></div>}>
      <GoogleCallbackInner />
    </Suspense>
  );
}
