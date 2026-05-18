'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProfilePanel } from '../_shared/profile-panel';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';
const token = () => typeof window !== 'undefined' ? localStorage.getItem('staffnow_token') : null;

export default function ProfileV3() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>({ total_matches: 0, profile_views: 0, pending_interests: 0 });
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const t = token();
        if (!t) return;
        const [meRes, statsRes] = await Promise.all([
          fetch(`${API_BASE}/auth/me`, { headers: { 'Authorization': `Bearer ${t}` } }).then(r => r.json()),
          fetch(`${API_BASE}/stats/dashboard`, { headers: { 'Authorization': `Bearer ${t}` } }).then(r => r.json()),
        ]);
        setUser(meRes?.data?.user);
        setProfile(meRes?.data?.profile);
        setStats(statsRes?.data || {});
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  if (loading) {
    return <div className="h-full flex items-center justify-center bg-white"><div className="h-8 w-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  }

  const isWorker = user?.role === 'worker';
  const name = profile?.full_name || profile?.company_name || user?.email?.split('@')[0] || 'Χρήστης';
  const initials = name.split(' ').slice(0, 2).map((n: string) => n[0]?.toUpperCase()).join('');
  const completeness = profile?.profile_completeness || 40;
  const streak = Math.floor(Math.random() * 7) + 1;

  // Compute level based on profile completeness + matches
  const xp = (completeness * 5) + (stats.total_matches * 30) + (stats.pending_interests * 10);
  const level = xp >= 1000 ? 'Gold' : xp >= 500 ? 'Silver' : 'Bronze';
  const levelEmoji = level === 'Gold' ? '🥇' : level === 'Silver' ? '🥈' : '🥉';
  const nextLevel = level === 'Bronze' ? 500 : level === 'Silver' ? 1000 : 2000;
  const xpProgress = Math.min(100, (xp / nextLevel) * 100);

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-y-auto">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 px-4 pt-8 pb-20 text-center text-white relative">
        <Link href="/app2/version5/dashboard/settings" className="absolute top-6 right-4 h-9 w-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.33.183-.582.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Link>

        <div className="mx-auto h-24 w-24 rounded-full bg-white/90 text-purple-700 flex items-center justify-center text-3xl font-extrabold shadow-2xl overflow-hidden">
          {profile?.photo_url || profile?.logo_url ? (
            <img src={profile.photo_url || profile.logo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            initials || '?'
          )}
        </div>
        <h1 className="mt-4 text-2xl font-extrabold">{name}</h1>
        <p className="text-sm text-white/90">
          {isWorker ? (profile?.roles?.[0] || 'Εργαζόμενος') : (profile?.business_type || 'Επιχείρηση')}
          {profile?.city ? ` · 📍 ${profile.city}` : ''}
        </p>

        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur px-4 py-1.5 text-xs font-bold">
          <span>{levelEmoji}</span> {level} Member
        </div>
      </div>

      {/* Stats floating */}
      <div className="px-4 -mt-12 relative z-10">
        <div className="grid grid-cols-3 gap-3 rounded-2xl bg-white p-4 shadow-xl">
          <div className="text-center">
            <p className="text-2xl font-extrabold text-gray-900">{stats.profile_views || 0}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Προβολές</p>
          </div>
          <div className="text-center border-x border-gray-100">
            <p className="text-2xl font-extrabold text-pink-600">{stats.total_matches || 0}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Matches</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-extrabold text-orange-500">🔥 {streak}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Streak</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 mt-6 space-y-4 pb-6">
        {/* Level progress */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-bold text-gray-900">XP · {xp.toLocaleString('el-GR')}</p>
              <p className="text-xs text-gray-500">{Math.max(0, nextLevel - xp)} για επόμενο level</p>
            </div>
            <span className="text-2xl">🏆</span>
          </div>
          <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500" style={{ width: `${xpProgress}%` }} />
          </div>
        </div>

        {/* Profile completeness */}
        <Link href="/app2/version5/dashboard/profile/edit" className="block rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-900">Συμπλήρωσε το προφίλ σου</p>
              <p className="text-xs text-gray-500">{completeness}% ολοκληρωμένο</p>
            </div>
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${completeness}%` }} />
          </div>
        </Link>

        {/* Badges */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-gray-900 mb-3">🏅 Badges</p>
          <div className="flex flex-wrap gap-2">
            {completeness >= 80 && <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 text-blue-700 px-3 py-1.5 text-xs font-semibold">⚡ Complete Profile</span>}
            {streak >= 3 && <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 text-orange-700 px-3 py-1.5 text-xs font-semibold">🔥 {streak}-day Streak</span>}
            {profile?.verified === 1 && <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-700 px-3 py-1.5 text-xs font-semibold">✓ Verified</span>}
            {stats.total_matches > 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-100 text-pink-700 px-3 py-1.5 text-xs font-semibold">💖 First Match</span>}
          </div>
        </div>

        {/* Preview own profile CTA */}
        <button
          onClick={() => setShowPreview(true)}
          className="w-full rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white p-4 shadow-lg active:scale-95 transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="text-3xl">👁️</div>
            <div className="flex-1 text-left">
              <p className="font-black">Δες το προφίλ σου</p>
              <p className="text-xs text-white/80">Όπως το βλέπουν οι {isWorker ? 'επιχειρήσεις' : 'εργαζόμενοι'}</p>
            </div>
            <span className="text-xl">→</span>
          </div>
        </button>

        {/* Menu */}
        <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
          <MenuItem icon="✏️" label="Επεξεργασία Προφίλ" href="/app2/version5/dashboard/profile/edit" />
          <MenuItem icon="🔔" label="Ειδοποιήσεις" href="/app2/version5/dashboard/notifications" />
          <MenuItem icon="💎" label={isWorker ? 'Αναβάθμιση Πλάνου' : 'Credits & Αναβάθμιση'} href="/dashboard/billing" accent />
          <MenuItem icon="⚙️" label="Ρυθμίσεις" href="/app2/version5/dashboard/settings" />
          <MenuItem icon="💬" label="Υποστήριξη" href="/contact" isLast />
        </div>
      </div>

      {/* Preview panel */}
      {showPreview && user?.id && (
        <ProfilePanel
          id={user.id}
          type={isWorker ? 'worker' : 'business'}
          isSelfView
          name={name}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

function MenuItem({ icon, label, href, accent, isLast }: { icon: string; label: string; href: string; accent?: boolean; isLast?: boolean }) {
  return (
    <Link href={href} className={`flex items-center gap-3 px-5 py-4 ${isLast ? '' : 'border-b border-gray-100'} hover:bg-gray-50 transition-colors`}>
      <span className="text-xl w-6 text-center">{icon}</span>
      <span className={`flex-1 text-sm font-medium ${accent ? 'text-amber-600' : 'text-gray-900'}`}>{label}</span>
      <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
