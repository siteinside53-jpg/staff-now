'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AppBar,
  Body,
  Card,
  EmptyState,
  FullPageSpinner,
  Section,
  Spinner,
  Stat,
} from '../../../_lib/ui';
import { API_BASE, getToken } from '../../../_lib/api';

export default function JobStatsPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <JobStats />
    </Suspense>
  );
}

function JobStats() {
  const params = useSearchParams();
  const id = params?.get('id') || '';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/jobs/${id}`, {
          headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
        });
        const r = await res.json();
        if (!cancelled) setData(r?.data || null);
      } catch {} finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <div className="fixed inset-0 flex items-center justify-center bg-white"><Spinner /></div>;
  if (!data) return (
    <div className="fixed inset-0 flex flex-col bg-white">
      <AppBar back title="Στατιστικά" />
      <Body><EmptyState icon="📊" title="Δεν υπάρχουν δεδομένα" /></Body>
    </div>
  );

  return (
    <div className="fixed inset-0 flex flex-col bg-[#F5F7FB]">
      <AppBar back title="Στατιστικά αγγελίας" subtitle={data.title} />
      <Body>
        <div className="grid grid-cols-2 gap-2.5">
          <Stat label="Σύνολο views" value={data.view_count || 0} tone="cyan" icon={<span>👁️</span>} />
          <Stat label="Likes" value={data.like_count || 0} tone="rose" icon={<span>💕</span>} />
          <Stat label="Matches" value={data.match_count || 0} tone="green" icon={<span>🎯</span>} />
          <Stat label="Conversations" value={data.conversation_count || 0} tone="blue" icon={<span>💬</span>} />
        </div>

        <Section title="Performance">
          <Card className="p-4">
            <div className="space-y-3 text-[13px]">
              <RowKV k="Conversion (likes/views)" v={pct(data.like_count, data.view_count)} />
              <RowKV k="Match rate (matches/likes)" v={pct(data.match_count, data.like_count)} />
              <RowKV k="Reply rate (conv/matches)" v={pct(data.conversation_count, data.match_count)} />
            </div>
          </Card>
        </Section>

        <Section title="Boost">
          <Card className="p-4 bg-gradient-to-br from-amber-400 to-orange-500 text-white">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/90">Πιο πολλά views;</p>
            <p className="mt-1 text-base font-extrabold">Boost-αρε την αγγελία σου</p>
            <p className="mt-1 text-[12px] text-white/85">Featured στην κορυφή για 7 μέρες — έως 5x views.</p>
            <a
              href={`/app2/version7/business/boost?job=${id}`}
              className="mt-3 inline-flex rounded-full bg-white px-4 py-2 text-[12px] font-extrabold text-orange-700"
            >
              🚀 Boost τώρα
            </a>
          </Card>
        </Section>
      </Body>
    </div>
  );
}

function RowKV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{k}</span>
      <span className="font-bold text-gray-900">{v}</span>
    </div>
  );
}

function pct(a: number, b: number): string {
  if (!b) return '—';
  return `${Math.round((a / b) * 100)}%`;
}
