'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';
const token = () => typeof window !== 'undefined' ? localStorage.getItem('staffnow_token') : null;

interface MatchItem {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  unread: number;
}

export default function MatchesV3() {
  const [items, setItems] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const t = token();
        if (!t) return;
        const res = await fetch(`${API_BASE}/conversations`, {
          headers: { 'Authorization': `Bearer ${t}` },
        });
        const data = await res.json() as any;
        const convos = data?.data || [];
        const mapped: MatchItem[] = convos.map((c: any) => ({
          id: c.id,
          name: c.otherParty?.name || 'Χρήστης',
          role: c.jobTitle || c.otherParty?.type || '',
          avatar: c.otherParty?.avatar,
          unread: c.unreadCount || 0,
        }));
        setItems(mapped);
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  if (loading) {
    return <div className="h-full flex items-center justify-center bg-white"><div className="h-8 w-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="h-full flex flex-col bg-white overflow-y-auto">
      <div className="px-4 pt-6 pb-4 bg-gradient-to-r from-pink-500 to-red-500">
        <h1 className="text-3xl font-extrabold text-white">💖 Matches</h1>
        <p className="mt-1 text-sm text-pink-100">{items.length} {items.length === 1 ? 'σύνδεση' : 'συνδέσεις'}</p>
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="text-5xl mb-3">💫</div>
          <p className="font-bold text-gray-900">Ακόμα κανένα match</p>
          <p className="mt-1 text-sm text-gray-500">Κάνε swipe δεξιά σε προφίλ που σου αρέσουν</p>
          <Link href="/app2/version4/dashboard/swipe" className="mt-6 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-bold text-white">
            🎯 Swipe τώρα
          </Link>
        </div>
      ) : (
        <>
          {/* New matches avatars */}
          <div className="px-4 py-5 border-b border-gray-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Νέα Matches</h3>
            <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-2">
              {items.slice(0, 8).map((m) => (
                <Link key={m.id} href="/app2/version4/dashboard/chat" className="flex-shrink-0 text-center">
                  <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center text-xl font-bold text-purple-700 ring-4 ring-white shadow-md overflow-hidden">
                    {m.avatar ? <img src={m.avatar} alt="" className="h-full w-full object-cover" /> : m.name[0]?.toUpperCase()}
                    {m.unread > 0 && (
                      <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center ring-2 ring-white">
                        {m.unread}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-[11px] font-semibold text-gray-700 w-20 truncate">{m.name}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex-1 px-4 py-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Όλα τα Matches</h3>
            <div className="space-y-2">
              {items.map((m) => (
                <Link key={m.id} href="/app2/version4/dashboard/chat" className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-colors">
                  <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-base font-bold text-purple-700 overflow-hidden">
                    {m.avatar ? <img src={m.avatar} alt="" className="h-full w-full object-cover" /> : m.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{m.name}</p>
                    {m.role && <p className="text-sm text-gray-500 truncate">{m.role}</p>}
                  </div>
                  {m.unread > 0 && <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
