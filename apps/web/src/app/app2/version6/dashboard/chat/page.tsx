'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { conversations as convApi, ApiError } from '../../_lib/api';
import { Avatar, EmptyState, ErrorState, FullPageSpinner, Pill, ScreenHeader, Spinner } from '../../_lib/ui';
import { timeAgo } from '../../_lib/format';
import { haptic } from '../../_lib/haptics';
import { useUser } from '../../_lib/use-user';

export const dynamic = 'force-static';

export default function ChatV6Page() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <ChatV6 />
    </Suspense>
  );
}

interface Conversation {
  id: string;
  otherName: string;
  otherPhoto?: string;
  lastMessage?: string;
  lastTime?: string;
  unread: number;
}

function ChatV6() {
  const router = useRouter();
  const search = useSearchParams();
  const id = search.get('id');
  const { user } = useUser();

  if (!user) return <FullPageSpinner />;

  return id ? <Thread conversationId={id} userId={user.id} /> : <ConversationsList userId={user.id} />;
}

function ConversationsList({ userId }: { userId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<Conversation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const res = await convApi.list();
      const list: Conversation[] = (res.items || []).map((c: any) => ({
        id: c.id,
        otherName: c.other_name || 'Χρήστης',
        otherPhoto: c.other_photo || c.other_avatar,
        lastMessage: c.last_message,
        lastTime: c.last_message_at || c.created_at,
        unread: Number(c.unread_count || 0),
      }));
      setItems(list);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Σφάλμα φόρτωσης');
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (items === null) return <FullPageSpinner />;

  return (
    <div className="px-4 pt-4 pb-6">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-black text-gray-900">Συνομιλίες</h1>
        <button onClick={load} className="text-xs font-semibold text-blue-600">
          Ανανέωση
        </button>
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon="💬"
          title="Δεν έχεις συνομιλίες ακόμα"
          description="Όταν ταιριάξεις με κάποιον, θα εμφανιστεί εδώ."
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
          {items.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => router.push(`/app2/version6/dashboard/chat?id=${encodeURIComponent(c.id)}`)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-gray-50"
              >
                <Avatar src={c.otherPhoto} name={c.otherName} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm truncate ${c.unread > 0 ? 'font-extrabold' : 'font-bold'} text-gray-900`}>
                      {c.otherName}
                    </p>
                    <span className="text-[11px] text-gray-400 flex-shrink-0">{timeAgo(c.lastTime)}</span>
                  </div>
                  <p
                    className={`mt-0.5 text-xs truncate ${
                      c.unread > 0 ? 'font-semibold text-gray-700' : 'text-gray-500'
                    }`}
                  >
                    {c.lastMessage || 'Ξεκίνα τη συνομιλία 👋'}
                  </p>
                </div>
                {c.unread > 0 && (
                  <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-extrabold text-white">
                    {c.unread}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at?: string | null;
  sender_name?: string;
  sender_photo?: string;
}

function Thread({ conversationId, userId }: { conversationId: string; userId: string }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [otherInfo, setOtherInfo] = useState<{ name: string; photo?: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const res = await convApi.messages(conversationId);
      const msgs = res.items || [];
      setMessages(msgs);
      // Mark as read
      convApi.markRead(conversationId).catch(() => {});
      // Pick up "other" info from first message that isn't from us
      const other = msgs.find((m: Message) => m.sender_id !== userId);
      if (other) {
        setOtherInfo({ name: other.sender_name || 'Χρήστης', photo: other.sender_photo });
      }
      window.dispatchEvent(new Event('staffnow:refresh-badges'));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Σφάλμα φόρτωσης');
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const newMsg = await convApi.send(conversationId, text);
      setInput('');
      setMessages((prev) => {
        const next = newMsg
          ? [...(prev || []), { ...newMsg, sender_id: userId, created_at: new Date().toISOString() } as Message]
          : prev;
        return next ?? null;
      });
      haptic('light');
      // Refetch to ensure consistency
      load();
    } catch (e) {
      haptic('error');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send();
  };

  return (
    <div className="h-full flex flex-col">
      <ScreenHeader
        title={otherInfo?.name || 'Συνομιλία'}
        back={() => router.push('/app2/version6/dashboard/chat')}
      />

      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-gray-50 px-4 py-3">
        {messages === null ? (
          <div className="flex items-center justify-center h-full">
            <Spinner />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <Avatar src={otherInfo?.photo} name={otherInfo?.name} size="lg" />
            <h2 className="mt-4 text-base font-bold text-gray-900">
              {otherInfo?.name || 'Νέα συνομιλία'}
            </h2>
            <p className="mt-1 text-xs text-gray-500">Ξεκίνα τη συνομιλία λέγοντας ένα γεια 👋</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {messages.map((m, idx) => {
              const mine = m.sender_id === userId;
              const prev = messages[idx - 1];
              const showTimestamp = !prev || new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60 * 1000;
              return (
                <li key={m.id}>
                  {showTimestamp && (
                    <div className="text-center text-[10px] text-gray-400 my-2">
                      {new Date(m.created_at).toLocaleString('el-GR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                    </div>
                  )}
                  <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[78%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap break-words ${
                        mine
                          ? 'bg-blue-600 text-white rounded-br-md'
                          : 'bg-white text-gray-900 ring-1 ring-gray-100 rounded-bl-md'
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form
        onSubmit={onSubmit}
        className="flex-shrink-0 bg-white border-t border-gray-100 px-3 py-2 flex items-center gap-2"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Γράψε ένα μήνυμα…"
          className="flex-1 rounded-full bg-gray-100 px-4 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/30"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="h-10 w-10 flex-shrink-0 inline-flex items-center justify-center rounded-full bg-blue-600 text-white disabled:opacity-50 active:scale-95"
          aria-label="Στείλε"
        >
          {sending ? <Spinner className="h-4 w-4 border-white border-t-transparent" /> : '➤'}
        </button>
      </form>
    </div>
  );
}
