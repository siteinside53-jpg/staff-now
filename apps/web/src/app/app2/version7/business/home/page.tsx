'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  AppBar,
  Avatar,
  Badge,
  Body,
  Card,
  EmptyState,
  Section,
  Spinner,
  Stat,
} from '../../_lib/ui';
import { auth, businesses, jobs as jobsApi, stats as statsApi, type User } from '../../_lib/api';

export default function BusinessHome() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [me, biz, list, s] = await Promise.all([
          auth.me(),
          businesses.me().catch(() => null),
          jobsApi.list({ limit: 5 }),
          statsApi.dashboard().catch(() => null),
        ]);
        if (cancelled) return;
        setUser(me.user);
        setProfile(biz?.profile || null);
        setActiveJobs((list.items || []).filter((j: any) => j.status === 'published').slice(0, 4));
        setStats(s);
      } catch {}
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <AppBar
        title={profile?.company_name || profile?.name || user?.email?.split('@')[0] || 'Αρχική'}
        subtitle="Επιχείρηση Dashboard"
        right={
          <Link
            href="/app2/version7/business/notifications"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
          >
            <span className="text-base">🔔</span>
          </Link>
        }
      />

      <Body>
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <Stat
            label="Ενεργές αγγελίες"
            value={stats?.active_jobs ?? 0}
            tone="blue"
            icon={<span className="text-base">💼</span>}
          />
          <Stat
            label="Matches"
            value={stats?.total_matches ?? 0}
            tone="green"
            icon={<span className="text-base">🎯</span>}
          />
          <Stat
            label="Νέα ενδιαφέροντα"
            value={stats?.pending_interests ?? 0}
            tone="amber"
            icon={<span className="text-base">⭐</span>}
          />
          <Stat
            label="Αδιάβαστα μηνύματα"
            value={stats?.unread_messages ?? 0}
            tone="rose"
            icon={<span className="text-base">💬</span>}
          />
        </div>

        {/* Quick actions */}
        <Section title="Γρήγορες ενέργειες">
          <div className="grid grid-cols-2 gap-2.5">
            <QuickAction icon="➕" label="Νέα αγγελία" href="/app2/version7/business/jobs/new" tone="blue" />
            <QuickAction icon="🔍" label="Βρες εργαζόμενους" href="/app2/version7/business/discover" tone="cyan" />
            <QuickAction icon="🚀" label="Boost" href="/app2/version7/business/boost" tone="amber" />
            <QuickAction icon="✓" label="Επαλήθευση" href="/app2/version7/business/verification" tone="green" />
          </div>
        </Section>

        {/* Active jobs */}
        <Section
          title="Ενεργές αγγελίες"
          action={<Link href="/app2/version7/business/jobs" className="text-[12px] font-bold text-blue-600">Όλες →</Link>}
        >
          {loading ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : activeJobs.length === 0 ? (
            <EmptyState
              icon="💼"
              title="Καμία ενεργή αγγελία"
              description="Δημοσίευσε την πρώτη σου αγγελία για να ξεκινήσεις."
              action={
                <Link href="/app2/version7/business/jobs/new" className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white">
                  ➕ Νέα αγγελία
                </Link>
              }
            />
          ) : (
            <div className="space-y-2">
              {activeJobs.map((j) => (
                <Card key={j.id} href={`/app2/version7/business/jobs/detail?id=${j.id}`} className="p-3">
                  <div className="flex items-start gap-3">
                    <Avatar name={j.title} size="md" src={profile?.logo_url} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-900 truncate">{j.title}</p>
                      <p className="mt-0.5 text-[11px] text-gray-500 truncate">📍 {j.city || j.region}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <Badge tone="green">Δημοσιευμένη</Badge>
                        <Badge tone="blue">{j.match_count || 0} matches</Badge>
                        <Badge tone="cyan">{j.view_count || 0} views</Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Section>
      </Body>
    </>
  );
}

function QuickAction({
  icon,
  label,
  href,
  tone,
}: {
  icon: string;
  label: string;
  href: string;
  tone: 'blue' | 'green' | 'amber' | 'cyan';
}) {
  const t = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-orange-600',
    cyan: 'from-cyan-500 to-blue-600',
  }[tone];
  return (
    <Link
      href={href}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${t} p-4 text-white shadow-sm active:scale-[0.98] transition-transform`}
    >
      <span className="text-2xl">{icon}</span>
      <p className="mt-1 text-sm font-extrabold">{label}</p>
      <span className="absolute -right-2 -bottom-2 text-[80px] opacity-10 leading-none">{icon}</span>
    </Link>
  );
}
