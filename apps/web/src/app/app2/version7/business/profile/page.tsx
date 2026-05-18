'use client';

/**
 * Business profile — merged v5 hero + v7 settings rows.
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FieldGroup, Row, Section, Spinner } from '../../_lib/ui';
import { auth, businesses, clearToken, stats as statsApi, type User } from '../../_lib/api';

export default function BusinessProfile() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>({ total_matches: 0, profile_views: 0, pending_interests: 0, active_jobs: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [me, b, s] = await Promise.all([
          auth.me(),
          businesses.me().catch(() => null),
          statsApi.dashboard().catch(() => null),
        ]);
        if (cancelled) return;
        setUser(me.user);
        setProfile(b?.profile || me.profile || null);
        if (s) setStats(s);
      } catch {} finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const onLogout = async () => {
    try { await auth.logout(); } catch {}
    clearToken();
    router.replace('/app2/version7');
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <Spinner className="h-10 w-10" />
      </div>
    );
  }

  const name = profile?.company_name || profile?.name || user?.email?.split('@')[0] || 'Επιχείρηση';
  const initials = name.split(' ').slice(0, 2).map((n: string) => n[0]?.toUpperCase()).join('') || '?';
  const photo = profile?.logo_url || profile?.photo_url;
  const completeness = profile?.profile_completeness || profile?.completion_pct || 40;
  const businessType = profile?.business_type ? labelType(profile.business_type) : 'Επιχείρηση';

  const xp = (completeness * 5) + ((stats.total_matches || 0) * 30) + ((stats.active_jobs || 0) * 20);
  const level = xp >= 1000 ? 'Gold' : xp >= 500 ? 'Silver' : 'Bronze';
  const levelEmoji = level === 'Gold' ? '🥇' : level === 'Silver' ? '🥈' : '🥉';
  const nextLevel = level === 'Bronze' ? 500 : level === 'Silver' ? 1000 : 2000;
  const xpProgress = Math.min(100, (xp / nextLevel) * 100);

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-y-auto">
      {/* ─────────── HERO (v5) ─────────── */}
      <div
        className="flex-shrink-0 bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 px-4 pt-8 pb-20 text-center text-white relative"
        style={{ paddingTop: 'calc(32px + env(safe-area-inset-top))' }}
      >
        <Link
          href="/app2/version7/business/settings"
          className="absolute right-4 h-9 w-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center"
          style={{ top: 'calc(24px + env(safe-area-inset-top))' }}
          aria-label="Ρυθμίσεις"
        >
          <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.33.183-.582.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Link>

        <div className="mx-auto h-24 w-24 rounded-2xl bg-white/90 text-blue-700 flex items-center justify-center text-3xl font-extrabold shadow-2xl overflow-hidden">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <h1 className="mt-4 text-2xl font-extrabold">{name}</h1>
        <p className="text-sm text-white/90">
          {businessType}{profile?.city ? ` · 📍 ${profile.city}` : ''}
        </p>

        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur px-4 py-1.5 text-xs font-bold">
          <span>{levelEmoji}</span> {level} Member
          {profile?.verified ? <span className="ml-1">· ✓ Verified</span> : null}
        </div>
      </div>

      {/* Stats floating */}
      <div className="px-4 -mt-12 relative z-10">
        <div className="grid grid-cols-3 gap-3 rounded-2xl bg-white p-4 shadow-xl">
          <div className="text-center">
            <p className="text-2xl font-extrabold text-blue-600">{stats.active_jobs || 0}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Αγγελίες</p>
          </div>
          <div className="text-center border-x border-gray-100">
            <p className="text-2xl font-extrabold text-emerald-600">{stats.total_matches || 0}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Matches</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-extrabold text-amber-500">{stats.pending_interests || 0}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Νέα</p>
          </div>
        </div>
      </div>

      {/* ─────────── Cards ─────────── */}
      <div className="px-4 mt-6 space-y-4 pb-4">
        {/* XP */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-bold text-gray-900">XP · {xp.toLocaleString('el-GR')}</p>
              <p className="text-xs text-gray-500">{Math.max(0, nextLevel - xp)} για επόμενο level</p>
            </div>
            <span className="text-2xl">🏆</span>
          </div>
          <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
        </div>

        {/* Completeness */}
        <Link href="/app2/version7/business/profile/edit" className="block rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-900">Συμπλήρωσε το προφίλ της επιχείρησης</p>
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
            {completeness >= 80 && <Badge tone="blue">⚡ Complete Profile</Badge>}
            {profile?.verified ? <Badge tone="emerald">✓ Verified</Badge> : null}
            {profile?.plan && profile.plan !== 'starter' && <Badge tone="amber">⭐ {labelPlan(profile.plan)}</Badge>}
            {(stats.total_matches || 0) > 0 && <Badge tone="pink">💖 First Match</Badge>}
            {(stats.active_jobs || 0) >= 5 && <Badge tone="orange">🚀 Power Lister</Badge>}
          </div>
        </div>

        {/* "Δες το προφίλ σου" CTA */}
        <Link
          href={user?.id ? `/app2/version7/business/preview?id=${user.id}` : '#'}
          className="block w-full rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white p-4 shadow-lg active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="text-3xl">👁️</div>
            <div className="flex-1 text-left">
              <p className="font-black">Δες το προφίλ σου</p>
              <p className="text-xs text-white/80">Όπως το βλέπουν οι εργαζόμενοι</p>
            </div>
            <span className="text-xl">→</span>
          </div>
        </Link>
      </div>

      {/* ─────────── Settings (v7) ─────────── */}
      <div className="px-4 pb-8 space-y-4">
        <Section title="Διαχείριση">
          <FieldGroup>
            <Row icon="✏️" label="Επεξεργασία προφίλ" hint="Λογότυπο, περιγραφή, στοιχεία" href="/app2/version7/business/profile/edit" />
            <Row icon="✓" iconBg="bg-emerald-50" iconColor="text-emerald-600" label="Επαλήθευση" hint={profile?.verified ? 'Ολοκληρωμένη' : 'Σε εκκρεμότητα'} href="/app2/version7/business/verification" />
            <Row icon="🚀" iconBg="bg-amber-50" iconColor="text-amber-600" label="Boost & Συνδρομή" hint="Προβολή · Featured · Premium" href="/app2/version7/business/boost" />
            <Row icon="💳" iconBg="bg-cyan-50" iconColor="text-cyan-600" label="Χρεώσεις & Αποδείξεις" href="/app2/version7/business/billing" />
            <Row icon="🔔" iconBg="bg-blue-50" iconColor="text-blue-600" label="Ειδοποιήσεις" href="/app2/version7/business/notifications" />
            <Row icon="⚙️" iconBg="bg-gray-100" iconColor="text-gray-700" label="Γενικές ρυθμίσεις" href="/app2/version7/business/settings" last />
          </FieldGroup>
        </Section>

        <Section title="Λογαριασμός">
          <FieldGroup>
            <Row icon="🛟" iconBg="bg-blue-50" iconColor="text-blue-600" label="Υποστήριξη" href="/app2/version7/support" />
            <Row icon="📜" iconBg="bg-gray-100" iconColor="text-gray-700" label="Όροι χρήσης" href="/terms" />
            <Row icon="🔒" iconBg="bg-gray-100" iconColor="text-gray-700" label="Πολιτική απορρήτου" href="/privacy" last />
          </FieldGroup>
        </Section>

        <button
          type="button"
          onClick={onLogout}
          className="w-full rounded-2xl bg-rose-50 text-rose-700 py-3.5 text-sm font-extrabold active:bg-rose-100 transition-colors"
        >
          Αποσύνδεση
        </button>

        <p className="text-center text-[10px] text-gray-400">v7 · staffnow.gr</p>
      </div>
    </div>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: 'blue' | 'orange' | 'emerald' | 'pink' | 'amber';
}) {
  const t: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    orange: 'bg-orange-100 text-orange-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    pink: 'bg-pink-100 text-pink-700',
    amber: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${t[tone]}`}>
      {children}
    </span>
  );
}

function labelType(t: string): string {
  return ({
    hotel: 'Ξενοδοχείο',
    restaurant: 'Εστιατόριο',
    beach_bar: 'Beach Bar',
    cafe: 'Καφετέρια',
    villa: 'Βίλα',
    tourism_company: 'Τουριστική Εταιρεία',
    bar: 'Bar',
    resort: 'Resort',
    cruise: 'Κρουαζιέρα',
    other: 'Άλλο',
  } as any)[t] || t;
}
function labelPlan(p: string): string {
  return ({ starter: 'Starter', pro: 'Pro', elite: 'Elite' } as any)[p] || p;
}
