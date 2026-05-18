'use client';

import { useEffect, useRef, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';
const token = () => typeof window !== 'undefined' ? localStorage.getItem('staffnow_token') : null;

interface Convo {
  id: string;
  name: string;
  avatar?: string;
  lastMsg: string;
  unread: number;
  updatedAt: string;
  otherId: string;
}

interface Msg {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  readAt?: string;
}

export default function ChatV3() {
  const [conversations, setConversations] = useState<Convo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string>('');
  const msgsEndRef = useRef<HTMLDivElement>(null);
  const lastMsgIdRef = useRef<string | null>(null);

  // Load me + convos
  useEffect(() => {
    (async () => {
      try {
        const t = token();
        if (!t) return;
        const meRes = await fetch(`${API_BASE}/auth/me`, { headers: { 'Authorization': `Bearer ${t}` } });
        const meData = await meRes.json() as any;
        setMyId(meData?.data?.user?.id || '');

        const res = await fetch(`${API_BASE}/conversations`, { headers: { 'Authorization': `Bearer ${t}` } });
        const data = await res.json() as any;
        const convos = (data?.data || []).map((c: any) => ({
          id: c.id,
          name: c.otherParty?.name || 'Χρήστης',
          avatar: c.otherParty?.avatar,
          lastMsg: formatPreview(c.lastMessage?.content),
          unread: c.unreadCount || 0,
          updatedAt: c.updatedAt,
          otherId: c.otherParty?.id,
        }));
        setConversations(convos);
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  // Poll conversation messages when active
  useEffect(() => {
    if (!activeId) return;
    const load = async () => {
      try {
        const t = token();
        if (!t) return;
        const res = await fetch(`${API_BASE}/conversations/${activeId}/messages`, {
          headers: { 'Authorization': `Bearer ${t}` },
        });
        const data = await res.json() as any;
        const msgs: Msg[] = (data?.data || []).map((m: any) => ({
          id: m.id,
          senderId: m.sender_id,
          content: m.content,
          createdAt: m.created_at,
          readAt: m.read_at,
        })).reverse();
        const newestId = msgs[msgs.length - 1]?.id;
        if (newestId && newestId !== lastMsgIdRef.current) {
          lastMsgIdRef.current = newestId;
          setMessages(msgs);
          setTimeout(() => msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      } catch {}
    };
    load();
    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  }, [activeId]);

  const send = async () => {
    if (!newMsg.trim() || !activeId || sending) return;
    setSending(true);
    const content = newMsg.trim();
    setNewMsg('');
    // Optimistic
    const tempId = `temp_${Date.now()}`;
    setMessages((prev) => [...prev, { id: tempId, senderId: myId, content, createdAt: new Date().toISOString() }]);
    try {
      const t = token();
      await fetch(`${API_BASE}/conversations/${activeId}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
    } catch {} finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center bg-white"><div className="h-8 w-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  }

  // Chat detail view
  if (activeId) {
    const chat = conversations.find((c) => c.id === activeId);
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white">
          <button onClick={() => setActiveId(null)} className="p-1.5 -ml-1.5">
            <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center font-bold text-purple-700 overflow-hidden">
            {chat?.avatar ? <img src={chat.avatar} alt="" className="h-full w-full object-cover" /> : chat?.name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{chat?.name}</p>
            <p className="text-[11px] text-emerald-500 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              online
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <span className="text-4xl mb-2">👋</span>
              <p className="text-sm">Ξεκίνα τη συνομιλία!</p>
            </div>
          ) : (
            messages.map((m) => {
              const isMine = m.senderId === myId;
              return (
                <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
                    isMine ? 'bg-blue-600 text-white rounded-br-md' : 'bg-white text-gray-900 rounded-bl-md border border-gray-100'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                    <p className={`text-[10px] mt-1 text-right ${isMine ? 'text-blue-100' : 'text-gray-400'}`}>
                      {new Date(m.createdAt).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={msgsEndRef} />
        </div>

        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5 border-t border-gray-100 bg-white" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.625rem)' }}>
          <input
            type="text"
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Μήνυμα..."
            className="flex-1 rounded-full bg-gray-100 px-4 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/30"
          />
          <button
            onClick={send}
            disabled={!newMsg.trim() || sending}
            className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center disabled:opacity-50"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white overflow-y-auto">
      <div className="flex-shrink-0 px-4 pt-6 pb-4">
        <h1 className="text-3xl font-extrabold text-gray-900">💬 Συνομιλίες</h1>
      </div>

      <div className="flex-1">
        {conversations.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center px-8 text-center text-gray-400">
            <span className="text-5xl mb-3">💬</span>
            <p className="font-semibold text-gray-600">Καμία συνομιλία ακόμα</p>
            <p className="mt-1 text-xs">Κάνε match για να ξεκινήσεις chat!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => { setActiveId(c.id); setMessages([]); lastMsgIdRef.current = null; }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
              >
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center font-bold text-purple-700 overflow-hidden flex-shrink-0">
                  {c.avatar ? <img src={c.avatar} alt="" className="h-full w-full object-cover" /> : c.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate ${c.unread > 0 ? 'text-gray-900' : 'text-gray-700'}`}>{c.name}</p>
                  <p className={`text-sm truncate ${c.unread > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>{c.lastMsg || 'Νέα συνομιλία'}</p>
                </div>
                {c.unread > 0 && (
                  <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {c.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatPreview(content?: string): string {
  if (!content) return '';
  if (content.startsWith('📹')) return '📹 Video κλήση';
  if (content.startsWith('📷')) return '📷 Φωτογραφία';
  if (content.startsWith('📎')) {
    const match = content.match(/\[([^\]]+)\]/);
    return match ? `📎 ${match[1]}` : '📎 Αρχείο';
  }
  return content;
}
