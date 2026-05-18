'use client';

import Link from 'next/link';

export default function ProfilePage() {
  // Fake data — hookup to real API later
  const profile = {
    name: 'Ευγένιος Αφεντουλίδης',
    role: 'Σερβιτόρος',
    city: 'Θεσσαλονίκη',
    initials: 'ΕΑ',
    views: 47,
    matches: 3,
    streak: 5,
    completeness: 80,
    level: 'Silver',
    nextLevel: 'Gold',
    xpCurrent: 720,
    xpNext: 1000,
    badges: [
      { icon: '⚡', label: 'Quick Responder', color: 'bg-blue-100 text-blue-700' },
      { icon: '🔥', label: '5-day Streak', color: 'bg-orange-100 text-orange-700' },
      { icon: '✓', label: 'Επαληθευμένος', color: 'bg-emerald-100 text-emerald-700' },
    ],
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-y-auto">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 px-4 pt-8 pb-20 text-center text-white relative">
        <div className="mx-auto h-24 w-24 rounded-full bg-white/90 text-purple-700 flex items-center justify-center text-3xl font-extrabold shadow-2xl">
          {profile.initials}
        </div>
        <h1 className="mt-4 text-2xl font-extrabold">{profile.name}</h1>
        <p className="text-sm text-white/90">{profile.role} · 📍 {profile.city}</p>

        {/* Level badge */}
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur px-4 py-1.5 text-xs font-bold">
          <span>⭐</span> {profile.level} Member
        </div>
      </div>

      {/* Stats row - floating above gradient */}
      <div className="px-4 -mt-12 relative z-10">
        <div className="grid grid-cols-3 gap-3 rounded-2xl bg-white p-4 shadow-xl">
          <div className="text-center">
            <p className="text-2xl font-extrabold text-gray-900">{profile.views}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Προβολές</p>
          </div>
          <div className="text-center border-x border-gray-100">
            <p className="text-2xl font-extrabold text-pink-600">{profile.matches}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Matches</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-extrabold text-orange-500">🔥 {profile.streak}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Streak</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 mt-6 space-y-4 pb-4">
        {/* Progress to next level */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-bold text-gray-900">Προς {profile.nextLevel} ⭐⭐</p>
              <p className="text-xs text-gray-500">{profile.xpCurrent}/{profile.xpNext} XP</p>
            </div>
            <span className="text-2xl">🏆</span>
          </div>
          <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
              style={{ width: `${(profile.xpCurrent / profile.xpNext) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-gray-500">+280 XP για να ανοίξεις unlimited swipes</p>
        </div>

        {/* Profile completeness */}
        <Link href="/dashboard/profile" className="block rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-900">Συμπλήρωσε το προφίλ σου</p>
              <p className="text-xs text-gray-500">{profile.completeness}% ολοκληρωμένο</p>
            </div>
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${profile.completeness}%` }} />
          </div>
        </Link>

        {/* Badges */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-gray-900 mb-3">🏅 Badges</p>
          <div className="flex flex-wrap gap-2">
            {profile.badges.map((b) => (
              <span key={b.label} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${b.color}`}>
                <span>{b.icon}</span> {b.label}
              </span>
            ))}
          </div>
        </div>

        {/* Menu items */}
        <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
          <MenuItem icon="✏️" label="Επεξεργασία Προφίλ" href="/dashboard/profile" />
          <MenuItem icon="💎" label="Αναβάθμιση σε Gold" href="/dashboard/billing" accent />
          <MenuItem icon="🔔" label="Ειδοποιήσεις" href="/dashboard/settings" />
          <MenuItem icon="⚙️" label="Ρυθμίσεις" href="/dashboard/settings" />
          <MenuItem icon="💬" label="Υποστήριξη" href="/contact" />
          <MenuItem icon="🚪" label="Αποσύνδεση" href="/" isLast />
        </div>
      </div>
    </div>
  );
}

function MenuItem({ icon, label, href, accent, isLast }: { icon: string; label: string; href: string; accent?: boolean; isLast?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-5 py-4 ${isLast ? '' : 'border-b border-gray-100'} hover:bg-gray-50 transition-colors`}
    >
      <span className="text-xl w-6 text-center">{icon}</span>
      <span className={`flex-1 text-sm font-medium ${accent ? 'text-amber-600' : 'text-gray-900'}`}>{label}</span>
      <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
