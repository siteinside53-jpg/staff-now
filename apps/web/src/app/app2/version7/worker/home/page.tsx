'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppBar, Avatar, Badge, Body, Card, EmptyState, Section, Spinner, Stat } from '../../_lib/ui';
import { auth, jobs as jobsApi, stats as statsApi, type User } from '../../_lib/api';

export default function WorkerHome() {
  const [user, setUser] = useState<User | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [me, list, s] = await Promise.all([
          auth.me(),
          jobsApi.list({ limit: 6 }),
          statsApi.dashboard().catch(() => null),
        ]);
        if (cancelled) return;
        setUser(me.user);
        setJobs(list.items || []);
        setStats(s);
      } catch {}
      finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <AppBar
        title={user ? `Γεια σου, ${user.display_name || user.email.split('@')[0]} 👋` : 'Αρχική'}
        subtitle="Δες τι νέο έχει σήμερα"
        right={
          <Link
            href="/app2/version7/worker/notifications"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
          >
            <span className="text-base">🔔</span>
          </Link>
        }
      />

      <Body>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2.5">
          <Stat
            label="Matches"
            value={stats?.total_matches ?? 0}
            tone="rose"
            icon={<span className="text-base">💕</span>}
          />
          <Stat
            label="Μηνύματα"
            value={stats?.unread_messages ?? 0}
            tone="cyan"
            icon={<span className="text-base">💬</span>}
          />
          <Stat
            label="Views"
            value={stats?.profile_views ?? 0}
            tone="amber"
            icon={<span className="text-base">👁️</span>}
          />
        </div>

        {/* Quick swipe banner */}
        <Section title="Έτοιμος να ξεκινήσεις;">
          <Card className="overflow-hidden">
            <Link
              href="/app2/version7/worker/discover"
              className="block bg-gradient-to-br from-blue-600 to-indigo-700 p-5 text-white"
            >
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                Live αγγελίες
              </p>
              <p className="mt-1 text-lg font-extrabold leading-tight">
                Swipe σε νέες προσφορές δουλειάς
              </p>
              <p className="mt-1 text-[12px] text-white/85">
                Ταίριαξε με επιχειρήσεις που σε θέλουν.
              </p>
              <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-bold backdrop-blur">
                Ξεκίνα τώρα →
              </div>
            </Link>
          </Card>
        </Section>

        {/* Latest jobs */}
        <Section
          title="Νέες αγγελίες"
          action={
            <Link
              href="/app2/version7/worker/discover"
              className="text-[12px] font-bold text-blue-600"
            >
              Όλες →
            </Link>
          }
        >
          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : jobs.length === 0 ? (
            <EmptyState icon="🌙" title="Καμία νέα αγγελία" description="Δες αργότερα — προσθέτονται συνέχεια." />
          ) : (
            <div className="space-y-2">
              {jobs.map((j) => <JobMini key={j.id} job={j} />)}
            </div>
          )}
        </Section>
      </Body>
    </>
  );
}

function JobMini({ job }: { job: any }) {
  return (
    <Card href={`/app2/version7/worker/job?id=${job.id}`} className="p-3">
      <div className="flex items-start gap-3">
        <Avatar name={job.business_name || job.title} src={job.business_logo} size="md" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900 truncate">{job.title}</p>
          <p className="mt-0.5 text-[11px] text-gray-500 truncate">
            {job.business_name || '—'} · {job.city || job.region || 'Όλη η Ελλάδα'}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {job.employment_type && <Badge tone="blue">{labelEmployment(job.employment_type)}</Badge>}
            {(job.salary_min || job.salary_max) && (
              <Badge tone="green">
                {salaryRange(job.salary_min, job.salary_max, job.salary_type)}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function labelEmployment(t: string): string {
  return ({ full_time: 'Πλήρης', part_time: 'Μερική', seasonal: 'Σεζόν' } as Record<string, string>)[t] || t;
}

function salaryRange(min?: number, max?: number, type?: string): string {
  const suffix = type === 'hourly' ? '/ώρα' : type === 'daily' ? '/μέρα' : '€/μήνα';
  if (min && max) return `${min}-${max}${suffix.startsWith('€') ? suffix : '€' + suffix}`;
  if (min) return `Από ${min}€${suffix.startsWith('€') ? '' : suffix}`;
  return 'Συζητήσιμα';
}
