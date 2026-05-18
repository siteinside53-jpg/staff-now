'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppBar, Avatar, Badge, Body, Card, Chip, EmptyState, Spinner } from '../../_lib/ui';
import { matches as matchesApi, interests as interestsApi } from '../../_lib/api';

type Tab = 'matches' | 'interests_received' | 'interests_sent';

export default function WorkerMatches() {
  const [tab, setTab] = useState<Tab>('matches');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        let data: any;
        if (tab === 'matches') data = await matchesApi.list({ limit: 50 });
        else if (tab === 'interests_received') data = await interestsApi.received();
        else data = await interestsApi.sent();
        if (!cancelled) setItems(data.items || []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tab]);

  return (
    <>
      <AppBar title="Matches" subtitle="Επιχειρήσεις που σε ενδιαφέρουν" />
      <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1">
          <Chip active={tab === 'matches'} onClick={() => setTab('matches')}>🤝 Deals</Chip>
          <Chip active={tab === 'interests_received'} onClick={() => setTab('interests_received')}>📥 Σε σκέφτηκαν</Chip>
          <Chip active={tab === 'interests_sent'} onClick={() => setTab('interests_sent')}>📤 Σε ενδιαφέρουν</Chip>
        </div>
      </div>

      <Body>
        {loading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={tab === 'matches' ? '🤝' : '✨'}
            title={tab === 'matches' ? 'Καμία αντιστοιχία ακόμα' : 'Καμία ενεργή κίνηση'}
            description="Κάνε swipe σε αγγελίες για να ξεκινήσουν τα matches."
          />
        ) : (
          <div className="space-y-2.5">
            {items.map((it) => (
              <MatchRow key={it.id || it.match_id} item={it} tab={tab} />
            ))}
          </div>
        )}
      </Body>
    </>
  );
}

function MatchRow({ item, tab }: { item: any; tab: Tab }) {
  const name = item.other_name || item.business_name || item.business?.name || item.full_name || item.title || 'Επιχείρηση';
  const subtitle = item.job_title || item.role || item.city || '';
  const href = item.conversation_id
    ? `/app2/version7/worker/chat?id=${item.conversation_id}`
    : `/app2/version7/worker/job?id=${item.job_id || item.id}`;

  return (
    <Card href={href} className="p-3">
      <div className="flex items-center gap-3">
        <Avatar name={name} src={item.business_logo || item.avatar_url} size="md" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900 truncate">{name}</p>
          <p className="mt-0.5 text-[11px] text-gray-500 truncate">{subtitle}</p>
        </div>
        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          {tab === 'matches' && <Badge tone="green">Match</Badge>}
          {tab === 'interests_received' && <Badge tone="cyan">Σε swipe-αρε</Badge>}
          {tab === 'interests_sent' && <Badge tone="amber">Pending</Badge>}
        </div>
      </div>
    </Card>
  );
}
