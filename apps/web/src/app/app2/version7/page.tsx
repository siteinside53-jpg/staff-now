'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, getToken } from './_lib/api';

export default function V7Splash() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!getToken()) {
        if (!cancelled) setChecking(false);
        return;
      }
      try {
        const me = await auth.me();
        if (cancelled) return;
        const path =
          me.user.role === 'business'
            ? '/app2/version7/business/home'
            : '/app2/version7/worker/home';
        router.replace(path);
      } catch {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (checking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 text-white">
        <div className="flex flex-col items-center gap-3">
          <span className="h-10 w-10 rounded-full border-[3px] border-white/30 border-t-white animate-spin" />
          <p className="text-sm font-semibold">StaffNow</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 text-white overflow-hidden">
      <div
        className="flex-1 flex flex-col items-center justify-center px-8 text-center"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="text-7xl mb-4">⚡</div>
        <h1 className="text-5xl font-black tracking-tight">
          <span>Staff</span>
          <span className="text-cyan-300">Now</span>
        </h1>
        <p className="mt-4 max-w-xs text-base text-white/90">
          Βρες δουλειά ή προσωπικό σε λίγα λεπτά.<br />Swipe, ταίριαξε, ξεκίνα.
        </p>

        <div className="mt-12 w-full max-w-xs space-y-3">
          <Link
            href="/app2/version7/login?mode=signup"
            className="block w-full rounded-full bg-white px-6 py-3.5 text-center text-base font-bold text-blue-700 shadow-xl active:scale-[0.98] transition-transform"
          >
            Ξεκίνα δωρεάν
          </Link>
          <Link
            href="/app2/version7/login"
            className="block w-full rounded-full border-2 border-white/40 px-6 py-3 text-center text-sm font-semibold text-white"
          >
            Έχω ήδη λογαριασμό
          </Link>
        </div>

        <p className="mt-8 text-[11px] text-white/70 max-w-xs">
          Συνεχίζοντας, αποδέχεσαι τους <Link href="/terms" className="underline">Όρους</Link> και την{' '}
          <Link href="/privacy" className="underline">Πολιτική Απορρήτου</Link>.
        </p>
      </div>
    </div>
  );
}
