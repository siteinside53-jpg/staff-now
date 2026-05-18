'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { notifications } from '../../_lib/api';
import { EmptyState, ErrorState, FullPageSpinner, ScreenHeader } from '../../_lib/ui';
import { timeAgo } from '../../_lib/format';

interface Notif {
  id: string;
  type: string;
  title: string;
  body?: string;
  created_at: string;
  read_at?: string | null;
  data?: any;
}

const ICONS: Record<string, string> = {
  new_match: '🎉',
  new_message: '💬',
  new_like: '❤️',
  profile_view: '👁️',
  verification_approved: '✅',
  verification_rejected: '❌',
  subscription_updated: '💎',
  system: '🔔',
};

export default function NotifV6() {
  const router = useRouter();
  const [items, setItems] = useState<Notif[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const res = await notifications.list(50);
      setItems(res.items as Notif[]);
    } catch (e: any) {
      setError(e?.message || 'Σφάλμα');
    }
  };

  const markAll = async () => {
    await notifications.markAllRead().catch(() => null);
    load();
    window.dispatchEvent(new Event('staffnow:refresh-badges'));
  };

  useEffect(() => {
    load();
  }, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (items === null) return <FullPageSpinner />;

  const unread = items.filter((n) => !n.read_at).length;

  return (
    <>
      <ScreenHeader
        title="Ειδοποιήσεις"
        back={() => router.back()}
        right={
          unread > 0 ? (
            <button onClick={markAll} className="text-xs font-bold text-blue-600">
              Όλες ως αναγνωσμένες
            </button>
          ) : null
        }
      />

      {items.length === 0 ? (
        <EmptyState icon="🔔" title="Καμία ειδοποίηση" description="Όταν υπάρχουν νέα, θα τα δεις εδώ." />
      ) : (
        <ul className="divide-y divide-gray-100 bg-white">
          {items.map((n) => (
            <li
              key={n.id}
              onClick={() => {
                if (!n.read_at) notifications.markRead(n.id).catch(() => null);
                routeForNotif(n, router);
              }}
              className={`px-4 py-3 flex items-start gap-3 active:bg-gray-50 cursor-pointer ${
                !n.read_at ? 'bg-blue-50/40' : ''
              }`}
            >
              <span className="text-2xl flex-shrink-0">{ICONS[n.type] || '🔔'}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!n.read_at ? 'font-bold' : 'font-semibold'} text-gray-900`}>
                  {n.title}
                </p>
                {n.body && <p className="mt-0.5 text-xs text-gray-600">{n.body}</p>}
                <p className="mt-1 text-[11px] text-gray-400">{timeAgo(n.created_at)}</p>
              </div>
              {!n.read_at && <span className="mt-2 h-2 w-2 rounded-full bg-blue-600" />}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function routeForNotif(n: Notif, router: ReturnType<typeof useRouter>) {
  if (n.type === 'new_message' || n.type === 'new_match') {
    const convId = n.data?.convId || n.data?.conversation_id;
    if (convId) {
      router.push(`/app2/version6/dashboard/chat?id=${convId}`);
      return;
    }
  }
  if (n.type === 'new_like') {
    router.push('/app2/version6/dashboard/matches');
    return;
  }
  // default: do nothing
}
