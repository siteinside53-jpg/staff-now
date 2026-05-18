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
  otherType: 'worker' | 'business';
  isBlocked: boolean;
  matchStatus: string;
}

interface Msg {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  readAt?: string;
}

export default function ChatV5() {
  const [conversations, setConversations] = useState<Convo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string>('');
  const [myRole, setMyRole] = useState<'worker' | 'business' | 'admin' | ''>('');
  const [videoRoom, setVideoRoom] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const msgsEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const lastMsgIdRef = useRef<string | null>(null);
  const dismissedCallRef = useRef<string | null>(null);

  const loadConversations = async () => {
    try {
      const t = token();
      if (!t) return;
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
        otherType: c.otherParty?.type,
        isBlocked: !!c.isBlocked,
        matchStatus: c.matchStatus || 'active',
      }));
      setConversations(convos);
    } catch {}
  };

  // Load me + convos + poll convos every 3s
  useEffect(() => {
    (async () => {
      try {
        const t = token();
        if (!t) return;
        const meRes = await fetch(`${API_BASE}/auth/me`, { headers: { 'Authorization': `Bearer ${t}` } });
        const meData = await meRes.json() as any;
        setMyId(meData?.data?.user?.id || '');
        setMyRole(meData?.data?.user?.role || '');
        await loadConversations();
      } catch {} finally { setLoading(false); }
    })();
    const interval = setInterval(loadConversations, 3000);
    return () => clearInterval(interval);
  }, []);

  // Poll messages of active conversation
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
        const newestId = msgs.filter((m) => !m.id?.startsWith('temp_')).pop()?.id || null;
        if (newestId && newestId !== lastMsgIdRef.current) {
          lastMsgIdRef.current = newestId;
          setMessages(msgs);
          setTimeout(() => msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

          // Detect incoming video call
          const twoMinsAgo = Date.now() - 120000;
          const callMsg = msgs.filter((m) =>
            m.senderId !== myId &&
            m.content?.startsWith('📹') &&
            m.content?.includes('jitsi.member.fsf.org') &&
            new Date(m.createdAt).getTime() > twoMinsAgo
          ).pop();
          if (callMsg && !videoRoom) {
            const match = callMsg.content.match(/https:\/\/jitsi\.member\.fsf\.org\/([^\s#]+)/);
            if (match && match[1] !== dismissedCallRef.current) {
              setIncomingCall(match[1]);
            }
          }
        }
      } catch {}
    };
    load();
    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  }, [activeId, myId, videoRoom]);

  const send = async () => {
    if (!newMsg.trim() || !activeId || sending) return;
    setSending(true);
    const content = newMsg.trim();
    setNewMsg('');
    const tempId = `temp_${Date.now()}`;
    setMessages((prev) => [...prev, { id: tempId, senderId: myId, content, createdAt: new Date().toISOString() }]);
    try {
      const t = token();
      await fetch(`${API_BASE}/conversations/${activeId}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
    } catch {} finally { setSending(false); }
  };

  const uploadAttachment = async (file: File, kind: 'photo' | 'file') => {
    if (!activeId) return;
    setUploading(true);
    try {
      const t = token();
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', 'chat');
      const up = await fetch(`${API_BASE}/uploads`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${t}` },
        body: fd,
      });
      const data = await up.json() as any;
      if (data?.data?.url) {
        const url = data.data.url;
        const content = kind === 'photo' ? `📷 ![photo](${url})` : `📎 [${file.name}](${url})`;
        await fetch(`${API_BASE}/conversations/${activeId}/messages`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
      }
    } catch {} finally { setUploading(false); }
  };

  const startVideoCall = async () => {
    if (!activeId) return;
    const room = `staffnow-v5-${activeId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)}-${Date.now().toString(36)}`;
    setVideoRoom(room);
    const callUrl = `https://jitsi.member.fsf.org/${room}`;
    try {
      const t = token();
      await fetch(`${API_BASE}/conversations/${activeId}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: `📹 Video κλήση: ${callUrl}` }),
      });
    } catch {}
  };

  const convAction = async (action: 'archive' | 'restore' | 'delete' | 'block' | 'clear_messages') => {
    if (!activeId) return;
    const t = token();
    const endpoints: Record<string, { method: string; path: string }> = {
      archive: { method: 'POST', path: `/matches/${conversations.find((c) => c.id === activeId)?.id || ''}/archive` },
      restore: { method: 'POST', path: `/matches/${conversations.find((c) => c.id === activeId)?.id || ''}/restore` },
      delete: { method: 'DELETE', path: `/conversations/${activeId}` },
      block: { method: 'POST', path: `/conversations/${activeId}/block` },
      clear_messages: { method: 'POST', path: `/conversations/${activeId}/clear-messages` },
    };
    const ep = endpoints[action];
    try {
      await fetch(`${API_BASE}${ep.path}`, { method: ep.method, headers: { 'Authorization': `Bearer ${t}` } });
      setShowMenu(false);
      if (action === 'delete' || action === 'block' || action === 'archive') {
        setActiveId(null);
        await loadConversations();
      } else if (action === 'clear_messages') {
        setMessages([]);
        lastMsgIdRef.current = null;
      }
    } catch {}
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center bg-white"><div className="h-8 w-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  }

  const activeChat = conversations.find((c) => c.id === activeId);

  // Chat detail view
  if (activeChat) {
    return (
      <div className="h-full flex flex-col bg-white">
        {/* Header — tap to open profile */}
        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 bg-white">
          <button onClick={() => { setActiveId(null); setShowMenu(false); setVideoRoom(null); }} className="p-1.5 -ml-1.5">
            <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={() => setShowProfile(true)} className="flex items-center gap-2.5 flex-1 min-w-0 text-left">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center font-bold text-purple-700 overflow-hidden flex-shrink-0">
              {activeChat.avatar ? <img src={activeChat.avatar} alt="" className="h-full w-full object-cover" /> : activeChat.name[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{activeChat.name}</p>
              <p className="text-[11px] text-gray-400">Πάτα για προβολή προφίλ</p>
            </div>
          </button>
          {!activeChat.isBlocked && (
            <button onClick={startVideoCall} className="p-2 rounded-full bg-emerald-50 text-emerald-600" title="Video κλήση">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </button>
          )}
          <button onClick={() => setShowMenu(true)} className="p-2 rounded-full hover:bg-gray-100">
            <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
            </svg>
          </button>
        </div>

        {/* Incoming call banner */}
        {incomingCall && !videoRoom && (
          <div className="flex-shrink-0 bg-gradient-to-r from-emerald-600 to-blue-600 px-3 py-2 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2 text-white text-sm font-semibold">
              <span>📹</span> Εισερχόμενη κλήση
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setVideoRoom(incomingCall); setIncomingCall(null); }} className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-700">
                Αποδοχή
              </button>
              <button onClick={() => { dismissedCallRef.current = incomingCall; setIncomingCall(null); }} className="rounded-full bg-red-500 px-2 py-1 text-xs font-black text-white">✕</button>
            </div>
          </div>
        )}

        {/* Video iframe */}
        {videoRoom && (
          <div className="flex-shrink-0 relative bg-gray-900">
            <iframe
              src={`https://jitsi.member.fsf.org/${videoRoom}#config.prejoinConfig.enabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false&config.disableDeepLinking=true&config.requireDisplayName=false`}
              className="w-full h-[300px]"
              allow="camera *; microphone *; fullscreen; display-capture; autoplay"
              style={{ border: 'none' }}
            />
            <button onClick={() => setVideoRoom(null)} className="absolute top-2 right-2 rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
              📞 Τέλος
            </button>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-gray-50">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <span className="text-4xl mb-2">👋</span>
              <p className="text-sm">Ξεκίνα τη συνομιλία!</p>
            </div>
          ) : (
            messages.map((m) => {
              const isMine = m.senderId === myId;
              const isVideoCall = m.content?.startsWith('📹') && m.content?.includes('jitsi');
              const isPhoto = m.content?.startsWith('📷') && m.content?.includes('](');
              const isFile = m.content?.startsWith('📎') && m.content?.includes('](');

              return (
                <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  {isVideoCall ? (
                    (() => {
                      const match = m.content.match(/https:\/\/[^\s]+/);
                      const url = match?.[0] || '';
                      const roomName = url.split('/').pop()?.split('#')[0] || '';
                      return (
                        <div className={`rounded-2xl px-4 py-3 ${isMine ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 shadow-sm'}`}>
                          <p className="text-sm font-semibold mb-2">📹 Video κλήση</p>
                          {videoRoom === roomName ? (
                            <span className="text-xs opacity-75">Σε κλήση...</span>
                          ) : (
                            <button onClick={() => setVideoRoom(roomName)} className={`rounded-lg px-4 py-1.5 text-xs font-bold ${isMine ? 'bg-white/20 text-white' : 'bg-emerald-600 text-white'}`}>
                              📹 Συμμετοχή
                            </button>
                          )}
                        </div>
                      );
                    })()
                  ) : isPhoto ? (
                    (() => {
                      const url = m.content.match(/\((https?:\/\/[^)]+)\)/)?.[1];
                      return url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt="" className="max-w-[220px] rounded-xl shadow-sm" />
                        </a>
                      ) : null;
                    })()
                  ) : isFile ? (
                    (() => {
                      const url = m.content.match(/\((https?:\/\/[^)]+)\)/)?.[1];
                      const name = m.content.match(/\[([^\]]+)\]/)?.[1];
                      return url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm shadow-sm ${isMine ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200'}`}>
                          📎 {name || 'Αρχείο'}
                        </a>
                      ) : null;
                    })()
                  ) : (
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
                      isMine ? 'bg-blue-600 text-white rounded-br-md' : 'bg-white text-gray-900 rounded-bl-md border border-gray-100'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                      <p className={`text-[10px] mt-1 text-right ${isMine ? 'text-blue-100' : 'text-gray-400'}`}>
                        {new Date(m.createdAt).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={msgsEndRef} />
        </div>

        {/* Input */}
        <div className="flex-shrink-0 flex items-center gap-1.5 px-2 py-2 border-t border-gray-100 bg-white" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)' }}>
          <button onClick={() => photoRef.current?.click()} disabled={uploading || activeChat.isBlocked} className="p-2 text-gray-500 disabled:opacity-50" title="Φωτό">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={uploading || activeChat.isBlocked} className="p-2 text-gray-500 disabled:opacity-50" title="Αρχείο">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.122 2.122l7.81-7.81" />
            </svg>
          </button>
          <input
            ref={photoRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAttachment(f, 'photo'); }}
          />
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAttachment(f, 'file'); }}
          />
          <input
            type="text"
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder={activeChat.isBlocked ? 'Ο χρήστης είναι blocked' : 'Μήνυμα...'}
            disabled={activeChat.isBlocked}
            className="flex-1 rounded-full bg-gray-100 px-3 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={!newMsg.trim() || sending || activeChat.isBlocked}
            className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center disabled:opacity-50"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>

        {/* 3-dot menu */}
        {showMenu && (
          <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowMenu(false)}>
            <div className="absolute inset-0 bg-black/50" />
            <div className="relative z-10 w-full bg-white rounded-t-3xl p-4 space-y-1" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}>
              <div className="flex justify-center mb-2"><div className="h-1.5 w-10 rounded-full bg-gray-300" /></div>
              <MenuItem icon="👤" label="Προβολή προφίλ" onClick={() => { setShowMenu(false); setShowProfile(true); }} />
              <MenuItem icon="📦" label={activeChat.matchStatus === 'archived' ? 'Επαναφορά' : 'Αρχειοθέτηση'} onClick={() => convAction(activeChat.matchStatus === 'archived' ? 'restore' : 'archive')} />
              <MenuItem icon="🧹" label="Διαγραφή μηνυμάτων" onClick={() => convAction('clear_messages')} color="text-orange-600" />
              <MenuItem icon="🗑️" label="Διαγραφή συνομιλίας" onClick={() => convAction('delete')} color="text-red-600" />
              <MenuItem icon="🚫" label="Αποκλεισμός" onClick={() => convAction('block')} color="text-red-700" />
            </div>
          </div>
        )}

        {/* Profile panel */}
        {showProfile && (
          <ProfilePanel
            id={activeChat.otherId}
            type={activeChat.otherType}
            name={activeChat.name}
            avatar={activeChat.avatar}
            onClose={() => setShowProfile(false)}
          />
        )}
      </div>
    );
  }

  // Conversation list
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
                  <div className="flex items-center gap-1.5">
                    <p className={`flex-1 font-semibold truncate ${c.unread > 0 ? 'text-gray-900' : 'text-gray-700'}`}>{c.name}</p>
                    {c.matchStatus === 'archived' && <span className="text-[10px] text-amber-600 font-medium">Αρχείο</span>}
                  </div>
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

function MenuItem({ icon, label, onClick, color = 'text-gray-900' }: { icon: string; label: string; onClick: () => void; color?: string }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 text-left ${color}`}>
      <span className="text-xl w-6 text-center">{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
    </button>
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

// Profile Panel — fetches worker or business and shows slide-over
function ProfilePanel({ id, type, name, avatar, onClose }: { id: string; type: 'worker' | 'business'; name: string; avatar?: string; onClose: () => void }) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const t = token();
        const endpoint = type === 'worker' ? `/workers/${id}` : `/businesses/${id}`;
        const res = await fetch(`${API_BASE}${endpoint}`, { headers: { 'Authorization': `Bearer ${t}` } });
        const data = await res.json() as any;
        setProfile(data?.data);
      } catch {} finally { setLoading(false); }
    })();
  }, [id, type]);

  const p = profile?.profile || profile || {};
  const roles = profile?.roles || [];

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 ml-auto h-full w-full max-w-md bg-white overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {loading ? (
          <div className="h-full flex items-center justify-center"><div className="h-8 w-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" /></div>
        ) : (
          <>
            <div className={`relative px-5 pt-8 pb-6 text-white ${type === 'worker' ? 'bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700' : 'bg-gradient-to-br from-emerald-500 via-teal-600 to-blue-600'}`}>
              <button onClick={onClose} className="absolute top-3 right-3 h-9 w-9 rounded-full bg-black/30 flex items-center justify-center">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="text-center">
                <div className="mx-auto h-28 w-28 rounded-full bg-white/90 flex items-center justify-center text-3xl font-extrabold text-purple-700 overflow-hidden border-4 border-white/90 shadow-xl">
                  {(p.photo_url || p.logo_url || avatar) ? (
                    <img src={p.photo_url || p.logo_url || avatar} alt="" className="h-full w-full object-cover" />
                  ) : name[0]?.toUpperCase()}
                </div>
                <h2 className="mt-4 text-2xl font-extrabold">{p.full_name || p.company_name || name}</h2>
                {type === 'worker' && roles.length > 0 && (
                  <p className="text-sm text-white/90 mt-1">{roles[0]}</p>
                )}
                {type === 'business' && p.business_type && (
                  <p className="text-sm text-white/90 mt-1">{p.business_type}</p>
                )}
                {(p.city || p.region) && (
                  <p className="text-xs text-white/80 mt-1">📍 {[p.city, p.region].filter(Boolean).join(', ')}</p>
                )}
                {p.verified === 1 && (
                  <span className="mt-2 inline-block rounded-full bg-white/30 backdrop-blur px-3 py-0.5 text-xs font-bold">✓ Verified</span>
                )}
              </div>
            </div>

            <div className="p-5 space-y-4">
              {(p.bio || p.description) && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Σχετικά</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{p.bio || p.description}</p>
                </div>
              )}

              {type === 'worker' && roles.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Ρόλοι</h3>
                  <div className="flex flex-wrap gap-2">
                    {roles.map((r: string) => (
                      <span key={r} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{r}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {p.years_of_experience != null && (
                  <InfoBox label="Εμπειρία" value={`${p.years_of_experience} χρόνια`} />
                )}
                {p.expected_monthly_salary && (
                  <InfoBox label="Μισθός" value={`${p.expected_monthly_salary}€/μήνα`} />
                )}
                {p.availability && (
                  <InfoBox label="Διαθεσιμότητα" value={p.availability} />
                )}
                {p.email && (
                  <InfoBox label="Email" value={p.email} />
                )}
                {p.phone && (
                  <InfoBox label="Τηλέφωνο" value={p.phone} />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold text-gray-900 mt-0.5 truncate">{value}</p>
    </div>
  );
}
