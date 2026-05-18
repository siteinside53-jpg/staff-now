'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function AppEntryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [phase, setPhase] = useState<'splash' | 'role'>('splash');

  // If already logged in, go to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  // Splash → role after 2.5s
  useEffect(() => {
    const t = setTimeout(() => setPhase('role'), 2500);
    return () => clearTimeout(t);
  }, []);

  if (loading) return null;
  if (user) return null;

  // ==================== SCREEN 1: SPLASH — only logo + tagline ====================
  if (phase === 'splash') {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#0A0F2E]">
        {/* Logo */}
        <div className="animate-in zoom-in-50 duration-700">
          <img src="/staffnow-logo.png" alt="StaffNow" className="h-28 w-28 rounded-full shadow-2xl" />
        </div>

        {/* Brand name */}
        <div className="mt-5 animate-in fade-in duration-1000 delay-300">
          <p className="text-3xl font-extrabold text-white text-center">
            Staff<span className="text-blue-400">Now</span>
          </p>
        </div>

        {/* Tagline */}
        <p className="mt-4 animate-in fade-in duration-1000 delay-700 text-center text-sm text-blue-200/60 max-w-[260px] leading-relaxed">
          Το έξυπνο εργαλείο για γρήγορη εύρεση εργασίας και προσωπικού.
        </p>
      </div>
    );
  }

  // ==================== SCREEN 2: ROLE SELECTOR — WHITE background ====================
  return (
    <div className="fixed inset-0 flex flex-col bg-white animate-in fade-in duration-500">
      {/* Top: Logo + brand */}
      <div className="flex flex-col items-center pt-16 pb-6 px-6">
        <img src="/staffnow-logo.png" alt="StaffNow" className="h-16 w-16 rounded-full shadow-lg" />
        <p className="mt-3 text-xl font-extrabold text-gray-900">
          Staff<span className="text-blue-600">Now</span>
        </p>
        <h1 className="mt-8 text-2xl font-extrabold text-gray-900 text-center">
          Καλωσήρθες!
        </h1>
        <p className="mt-2 text-sm text-gray-500 text-center">
          Επίλεξε τον ρόλο σου για να συνεχίσεις.
        </p>
      </div>

      {/* Two cards side by side */}
      <div className="flex-1 flex items-start justify-center px-5 pt-4">
        <div className="grid grid-cols-2 gap-4 w-full max-w-md">
          {/* LEFT: Εργαζόμενος */}
          <button
            onClick={() => {
              localStorage.setItem('staffnow_guest_role', 'worker');
              router.push('/app/browse?role=worker');
            }}
            className="flex flex-col items-center rounded-3xl border-2 border-gray-200 bg-white p-6 text-center transition-all hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10 active:scale-[0.96] shadow-sm"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-3xl shadow-lg mb-4">
              👤
            </div>
            <p className="text-base font-bold text-gray-900">Είμαι<br />Εργαζόμενος</p>
            <p className="mt-2 text-[11px] text-gray-400 leading-snug">Βρες εργασία<br />γρήγορα</p>
          </button>

          {/* RIGHT: Επιχείρηση */}
          <button
            onClick={() => {
              localStorage.setItem('staffnow_guest_role', 'business');
              router.push('/app/browse?role=business');
            }}
            className="flex flex-col items-center rounded-3xl border-2 border-gray-200 bg-white p-6 text-center transition-all hover:border-purple-400 hover:shadow-lg hover:shadow-purple-500/10 active:scale-[0.96] shadow-sm"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-3xl shadow-lg mb-4">
              🏢
            </div>
            <p className="text-base font-bold text-gray-900">Είμαι<br />Επιχείρηση</p>
            <p className="mt-2 text-[11px] text-gray-400 leading-snug">Βρες προσωπικό<br />εύκολα</p>
          </button>
        </div>
      </div>

      {/* Bottom: already have account */}
      <div className="pb-10 text-center">
        <button
          onClick={() => router.push('/?login=1')}
          className="text-sm font-semibold text-gray-400 hover:text-blue-600"
        >
          Έχω ήδη λογαριασμό → <span className="underline">Σύνδεση</span>
        </button>
      </div>
    </div>
  );
}
