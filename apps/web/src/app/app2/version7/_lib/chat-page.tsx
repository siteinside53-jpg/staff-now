'use client';

/**
 * Chat detail — styled to match mockup #2 ("Συνομιλία"):
 *  - Blue header with avatar + name + role + verified pill + back/menu
 *  - Date separators ("Σήμερα", "Χθες", etc.)
 *  - Received bubbles: white, left aligned
 *  - Sent bubbles: blue gradient, right aligned, with double-check
 *  - File attachments: dark card with icon + filename + size
 *  - Composer: paperclip + textarea + circular blue send button
 */

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Avatar, FullPageSpinner, Spinner } from './ui';
import { conversations as convsApi } from './api';

export function ChatPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <ChatInner />
    </Suspense>
  );
}

function ChatInner() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params?.get('id') || '';
  const [conv, setConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [list, all] = await Promise.all([
          convsApi.messages(id),
          convsApi.list().catch(() => ({ items: [] as any[] })),
        ]);
        if (cancelled) return;
        setMessages(list.items || []);
        const found = (all.items || []).find((c: any) => c.id === id);
        setConv(found || null);
        convsApi.markRead(id).catch(() => {});
      } catch {} finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const onSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !id) return;
    setSending(true);
    try {
      const msg = await convsApi.send(id, trimmed);
      setMessages((prev) => [...prev, msg]);
      setText('');
    } catch {} finally {
      setSending(false);
    }
  };

  const name = conv?.other_name || conv?.other_user_name || conv?.business_name || conv?.worker_name || 'Συνομιλία';
  const role = conv?.other_role || conv?.role || conv?.job_title || '';
  const company = conv?.other_company || conv?.business_name || '';
  const subtitle = [role, company].filter(Boolean).join(' · ');
  const photo = conv?.other_photo || conv?.other_avatar || conv?.other_user_avatar;
  const verified = !!(conv?.other_verified || conv?.verified);

  return (
    <div className="fixed inset-0 flex flex-col bg-[#F1F5F9]">
      {/* Header — blue with avatar */}
      <header
        className="flex-shrink-0 bg-gradient-to-b from-blue-600 to-blue-700 text-white shadow-md"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center gap-3 px-3 py-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Πίσω"
            className="flex h-9 w-9 items-center justify-center rounded-full active:bg-white/15"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <Avatar name={name} src={photo} size="md" ring />
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-extrabold tracking-tight truncate">{name}</h1>
            {subtitle && <p className="text-[11px] text-white/85 truncate">{subtitle}</p>}
            {verified && (
              <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-extrabold">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
                  <path d="M9 16.17 5.53 12.7a1 1 0 1 0-1.42 1.42l4.18 4.18a1 1 0 0 0 1.42 0L20.3 7.71a1 1 0 0 0-1.42-1.42L9 16.17Z" />
                </svg>
                Verified
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Επιλογές"
            className="flex h-9 w-9 items-center justify-center rounded-full active:bg-white/15"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
            </svg>
          </button>
        </div>
      </header>

      {/* Menu drop */}
      {menuOpen && (
        <div className="absolute right-3 top-[68px] z-30 rounded-2xl bg-white shadow-xl ring-1 ring-black/5 overflow-hidden text-sm">
          <button className="block w-full px-5 py-3 text-left hover:bg-gray-50">📹 Βιντεοκλήση</button>
          <button className="block w-full px-5 py-3 text-left hover:bg-gray-50">🔕 Σίγαση</button>
          <button className="block w-full px-5 py-3 text-left hover:bg-gray-50 text-rose-600">🚫 Αποκλεισμός</button>
        </div>
      )}

      {/* Body */}
      <main className="flex-1 overflow-y-auto px-3 py-3">
        {loading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-gray-400 px-8">
            <Avatar name={name} src={photo} size="xl" />
            <p className="mt-3 text-sm font-bold text-gray-700">{name}</p>
            <p className="mt-1 text-[12px]">Πες ένα γεια για να ξεκινήσετε!</p>
          </div>
        ) : (
          <RenderMessages messages={messages} />
        )}
        <div ref={bottomRef} />
      </main>

      {/* Composer */}
      <footer
        className="flex-shrink-0 border-t border-gray-200 bg-white px-3 py-2"
        style={{ paddingBottom: 'calc(8px + env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-end gap-2">
          <button
            type="button"
            aria-label="Συνημμένο"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 active:bg-gray-200"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21.44 11.05-9.19 9.19a6 6 0 1 1-8.49-8.49l9.19-9.19a4 4 0 1 1 5.66 5.66l-9.2 9.19a2 2 0 1 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Γράψε ένα μήνυμα..."
            rows={1}
            className="min-h-[40px] max-h-[100px] flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none"
          />
          <button
            type="button"
            onClick={onSend}
            disabled={sending || !text.trim()}
            aria-label="Αποστολή"
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-600/30 active:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {sending ? (
              <Spinner className="h-4 w-4 border-white/40 border-t-white" />
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 -translate-x-px">
                <path d="M2 21l21-9L2 3v7l15 2-15 2v7Z" />
              </svg>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}

// ─────────── Messages with date separators ───────────

function RenderMessages({ messages }: { messages: any[] }) {
  let lastDay = '';
  const items: React.ReactNode[] = [];
  messages.forEach((m, i) => {
    const day = dayKey(m.created_at || m.sent_at);
    if (day !== lastDay) {
      items.push(<DateSeparator key={`d-${i}`} label={dayLabel(m.created_at || m.sent_at)} />);
      lastDay = day;
    }
    items.push(<Bubble key={m.id || i} m={m} />);
  });
  return <div className="space-y-1.5">{items}</div>;
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="my-3 flex justify-center">
      <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700">
        {label}
      </span>
    </div>
  );
}

function Bubble({ m }: { m: any }) {
  const mine = m.is_mine || m.from_me || m.sent_by_me || false;
  const time = formatTime(m.created_at || m.sent_at);
  const attachment = m.attachment_url || m.file_url;
  const fileName = m.attachment_name || m.file_name;
  const fileSize = m.attachment_size || m.file_size;

  const bubbleBase =
    'max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-snug shadow-sm';
  const sentClasses = 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-md';
  const receivedClasses = 'bg-white text-gray-900 ring-1 ring-gray-100 rounded-bl-md';

  // File attachment bubble
  if (attachment && (fileName || /\.(pdf|doc|docx|xls|xlsx|zip)$/i.test(attachment))) {
    return (
      <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
        <a
          href={attachment}
          target="_blank"
          rel="noopener"
          className={`${bubbleBase} ${mine ? sentClasses : receivedClasses} flex items-center gap-3 !py-3 !pr-4`}
        >
          <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${mine ? 'bg-white/20' : 'bg-blue-50'}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`h-5 w-5 ${mine ? 'text-white' : 'text-blue-600'}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className={`truncate text-[13px] font-extrabold ${mine ? 'text-white' : 'text-gray-900'}`}>
              {fileName || attachment.split('/').pop()}
            </p>
            <p className={`text-[11px] ${mine ? 'text-white/80' : 'text-gray-500'}`}>
              {fileExt(attachment)}{fileSize ? ` · ${formatSize(fileSize)}` : ''}
            </p>
          </div>
          <span className={`text-[10px] ${mine ? 'text-white/80' : 'text-gray-400'} flex items-center gap-0.5`}>
            {time}
            {mine && <DoubleCheck />}
          </span>
        </a>
      </div>
    );
  }

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`${bubbleBase} ${mine ? sentClasses : receivedClasses}`}>
        <p className="whitespace-pre-wrap break-words">{m.content || m.text || ''}</p>
        <p
          className={`mt-1 flex items-center justify-end gap-0.5 text-[10px] ${
            mine ? 'text-blue-100' : 'text-gray-400'
          }`}
        >
          <span>{time}</span>
          {mine && <DoubleCheck />}
        </p>
      </div>
    </div>
  );
}

function DoubleCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3 w-3">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 13l3 3 7-7M9 13l3 3 9-9" />
    </svg>
  );
}

// ─────────── Helpers ───────────

function dayKey(s?: string): string {
  if (!s) return '';
  return new Date(s).toDateString();
}
function dayLabel(s?: string): string {
  if (!s) return '';
  const d = new Date(s);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Σήμερα';
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Χθες';
  const days = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 7) return d.toLocaleDateString('el-GR', { weekday: 'long' });
  return d.toLocaleDateString('el-GR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatTime(s?: string): string {
  if (!s) return '';
  return new Date(s).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
}
function fileExt(url: string): string {
  const m = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
  return m ? m[1]!.toUpperCase() : 'FILE';
}
function formatSize(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}
