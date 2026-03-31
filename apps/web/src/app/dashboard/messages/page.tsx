'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';

function MessagesInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const convId = searchParams.get('id');
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(convId);
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [failedMsgs, setFailedMsgs] = useState<Set<string>>(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ file: File; previewUrl: string; uploading: boolean } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversations
  useEffect(() => {
    async function load() {
      try {
        const res = await api.conversations.list() as any;
        setConversations(res?.data || []);
      } catch {} finally { setLoading(false); }
    }
    load();
  }, []);

  // Load messages
  useEffect(() => {
    if (!selectedConv) return;
    async function loadMsgs() {
      setLoadingMsgs(true);
      try {
        const res = await api.conversations.getMessages(selectedConv!) as any;
        const msgs = res?.data || [];
        setMessages(Array.isArray(msgs) ? [...msgs].reverse() : []);
        // Mark conversation as read
        try {
          const token = localStorage.getItem('staffnow_token');
          await fetch(`https://staffnow-api-production.siteinside53.workers.dev/conversations/${selectedConv}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          });
          // Update unread count locally
          setConversations((prev) => prev.map((c) => c.id === selectedConv ? { ...c, unreadCount: 0 } : c));
        } catch {}
      } catch {} finally { setLoadingMsgs(false); }
    }
    loadMsgs();
  }, [selectedConv]);

  // Simulate typing indicator (poll every 5s in real app)
  useEffect(() => {
    if (!selectedConv) return;
    // Fake typing for demo — in production, use WebSocket or polling
    const interval = setInterval(() => {
      // Could poll /conversations/:id/typing endpoint
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedConv]);

  const sendMessage = async () => {
    if (!newMsg.trim() || !selectedConv) return;
    const tempId = `temp_${Date.now()}`;
    const tempMsg = {
      id: tempId,
      sender_id: user?.id,
      content: newMsg.trim(),
      created_at: new Date().toISOString(),
      status: 'sending',
    };

    // Optimistic add
    setMessages((prev) => [...prev, tempMsg]);
    setNewMsg('');
    setSending(true);

    try {
      const res = await api.conversations.sendMessage(selectedConv, { content: tempMsg.content }) as any;
      if (res.success) {
        const realMsg = res.data?.message || res.data;
        if (!realMsg.created_at) realMsg.created_at = new Date().toISOString();
        if (!realMsg.sender_id) realMsg.sender_id = user?.id;
        realMsg.status = 'sent';
        // Replace temp with real
        setMessages((prev) => prev.map((m) => m.id === tempId ? realMsg : m));
      } else {
        setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, status: 'failed' } : m));
        setFailedMsgs((prev) => new Set(prev).add(tempId));
      }
    } catch {
      setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, status: 'failed' } : m));
      setFailedMsgs((prev) => new Set(prev).add(tempId));
    } finally {
      setSending(false);
    }
  };

  const retryMessage = async (msgId: string) => {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg || !selectedConv) return;
    setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, status: 'sending' } : m));

    try {
      const res = await api.conversations.sendMessage(selectedConv, { content: msg.content }) as any;
      if (res.success) {
        const realMsg = res.data?.message || res.data;
        if (!realMsg.created_at) realMsg.created_at = new Date().toISOString();
        if (!realMsg.sender_id) realMsg.sender_id = user?.id;
        realMsg.status = 'sent';
        setMessages((prev) => prev.map((m) => m.id === msgId ? realMsg : m));
        setFailedMsgs((prev) => { const n = new Set(prev); n.delete(msgId); return n; });
      }
    } catch {
      setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, status: 'failed' } : m));
    }
  };

  const deleteMessage = (msgId: string, forAll: boolean) => {
    if (forAll) {
      // In production: call DELETE /messages/:id
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      toast.success('Το μήνυμα διαγράφηκε');
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      toast.success('Το μήνυμα κρύφτηκε');
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  return (
    <div>
      <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900">💬 Μηνύματα</h1></div>

      {conversations.length === 0 && !selectedConv ? (
        <EmptyState title="Δεν έχεις μηνύματα ακόμα" description="Κάνε match για να ξεκινήσεις συνομιλία!" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Conversation List */}
          <div className="lg:col-span-1 space-y-2">
            <p className="text-sm font-medium text-gray-500 mb-2">{conversations.length} συνομιλίες</p>
            {conversations.map((c: any) => {
              const isActive = selectedConv === c.id;
              const otherName = c.otherParty?.name || (user?.role === 'worker' ? 'Επιχείρηση' : 'Εργαζόμενος');
              const lastMsg = c.lastMessage?.content || c.lastMessage?.text;
              const dateStr = c.updatedAt || c.createdAt;
              return (
                <div key={c.id} onClick={() => setSelectedConv(c.id)}
                  className={`cursor-pointer rounded-xl p-4 transition-all ${isActive ? 'bg-blue-50 border-2 border-blue-500' : 'bg-white border border-gray-100 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-3">
                    {c.otherParty?.avatar ? (
                      <img src={c.otherParty.avatar} alt="" className="h-10 w-10 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600 flex-shrink-0">
                        {otherName[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate text-sm">{otherName}</p>
                      {lastMsg && <p className="text-xs text-gray-500 truncate">{lastMsg}</p>}
                      {dateStr && (() => { const d = new Date(dateStr); return !isNaN(d.getTime()) ? <p className="text-xs text-gray-400">{d.toLocaleDateString('el-GR')}</p> : null; })()}
                    </div>
                    {c.unreadCount > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">{c.unreadCount}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2">
            {selectedConv ? (
              <Card className="h-[550px] flex flex-col overflow-hidden">
                {/* Chat header */}
                <div className="border-b border-gray-100 px-5 py-3 flex items-center gap-3">
                  {(() => {
                    const conv = conversations.find((c) => c.id === selectedConv);
                    const avatar = conv?.otherParty?.avatar;
                    const name = conv?.otherParty?.name || 'Συνομιλία';
                    return avatar ? (
                      <img src={avatar} alt="" className="h-8 w-8 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                        {name[0]?.toUpperCase() || '?'}
                      </div>
                    );
                  })()}
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {conversations.find((c) => c.id === selectedConv)?.otherParty?.name || 'Συνομιλία'}
                    </p>
                    {isTyping && <p className="text-[11px] text-blue-500 animate-pulse">Πληκτρολογεί...</p>}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50/50">
                  {loadingMsgs ? (
                    <div className="flex justify-center py-10"><Spinner className="h-6 w-6" /></div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <p className="text-4xl mb-2">👋</p>
                      <p className="text-sm">Ξεκίνα τη συνομιλία!</p>
                    </div>
                  ) : (
                    messages.map((m: any) => {
                      const isMine = m.sender_id === user?.id;
                      const msgDate = m.created_at ? new Date(m.created_at) : null;
                      const timeStr = msgDate && !isNaN(msgDate.getTime()) ? msgDate.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' }) : '';
                      const isFailed = m.status === 'failed';
                      const isSending = m.status === 'sending';

                      return (
                        <div key={m.id} className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}>
                          <div className="group relative max-w-[75%]">
                            {m.content?.startsWith('📷') && m.content.includes('](') ? (
                              /* Image — no bubble, just image */
                              <div className={isFailed ? 'opacity-60' : ''}>
                                <a href={m.content.match(/\((https?:\/\/[^)]+)\)/)?.[1] || '#'} target="_blank" rel="noopener noreferrer">
                                  <img src={m.content.match(/\((https?:\/\/[^)]+)\)/)?.[1] || ''} alt="Φωτογραφία" className="max-w-[220px] rounded-xl shadow-sm" />
                                </a>
                              </div>
                            ) : m.content?.startsWith('📎') && m.content.includes('](') ? (
                              /* File — minimal card, no colored bubble */
                              <div className={`rounded-xl border border-gray-200 bg-white p-3 shadow-sm ${isFailed ? 'opacity-60' : ''}`}>
                                <a href={m.content.match(/\((https?:\/\/[^)]+)\)/)?.[1] || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                                  <svg className="h-5 w-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                                  {m.content.match(/\[([^\]]+)\]/)?.[1] || 'Αρχείο'}
                                </a>
                              </div>
                            ) : (
                              /* Text — normal bubble */
                              <div className={`rounded-2xl px-4 py-2.5 text-sm ${
                                isMine ? 'bg-blue-600 text-white rounded-bl-md' : 'bg-white text-gray-900 border border-gray-200 rounded-br-md shadow-sm'
                              } ${isFailed ? 'opacity-60' : ''}`}>
                                <p>{m.content}</p>
                              </div>
                            )}
                            {/* Status below message */}
                            <div className="px-1">
                              {/* Keep existing status rendering inside the old div — move it here */}
                              <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-start' : 'justify-end'}`}>
                                {timeStr && (
                                  <span className={`text-[10px] ${isMine ? 'text-blue-200' : 'text-gray-400'}`}>{timeStr}</span>
                                )}
                                {isMine && !isFailed && !isSending && (
                                  <span className={`text-[10px] ${m.read_at ? 'text-blue-200' : 'text-blue-300'}`}>
                                    {m.read_at ? '✓✓' : '✓'}
                                  </span>
                                )}
                                {isSending && (
                                  <span className="text-[10px] text-blue-200">⏳</span>
                                )}
                              </div>
                            </div>

                            {/* Failed message actions */}
                            {isFailed && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-red-500">❌ Αποτυχία</span>
                                <button onClick={() => retryMessage(m.id)} className="text-[10px] text-blue-600 hover:underline font-medium">Ξαναστείλε</button>
                              </div>
                            )}

                            {/* Delete option on hover */}
                            {isMine && !isFailed && !isSending && (
                              <div className="absolute -top-2 right-0 hidden group-hover:flex bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                                <button onClick={() => deleteMessage(m.id, false)} className="px-2 py-1 text-[10px] text-gray-500 hover:bg-gray-50 whitespace-nowrap" title="Διαγραφή για μένα">
                                  🗑️
                                </button>
                                <button onClick={() => deleteMessage(m.id, true)} className="px-2 py-1 text-[10px] text-red-500 hover:bg-red-50 whitespace-nowrap border-l" title="Διαγραφή για όλους">
                                  🗑️ Όλοι
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Typing indicator */}
                {isTyping && (
                  <div className="px-5 py-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <div className="flex gap-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      Πληκτρολογεί...
                    </div>
                  </div>
                )}

                {/* Pending file preview */}
                {pendingFile && (
                  <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
                    <div className="flex items-center gap-3">
                      {pendingFile.previewUrl ? (
                        <img src={pendingFile.previewUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-50">
                          <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{pendingFile.file.name}</p>
                        <p className="text-xs text-gray-400">{(pendingFile.file.size / 1024).toFixed(0)} KB</p>
                      </div>
                      {pendingFile.uploading ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      ) : (
                        <button onClick={() => { if (pendingFile.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl); setPendingFile(null); }}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Input */}
                <div className="border-t border-gray-200 p-4 bg-white">
                  <div className="flex gap-2">
                    {/* Upload button */}
                    <label className="flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-xl border border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition-colors">
                      <input type="file" accept="image/*,application/pdf,.doc,.docx" className="sr-only" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : '';
                        setPendingFile({ file, previewUrl, uploading: false });
                        e.target.value = '';
                      }} />
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                      </svg>
                    </label>
                    <input
                      value={newMsg}
                      onChange={(e) => setNewMsg(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      placeholder="Γράψε μήνυμα..."
                      className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-gray-50"
                    />
                    <button onClick={async () => {
                      if (pendingFile && selectedConv) {
                        setPendingFile((p) => p ? { ...p, uploading: true } : null);
                        try {
                          const formData = new FormData();
                          formData.append('file', pendingFile.file);
                          formData.append('category', 'chat');
                          const token = localStorage.getItem('staffnow_token');
                          const uploadRes = await fetch('https://staffnow-api-production.siteinside53.workers.dev/uploads', {
                            method: 'POST', headers: token ? { 'Authorization': `Bearer ${token}` } : {}, body: formData,
                          });
                          const uploadData = await uploadRes.json() as any;
                          if (uploadData.success && uploadData.data?.url) {
                            const isImage = pendingFile.file.type.startsWith('image/');
                            const content = isImage ? `📷 [Φωτογραφία](${uploadData.data.url})` : `📎 [${pendingFile.file.name}](${uploadData.data.url})`;
                            const msgText = newMsg.trim() ? `${content}\n${newMsg.trim()}` : content;
                            const res = await api.conversations.sendMessage(selectedConv, { content: msgText }) as any;
                            if (res.success) {
                              const m = res.data?.message || res.data;
                              if (!m.created_at) m.created_at = new Date().toISOString();
                              if (!m.sender_id) m.sender_id = user?.id;
                              setMessages((prev) => [...prev, m]);
                            }
                          } else { toast.error(uploadData.error?.message || 'Αποτυχία upload'); }
                        } catch { toast.error('Σφάλμα upload'); }
                        if (pendingFile?.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl);
                        setPendingFile(null);
                        setNewMsg('');
                      } else {
                        sendMessage();
                      }
                    }} disabled={sending || (!newMsg.trim() && !pendingFile)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                      {sending ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="h-[550px] flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <p className="text-4xl mb-2">💬</p>
                  <p className="text-sm">Επίλεξε μια συνομιλία</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>}>
      <MessagesInner />
    </Suspense>
  );
}
