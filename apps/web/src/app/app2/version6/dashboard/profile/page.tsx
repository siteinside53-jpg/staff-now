'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, clearToken } from '../../_lib/api';
import { Avatar, FullPageSpinner, Pill, VerifiedBadge } from '../../_lib/ui';
import { useUser } from '../../_lib/use-user';
import { businessTypeLabel, roleLabel } from '../../_lib/format';
import { haptic } from '../../_lib/haptics';

export default function ProfileV6() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [profile, setProfile] = useState<any | null>(null);

  useEffect(() => {
    if (!user) return;
    auth.me().then((d) => setProfile(d.profile)).catch(() => setProfile({}));
  }, [user]);

  if (loading || !user) return <FullPageSpinner />;

  const isWorker = user.role === 'worker';
  const name =
    profile?.full_name || profile?.company_name || user.display_name || user.email?.split('@')[0];
  const photo = profile?.photo_url || profile?.logo_url || user.avatar_url;
  const verified = profile?.verified === 1;

  const completeness = computeCompleteness(profile, isWorker);

  const logout = async () => {
    if (!confirm('Σίγουρα θέλεις να αποσυνδεθείς;')) return;
    haptic('warning');
    await auth.logout();
    clearToken();
    router.replace('/app2/version6/login');
  };

  return (
    <div className="pb-8">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-blue-600 via-indigo-700 to-blue-800 px-4 pt-6 pb-12 text-white">
        <div className="flex flex-col items-center text-center">
          <Avatar src={photo} name={name} size="xl" ring />
          <div className="mt-3 flex items-center gap-1.5">
            <h1 className="text-xl font-black">{name}</h1>
            {verified && <VerifiedBadge className="h-5 w-5" />}
          </div>
          <p className="text-sm text-white/80">
            {isWorker ? roleLabel(profile?.roles?.[0]) || 'Εργαζόμενος' : businessTypeLabel(profile?.business_type) || 'Επιχείρηση'}
            {profile?.city ? ` · ${profile.city}` : ''}
          </p>

          {/* Completeness ring */}
          <div className="mt-5 w-full max-w-xs rounded-2xl bg-white/15 backdrop-blur p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">Πληρότητα προφίλ</span>
              <span className="font-bold">{completeness}%</span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-white/25 overflow-hidden">
              <div
                className="h-full rounded-full bg-cyan-300 transition-all"
                style={{ width: `${completeness}%` }}
              />
            </div>
            {completeness < 100 && (
              <Link
                href="/app2/version6/dashboard/profile/edit"
                className="mt-3 inline-block rounded-full bg-white text-blue-700 px-4 py-1.5 text-xs font-bold"
              >
                Ολοκλήρωσε το προφίλ
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="px-4 -mt-6 pb-2 space-y-2.5">
        <Link
          href="/app2/version6/dashboard/profile/edit"
          className="flex items-center gap-3 rounded-2xl bg-white ring-1 ring-gray-100 p-4 active:bg-gray-50"
        >
          <span className="text-2xl">✏️</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-900">Επεξεργασία προφίλ</p>
            <p className="text-xs text-gray-500">Φωτογραφία, στοιχεία, εμπειρία</p>
          </div>
          <span className="text-gray-300 text-lg">›</span>
        </Link>

        <Link
          href="/app2/version6/dashboard/notifications"
          className="flex items-center gap-3 rounded-2xl bg-white ring-1 ring-gray-100 p-4 active:bg-gray-50"
        >
          <span className="text-2xl">🔔</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-900">Ειδοποιήσεις</p>
            <p className="text-xs text-gray-500">Δες όλες σου τις ενημερώσεις</p>
          </div>
          <span className="text-gray-300 text-lg">›</span>
        </Link>

        <Link
          href="/app2/version6/dashboard/settings"
          className="flex items-center gap-3 rounded-2xl bg-white ring-1 ring-gray-100 p-4 active:bg-gray-50"
        >
          <span className="text-2xl">⚙️</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-900">Ρυθμίσεις</p>
            <p className="text-xs text-gray-500">Λογαριασμός, απόρρητο</p>
          </div>
          <span className="text-gray-300 text-lg">›</span>
        </Link>

        <Link
          href="/help"
          className="flex items-center gap-3 rounded-2xl bg-white ring-1 ring-gray-100 p-4 active:bg-gray-50"
        >
          <span className="text-2xl">❓</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-900">Βοήθεια</p>
            <p className="text-xs text-gray-500">FAQ, επικοινωνία</p>
          </div>
          <span className="text-gray-300 text-lg">›</span>
        </Link>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 rounded-2xl bg-white ring-1 ring-rose-100 p-4 active:bg-rose-50 text-left"
        >
          <span className="text-2xl">🚪</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-rose-600">Αποσύνδεση</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </button>
      </div>
    </div>
  );
}

function computeCompleteness(p: any, isWorker: boolean): number {
  if (!p) return 0;
  let score = 0;
  let max = 0;

  const checks = isWorker
    ? [
        ['full_name', 1],
        ['photo_url', 2],
        ['city', 1],
        ['region', 1],
        ['phone', 1],
        ['bio', 2],
        ['years_of_experience', 1],
        ['expected_monthly_salary', 1],
        ['availability', 1],
        ['cv_url', 1],
      ]
    : [
        ['company_name', 2],
        ['logo_url', 2],
        ['city', 1],
        ['region', 1],
        ['phone', 1],
        ['description', 2],
        ['business_type', 1],
        ['website', 1],
      ];

  for (const [key, weight] of checks as [string, number][]) {
    max += weight;
    if (p[key]) score += weight;
  }
  return Math.min(100, Math.round((score / max) * 100));
}
