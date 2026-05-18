'use client';

/**
 * Shared swipe deck — style ported from v5 (`/app2/version5/dashboard/swipe`):
 *  - 60/40 card with gradient photo header + white info section
 *  - LIVE strip with online count
 *  - Two action buttons (skip white + like emerald)
 *  - Grid (workers) or single-column (jobs) list view
 *  - Tap card → details
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { jobs as jobsApi, workers as workersApi, ApiError } from './api';

export interface DeckCard {
  id: string;
  type: 'job' | 'worker';
  title: string;
  subtitle: string;
  city: string;
  photo?: string;
  salary?: string;
  salaryNum: number;
  tags: string[];
  perks: string[];
  verified?: boolean;
  urgent?: boolean;
  matchPct?: number;
  viewsToday: number;
}

type View = 'swipe' | 'list';

export function SwipeDeck({ mode }: { mode: 'worker_swipes_jobs' | 'business_swipes_workers' }) {
  const router = useRouter();
  const [view, setView] = useState<View>('swipe');
  const [cards, setCards] = useState<DeckCard[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchModal, setMatchModal] = useState<{ title: string; subtitle: string; conversationId?: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [swipeDir, setSwipeDir] = useState<'left' | 'right' | null>(null);
  const [onlineCount, setOnlineCount] = useState(1847);
  const [todayStreak] = useState(() => Math.floor(Math.random() * 7) + 1);

  const dragRef = useRef({ startX: 0, startY: 0, time: 0, moved: false });
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [dragging, setDragging] = useState(false);

  const isBusiness = mode === 'business_swipes_workers';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = isBusiness
        ? (await workersApi.discover(30)).items || []
        : (await jobsApi.list({ limit: 30 })).items || [];
      const mapped: DeckCard[] = items
        .filter((x: any) => !x.is_matched)
        .map((x: any) => mapCard(x, isBusiness));
      setCards(mapped);
      setIndex(0);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Σφάλμα φόρτωσης');
    } finally {
      setLoading(false);
    }
  }, [isBusiness]);

  useEffect(() => { load(); }, [load]);

  // Cosmetic live counter
  useEffect(() => {
    const id = setInterval(() => {
      setOnlineCount((c) => Math.max(1500, c + Math.floor(Math.random() * 20) - 8));
    }, 3000);
    return () => clearInterval(id);
  }, []);

  // Loop deck when exhausted
  useEffect(() => {
    if (view === 'swipe' && !loading && cards.length > 0 && index >= cards.length) {
      setCards((cs) => [...cs].sort(() => Math.random() - 0.5));
      setIndex(0);
    }
  }, [index, cards.length, loading, view]);

  const current = cards[index];
  const next = cards[index + 1];

  const detailHref = (c: DeckCard) =>
    c.type === 'job'
      ? `/app2/version7/worker/job?id=${c.id}`
      : `/app2/version7/business/worker?id=${c.id}`;

  const doSwipe = async (action: 'like' | 'skip', card?: DeckCard) => {
    const target = card || current;
    if (!target) return;
    if (!card) setSwipeDir(action === 'like' ? 'right' : 'left');
    setActionLoading(target.id);

    try {
      if (action === 'like') {
        const result = isBusiness ? await workersApi.like(target.id) : await jobsApi.like(target.id);
        if ((result as any)?.matched) {
          setTimeout(
            () =>
              setMatchModal({
                title: target.title,
                subtitle: target.subtitle,
                conversationId: (result as any).conversationId,
              }),
            250,
          );
        }
      } else {
        await (isBusiness ? workersApi.skip(target.id) : jobsApi.skip(target.id));
      }
    } catch {} finally {
      setActionLoading(null);
    }

    if (card) {
      setCards((cs) => cs.filter((c) => c.id !== target.id));
    } else {
      setTimeout(() => {
        setIndex((i) => i + 1);
        setSwipeDir(null);
        setOffsetX(0);
        setOffsetY(0);
      }, 300);
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, time: Date.now(), moved: false };
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) dragRef.current.moved = true;
    setOffsetX(dx);
    setOffsetY(dy);
  };
  const onPointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    const { moved } = dragRef.current;

    if (Math.abs(offsetX) > 100) {
      doSwipe(offsetX > 0 ? 'like' : 'skip');
    } else if (!moved && current) {
      router.push(detailHref(current));
      setOffsetX(0);
      setOffsetY(0);
    } else {
      setOffsetX(0);
      setOffsetY(0);
    }
  };

  const rotation = offsetX / 20;
  const opacity = 1 - Math.abs(offsetX) / 400;

  const Header = (
    <>
      <div
        className="flex-shrink-0 flex items-center justify-between px-4 py-3"
        style={{ paddingTop: 'calc(12px + env(safe-area-inset-top))' }}
      >
        <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-700">
          🔥 {todayStreak}
        </span>

        <div className="flex rounded-full bg-gray-200 p-0.5">
          <button
            type="button"
            onClick={() => setView('swipe')}
            className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${view === 'swipe' ? 'bg-white text-gray-900 shadow' : 'text-gray-500'}`}
          >
            🎯 Swipe
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${view === 'list' ? 'bg-white text-gray-900 shadow' : 'text-gray-500'}`}
          >
            📋 Λίστα
          </button>
        </div>

        <button
          type="button"
          onClick={load}
          aria-label="Ανανέωση"
          className="p-1.5 rounded-full hover:bg-gray-200"
        >
          <svg className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" d="M16.023 9.348h4.992M2.985 19.644v-4.992m0 0h4.992m-4.992 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </button>
      </div>

      <div className="flex-shrink-0 px-4 pb-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[10px] font-semibold text-emerald-700">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          <span className="tabular-nums">{onlineCount.toLocaleString('el-GR')}</span> online · {cards.length} {isBusiness ? 'υποψήφιοι' : 'θέσεις'}
        </span>
      </div>
    </>
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="h-10 w-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="h-full flex flex-col bg-gradient-to-b from-gray-50 to-gray-100">
        {Header}
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="text-5xl">⚠️</div>
          <h2 className="mt-3 text-xl font-bold text-gray-900">Σφάλμα φόρτωσης</h2>
          <p className="mt-1 text-sm text-gray-600">{error}</p>
          <button onClick={load} className="mt-5 rounded-full bg-blue-600 px-6 py-2.5 text-white font-bold shadow-lg">
            Δοκίμασε ξανά
          </button>
        </div>
      </div>
    );
  }
  if (cards.length === 0) {
    return (
      <div className="h-full flex flex-col bg-gradient-to-b from-blue-50 to-white">
        {Header}
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900">Τα είδες όλα!</h2>
          <p className="mt-2 text-gray-600">Έλα ξανά αργότερα για νέες {isBusiness ? 'προτάσεις' : 'ευκαιρίες'}.</p>
          <button onClick={load} className="mt-6 rounded-full bg-blue-600 px-8 py-3 text-white font-semibold shadow-lg">
            🔄 Ανανέωση
          </button>
        </div>
      </div>
    );
  }

  // ─────────── List view ───────────
  if (view === 'list') {
    return (
      <div className="h-full flex flex-col bg-gradient-to-b from-gray-50 to-gray-100 overflow-hidden">
        {Header}
        <div className="flex-1 overflow-y-auto px-4 pb-24 pt-1">
          {isBusiness ? (
            <div className="grid grid-cols-2 gap-3">
              {cards.map((w) => (
                <WorkerTile
                  key={w.id}
                  card={w}
                  onLike={() => doSwipe('like', w)}
                  onSkip={() => doSwipe('skip', w)}
                  loading={actionLoading === w.id}
                  href={detailHref(w)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {cards.map((j) => (
                <JobRow
                  key={j.id}
                  card={j}
                  onLike={() => doSwipe('like', j)}
                  onSkip={() => doSwipe('skip', j)}
                  loading={actionLoading === j.id}
                  href={detailHref(j)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─────────── Swipe view ───────────
  if (!current) return null;

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-50 to-gray-100 overflow-hidden">
      {Header}

      <div className="flex-1 relative px-4 pb-4">
        {next && <div className="absolute inset-x-4 top-0 bottom-4 rounded-3xl bg-white shadow-lg scale-95 opacity-60" />}

        <div
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
          {/* 60% gradient photo header */}
          <div className={`h-3/5 bg-gradient-to-br ${current.type === 'job' ? 'from-blue-500 via-indigo-600 to-purple-700' : 'from-pink-500 via-rose-500 to-red-500'} flex items-center justify-center relative`}>
            {current.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.photo} alt="" className="h-full w-full object-cover pointer-events-none" />
            ) : (
              <span className="text-8xl">{current.type === 'job' ? '💼' : '👤'}</span>
            )}

            {offsetX > 50 && (
              <div className="absolute top-8 left-8 rounded-2xl border-4 border-emerald-500 px-4 py-2 rotate-[-20deg] pointer-events-none">
                <span className="text-3xl font-extrabold text-emerald-500">LIKE</span>
              </div>
            )}
            {offsetX < -50 && (
              <div className="absolute top-8 right-8 rounded-2xl border-4 border-red-500 px-4 py-2 rotate-[20deg] pointer-events-none">
                <span className="text-3xl font-extrabold text-red-500">NOPE</span>
              </div>
            )}

            {current.urgent && (
              <span className="absolute top-4 right-4 flex items-center gap-1 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white shadow-lg animate-pulse">
                🔥 {current.type === 'job' ? 'Επείγει' : 'Άμεσα'}
              </span>
            )}

            <span className="absolute bottom-4 left-4 flex items-center gap-1 rounded-full bg-black/40 backdrop-blur px-3 py-1 text-xs font-semibold text-white">
              👁️ {current.viewsToday} σήμερα
            </span>
          </div>

          {/* 40% info */}
          <div className="h-2/5 p-6 flex flex-col">
            <h2 className="text-2xl font-extrabold text-gray-900">{current.title}</h2>
            <p className="mt-1 text-base text-gray-600">{current.subtitle}</p>
            {current.city && <p className="mt-2 flex items-center gap-1 text-sm text-gray-500">📍 {current.city}</p>}
            {current.salary && <p className="mt-3 text-xl font-bold text-emerald-600">💰 {current.salary}</p>}
            <div className="mt-auto flex flex-wrap gap-2">
              {[...current.tags, ...current.perks].slice(0, 4).map((tag, i) => (
                <span key={i} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex-shrink-0 flex items-center justify-center gap-6 py-4 px-4">
        <button
          onClick={() => doSwipe('skip')}
          disabled={!!actionLoading}
          aria-label="Παράλειψη"
          className="h-14 w-14 rounded-full bg-white shadow-lg flex items-center justify-center text-red-500 hover:scale-110 active:scale-95 transition-transform disabled:opacity-50"
        >
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <button
          onClick={() => doSwipe('like')}
          disabled={!!actionLoading}
          aria-label="Με ενδιαφέρει"
          className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-xl flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-transform disabled:opacity-50"
        >
          <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21s-7-4.534-7-10a5 5 0 019-3 5 5 0 019 3c0 5.466-7 10-7 10z" />
          </svg>
        </button>
      </div>

      {matchModal && (
        <MatchModal
          title={matchModal.title}
          subtitle={matchModal.subtitle}
          conversationId={matchModal.conversationId}
          isBusiness={isBusiness}
          onClose={() => setMatchModal(null)}
        />
      )}
    </div>
  );
}

// ─────────── List items ───────────

function WorkerTile({
  card, onLike, onSkip, loading, href,
}: { card: DeckCard; onLike: () => void; onSkip: () => void; loading: boolean; href: string }) {
  return (
    <div className="rounded-2xl bg-white overflow-hidden shadow-sm border border-gray-100">
      <Link href={href} className="block relative aspect-square bg-gradient-to-br from-purple-200 to-pink-200 flex items-center justify-center">
        {card.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-5xl font-black text-purple-700">{card.title[0]?.toUpperCase()}</span>
        )}
        {card.matchPct != null && (
          <span className="absolute top-2 left-2 rounded-full bg-white/95 backdrop-blur px-2 py-0.5 text-[10px] font-black text-emerald-700">
            {card.matchPct}%
          </span>
        )}
        {card.urgent && (
          <span className="absolute top-2 right-2 rounded-full bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />LIVE
          </span>
        )}
        {card.verified && (
          <span className="absolute bottom-2 right-2 rounded-full bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5">✓</span>
        )}
      </Link>
      <div className="p-3">
        <Link href={href} className="block">
          <p className="font-bold text-gray-900 text-sm truncate">{card.title}</p>
          <p className="text-xs text-gray-500 truncate">{card.subtitle}</p>
          {card.city && <p className="mt-1 text-[10px] text-gray-400 truncate">📍 {card.city}</p>}
        </Link>
        <div className="mt-2 flex gap-1.5">
          <button onClick={onSkip} disabled={loading} className="flex-1 rounded-full bg-red-50 text-red-600 py-1.5 text-xs font-bold active:scale-95 disabled:opacity-50">✕</button>
          <button onClick={onLike} disabled={loading} className="flex-[2] rounded-full bg-emerald-600 text-white py-1.5 text-xs font-bold active:scale-95 disabled:opacity-50">💬 Σύνδεση</button>
        </div>
      </div>
    </div>
  );
}

function JobRow({
  card, onLike, onSkip, loading, href,
}: { card: DeckCard; onLike: () => void; onSkip: () => void; loading: boolean; href: string }) {
  const salaryColor =
    card.salaryNum >= 3000 ? 'text-orange-600'
    : card.salaryNum >= 1500 ? 'text-emerald-600'
    : 'text-gray-900';
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
      <div className="flex gap-3">
        <Link href={href} className="flex-shrink-0 h-14 w-14 rounded-xl overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-xl font-bold text-blue-700">
          {card.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.photo} alt="" className="h-full w-full object-cover" />
          ) : (
            (card.subtitle || card.title)[0]?.toUpperCase()
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={href} className="block">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 truncate">{card.title}</p>
                <p className="text-xs text-gray-500 truncate">{card.subtitle}</p>
              </div>
              {card.urgent && (
                <span className="flex-shrink-0 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-bold text-red-600">🔥</span>
              )}
            </div>
            {card.city && <p className="mt-1 text-xs text-gray-500">📍 {card.city}</p>}
          </Link>
          <div className="mt-2 flex items-center justify-between gap-2">
            {card.salary ? (
              <p className={`text-base font-extrabold ${salaryColor}`}>💰 {card.salary}</p>
            ) : <span />}
            <div className="flex gap-1.5">
              <button onClick={onSkip} disabled={loading} className="rounded-full bg-gray-100 text-gray-600 px-3 py-1.5 text-xs font-bold active:scale-95 disabled:opacity-50">✕</button>
              <button onClick={onLike} disabled={loading} className="rounded-full bg-emerald-600 text-white px-4 py-1.5 text-xs font-bold active:scale-95 disabled:opacity-50">❤️ Ενδιαφέρον</button>
            </div>
          </div>
          {card.perks.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {card.perks.map((p) => (
                <span key={p} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{p}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────── Match modal ───────────

function MatchModal({
  title, subtitle, conversationId, isBusiness, onClose,
}: {
  title: string;
  subtitle: string;
  conversationId?: string;
  isBusiness: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-pink-600 via-purple-600 to-blue-700 px-8"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="text-center text-white">
        <div className="text-7xl mb-4 animate-bounce">🎉</div>
        <h1 className="text-5xl font-extrabold tracking-tight">Κάνατε</h1>
        <h1 className="text-6xl font-extrabold tracking-tight bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
          ΤΑΙΡΙΑΣΜΑ!
        </h1>
        <p className="mt-6 text-base text-white/90">Και οι δύο δείξατε ενδιαφέρον</p>
        <p className="mt-1 text-xl font-bold">{title}</p>
        <p className="text-sm opacity-80">{subtitle}</p>
      </div>
      <div className="mt-8 flex flex-col gap-3 max-w-xs w-full">
        <button
          onClick={() => {
            const target = conversationId
              ? (isBusiness
                  ? `/app2/version7/business/chat?id=${conversationId}`
                  : `/app2/version7/worker/chat?id=${conversationId}`)
              : (isBusiness
                  ? '/app2/version7/business/messages'
                  : '/app2/version7/worker/messages');
            router.push(target);
          }}
          className="rounded-full bg-white px-6 py-3.5 text-base font-bold text-purple-700 shadow-xl"
        >
          💬 Στείλε Μήνυμα
        </button>
        <button onClick={onClose} className="rounded-full border-2 border-white/50 px-6 py-3 text-white font-semibold">
          Συνέχισε
        </button>
      </div>
    </div>
  );
}

// ─────────── Mappers ───────────

function mapCard(x: any, isBusiness: boolean): DeckCard {
  if (isBusiness) {
    return {
      id: x.user_id || x.id,
      type: 'worker',
      title: x.full_name || x.display_name || 'Εργαζόμενος',
      subtitle: humaniseRole(x.roles?.[0]) || x.title || 'Εργαζόμενος',
      city: [x.city, x.region].filter(Boolean).join(', '),
      photo: x.photo_url || x.avatar_url,
      salary: x.expected_monthly_salary
        ? `${Number(x.expected_monthly_salary).toLocaleString('el-GR')}€/μήνα`
        : undefined,
      salaryNum: Number(x.expected_monthly_salary) || 0,
      tags: [
        x.years_of_experience ? `${x.years_of_experience} έτη` : null,
        humaniseAvail(x.availability),
      ].filter(Boolean) as string[],
      perks: [],
      verified: x.verified === 1 || !!x.verified,
      urgent: x.availability === 'immediate',
      matchPct: 75 + Math.floor(Math.random() * 25),
      viewsToday: Math.floor(Math.random() * 8) + 1,
    };
  }
  const min = Number(x.salary_min) || null;
  const max = Number(x.salary_max) || null;
  return {
    id: x.id,
    type: 'job',
    title: x.title || 'Θέση εργασίας',
    subtitle: x.business_name || x.display_company_name || x.company_name || 'Επιχείρηση',
    city: [x.city, x.region].filter(Boolean).join(', '),
    photo: x.business_logo || x.company_logo || x.company_cover_photo,
    salary: min || max ? formatSalary(min, max, x.salary_type || 'monthly') : undefined,
    salaryNum: max || min || 0,
    tags: [
      humaniseEmployment(x.employment_type),
      x.shift_type ? humaniseShift(x.shift_type) : null,
    ].filter(Boolean) as string[],
    perks: [
      x.housing_provided ? '🏠 Διαμονή' : null,
      x.meals_provided ? '🍽️ Σίτιση' : null,
      x.transport_provided ? '🚌 Μεταφορά' : null,
      x.bonus_provided ? '💎 Bonus' : null,
    ].filter(Boolean) as string[],
    verified: x.business_verified === 1 || !!x.business_verified,
    urgent: false,
    viewsToday: Math.floor(Math.random() * 20) + 3,
  };
}

function formatSalary(min: number | null, max: number | null, type: string): string {
  const suf = type === 'hourly' ? '€/ώρα' : type === 'daily' ? '€/μέρα' : '€/μήνα';
  if (min && max) return `${min}-${max} ${suf}`;
  if (min) return `Από ${min} ${suf}`;
  if (max) return `Έως ${max} ${suf}`;
  return 'Συζητήσιμα';
}
function humaniseEmployment(t?: string): string | null {
  if (!t) return null;
  return ({ full_time: 'Πλήρης', part_time: 'Μερική', seasonal: 'Σεζόν' } as any)[t] || t;
}
function humaniseShift(t?: string): string | null {
  if (!t) return null;
  return ({ morning: '🌅 Πρωί', evening: '🌃 Βράδυ', split: '⏱️ Σπαστό', flexible: '⚡ Ευέλικτο' } as any)[t] || t;
}
function humaniseAvail(t?: string): string | null {
  if (!t) return null;
  return ({ immediate: 'Άμεσα', within_week: 'Εντός εβδομάδας', within_month: 'Εντός μήνα' } as any)[t] || t;
}
function humaniseRole(id?: string): string | null {
  if (!id) return null;
  return id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
