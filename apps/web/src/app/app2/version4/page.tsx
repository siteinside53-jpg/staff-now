'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';

export default function SplashV4() {
  const [stats, setStats] = useState({ users: 0, jobs: 0, matches: 0 });
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Auto-check auth and redirect if logged in
    const token = localStorage.getItem('staffnow_token');
    if (token) {
      fetch(`${API_BASE}/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          if (data?.data?.user?.role === 'admin') window.location.href = '/admin';
          else if (data?.data?.user) window.location.href = '/app2/version4/dashboard';
        })
        .catch(() => {});
    }

    // Fetch real stats for the splash
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
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#060B1F]">
      {/* Animated background blobs */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#060B1F] via-[#0C1333] to-[#111839]" />
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-blue-600/30 blur-[120px]" style={{ animation: 'blob1 12s ease-in-out infinite' }} />
      <div className="absolute top-1/3 -right-20 w-[400px] h-[400px] rounded-full bg-purple-500/25 blur-[100px]" style={{ animation: 'blob2 15s ease-in-out infinite' }} />
      <div className="absolute -bottom-20 left-1/3 w-[450px] h-[450px] rounded-full bg-cyan-500/20 blur-[110px]" style={{ animation: 'blob3 18s ease-in-out infinite' }} />

      <div className="relative flex-1 flex flex-col items-center justify-center text-white px-6 py-8 overflow-y-auto">
        <div className={`transition-all duration-700 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Logo */}
          <div className="text-center">
            <div className="mx-auto h-24 w-24 rounded-[28px] bg-gradient-to-br from-blue-500 to-indigo-600 shadow-2xl shadow-blue-500/30 flex items-center justify-center text-5xl">
              💼
            </div>
            <h1 className="mt-6 text-5xl font-black tracking-tight">
              Staff<span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Now</span>
            </h1>
            <p className="mt-2 text-base text-blue-200/80 font-medium">Swipe, match, ξεκίνα.</p>
          </div>

          {/* Live badge */}
          <div className="mt-8 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-400/30 backdrop-blur px-4 py-2 text-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">LIVE</span>
              <span className="text-emerald-300 font-semibold">
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

          {/* CTA */}
          <div className="mt-12 space-y-3 max-w-md mx-auto w-full">
            <Link
              href="/app2/version4/role"
              className="block w-full rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 py-4 text-base font-bold text-white shadow-xl shadow-blue-500/30 text-center active:scale-95 transition-transform"
            >
              Ξεκίνα Τώρα →
            </Link>
            <Link
              href="/app2/version4/login"
              className="block w-full rounded-2xl border border-white/20 bg-white/5 backdrop-blur py-3.5 text-sm font-semibold text-white text-center hover:bg-white/10 transition-colors"
            >
              Έχω ήδη λογαριασμό
            </Link>
          </div>

          {/* Tagline */}
          <p className="mt-8 text-center text-xs text-white/40">
            Δωρεάν εγγραφή · Χωρίς κάρτα · Ξεκίνα σε 30 δευτερόλεπτα
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob1 { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(60px,40px) scale(1.1); } 66% { transform: translate(-30px,60px) scale(0.95); } }
        @keyframes blob2 { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(-50px,-30px) scale(1.05); } 66% { transform: translate(40px,-50px) scale(0.9); } }
        @keyframes blob3 { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(40px,-40px) scale(1.08); } 66% { transform: translate(-60px,20px) scale(0.92); } }
      `}</style>
    </div>
  );
}

function StatBox({ label, value, suffix, color }: { label: string; value: number; suffix: string; color: string }) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-3 text-center">
      <p className={`text-2xl font-extrabold tabular-nums bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
        <AnimatedNumber value={value} />{suffix}
      </p>
      <p className="mt-1 text-[10px] text-white/50 font-medium">{label}</p>
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
