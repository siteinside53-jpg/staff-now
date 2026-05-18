'use client';

import { useEffect, useState } from 'react';
import { AppBar, Body, Card, EmptyState, Spinner } from '../../_lib/ui';
import { notifications as notifApi } from '../../_lib/api';

export default function WorkerNotifications() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await notifApi.list(50);
        if (!cancelled) setItems(res.items || []);
        notifApi.markAllRead().catch(() => {});
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <AppBar back title="Ειδοποιήσεις" />
      <Body>
        {loading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : items.length === 0 ? (
          <EmptyState icon="🔔" title="Καμία ειδοποίηση" description="Όταν έχεις matches ή νέα μηνύματα θα εμφανιστούν εδώ." />
        ) : (
          <div className="space-y-2">
            {items.map((n) => <NotifRow key={n.id} n={n} />)}
          </div>
        )}
      </Body>
    </>
  );
}

function NotifRow({ n }: { n: any }) {
  const icon = (
    {
      match: '💕',
      message: '💬',
      job: '💼',
      interest: '✨',
      verification: '✓',
      payment: '💳',
    } as any
  )[n.type] || '🔔';
  return (
    <Card className={`p-3 ${!n.read ? 'ring-2 ring-blue-200' : ''}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-base">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-gray-900">{n.title || 'Ειδοποίηση'}</p>
          {n.body && <p className="mt-0.5 text-[12px] text-gray-600">{n.body}</p>}
          <p className="mt-1 text-[10px] text-gray-400">{formatTime(n.created_at)}</p>
        </div>
        {!n.read && <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />}
      </div>
    </Card>
  );
}

function formatTime(s?: string): string {
  if (!s) return '';
  const d = new Date(s);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'τώρα';
  if (m < 60) return `${m} λ.`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ώ.`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} μ.`;
  return d.toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit' });
}
