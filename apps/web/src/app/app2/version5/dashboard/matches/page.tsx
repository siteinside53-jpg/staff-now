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

interface Interest {
  swipeId: string;
  swiperId: string;
  name: string;
  avatar?: string;
  liked_at: string;
  isMatched: boolean;
  details: string;
}

export default function MatchesV5() {
  const [items, setItems] = useState<MatchItem[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [tab, setTab] = useState<'matches' | 'interests'>('matches');
  const [loading, setLoading] = useState(true);
  const [likingBack, setLikingBack] = useState<string | null>(null);

  const load = async () => {
    try {
      const t = token();
      if (!t) return;
      const [convoRes, intRes] = await Promise.all([
        fetch(`${API_BASE}/conversations`, { headers: { 'Authorization': `Bearer ${t}` } }).then(r => r.json()),
        fetch(`${API_BASE}/interests/received`, { headers: { 'Authorization': `Bearer ${t}` } }).then(r => r.json()),
      ]);
      const convos = convoRes?.data || [];
      setItems(convos.map((c: any) => ({
        id: c.id,
        name: c.otherParty?.name || 'Χρήστης',
        role: c.jobTitle || '',
        avatar: c.otherParty?.avatar,
        unread: c.unreadCount || 0,
      })));

      const raw = intRes?.data || [];
      setInterests(raw.map((i: any) => ({
        swipeId: i.swipe_id,
        swiperId: i.swiper_id,
        name: i.company_name || i.full_name || 'Χρήστης',
        avatar: i.logo_url || i.photo_url,
        liked_at: i.liked_at,
        isMatched: (i.is_matched || 0) > 0,
        details: i.job_title || i.bio || '',
      })));
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, []);

  const likeBack = async (swiperId: string) => {
    setLikingBack(swiperId);
    try {
      const t = token();
      await fetch(`${API_BASE}/interests/like-back/${swiperId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${t}` },
      });
      await load();
    } catch {} finally { setLikingBack(null); }
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center bg-white"><div className="h-8 w-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="h-full flex flex-col bg-white overflow-y-auto">
      <div className="flex-shrink-0 px-4 pt-6 pb-4 bg-gradient-to-r from-pink-500 to-red-500 text-white">
        <h1 className="text-3xl font-extrabold">💖 Matches & Αιτήματα</h1>
        <p className="mt-1 text-sm text-pink-100">{items.length} matches · {interests.filter(i => !i.isMatched).length} αιτήματα</p>
      </div>

      <div className="flex-shrink-0 flex rounded-full bg-gray-100 mx-4 mt-3 p-1">
        <button onClick={() => setTab('matches')} className={`flex-1 py-2 text-xs font-bold rounded-full transition-all ${tab === 'matches' ? 'bg-white text-gray-900 shadow' : 'text-gray-500'}`}>
          💖 Matches ({items.length})
        </button>
        <button onClick={() => setTab('interests')} className={`flex-1 py-2 text-xs font-bold rounded-full transition-all ${tab === 'interests' ? 'bg-white text-gray-900 shadow' : 'text-gray-500'}`}>
          ❤️ Αιτήματα ({interests.filter(i => !i.isMatched).length})
        </button>
      </div>

      {tab === 'matches' ? (
        items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
            <div className="text-5xl mb-3">💫</div>
            <p className="font-bold text-gray-900">Κανένα match</p>
            <p className="mt-1 text-sm text-gray-500">Κάνε swipe σε προφίλ που σου αρέσουν</p>
            <Link href="/app2/version5/dashboard/swipe" className="mt-6 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-bold text-white">
              🎯 Swipe τώρα
            </Link>
          </div>
        ) : (
          <>
            <div className="px-4 py-5 border-b border-gray-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Νέα Matches</h3>
              <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-2">
                {items.slice(0, 8).map((m) => (
                  <Link key={m.id} href="/app2/version5/dashboard/chat" className="flex-shrink-0 text-center">
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
              <div className="space-y-2">
                {items.map((m) => (
                  <Link key={m.id} href="/app2/version5/dashboard/chat" className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-colors">
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
        )
      ) : (
        <div className="flex-1 px-4 py-4 space-y-2">
          {interests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-5xl mb-3">👀</div>
              <p className="font-bold text-gray-900">Κανείς δεν σε έχει κάνει like ακόμα</p>
              <p className="mt-1 text-sm text-gray-500">Συμπλήρωσε το προφίλ σου να σε βρουν</p>
            </div>
          ) : (
            interests.map((i) => (
              <div key={i.swipeId} className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center text-base font-bold text-pink-700 overflow-hidden">
                  {i.avatar ? <img src={i.avatar} alt="" className="h-full w-full object-cover" /> : i.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{i.name}</p>
                  {i.details && <p className="text-xs text-gray-500 truncate">{i.details}</p>}
                </div>
                {i.isMatched ? (
                  <Link href="/app2/version5/dashboard/chat" className="rounded-full bg-emerald-600 text-white px-4 py-2 text-xs font-bold">
                    💬 Chat
                  </Link>
                ) : (
                  <button
                    onClick={() => likeBack(i.swiperId)}
                    disabled={likingBack === i.swiperId}
                    className="rounded-full bg-pink-500 text-white px-4 py-2 text-xs font-bold active:scale-95 disabled:opacity-50"
                  >
                    ❤️ Like Back
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
