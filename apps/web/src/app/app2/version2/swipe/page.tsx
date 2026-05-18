'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';

/* ── Types ─────────────────────────────────────── */
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

/* ── Fallback data ─────────────────────────────── */
const FALLBACK_CARDS: Card[] = [
  { id: 'f1', type: 'job', title: 'Σερβιτόρος/α', subtitle: 'Sunset Beach Bar', city: 'Μύκονος', salary: '1.200-1.500€', tags: ['Σεζόν', 'Διαμονή'], viewsToday: 12, urgent: true },
  { id: 'f2', type: 'job', title: 'Πωλητής Retail', subtitle: 'Fashion Store', city: 'Αθήνα', salary: '900-1.200€', tags: ['Full-time'], viewsToday: 8 },
  { id: 'f3', type: 'job', title: 'Bartender', subtitle: 'Hotel Poseidon', city: 'Ρόδος', salary: '1.400-1.800€', tags: ['Full-time', 'Διαμονή', 'Σίτιση'], viewsToday: 24, urgent: true },
  { id: 'f4', type: 'job', title: 'Αποθηκάριος', subtitle: 'Express Logistics', city: 'Θεσσαλονίκη', salary: '1.100-1.400€', tags: ['Full-time'], viewsToday: 5 },
  { id: 'f5', type: 'job', title: 'Μάγειρας', subtitle: 'Ταβέρνα Θάλασσα', city: 'Κρήτη', salary: '1.300-1.600€', tags: ['Σεζόν', 'Σίτιση'], viewsToday: 9 },
];

/* ── Page ──────────────────────────────────────── */
export default function SwipePage() {
  const [cards, setCards] = useState<Card[]>(FALLBACK_CARDS);
  const [index, setIndex] = useState(0);
  const [showMatch, setShowMatch] = useState(false);
  const [swipeDir, setSwipeDir] = useState<'left' | 'right' | null>(null);
  const [todayStreak] = useState(() => Math.floor(Math.random() * 7) + 1);

  // Drag state
  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [dragging, setDragging] = useState(false);

  // Fetch real data
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/public/jobs?limit=20`);
        if (!res.ok) return;
        const json = await res.json();
        const data = json?.data;
        if (!Array.isArray(data) || data.length === 0) return;
        const real: Card[] = data.map((j: any, i: number) => ({
          id: j.id?.toString() || `r${i}`,
          type: 'job',
          title: j.title || 'Θέση εργασίας',
          subtitle: j.display_company_name || j.company_name || 'Επιχείρηση',
          city: j.city || j.region || '',
          photo: j.company_logo || j.company_cover_photo,
          salary: j.salary_min && j.salary_max ? `${j.salary_min}-${j.salary_max}€` : undefined,
          tags: [j.employment_type, j.housing_provided === 1 ? 'Διαμονή' : null, j.meals_provided === 1 ? 'Σίτιση' : null].filter(Boolean),
          viewsToday: Math.floor(Math.random() * 20) + 3,
          urgent: Math.random() > 0.7,
        }));
        setCards(real);
      } catch { /* keep fallback */ }
    })();
  }, []);

  const current = cards[index];
  const next = cards[index + 1];

  const handleSwipe = (direction: 'left' | 'right') => {
    if (!current) return;
    setSwipeDir(direction);

    // 20% chance of match on "like"
    if (direction === 'right' && Math.random() > 0.75) {
      setTimeout(() => {
        setShowMatch(true);
      }, 300);
    }

    setTimeout(() => {
      setIndex((i) => i + 1);
      setSwipeDir(null);
      setOffsetX(0);
      setOffsetY(0);
    }, 300);
  };

  // Touch/mouse handlers
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
    if (Math.abs(dx) > 100) {
      handleSwipe(dx > 0 ? 'right' : 'left');
    } else {
      setOffsetX(0);
      setOffsetY(0);
    }
  };

  const rotation = offsetX / 20;
  const opacity = 1 - Math.abs(offsetX) / 400;

  // End of stack
  if (!current) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8 text-center bg-gradient-to-b from-blue-50 to-white">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900">Αυτά για σήμερα!</h2>
        <p className="mt-2 text-gray-600">Έλα ξανά αύριο για νέες ευκαιρίες.</p>
        <button onClick={() => { setIndex(0); setCards([...FALLBACK_CARDS].sort(() => Math.random() - 0.5)); }}
          className="mt-8 rounded-full bg-blue-600 px-8 py-3 text-white font-semibold shadow-lg">
          🔄 Δες ξανά
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Top Status Bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-700">
            🔥 {todayStreak} μέρες
          </span>
        </div>
        <div className="text-lg font-extrabold">
          <span className="text-gray-900">Staff</span><span className="text-blue-500">Now</span>
        </div>
        <Link href="/app2/version2/profile" className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
          Ε
        </Link>
      </div>

      {/* Card Stack */}
      <div className="flex-1 relative px-4 pb-4">
        {/* Next card (behind) */}
        {next && (
          <div className="absolute inset-x-4 top-0 bottom-4 rounded-3xl bg-white shadow-lg scale-95 opacity-60" />
        )}

        {/* Current card */}
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
          {/* Card visual */}
          <div className="h-3/5 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 flex items-center justify-center relative">
            {current.photo ? (
              <img src={current.photo} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-8xl">{current.type === 'job' ? '💼' : '👤'}</span>
            )}

            {/* LIKE/NOPE overlay indicators */}
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

            {/* Urgent badge */}
            {current.urgent && (
              <span className="absolute top-4 right-4 flex items-center gap-1 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white shadow-lg animate-pulse">
                🔥 Επείγει
              </span>
            )}

            {/* Views today */}
            <span className="absolute bottom-4 left-4 flex items-center gap-1 rounded-full bg-black/40 backdrop-blur px-3 py-1 text-xs font-semibold text-white">
              👁️ {current.viewsToday} σήμερα
            </span>
          </div>

          {/* Card info */}
          <div className="h-2/5 p-6 flex flex-col">
            <h2 className="text-2xl font-extrabold text-gray-900">{current.title}</h2>
            <p className="mt-1 text-base text-gray-600">{current.subtitle}</p>
            <p className="mt-2 flex items-center gap-1 text-sm text-gray-500">📍 {current.city}</p>

            {current.salary && (
              <p className="mt-3 text-xl font-bold text-emerald-600">💰 {current.salary}</p>
            )}

            <div className="mt-auto flex flex-wrap gap-2">
              {current.tags.map((tag) => (
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
          onClick={() => handleSwipe('left')}
          className="h-14 w-14 rounded-full bg-white shadow-lg flex items-center justify-center text-red-500 hover:scale-110 active:scale-95 transition-transform"
        >
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <button
          className="h-12 w-12 rounded-full bg-white shadow-md flex items-center justify-center text-amber-500 hover:scale-110 active:scale-95 transition-transform"
        >
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 17.3l6.18 3.73-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.76-1.64 7.03z" />
          </svg>
        </button>

        <button
          onClick={() => handleSwipe('right')}
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
            <h1 className="text-6xl font-extrabold tracking-tight">It's a</h1>
            <h1 className="text-7xl font-extrabold tracking-tight bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">MATCH!</h1>
            <p className="mt-6 text-lg text-white/90">Και οι δύο δείξατε ενδιαφέρον</p>
            <p className="mt-1 text-2xl font-bold">{current?.title} · {current?.subtitle}</p>

            <div className="mt-10 flex flex-col gap-3 max-w-xs mx-auto">
              <Link href="/app2/version2/chat" className="rounded-full bg-white px-6 py-3.5 text-base font-bold text-purple-700 shadow-xl">
                💬 Στείλε Μήνυμα
              </Link>
              <button onClick={() => setShowMatch(false)} className="rounded-full border-2 border-white/50 px-6 py-3 text-white font-semibold">
                Συνέχισε Swiping
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
