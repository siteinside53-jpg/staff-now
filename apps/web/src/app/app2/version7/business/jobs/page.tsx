'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppBar, Avatar, Badge, Body, Card, Chip, EmptyState, FAB, Spinner, TabIcons } from '../../_lib/ui';
import { jobs as jobsApi } from '../../_lib/api';

const STATUSES = [
  { value: '', label: 'Όλες' },
  { value: 'published', label: 'Δημοσιευμένες' },
  { value: 'draft', label: 'Πρόχειρα' },
  { value: 'paused', label: 'Σε παύση' },
  { value: 'archived', label: 'Αρχειοθετημένες' },
];

export default function BusinessJobs() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await jobsApi.list({ limit: 50 });
        let list = res.items || [];
        if (status) list = list.filter((j: any) => j.status === status);
        if (!cancelled) setItems(list);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [status]);

  return (
    <>
      <AppBar title="Οι αγγελίες μου" subtitle={`${items.length} συνολικά`} />
      <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1">
          {STATUSES.map((s) => (
            <Chip key={s.value} active={status === s.value} onClick={() => setStatus(s.value)}>
              {s.label}
            </Chip>
          ))}
        </div>
      </div>
      <Body>
        {loading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : items.length === 0 ? (
          <EmptyState
            icon="💼"
            title="Καμία αγγελία"
            description="Πάτα + για να δημοσιεύσεις την πρώτη σου αγγελία."
            action={
              <Link
                href="/app2/version7/business/jobs/new"
                className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white"
              >
                ➕ Νέα αγγελία
              </Link>
            }
          />
        ) : (
          <div className="space-y-2.5">
            {items.map((j) => <JobCard key={j.id} job={j} />)}
          </div>
        )}
      </Body>
      <FAB href="/app2/version7/business/jobs/new" label="Νέα">
        {TabIcons.plus}
      </FAB>
    </>
  );
}

function JobCard({ job }: { job: any }) {
  return (
    <Card href={`/app2/version7/business/jobs/detail?id=${job.id}`} className="p-3.5">
      <div className="flex items-start gap-3">
        <Avatar name={job.title} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-extrabold text-gray-900 truncate">{job.title}</p>
            <StatusBadge status={job.status} />
          </div>
          <p className="mt-0.5 text-[11px] text-gray-500 truncate">📍 {job.city || job.region || '—'}</p>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <MiniStat label="Matches" value={job.match_count || 0} tone="green" />
            <MiniStat label="Views" value={job.view_count || 0} tone="cyan" />
            <MiniStat label="Likes" value={job.like_count || 0} tone="rose" />
          </div>
        </div>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: any }> = {
    published: { label: 'Live', tone: 'green' },
    draft: { label: 'Πρόχειρο', tone: 'gray' },
    paused: { label: 'Παύση', tone: 'amber' },
    archived: { label: 'Αρχείο', tone: 'gray' },
    filled: { label: 'Καλύφθηκε', tone: 'blue' },
  };
  const m = map[status] || map.draft!;
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: 'green' | 'cyan' | 'rose' }) {
  const c = { green: 'bg-emerald-50 text-emerald-700', cyan: 'bg-cyan-50 text-cyan-700', rose: 'bg-rose-50 text-rose-700' }[tone];
  return (
    <div className={`rounded-lg px-2 py-1.5 text-center ${c}`}>
      <p className="text-sm font-extrabold">{value}</p>
      <p className="text-[9px] font-bold uppercase tracking-wide opacity-80">{label}</p>
    </div>
  );
}
