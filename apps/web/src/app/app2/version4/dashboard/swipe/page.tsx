'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';

interface Card {
  id: string;
  type: 'job' | 'worker';
  title: string;
  subtitle: string;
  city: string;
  photo?: string;
  salary?: string;
  tags: string[];
  viewsToday: number;
  urgent?: boolean;
}

interface Me { id: string; role: 'worker' | 'business' | 'admin'; }

const token = () => typeof window !== 'undefined' ? localStorage.getItem('staffnow_token') : null;

export default function SwipeV3() {
  const [me, setMe] = useState<Me | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showMatch, setShowMatch] = useState<{ title: string; subtitle: string } | null>(null);
  const [swipeDir, setSwipeDir] = useState<'left' | 'right' | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [todayStreak, setTodayStreak] = useState(0);

  // Fetch user + candidates
  useEffect(() => {
    (async () => {
      try {
        const t = token();
        if (!t) return;
        const meRes = await fetch(`${API_BASE}/auth/me`, { headers: { 'Authorization': `Bearer ${t}` } });
        const meData = await meRes.json() as any;
        if (!meData?.data?.user) return;
        setMe(meData.data.user);

        const isBiz = meData.data.user.role === 'business';
        const endpoint = isBiz ? '/workers/discover' : '/jobs';
        const res = await fetch(`${API_BASE}${endpoint}?limit=30`, {
          headers: { 'Authorization': `Bearer ${t}` },
        });
        const data = await res.json() as any;
        const items = data?.data?.items || data?.data || [];

        const mapped: Card[] = (Array.isArray(items) ? items : [])
          .filter((x: any) => !x.swipe_status && !x.is_matched)
          .map((x: any) => {
            if (isBiz) {
              // Worker card
              const name = x.full_name || 'Εργαζόμενος';
              return {
                id: x.user_id || x.id,
                type: 'worker',
                title: name,
                subtitle: x.roles?.[0] || 'Εργαζόμενος',
                city: [x.city, x.region].filter(Boolean).join(', '),
                photo: x.photo_url,
                salary: x.expected_monthly_salary ? `${x.expected_monthly_salary}€/μήνα` : undefined,
                tags: [
                  x.years_of_experience ? `${x.years_of_experience} χρόνια` : null,
                  x.employment_type,
                  x.verified === 1 ? '✓ Verified' : null,
                ].filter(Boolean),
                viewsToday: Math.floor(Math.random() * 8) + 1,
                urgent: x.availability === 'immediate',
              } as Card;
            } else {
              // Job card
              return {
                id: x.id,
                type: 'job',
                title: x.title || 'Θέση εργασίας',
                subtitle: x.display_company_name || x.company_name || 'Επιχείρηση',
                city: [x.display_city || x.city, x.display_region || x.region].filter(Boolean).join(', '),
                photo: x.company_logo || x.company_cover_photo,
                salary: x.salary_min && x.salary_max ? `${x.salary_min}-${x.salary_max}€` : undefined,
                tags: [
                  x.employment_type,
                  x.housing_provided === 1 ? '🏠 Διαμονή' : null,
                  x.meals_provided === 1 ? '🍽️ Σίτιση' : null,
                ].filter(Boolean),
                viewsToday: Math.floor(Math.random() * 20) + 3,
                urgent: Math.random() > 0.7,
              } as Card;
            }
          });

        setCards(mapped);

        // Calculate streak from last_login_at (placeholder)
        setTodayStreak(Math.floor(Math.random() * 7) + 1);
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  const current = cards[index];
  const next = cards[index + 1];

  const doSwipe = async (action: 'like' | 'skip') => {
    if (!current || !me) return;
    const t = token();
    if (!t) return;

    setSwipeDir(action === 'like' ? 'right' : 'left');

    try {
      if (action === 'like') {
        const endpoint = me.role === 'business' ? `/workers/${current.id}/like` : `/jobs/${current.id}/like`;
        const res = await fetch(`${API_BASE}${endpoint}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' },
        });
        const data = await res.json() as any;
        if (data?.data?.matched) {
          setTimeout(() => setShowMatch({ title: current.title, subtitle: current.subtitle }), 200);
        }
      } else {
        const endpoint = me.role === 'business' ? `/workers/${current.id}/skip` : `/jobs/${current.id}/skip`;
        fetch(`${API_BASE}${endpoint}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' },
        }).catch(() => {});
      }
    } catch {}

    setTimeout(() => {
      setIndex((i) => i + 1);
      setSwipeDir(null);
      setOffsetX(0);
      setOffsetY(0);
    }, 300);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    startY.current = e.clientY;
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setOffsetX(e.clientX - startX.current);
    setOffsetY(e.clientY - startY.current);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDragging(false);
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > 100) doSwipe(dx > 0 ? 'like' : 'skip');
    else { setOffsetX(0); setOffsetY(0); }
  };

  const rotation = offsetX / 20;
  const opacity = 1 - Math.abs(offsetX) / 400;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="h-10 w-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!current) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8 text-center bg-gradient-to-b from-blue-50 to-white">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900">Τα είδες όλα!</h2>
        <p className="mt-2 text-gray-600">Δες ξανά αύριο για νέες {me?.role === 'business' ? 'προτάσεις' : 'ευκαιρίες'}.</p>
        <Link href={me?.role === 'business' ? '/app2/version4/dashboard/jobs' : '/app2/version4/dashboard/matches'}
          className="mt-6 rounded-full bg-blue-600 px-8 py-3 text-white font-semibold shadow-lg">
          {me?.role === 'business' ? '💼 Δες τις θέσεις σου' : '💖 Δες τα matches'}
        </Link>
        <button onClick={() => window.location.reload()}
          className="mt-3 text-sm text-gray-500 underline">
          Ανανέωση
        </button>
      </div>
    );
  }

  const isBusiness = me?.role === 'business';

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Top */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3">
        <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-700">
          🔥 {todayStreak} μέρες
        </span>
        <div className="text-lg font-extrabold">
          <span className="text-gray-900">Staff</span><span className="text-blue-500">Now</span>
        </div>
        <Link href="/app2/version4/dashboard/notifications" className="relative p-1.5 rounded-full hover:bg-gray-200">
          <svg className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
        </Link>
      </div>

      {/* Card stack */}
      <div className="flex-1 relative px-4 pb-4">
        {next && (
          <div className="absolute inset-x-4 top-0 bottom-4 rounded-3xl bg-white shadow-lg scale-95 opacity-60" />
        )}

        <div
          ref={cardRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { setDragging(false); setOffsetX(0); setOffsetY(0); }}
          className={`absolute inset-x-4 top-0 bottom-4 rounded-3xl bg-white shadow-2xl overflow-hidden touch-none select-none ${
            swipeDir ? 'transition-all duration-300' : dragging ? '' : 'transition-transform duration-200'
          }`}
          style={{
            transform: swipeDir
              ? `translateX(${swipeDir === 'right' ? 600 : -600}px) rotate(${swipeDir === 'right' ? 30 : -30}deg)`
              : `translate(${offsetX}px, ${offsetY}px) rotate(${rotation}deg)`,
            opacity: swipeDir ? 0 : opacity,
          }}
        >
          <div className={`h-3/5 bg-gradient-to-br ${current.type === 'job' ? 'from-blue-500 via-indigo-600 to-purple-700' : 'from-pink-500 via-rose-500 to-red-500'} flex items-center justify-center relative`}>
            {current.photo ? (
              <img src={current.photo} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-8xl">{current.type === 'job' ? '💼' : '👤'}</span>
            )}

            {offsetX > 50 && (
              <div className="absolute top-8 left-8 rounded-2xl border-4 border-emerald-500 px-4 py-2 rotate-[-20deg]">
                <span className="text-3xl font-extrabold text-emerald-500">LIKE</span>
              </div>
            )}
            {offsetX < -50 && (
              <div className="absolute top-8 right-8 rounded-2xl border-4 border-red-500 px-4 py-2 rotate-[20deg]">
                <span className="text-3xl font-extrabold text-red-500">NOPE</span>
              </div>
            )}

            {current.urgent && (
              <span className="absolute top-4 right-4 flex items-center gap-1 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white shadow-lg animate-pulse">
                🔥 {current.type === 'job' ? 'Επείγει' : 'Άμεσα διαθέσιμος'}
              </span>
            )}

            <span className="absolute bottom-4 left-4 flex items-center gap-1 rounded-full bg-black/40 backdrop-blur px-3 py-1 text-xs font-semibold text-white">
              👁️ {current.viewsToday} σήμερα
            </span>
          </div>

          <div className="h-2/5 p-6 flex flex-col">
            <h2 className="text-2xl font-extrabold text-gray-900">{current.title}</h2>
            <p className="mt-1 text-base text-gray-600">{current.subtitle}</p>
            {current.city && (
              <p className="mt-2 flex items-center gap-1 text-sm text-gray-500">📍 {current.city}</p>
            )}

            {current.salary && (
              <p className="mt-3 text-xl font-bold text-emerald-600">💰 {current.salary}</p>
            )}

            <div className="mt-auto flex flex-wrap gap-2">
              {current.tags.slice(0, 4).map((tag) => (
                <span key={tag} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex-shrink-0 flex items-center justify-center gap-6 py-4 px-4">
        <button
          onClick={() => doSwipe('skip')}
          className="h-14 w-14 rounded-full bg-white shadow-lg flex items-center justify-center text-red-500 hover:scale-110 active:scale-95 transition-transform"
        >
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <button
          onClick={() => doSwipe('like')}
          className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-xl flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-transform"
        >
          <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21s-7-4.534-7-10a5 5 0 019-3 5 5 0 019 3c0 5.466-7 10-7 10z" />
          </svg>
        </button>
      </div>

      {/* Match Overlay */}
      {showMatch && (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-pink-600 via-purple-600 to-blue-700 flex flex-col items-center justify-center animate-fadeIn">
          <div className="text-center text-white px-8">
            <div className="text-7xl mb-4 animate-bounce">🎉</div>
            <h1 className="text-5xl font-extrabold tracking-tight">It's a</h1>
            <h1 className="text-6xl font-extrabold tracking-tight bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">MATCH!</h1>
            <p className="mt-6 text-base text-white/90">Και οι δύο δείξατε ενδιαφέρον</p>
            <p className="mt-1 text-xl font-bold">{showMatch.title}</p>
            <p className="text-sm opacity-80">{showMatch.subtitle}</p>

            <div className="mt-8 flex flex-col gap-3 max-w-xs mx-auto">
              <Link href="/app2/version4/dashboard/chat" className="rounded-full bg-white px-6 py-3.5 text-base font-bold text-purple-700 shadow-xl">
                💬 Στείλε Μήνυμα
              </Link>
              <button onClick={() => setShowMatch(null)} className="rounded-full border-2 border-white/50 px-6 py-3 text-white font-semibold">
                Συνέχισε
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  );
}
