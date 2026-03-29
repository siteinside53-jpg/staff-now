'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
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

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedConv) return;
    async function loadMsgs() {
      setLoadingMsgs(true);
      try {
        const res = await api.conversations.getMessages(selectedConv!) as any;
        const msgs = res?.data || [];
        // API returns newest first, we need oldest first for chat display
        setMessages(Array.isArray(msgs) ? [...msgs].reverse() : []);
      } catch {} finally { setLoadingMsgs(false); }
    }
    loadMsgs();
  }, [selectedConv]);

  const sendMessage = async () => {
    if (!newMsg.trim() || !selectedConv) return;
    setSending(true);
    try {
      const res = await api.conversations.sendMessage(selectedConv, { content: newMsg.trim() }) as any;
      if (res.success) {
        const newMessage = res.data?.message || res.data;
        // Ensure created_at exists
        if (!newMessage.created_at) newMessage.created_at = new Date().toISOString();
        if (!newMessage.sender_id) newMessage.sender_id = user?.id;
        setMessages((prev) => [...prev, newMessage]);
        setNewMsg('');
      }
    } catch { toast.error('Αποτυχία αποστολής'); } finally { setSending(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">💬 Μηνύματα</h1>
      </div>

      {conversations.length === 0 && !selectedConv ? (
        <EmptyState
          title="Δεν έχεις μηνύματα ακόμα"
          description="Κάνε match με κάποιον στην Ανακάλυψη ή στο Ενδιαφέρον για να ξεκινήσεις συνομιλία!"
        />
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
                      {dateStr && <p className="text-xs text-gray-400">{new Date(dateStr).toLocaleDateString('el-GR')}</p>}
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
              <Card className="h-[500px] flex flex-col">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                      return (
                        <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${isMine ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                            <p>{m.content}</p>
                            {timeStr && (
                              <p className={`text-[10px] mt-1 ${isMine ? 'text-blue-200' : 'text-gray-400'}`}>{timeStr}</p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-gray-200 p-4">
                  <div className="flex gap-2">
                    <input
                      value={newMsg}
                      onChange={(e) => setNewMsg(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      placeholder="Γράψε μήνυμα..."
                      className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                    <button onClick={sendMessage} disabled={sending || !newMsg.trim()}
                      className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                      {sending ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                      )}
                    </button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="h-[500px] flex items-center justify-center">
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
