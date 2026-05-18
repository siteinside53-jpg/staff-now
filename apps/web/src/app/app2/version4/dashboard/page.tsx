'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';
const token = () => typeof window !== 'undefined' ? localStorage.getItem('staffnow_token') : null;

export default function DashHome() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const t = token();
        if (!t) return;
        const [me, st, act] = await Promise.all([
          fetch(`${API_BASE}/auth/me`, { headers: { 'Authorization': `Bearer ${t}` } }).then(r => r.json()),
          fetch(`${API_BASE}/stats/dashboard`, { headers: { 'Authorization': `Bearer ${t}` } }).then(r => r.json()),
          fetch(`${API_BASE}/public/activity`).then(r => r.json()),
        ]);
        setUser(me?.data?.user);
        setProfile(me?.data?.profile);
        setStats(st?.data || {});
        const raw = act?.data?.activity || [];
        setActivity(raw.slice(0, 5).map((a: any) => {
          const loc = a.location ? ` · ${a.location}` : '';
          return a.type === 'signup' ? `🟢 ${a.text}${loc}` : `💼 ${a.text}${loc}`;
        }));
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  if (loading) {
    return <div className="h-full flex items-center justify-center"><div className="h-8 w-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  }

  const isWorker = user?.role === 'worker';
  const name = (profile?.full_name || profile?.company_name || user?.email?.split('@')[0] || 'Χρήστης').split(' ')[0];
  const completeness = profile?.profile_completeness || 30;
  const hasProfile = isWorker ? !!profile?.full_name : !!profile?.company_name;

  const steps = isWorker
    ? [
        { done: hasProfile, label: 'Δημιουργία προφίλ', href: '/app2/version4/dashboard/profile/edit', icon: '👤' },
        { done: (stats.pending_interests || 0) > 0 || (stats.total_matches || 0) > 0, label: 'Κάνε swipe σε θέσεις', href: '/app2/version4/dashboard/swipe', icon: '🎯' },
        { done: (stats.total_matches || 0) > 0, label: 'Αναμονή για match', href: '/app2/version4/dashboard/matches', icon: '💖' },
        { done: false, label: 'Στείλε μήνυμα', href: '/app2/version4/dashboard/chat', icon: '💬' },
      ]
    : [
        { done: hasProfile, label: 'Δημιουργία προφίλ επιχείρησης', href: '/app2/version4/dashboard/profile/edit', icon: '🏢' },
        { done: (stats.active_jobs || 0) > 0, label: 'Δημοσίευση αγγελίας', href: '/app2/version4/dashboard/jobs', icon: '📋' },
        { done: (stats.pending_interests || 0) > 0 || (stats.total_matches || 0) > 0, label: 'Βρες προσωπικό', href: '/app2/version4/dashboard/swipe', icon: '🔍' },
        { done: (stats.total_matches || 0) > 0, label: 'Matches', href: '/app2/version4/dashboard/chat', icon: '💖' },
      ];

  const completedCount = steps.filter((s) => s.done).length;
  const nextStep = steps.find((s) => !s.done);

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-y-auto">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-700 text-white px-4 pt-6 pb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/70 font-medium">Καλώς ήρθες πίσω</p>
            <h1 className="text-2xl font-black">{name} 👋</h1>
          </div>
          <Link href="/app2/version4/dashboard/notifications" className="relative h-10 w-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
            <span className="text-xl">🔔</span>
            {(stats.unread_messages || 0) > 0 && <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />}
          </Link>
        </div>

        {nextStep && (
          <p className="mt-2 text-sm text-white/90">
            📋 Επόμενο βήμα: <span className="font-bold">{nextStep.label}</span>
          </p>
        )}
      </div>

      {/* Stats grid */}
      <div className="px-4 -mt-4 relative z-10">
        <div className="grid grid-cols-4 gap-2 rounded-2xl bg-white p-3 shadow-xl">
          <StatCard icon="💖" value={stats.total_matches || 0} label="Matches" color="text-pink-600" />
          <StatCard icon="💬" value={stats.unread_messages || 0} label="Νέα" color="text-emerald-600" />
          <StatCard icon="👁️" value={stats.profile_views || 0} label="Views" color="text-blue-600" />
          <StatCard icon="❤️" value={stats.pending_interests || 0} label="Interests" color="text-amber-600" />
        </div>
      </div>

      <div className="px-4 mt-5 space-y-4 pb-4">
        {/* Onboarding checklist */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-bold text-gray-900">📋 Τα βήματά σου</p>
              <p className="text-xs text-gray-500">Ακολούθησε για να ξεκινήσεις</p>
            </div>
            <span className="text-xs font-bold text-gray-600">{completedCount}/{steps.length}</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mb-3">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(completedCount / steps.length) * 100}%` }} />
          </div>
          <div className="space-y-2">
            {steps.map((step, i) => {
              const isNext = !step.done && steps.slice(0, i).every((s) => s.done);
              return (
                <Link key={i} href={step.href} className={`flex items-center gap-3 p-2.5 rounded-xl ${
                  step.done ? 'bg-emerald-50' : isNext ? 'bg-blue-50 ring-2 ring-blue-300' : 'bg-gray-50'
                }`}>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    step.done ? 'bg-emerald-500 text-white' : isNext ? 'bg-blue-600 text-white' : 'bg-gray-300 text-white'
                  }`}>
                    {step.done ? '✓' : step.icon}
                  </div>
                  <p className={`flex-1 text-sm font-semibold ${step.done ? 'text-emerald-700 line-through' : isNext ? 'text-blue-900' : 'text-gray-500'}`}>
                    {step.label}
                  </p>
                  {!step.done && <span className={`text-xs ${isNext ? 'text-blue-600' : 'text-gray-300'}`}>→</span>}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Profile completeness */}
        {completeness < 100 && (
          <Link href="/app2/version4/dashboard/profile/edit" className="block rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-200 p-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl">✨</div>
              <div className="flex-1">
                <p className="font-bold text-amber-900">Ολοκλήρωσε το προφίλ σου</p>
                <p className="text-xs text-amber-700">{completeness}% — Κέρδισε περισσότερα matches</p>
              </div>
              <span className="text-amber-700">→</span>
            </div>
          </Link>
        )}

        {/* Big CTA */}
        <Link
          href="/app2/version4/dashboard/swipe"
          className={`block rounded-3xl ${isWorker ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-purple-500 to-pink-600'} text-white p-5 shadow-xl active:scale-[0.98] transition-transform`}
        >
          <div className="flex items-center gap-4">
            <div className="text-4xl">{isWorker ? '🎯' : '🔍'}</div>
            <div className="flex-1">
              <p className="text-lg font-black">{isWorker ? 'Swipe σε θέσεις' : 'Βρες προσωπικό'}</p>
              <p className="text-xs text-white/80">{isWorker ? 'Εκατοντάδες νέες θέσεις σε περιμένουν' : 'Χιλιάδες verified εργαζόμενοι'}</p>
            </div>
            <span className="text-2xl">→</span>
          </div>
        </Link>

        {/* Live activity feed */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-gray-900">⚡ Τι γίνεται τώρα</p>
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE
            </span>
          </div>
          <div className="space-y-2.5">
            {activity.length > 0 ? (
              activity.map((a, i) => (
                <div key={i} className="text-xs text-gray-600 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  <span className="truncate">{a}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400">Καμία δραστηριότητα</p>
            )}
          </div>
        </div>

        {/* Shortcuts */}
        <div className="grid grid-cols-2 gap-2">
          <Link href="/app2/version4/dashboard/profile" className="rounded-2xl bg-white p-4 shadow-sm text-center active:scale-95 transition-transform">
            <div className="text-2xl mb-1">👤</div>
            <p className="text-xs font-bold text-gray-900">Το προφίλ μου</p>
          </Link>
          <Link href="/app2/version4/dashboard/settings" className="rounded-2xl bg-white p-4 shadow-sm text-center active:scale-95 transition-transform">
            <div className="text-2xl mb-1">⚙️</div>
            <p className="text-xs font-bold text-gray-900">Ρυθμίσεις</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, color }: { icon: string; value: number; label: string; color: string }) {
  return (
    <div className="text-center">
      <div className="text-base mb-0.5">{icon}</div>
      <p className={`text-lg font-black ${color} tabular-nums`}>{value}</p>
      <p className="text-[9px] text-gray-500 font-medium">{label}</p>
    </div>
  );
}
