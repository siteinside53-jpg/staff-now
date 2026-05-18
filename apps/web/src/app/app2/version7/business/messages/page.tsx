'use client';

import { useEffect, useState } from 'react';
import { AppBar, Avatar, Body, Card, EmptyState, Spinner, TextField } from '../../_lib/ui';
import { conversations as convsApi } from '../../_lib/api';

export default function BusinessMessages() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await convsApi.list();
        if (!cancelled) setItems(res.items || []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = search
    ? items.filter((c) =>
        ((c.other_user_name || c.worker_name || '') + ' ' + (c.last_message || '')).toLowerCase().includes(search.toLowerCase()),
      )
    : items;

  return (
    <>
      <AppBar title="Μηνύματα" subtitle={`${items.length} συνομιλίες`} />
      <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-3">
        <TextField
          placeholder="Αναζήτηση..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z" />
            </svg>
          }
        />
      </div>
      <Body>
        {loading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="💬" title="Καμία συνομιλία" description="Όταν κάνεις match, θα δεις εδώ τα μηνύματα." />
        ) : (
          <div className="space-y-1.5">
            {filtered.map((c) => <ConvRow key={c.id} conv={c} />)}
          </div>
        )}
      </Body>
    </>
  );
}

function ConvRow({ conv }: { conv: any }) {
  const name = conv.other_name || conv.other_user_name || conv.worker_name || 'Συνομιλία';
  const last = conv.last_message || conv.last_message_preview || 'Πες ένα γεια!';
  const time = formatTime(conv.last_message_at || conv.updated_at || conv.created_at);
  const unread = Number(conv.unread_count || 0);

  return (
    <Card href={`/app2/version7/business/chat?id=${conv.id}`} className="p-3">
      <div className="flex items-center gap-3">
        <Avatar name={name} src={conv.other_photo || conv.other_avatar || conv.other_user_avatar || conv.worker_avatar} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm truncate ${unread ? 'font-extrabold text-gray-900' : 'font-bold text-gray-800'}`}>{name}</p>
            {time && <span className="flex-shrink-0 text-[10px] text-gray-400">{time}</span>}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <p className={`flex-1 truncate text-[12px] ${unread ? 'font-semibold text-gray-700' : 'text-gray-500'}`}>{last}</p>
            {unread > 0 && (
              <span className="flex-shrink-0 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-extrabold text-white">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function formatTime(s?: string): string {
  if (!s) return '';
  const d = new Date(s);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
  const days = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 7) return d.toLocaleDateString('el-GR', { weekday: 'short' });
  return d.toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit' });
}
