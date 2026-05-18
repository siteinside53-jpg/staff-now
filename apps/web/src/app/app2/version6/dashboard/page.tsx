'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '../_lib/use-user';
import { stats as statsApi } from '../_lib/api';
import { Avatar, FullPageSpinner } from '../_lib/ui';
import { roleTheme } from '../_lib/theme';

interface DashStats {
  total_matches: number;
  unread_messages: number;
  profile_views: number;
  pending_interests: number;
  active_jobs?: number;
}

export default function DashHome() {
  const { user, loading } = useUser();
  const [stats, setStats] = useState<DashStats | null>(null);

  useEffect(() => {
    if (!user) return;
    statsApi.dashboard().then(setStats).catch(() => setStats({ total_matches: 0, unread_messages: 0, profile_views: 0, pending_interests: 0 }));
  }, [user]);

  if (loading || !user) return <FullPageSpinner />;

  const isWorker = user.role === 'worker';
  const t = roleTheme(user.role);
  const greeting = greetingByHour();
  const name = user.display_name || user.email?.split('@')[0];

  return (
    <div className="px-4 pb-8 pt-4 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Avatar src={user.avatar_url || undefined} name={name} size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{greeting}</p>
          <h1 className="text-lg font-bold text-gray-900 truncate">{name}</h1>
        </div>
        <Link
          href="/app2/version6/dashboard/notifications"
          className="relative h-10 w-10 inline-flex items-center justify-center rounded-full bg-white ring-1 ring-gray-100"
          aria-label="Ειδοποιήσεις"
        >
          🔔
        </Link>
      </div>

      {/* Hero CTA */}
      <Link
        href="/app2/version6/dashboard/swipe"
        className={`block rounded-3xl p-6 text-white shadow-xl ${t.gradient} active:scale-[0.99] transition-transform`}
      >
        <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
          {isWorker ? 'Νέες αγγελίες σήμερα' : 'Νέα προφίλ σήμερα'}
        </p>
        <h2 className="mt-1 text-2xl font-black tracking-tight">
          {isWorker ? 'Βρες την επόμενη δουλειά σου' : 'Βρες προσωπικό τώρα'}
        </h2>
        <p className="mt-2 text-sm opacity-90">
          {isWorker
            ? 'Swipe σε αγγελίες, ταίριαξε με επιχειρήσεις, ξεκίνα.'
            : 'Swipe σε υποψήφιους, ταίριαξε άμεσα, στείλε μήνυμα.'}
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur px-4 py-1.5 text-xs font-bold">
          Ξεκίνα swipe →
        </div>
      </Link>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Ταίριαξαν" value={stats?.total_matches ?? '—'} icon="💖" href="/app2/version6/dashboard/matches" />
        <StatCard label="Μηνύματα" value={stats?.unread_messages ?? '—'} icon="💬" href="/app2/version6/dashboard/chat" />
        <StatCard
          label={isWorker ? 'Ενδιαφέρθηκαν' : 'Νέες αιτήσεις'}
          value={stats?.pending_interests ?? '—'}
          icon={isWorker ? '👀' : '📨'}
          href="/app2/version6/dashboard/matches"
        />
        {isWorker ? (
          <StatCard label="Προβολές" value={stats?.profile_views ?? '—'} icon="📈" href="/app2/version6/dashboard/profile" />
        ) : (
          <StatCard label="Ενεργές αγγελίες" value={stats?.active_jobs ?? '—'} icon="📋" href="/app2/version6/dashboard/jobs" />
        )}
      </div>

      {/* Quick actions */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Γρήγορες ενέργειες</h3>
        <div className="rounded-2xl bg-white ring-1 ring-gray-100 divide-y divide-gray-100">
          {isWorker ? (
            <>
              <ActionRow href="/app2/version6/dashboard/profile/edit" icon="✏️" title="Ενημέρωσε το προφίλ σου" desc="Πιο πολλά matches με πλήρες προφίλ" />
              <ActionRow href="/app2/version6/dashboard/swipe" icon="🎯" title="Κάνε swipe σε αγγελίες" desc="Δες νέες θέσεις τώρα" />
              <ActionRow href="/app2/version6/dashboard/chat" icon="💬" title="Συνέχισε τις συνομιλίες" desc="Απάντησε σε επιχειρήσεις" />
            </>
          ) : (
            <>
              <ActionRow href="/app2/version6/dashboard/jobs" icon="📝" title="Δημοσίευσε αγγελία" desc="Φέρε υποψήφιους στο προφίλ σου" />
              <ActionRow href="/app2/version6/dashboard/swipe" icon="🔍" title="Βρες υποψήφιους" desc="Swipe σε προφίλ που σε ενδιαφέρουν" />
              <ActionRow href="/app2/version6/dashboard/profile/edit" icon="🏢" title="Συμπλήρωσε το προφίλ σου" desc="Επαλήθευση = περισσότερη εμπιστοσύνη" />
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, icon, href }: { label: string; value: number | string; icon: string; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl bg-white ring-1 ring-gray-100 p-4 active:scale-[0.99] transition-transform"
    >
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-black text-gray-900 tabular-nums">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </Link>
  );
}

function ActionRow({ href, icon, title, desc }: { href: string; icon: string; title: string; desc: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3.5 active:bg-gray-50">
      <span className="text-2xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
      <span className="text-gray-300 text-lg">›</span>
    </Link>
  );
}

function greetingByHour() {
  const h = new Date().getHours();
  if (h < 5) return 'Καλό βράδυ';
  if (h < 12) return 'Καλημέρα';
  if (h < 18) return 'Καλό απόγευμα';
  return 'Καλό βράδυ';
}
