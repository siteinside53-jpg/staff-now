'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { matches as matchesApi, conversations, interests, ApiError } from '../../_lib/api';
import { Avatar, EmptyState, ErrorState, FullPageSpinner, Pill, Spinner } from '../../_lib/ui';
import { useUser } from '../../_lib/use-user';
import { timeAgo, roleLabel } from '../../_lib/format';
import { haptic } from '../../_lib/haptics';

interface MatchItem {
  id: string;
  conversationId?: string;
  otherName: string;
  otherSubtitle?: string;
  otherPhoto?: string;
  lastMessage?: string;
  lastTime?: string;
  unread: number;
}

interface InterestItem {
  swiperId: string;
  name: string;
  photo?: string;
  subtitle?: string;
  isMatched: boolean;
}

export default function MatchesV6() {
  const router = useRouter();
  const { user } = useUser();
  const [tab, setTab] = useState<'matches' | 'interests'>('matches');
  const [matchList, setMatchList] = useState<MatchItem[] | null>(null);
  const [interestsList, setInterestsList] = useState<InterestItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [likingId, setLikingId] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const [convs, recv] = await Promise.all([conversations.list(), interests.received()]);
      const items: MatchItem[] = (convs.items || []).map((c: any) => ({
        id: c.match_id || c.id,
        conversationId: c.id,
        otherName: c.other_name || 'Χρήστης',
        otherSubtitle: c.other_role || c.business_type || '',
        otherPhoto: c.other_photo || c.other_avatar,
        lastMessage: c.last_message,
        lastTime: c.last_message_at || c.created_at,
        unread: Number(c.unread_count || 0),
      }));
      setMatchList(items);

      const interestsItems: InterestItem[] = (recv.items || [])
        .filter((i: any) => !i.is_matched)
        .map((i: any) => ({
          swiperId: i.swiper_id,
          name: i.full_name || i.company_name || 'Χρήστης',
          photo: i.photo_url || i.logo_url,
          subtitle: i.role || i.business_type,
          isMatched: !!i.is_matched,
        }));
      setInterestsList(interestsItems);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Σφάλμα φόρτωσης');
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, []);

  const likeBack = async (swiperId: string) => {
    haptic('medium');
    setLikingId(swiperId);
    try {
      await interests.likeBack(swiperId);
      haptic('success');
      window.dispatchEvent(new Event('staffnow:refresh-badges'));
      await load();
    } catch (e) {
      haptic('error');
    } finally {
      setLikingId(null);
    }
  };

  if (!user) return <FullPageSpinner />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (matchList === null || interestsList === null) return <FullPageSpinner />;

  return (
    <div className="px-4 pt-4 pb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-gray-900">Ταιριάσματα</h1>
        <button onClick={load} className="text-xs font-semibold text-blue-600">Ανανέωση</button>
      </div>

      <div className="rounded-full bg-gray-100 p-1 flex">
        <Tab active={tab === 'matches'} onClick={() => setTab('matches')}>
          Ταιριάσματα
          {matchList.length > 0 && <span className="ml-1.5 text-xs">({matchList.length})</span>}
        </Tab>
        <Tab active={tab === 'interests'} onClick={() => setTab('interests')}>
          Ενδιαφέρθηκαν
          {interestsList.length > 0 && (
            <span className="ml-1.5 text-xs rounded-full bg-rose-500 text-white px-1.5">
              {interestsList.length}
            </span>
          )}
        </Tab>
      </div>

      {tab === 'matches' ? (
        matchList.length === 0 ? (
          <EmptyState
            icon="💖"
            title="Δεν έχεις ακόμα ταιριάσματα"
            description="Άρχισε να κάνεις swipe για να βρεις ευκαιρίες!"
            action={
              <button
                onClick={() => router.push('/app2/version6/dashboard/swipe')}
                className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white"
              >
                Κάνε Swipe
              </button>
            }
          />
        ) : (
          <ul className="rounded-2xl bg-white ring-1 ring-gray-100 divide-y divide-gray-100">
            {matchList.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() =>
                    router.push(`/app2/version6/dashboard/chat?id=${encodeURIComponent(m.conversationId || m.id)}`)
                  }
                  className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-gray-50"
                >
                  <Avatar src={m.otherPhoto} name={m.otherName} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-gray-900 truncate">{m.otherName}</p>
                      <span className="text-[11px] text-gray-400 flex-shrink-0">
                        {timeAgo(m.lastTime)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500 truncate">
                      {m.lastMessage || (m.otherSubtitle ? roleLabel(m.otherSubtitle) : 'Πες "γεια" 👋')}
                    </p>
                  </div>
                  {m.unread > 0 && (
                    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-extrabold text-white">
                      {m.unread}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )
      ) : interestsList.length === 0 ? (
        <EmptyState
          icon="✨"
          title="Καμία νέα αίτηση ακόμα"
          description="Όταν κάποιος δείξει ενδιαφέρον για το προφίλ σου, θα εμφανιστεί εδώ."
        />
      ) : (
        <div className="space-y-3">
          {interestsList.map((it) => (
            <div key={it.swiperId} className="rounded-2xl bg-white ring-1 ring-gray-100 p-4 flex items-center gap-3">
              <Avatar src={it.photo} name={it.name} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{it.name}</p>
                {it.subtitle && <p className="text-xs text-gray-500 truncate">{it.subtitle}</p>}
              </div>
              <button
                onClick={() => likeBack(it.swiperId)}
                disabled={likingId === it.swiperId}
                className="rounded-full bg-rose-500 px-4 py-2 text-xs font-bold text-white shadow active:scale-95 disabled:opacity-60"
              >
                {likingId === it.swiperId ? <Spinner className="h-3 w-3" /> : '❤️ Match!'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-full py-2 text-sm font-bold transition-colors ${
        active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
      }`}
    >
      {children}
    </button>
  );
}
