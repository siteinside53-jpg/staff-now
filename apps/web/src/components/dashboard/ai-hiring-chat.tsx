'use client';

/**
 * Minimal AI Hiring Chat panel for the business dashboard.
 *
 * Behavior:
 *   • Renders an inline chat (bubble-style) with the AI hiring assistant.
 *   • Sends to POST /ai/hiring-chat with a short rolling history.
 *   • If the API returns 403 AI_HIRING_CHAT_LOCKED → renders an upgrade CTA
 *     instead of the chat (so we don't show a broken input to free users).
 *   • Designed to be embedded as a card/section, not a separate page.
 */

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'Πώς γράφω αγγελία που τραβάει τον σωστό σερβιτόρο;',
  'Τι μισθό να βάλω για βοηθό κουζίνας Ιούλιο;',
  'Ποιες ερωτήσεις να κάνω σε συνέντευξη για receptionist;',
];

export function AIHiringChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, loading]);

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || loading) return;
    setInput('');

    const newMessages: Message[] = [...messages, { role: 'user', content: message }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const token = localStorage.getItem('staffnow_token');
      const API = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';
      const res = await fetch(`${API}/ai/hiring-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message,
          history: messages.slice(-6),
        }),
      });
      const j = (await res.json()) as any;
      if (res.status === 403 && j?.error?.code === 'AI_HIRING_CHAT_LOCKED') {
        setLocked(true);
        return;
      }
      const answer = j?.data?.answer?.trim() || j?.error?.message || 'Δεν έλαβα απάντηση. Δοκίμασε ξανά.';
      setMessages([...newMessages, { role: 'assistant', content: answer }]);
    } catch {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Σφάλμα δικτύου. Δοκίμασε ξανά σε λίγο.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (locked) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
        <p className="text-sm font-bold text-amber-900">🔒 AI Hiring Chat</p>
        <p className="mt-1 text-xs text-amber-800">
          Διαθέσιμο από το πλάνο <strong>Pro</strong> και πάνω. Πάρε άμεσες, εξατομικευμένες
          συμβουλές για κάθε hiring θέμα.
        </p>
        <a
          href="/dashboard/billing"
          className="mt-3 inline-block rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700"
        >
          Αναβάθμιση
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-lg text-white">
          🧠
        </span>
        <div>
          <h3 className="text-sm font-bold text-gray-900">AI Hiring Chat</h3>
          <p className="text-[11px] text-gray-500">
            Σύμβουλος hiring · μόνο για εσένα · Pro feature
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="max-h-[400px] min-h-[200px] overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">Ξεκίνα με μία ερώτηση:</p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs text-gray-700 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  💡 {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`mb-3 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-line ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start mb-3">
            <div className="rounded-2xl bg-gray-100 px-3 py-2 text-sm text-gray-500">
              <span className="inline-flex gap-1">
                <span className="animate-bounce">·</span>
                <span className="animate-bounce" style={{ animationDelay: '0.15s' }}>·</span>
                <span className="animate-bounce" style={{ animationDelay: '0.3s' }}>·</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex gap-2 border-t border-gray-100 px-5 py-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ρώτα για hiring, αγγελίες, μισθούς..."
          maxLength={2000}
          disabled={loading}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '...' : 'Στείλε'}
        </button>
      </form>
    </div>
  );
}
