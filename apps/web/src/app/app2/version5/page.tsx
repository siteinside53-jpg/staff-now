'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';

export default function SplashV4() {
  const [stats, setStats] = useState({ users: 0, jobs: 0, matches: 0 });
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Auto-check auth and redirect if logged in (non-blocking; CTAs are
    // plain <a> tags below so taps respond instantly even while this runs).
    const token = localStorage.getItem('staffnow_token');
    if (token) {
      const ac = new AbortController();
      fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: ac.signal,
      })
        .then(r => r.json())
        .then(data => {
          if (data?.data?.user?.role === 'admin') window.location.href = '/admin';
          else if (data?.data?.user) window.location.href = '/app2/version5/dashboard';
        })
        .catch(() => {});
      const t = setTimeout(() => ac.abort(), 4000);
      // continues — also kicks off the stats fetch below
    }

    fetch(`${API_BASE}/public/activity`)
      .then(r => r.json())
      .then(d => setStats({
        users: d?.data?.stats?.totalUsers || 50000,
        jobs: d?.data?.stats?.totalJobs || 5500,
        matches: d?.data?.stats?.totalMatches || 12000,
      }))
      .catch(() => setStats({ users: 50000, jobs: 5500, matches: 12000 }));

    setTimeout(() => setShow(true), 100);
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-white">
      {/* Soft pastel blobs on a white background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-blue-50 to-indigo-50" />
      <div data-blob="1" className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-blue-300/40 blur-[120px] pointer-events-none" style={{ animation: 'blob1 12s ease-in-out infinite' }} />
      <div data-blob="2" className="absolute top-1/3 -right-20 w-[400px] h-[400px] rounded-full bg-cyan-200/50 blur-[100px] pointer-events-none" style={{ animation: 'blob2 15s ease-in-out infinite' }} />
      <div data-blob="3" className="absolute -bottom-20 left-1/3 w-[450px] h-[450px] rounded-full bg-indigo-200/40 blur-[110px] pointer-events-none" style={{ animation: 'blob3 18s ease-in-out infinite' }} />

      <div className="relative flex-1 flex flex-col items-center justify-center text-gray-900 px-6 py-8 overflow-y-auto">
        <div className={`transition-all duration-700 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Logo */}
          <div className="text-center">
            <div className="mx-auto h-24 w-24 drop-shadow-[0_10px_30px_rgba(59,130,246,0.45)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/staffnow-logo.png" alt="StaffNow" className="h-24 w-24 object-contain" />
            </div>
            <h1 className="mt-6 text-5xl font-black tracking-tight">
              {/* Staff = black, Now = brand blue (per request) */}
              <span style={{ color: '#000000' }}>Staff</span><span style={{ color: '#3B82F6' }}>Now</span>
            </h1>
            <p className="mt-2 text-base text-gray-600 font-medium">Swipe, match, ξεκίνα.</p>
          </div>

          {/* Live badge */}
          <div className="mt-8 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">LIVE</span>
              <span className="text-emerald-700 font-semibold">
                <AnimatedNumber value={Math.floor(stats.users / 50)} /> online τώρα
              </span>
            </span>
          </div>

          {/* Big stats */}
          <div className="mt-10 grid grid-cols-3 gap-3 max-w-md">
            <StatBox label="Εργαζόμενοι" value={stats.users} suffix="+" color="from-blue-400 to-cyan-400" />
            <StatBox label="Επιχειρήσεις" value={stats.jobs} suffix="+" color="from-pink-400 to-rose-400" />
            <StatBox label="Matches" value={stats.matches} suffix="+" color="from-emerald-400 to-teal-400" />
          </div>

          {/* CTAs — Next.js Link prefetches the destination so taps trigger
              instant client-side navigation (no full reload). */}
          <div className="mt-12 space-y-3 max-w-md mx-auto w-full">
            <Link
              href="/app2/version5/role"
              className="block w-full rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 py-4 text-base font-bold text-white shadow-xl shadow-blue-500/30 text-center active:scale-95 transition-transform"
            >
              Ξεκίνα Τώρα →
            </Link>
            <Link
              href="/app2/version5/login"
              className="block w-full rounded-2xl border-2 border-gray-200 bg-white py-3.5 text-sm font-semibold text-gray-700 text-center hover:bg-gray-50 transition-colors"
            >
              Έχω ήδη λογαριασμό
            </Link>
          </div>

          {/* Tagline */}
          <p className="mt-8 text-center text-xs text-gray-500">
            Δωρεάν εγγραφή · Χωρίς κάρτα · Ξεκίνα σε 30 δευτερόλεπτα
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob1 { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(60px,40px) scale(1.1); } 66% { transform: translate(-30px,60px) scale(0.95); } }
        @keyframes blob2 { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(-50px,-30px) scale(1.05); } 66% { transform: translate(40px,-50px) scale(0.9); } }
        @keyframes blob3 { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(40px,-40px) scale(1.08); } 66% { transform: translate(-60px,20px) scale(0.92); } }

        /*
         * Safari (and Chromium on macOS) chokes on the heavy blur+animate combo
         * for these large soft blobs — visible as input lag/jank on desktop.
         * On screens wider than 768 px or when the user prefers reduced motion,
         * stop the animations (the blobs stay visible as static gradients).
         */
        @media (min-width: 768px), (prefers-reduced-motion: reduce) {
          :global([data-blob]) { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

function StatBox({ label, value, suffix, color }: { label: string; value: number; suffix: string; color: string }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-3 text-center">
      <p className={`text-2xl font-extrabold tabular-nums bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
        <AnimatedNumber value={value} />{suffix}
      </p>
      <p className="mt-1 text-[10px] text-gray-500 font-medium">{label}</p>
    </div>
  );
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const step = Math.max(1, Math.floor(value / 40));
    let current = 0;
    const id = setInterval(() => {
      current = Math.min(value, current + step);
      setDisplay(current);
      if (current >= value) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [value]);
  return <>{display.toLocaleString('el-GR')}</>;
}
