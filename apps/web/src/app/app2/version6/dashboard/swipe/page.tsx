'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '../../_lib/use-user';
import { jobs, workers, ApiError } from '../../_lib/api';
import { Avatar, EmptyState, FullPageSpinner, Pill, Spinner, VerifiedBadge } from '../../_lib/ui';
import { roleLabel, formatSalary, employmentLabel, businessTypeLabel } from '../../_lib/format';
import { haptic } from '../../_lib/haptics';

interface Card {
  id: string;
  type: 'job' | 'worker';
  title: string;
  subtitle: string;
  city: string;
  photo?: string;
  salary?: string;
  tags: string[];
  perks: string[];
  verified?: boolean;
  description?: string;
  raw: any;
}

export default function SwipeV6() {
  const router = useRouter();
  const { user, loading: loadingUser } = useUser();
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchModal, setMatchModal] = useState<{ title: string; subtitle: string; conversationId?: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // drag state
  const dragRef = useRef({ startX: 0, startY: 0, moved: false, time: 0 });
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exitDir, setExitDir] = useState<'left' | 'right' | null>(null);

  const isBusiness = user?.role === 'business';

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const items = isBusiness
        ? (await workers.discover(30)).items || []
        : (await jobs.list({ limit: 30 })).items || [];
      const mapped: Card[] = items
        .filter((x: any) => !x.is_matched)
        .map((x: any) => mapCard(x, isBusiness));
      setCards(mapped);
      setIndex(0);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Σφάλμα φόρτωσης');
    } finally {
      setLoading(false);
    }
  }, [user, isBusiness]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  if (loadingUser || !user) return <FullPageSpinner />;

  const current = cards[index];
  const next = cards[index + 1];

  const doSwipe = async (action: 'like' | 'skip') => {
    if (!current || actionLoading) return;
    setExitDir(action === 'like' ? 'right' : 'left');
    haptic(action === 'like' ? 'medium' : 'light');
    setActionLoading(current.id);

    try {
      const result =
        action === 'like'
          ? isBusiness
            ? await workers.like(current.id)
            : await jobs.like(current.id)
          : isBusiness
            ? await workers.skip(current.id)
            : await jobs.skip(current.id);

      if (action === 'like' && (result as any)?.matched) {
        haptic('success');
        const matched = result as { matched: boolean; conversationId?: string };
        setTimeout(
          () =>
            setMatchModal({
              title: current.title,
              subtitle: current.subtitle,
              conversationId: matched.conversationId,
            }),
          250,
        );
      }
    } catch (e) {
      // Show subtle error but don't block UX — restore index
      console.warn('Swipe failed', e);
    } finally {
      setActionLoading(null);
    }

    setTimeout(() => {
      setIndex((i) => i + 1);
      setOffsetX(0);
      setOffsetY(0);
      setExitDir(null);
    }, 220);
  };

  // Pointer handlers
  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      time: Date.now(),
    };
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
      // tap → preview (open profile panel)
      router.push(
        `/app2/version6/dashboard/profile/view?id=${encodeURIComponent(current.id)}&type=${current.type}`,
      );
      setOffsetX(0);
      setOffsetY(0);
    } else {
      setOffsetX(0);
      setOffsetY(0);
    }
  };

  // Body
  if (loading) return <FullPageSpinner />;

  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Δεν φόρτωσαν τα προφίλ"
        description={error}
        action={
          <button onClick={load} className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white">
            Δοκίμασε ξανά
          </button>
        }
      />
    );
  }

  if (!current) {
    return (
      <EmptyState
        icon="🎉"
        title="Είσαι ενημερωμένος!"
        description={
          isBusiness ? 'Δεν υπάρχουν νέα προφίλ τώρα. Έλα ξανά αργότερα.' : 'Δεν υπάρχουν νέες αγγελίες. Έλα ξανά αργότερα.'
        }
        action={
          <button onClick={load} className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white">
            Ανανέωση
          </button>
        }
      />
    );
  }

  const rotation = offsetX / 22;
  const likeOpacity = Math.max(0, Math.min(1, offsetX / 100));
  const skipOpacity = Math.max(0, Math.min(1, -offsetX / 100));

  return (
    <div className="h-full flex flex-col bg-gray-100">
      <div className="flex-shrink-0 px-4 pt-3 pb-2 flex items-center justify-between">
        <h1 className="text-base font-bold text-gray-900">{isBusiness ? 'Ανακάλυψη υποψηφίων' : 'Ανακάλυψη αγγελιών'}</h1>
        <button
          onClick={load}
          className="text-xs font-semibold text-blue-600 active:text-blue-800"
          aria-label="Ανανέωση"
        >
          Ανανέωση
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {/* Next card */}
        {next && (
          <CardView
            card={next}
            style={{
              transform: 'translate(-50%, -50%) scale(0.94)',
              opacity: 0.6,
            }}
          />
        )}

        {/* Current card */}
        <CardView
          card={current}
          dragging={dragging}
          style={{
            transform:
              exitDir === 'right'
                ? 'translate(calc(-50% + 130vw), -50%) rotate(40deg)'
                : exitDir === 'left'
                  ? 'translate(calc(-50% - 130vw), -50%) rotate(-40deg)'
                  : `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY * 0.5}px)) rotate(${rotation}deg)`,
            transition: dragging ? 'none' : 'transform 220ms ease-out',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          likeOpacity={likeOpacity}
          skipOpacity={skipOpacity}
        />
      </div>

      {/* Action bar */}
      <div className="flex-shrink-0 px-6 pt-2 pb-5 flex items-center justify-center gap-6">
        <ActionButton onClick={() => doSwipe('skip')} disabled={!!actionLoading} label="Παράλειψη" tone="neutral">
          ✕
        </ActionButton>
        <ActionButton onClick={() => current && router.push(`/app2/version6/dashboard/profile/view?id=${current.id}&type=${current.type}`)} label="Προβολή" tone="info" small>
          ℹ️
        </ActionButton>
        <ActionButton onClick={() => doSwipe('like')} disabled={!!actionLoading} label="Ενδιαφέρον" tone="success">
          ❤️
        </ActionButton>
      </div>

      {matchModal && (
        <MatchModal
          title={matchModal.title}
          subtitle={matchModal.subtitle}
          conversationId={matchModal.conversationId}
          onClose={() => setMatchModal(null)}
        />
      )}
    </div>
  );
}

function CardView({
  card,
  style,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  dragging,
  likeOpacity = 0,
  skipOpacity = 0,
}: {
  card: Card;
  style?: React.CSSProperties;
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerMove?: (e: React.PointerEvent) => void;
  onPointerUp?: () => void;
  dragging?: boolean;
  likeOpacity?: number;
  skipOpacity?: number;
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="absolute left-1/2 top-1/2 w-[88vw] max-w-[420px] aspect-[3/4.4] rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden touch-none select-none"
      style={style}
    >
      {/* Photo */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300">
        {card.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.photo} alt="" className="h-full w-full object-cover pointer-events-none" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-7xl">
            {card.type === 'job' ? '🏢' : '👤'}
          </div>
        )}
      </div>

      {/* Top labels */}
      <div
        className="absolute top-6 left-6 rounded-2xl border-4 border-emerald-400 px-4 py-1.5 text-xl font-black text-emerald-400 -rotate-12 pointer-events-none"
        style={{ opacity: likeOpacity }}
      >
        LIKE
      </div>
      <div
        className="absolute top-6 right-6 rounded-2xl border-4 border-rose-400 px-4 py-1.5 text-xl font-black text-rose-400 rotate-12 pointer-events-none"
        style={{ opacity: skipOpacity }}
      >
        NOPE
      </div>

      {/* Bottom gradient + text */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5 text-white">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-black truncate">{card.title}</h2>
          {card.verified && <VerifiedBadge className="h-5 w-5" />}
        </div>
        <p className="mt-0.5 text-sm font-semibold opacity-90 truncate">{card.subtitle}</p>
        {card.city && (
          <p className="mt-1 text-xs opacity-80 truncate flex items-center gap-1">📍 {card.city}</p>
        )}
        {card.salary && (
          <p className="mt-1 text-sm font-bold text-emerald-300">{card.salary}</p>
        )}
        {(card.tags.length > 0 || card.perks.length > 0) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {card.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-white/20 backdrop-blur px-2.5 py-0.5 text-[11px] font-bold">
                {tag}
              </span>
            ))}
            {card.perks.map((perk) => (
              <span key={perk} className="rounded-full bg-white/20 backdrop-blur px-2.5 py-0.5 text-[11px] font-bold">
                {perk}
              </span>
            ))}
          </div>
        )}
        <p className="mt-3 text-[11px] opacity-70">Πάτα για περισσότερα · Σύρε ➜ ή ⬅</p>
      </div>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  label,
  tone,
  disabled,
  small,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  tone: 'success' | 'neutral' | 'info';
  disabled?: boolean;
  small?: boolean;
}) {
  const sizeClass = small ? 'h-12 w-12 text-lg' : 'h-16 w-16 text-2xl';
  const toneClass: Record<string, string> = {
    success: 'bg-white ring-2 ring-emerald-300 text-emerald-500 active:bg-emerald-50',
    neutral: 'bg-white ring-2 ring-rose-200 text-rose-500 active:bg-rose-50',
    info: 'bg-white ring-2 ring-blue-200 text-blue-500 active:bg-blue-50',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`flex-shrink-0 ${sizeClass} flex items-center justify-center rounded-full shadow-lg transition-transform active:scale-95 disabled:opacity-50 ${toneClass[tone]}`}
    >
      {children}
    </button>
  );
}

function MatchModal({
  title,
  subtitle,
  conversationId,
  onClose,
}: {
  title: string;
  subtitle: string;
  conversationId?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-pink-600 via-purple-600 to-blue-700 animate-fadeIn px-8"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="text-center text-white">
        <div className="text-7xl mb-4 animate-bounce">🎉</div>
        <h1 className="text-4xl font-extrabold tracking-tight">Κάνατε</h1>
        <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
          ΤΑΙΡΙΑΣΜΑ!
        </h1>
        <p className="mt-6 text-base text-white/90">Και οι δύο δείξατε ενδιαφέρον</p>
        <p className="mt-2 text-xl font-bold">{title}</p>
        <p className="text-sm opacity-80">{subtitle}</p>
      </div>
      <div className="mt-10 w-full max-w-xs space-y-3">
        <button
          onClick={() => {
            const target = conversationId
              ? `/app2/version6/dashboard/chat?id=${conversationId}`
              : '/app2/version6/dashboard/chat';
            router.push(target);
          }}
          className="w-full rounded-full bg-white px-6 py-3.5 text-base font-bold text-purple-700 shadow-xl"
        >
          💬 Στείλε μήνυμα
        </button>
        <button
          onClick={onClose}
          className="w-full rounded-full border-2 border-white/50 px-6 py-3 text-white font-semibold"
        >
          Συνέχισε
        </button>
      </div>
    </div>
  );
}

function mapCard(x: any, isBusiness: boolean): Card {
  if (isBusiness) {
    // Worker
    return {
      id: x.user_id || x.id,
      type: 'worker',
      title: x.full_name || 'Εργαζόμενος',
      subtitle: roleLabel(x.roles?.[0]) || 'Εργαζόμενος',
      city: [x.city, x.region].filter(Boolean).join(', '),
      photo: x.photo_url,
      salary: x.expected_monthly_salary
        ? `${Number(x.expected_monthly_salary).toLocaleString('el-GR')}€/μήνα`
        : undefined,
      tags: [
        x.years_of_experience ? `${x.years_of_experience} έτη` : null,
        employmentLabel(x.availability),
      ].filter(Boolean) as string[],
      perks: [],
      verified: x.verified === 1,
      description: x.bio,
      raw: x,
    };
  }
  // Job
  const min = Number(x.salary_min) || null;
  const max = Number(x.salary_max) || null;
  return {
    id: x.id,
    type: 'job',
    title: x.title || 'Θέση εργασίας',
    subtitle: x.display_company_name || x.company_name || 'Επιχείρηση',
    city: [x.display_city || x.city, x.display_region || x.region].filter(Boolean).join(', '),
    photo: x.company_logo || x.company_cover_photo,
    salary: min || max ? formatSalary(min, max, x.salary_type || 'monthly') : undefined,
    tags: [
      employmentLabel(x.employment_type),
      x.branch_business_type ? businessTypeLabel(x.branch_business_type) : null,
    ].filter(Boolean) as string[],
    perks: [
      x.housing_provided === 1 ? '🏠 Διαμονή' : null,
      x.meals_provided === 1 ? '🍽️ Σίτιση' : null,
      x.bonus_provided === 1 ? '💎 Bonus' : null,
    ].filter(Boolean) as string[],
    verified: x.business_verified === 1,
    description: x.description,
    raw: x,
  };
}
