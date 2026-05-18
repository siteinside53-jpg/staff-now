'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';
const token = () => typeof window !== 'undefined' ? localStorage.getItem('staffnow_token') : null;

interface Notif {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

const ICON_MAP: Record<string, string> = {
  new_match: '🎉',
  new_message: '💬',
  new_like: '❤️',
  system: '🔔',
  profile_view: '👁️',
  verification_approved: '✅',
  verification_rejected: '❌',
  subscription_updated: '💎',
};

export default function NotificationsV3() {
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const t = token();
      if (!t) return;
      const res = await fetch(`${API_BASE}/notifications?limit=50`, {
        headers: { 'Authorization': `Bearer ${t}` },
      });
      const data = await res.json() as any;
      const raw = data?.data || [];
      setItems(raw.map((n: any) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        createdAt: n.created_at,
        readAt: n.read_at,
      })));
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const markAllRead = async () => {
    try {
      const t = token();
      await fetch(`${API_BASE}/notifications/read-all`, { method: 'POST', headers: { 'Authorization': `Bearer ${t}` } });
      await load();
    } catch {}
  };

  const unreadCount = items.filter((n) => !n.readAt).length;

  return (
    <div className="h-full flex flex-col bg-white overflow-y-auto">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-4 bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/app2/version4/dashboard/swipe" className="p-1.5 -ml-1.5">
            <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-gray-900">🔔 Ειδοποιήσεις</h1>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-xs font-semibold text-blue-600">
            Όλα διαβασμένα
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><div className="h-8 w-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="text-5xl mb-3">🔕</div>
          <p className="font-bold text-gray-900">Καμία ειδοποίηση</p>
          <p className="mt-1 text-sm text-gray-500">Θα εμφανιστούν εδώ όταν συμβεί κάτι νέο</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {items.map((n) => {
            const icon = ICON_MAP[n.type] || '🔔';
            const unread = !n.readAt;
            const time = timeAgo(n.createdAt);
            return (
              <div key={n.id} className={`flex items-start gap-3 px-4 py-3.5 ${unread ? 'bg-blue-50/50' : 'bg-white'}`}>
                <div className={`flex-shrink-0 h-11 w-11 rounded-full flex items-center justify-center text-xl ${unread ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${unread ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>{n.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{n.body}</p>
                  <p className="mt-1 text-[10px] text-gray-400">{time}</p>
                </div>
                {unread && <span className="flex-shrink-0 h-2 w-2 rounded-full bg-blue-500 mt-2" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'τώρα';
  if (mins < 60) return `${mins} λεπτά πριν`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ώρες πριν`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} μέρες πριν`;
  return new Date(date).toLocaleDateString('el-GR');
}
