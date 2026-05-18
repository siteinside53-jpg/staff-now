'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api, apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { WorkerProfilePanel } from '@/components/dashboard/worker-profile-panel';
import { BusinessProfilePanel } from '@/components/dashboard/business-profile-panel';

// Format message content for display (strip markdown links)
function formatMessagePreview(content: string | undefined): string {
  if (!content) return '';
  if (content.startsWith('📹')) return '📹 Video κλήση';
  if (content.startsWith('📷')) return '📷 Φωτογραφία';
  if (content.startsWith('📎')) {
    const match = content.match(/\[([^\]]+)\]/);
    return match ? `📎 ${match[1]}` : '📎 Αρχείο';
  }
  return content;
}

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
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [convMenuId, setConvMenuId] = useState<string | null>(null);
  const [reportModal, setReportModal] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [convTab, setConvTab] = useState<'active' | 'archived' | 'blocked'>('active');
  const [videoCallRoom, setVideoCallRoom] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<{ roomName: string; callerName: string; convId: string } | null>(null);
  const dismissedCallRef = useRef<string | null>(null);
  const [viewWorkerProfile, setViewWorkerProfile] = useState<string | null>(null);
  const [viewBusinessProfile, setViewBusinessProfile] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to last message
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
    });
  }, []);

  // Scroll when conversation changes or messages first load
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [selectedConv, loadingMsgs, scrollToBottom, messages.length]);

  // Smooth scroll when new message is added
  const prevMsgCount = useRef(0);
  useEffect(() => {
    if (messages.length > prevMsgCount.current && prevMsgCount.current > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMsgCount.current = messages.length;
  }, [messages.length]);

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
    setVideoCallRoom(null); // Close video call when switching conversations
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
          // Update unread count locally + notify sidebar immediately
          setConversations((prev) => prev.map((c) => c.id === selectedConv ? { ...c, unreadCount: 0 } : c));
          window.dispatchEvent(new CustomEvent('staffnow:badges-refresh'));
        } catch {}
      } catch {} finally { setLoadingMsgs(false); }
    }
    loadMsgs();
  }, [selectedConv]);

  // Poll for new messages every second + detect incoming calls
  const lastKnownMsgId = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedConv) return;
    const cId = selectedConv;
    const poll = async () => {
      try {
        const res = await api.conversations.getMessages(cId) as any;
        const msgs = res?.data || [];
        const sorted: any[] = Array.isArray(msgs) ? [...msgs].reverse() : [];
        const newestId = sorted.filter((m: any) => !m.id?.startsWith('temp_')).pop()?.id || null;
        if (newestId && newestId !== lastKnownMsgId.current) {
          lastKnownMsgId.current = newestId;
          setMessages(sorted);

          // Check for incoming call from the OTHER person (last 2 minutes)
          const twoMinsAgo = Date.now() - 120000;
          const callMsg = sorted.filter((m: any) =>
            m.sender_id !== user?.id &&
            (m.content?.includes('jitsi.member.fsf.org') || m.content?.includes('8x8.vc') || m.content?.includes('daily.co') || m.content?.includes('meet.jit.si')) &&
            m.content?.startsWith('📹') &&
            new Date(m.created_at).getTime() > twoMinsAgo
          ).pop();

          if (callMsg && !videoCallRoom) {
            const urlMatch = callMsg.content.match(/https:\/\/(?:jitsi\.member\.fsf\.org|meet\.jit\.si)\/([^\s#]+)/);
            const roomName = urlMatch?.[1] || '';
            if (roomName && roomName !== dismissedCallRef.current) {
              const callerName = callMsg.sender_name || 'Κάποιος';
              setIncomingCall({ roomName, callerName, convId: cId });
            }
          }
        }
      } catch {}
    };
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [selectedConv, user?.id, videoCallRoom]);

  // Poll conversations list every 8 seconds (for new convos + unread badges)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await api.conversations.list() as any;
        setConversations(res?.data || []);
      } catch {}
    }, 8000);
    return () => clearInterval(interval);
  }, []);

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

  // Upload multiple files and auto-send each as a message
  const handleFilesUpload = async (files: FileList | File[]) => {
    if (!selectedConv || !files.length) return;
    const fileArray = Array.from(files).slice(0, 5); // max 5
    setUploadingFiles(true);
    setShowAttachMenu(false);

    for (const file of fileArray) {
      const tempId = `upload_${Date.now()}_${Math.random()}`;
      const isImage = file.type.startsWith('image/');
      const tempMsg = {
        id: tempId,
        sender_id: user?.id,
        content: isImage ? `📷 Ανέβασμα φωτογραφίας...` : `📎 Ανέβασμα ${file.name}...`,
        created_at: new Date().toISOString(),
        status: 'sending',
      };
      setMessages((prev) => [...prev, tempMsg]);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', 'chat');
        const token = localStorage.getItem('staffnow_token');
        const uploadRes = await fetch('https://staffnow-api-production.siteinside53.workers.dev/uploads', {
          method: 'POST', headers: token ? { 'Authorization': `Bearer ${token}` } : {}, body: formData,
        });
        const uploadData = await uploadRes.json() as any;
        if (uploadData.success && uploadData.data?.url) {
          const content = isImage ? `📷 [Φωτογραφία](${uploadData.data.url})` : `📎 [${file.name}](${uploadData.data.url})`;
          const res = await api.conversations.sendMessage(selectedConv, { content }) as any;
          if (res.success) {
            const m = res.data?.message || res.data;
            if (!m.created_at) m.created_at = new Date().toISOString();
            if (!m.sender_id) m.sender_id = user?.id;
            m.status = 'sent';
            setMessages((prev) => prev.map((msg) => msg.id === tempId ? m : msg));
          } else {
            const why = res?.error?.message || 'Αποτυχία αποστολής';
            toast.error(`${file.name}: ${why}`);
            setMessages((prev) => prev.map((msg) => msg.id === tempId ? { ...msg, status: 'failed', content: `❌ ${file.name}: ${why}` } : msg));
          }
        } else {
          // Surface the real API rejection reason (size, MIME type, magic bytes,
          // etc.) so the user knows why the upload was refused.
          const why = uploadData?.error?.message || `HTTP ${uploadRes.status}`;
          toast.error(`${file.name}: ${why}`);
          setMessages((prev) => prev.map((msg) => msg.id === tempId ? { ...msg, status: 'failed', content: `❌ ${file.name}: ${why}` } : msg));
        }
      } catch (err: any) {
        const why = err?.message || 'Σφάλμα δικτύου';
        toast.error(`${file.name}: ${why}`);
        setMessages((prev) => prev.map((msg) => msg.id === tempId ? { ...msg, status: 'failed', content: `❌ ${file.name}: ${why}` } : msg));
      }
    }
    setUploadingFiles(false);
  };

  const sendQuickReply = async (text: string) => {
    if (!selectedConv) return;
    const tempId = `quick_${Date.now()}`;
    const tempMsg = { id: tempId, sender_id: user?.id, content: text, created_at: new Date().toISOString(), status: 'sending' };
    setMessages((prev) => [...prev, tempMsg]);
    try {
      const res = await api.conversations.sendMessage(selectedConv, { content: text }) as any;
      if (res.success) {
        const m = res.data?.message || res.data;
        if (!m.created_at) m.created_at = new Date().toISOString();
        if (!m.sender_id) m.sender_id = user?.id;
        m.status = 'sent';
        setMessages((prev) => prev.map((x) => x.id === tempId ? m : x));
      }
    } catch { setMessages((prev) => prev.map((x) => x.id === tempId ? { ...x, status: 'failed' } : x)); }
  };

  const deleteMessage = async (msgId: string, forAll: boolean) => {
    if (!selectedConv) return;
    try {
      const token = localStorage.getItem('staffnow_token');
      const res = await fetch(`https://staffnow-api-production.siteinside53.workers.dev/conversations/${selectedConv}/messages/${msgId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ forAll }),
      });
      const data = await res.json() as any;
      if (data.success) {
        setMessages((prev) => prev.filter((m) => m.id !== msgId));
        toast.success(forAll ? 'Το μήνυμα διαγράφηκε για όλους' : 'Το μήνυμα κρύφτηκε');
      } else {
        toast.error('Αποτυχία διαγραφής');
      }
    } catch {
      toast.error('Σφάλμα διαγραφής');
    }
  };

  // Conversation actions
  const convAction = async (convId: string, action: 'archive' | 'restore' | 'delete' | 'block' | 'report' | 'clear_messages', reportDesc?: string) => {
    const token = localStorage.getItem('staffnow_token');
    const base = 'https://staffnow-api-production.siteinside53.workers.dev';
    const headers: any = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    try {
      let res;
      if (action === 'archive' || action === 'restore') {
        res = await fetch(`${base}/conversations/${convId}`, { method: 'PATCH', headers, body: JSON.stringify({ action }) });
      } else if (action === 'delete') {
        if (!confirm('Σίγουρα θέλεις να διαγράψεις αυτή τη συνομιλία;')) return;
        res = await fetch(`${base}/conversations/${convId}`, { method: 'DELETE', headers });
      } else if (action === 'block') {
        if (!confirm('Σίγουρα θέλεις να μπλοκάρεις αυτόν τον χρήστη; Δεν θα μπορείτε πλέον να επικοινωνήσετε.')) return;
        res = await fetch(`${base}/conversations/${convId}/block`, { method: 'POST', headers });
      } else if (action === 'report') {
        res = await fetch(`${base}/conversations/${convId}/report`, { method: 'POST', headers, body: JSON.stringify({ reason: 'inappropriate', description: reportDesc || '' }) });
      } else if (action === 'clear_messages') {
        if (!confirm('Σίγουρα θέλεις να διαγράψεις όλα τα μηνύματα;')) return;
        res = await fetch(`${base}/conversations/${convId}/clear-messages`, { method: 'POST', headers });
      }
      const data = await res?.json() as any;
      if (data?.success) {
        const msgs: Record<string, string> = { archive: 'Αρχειοθετήθηκε', restore: 'Επαναφέρθηκε', delete: 'Διαγράφηκε', block: 'Μπλοκαρίστηκε', report: 'Η αναφορά στάλθηκε', clear_messages: 'Τα μηνύματα διαγράφηκαν' };
        toast.success(msgs[action]);
        if (action === 'delete') {
          setConversations((prev) => prev.filter((c) => c.id !== convId));
          if (selectedConv === convId) { setSelectedConv(null); setMessages([]); }
        } else if (action === 'block') {
          setConversations((prev) => prev.map((c) => c.id === convId ? { ...c, matchStatus: 'archived', isBlocked: true } : c));
          setConvTab('blocked');
        } else if (action === 'archive') {
          setConversations((prev) => prev.map((c) => c.id === convId ? { ...c, matchStatus: 'archived' } : c));
        } else if (action === 'restore') {
          setConversations((prev) => prev.map((c) => c.id === convId ? { ...c, matchStatus: 'active', isBlocked: false, blockedByMe: false } : c));
          setConvTab('active');
        } else if (action === 'clear_messages') {
          if (selectedConv === convId) setMessages([]);
        }
      } else { toast.error('Σφάλμα'); }
    } catch { toast.error('Σφάλμα σύνδεσης'); }
    setConvMenuId(null);
    setReportModal(null);
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
            {/* Tabs */}
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1 mb-3">
              {[
                { key: 'active' as const, label: 'Ενεργές', count: conversations.filter((c) => c.matchStatus !== 'archived' && !c.isBlocked).length },
                { key: 'archived' as const, label: 'Αρχείο', count: conversations.filter((c) => c.matchStatus === 'archived' && !c.isBlocked).length },
                { key: 'blocked' as const, label: 'Blocked', count: conversations.filter((c) => c.isBlocked).length },
              ].map((tab) => (
                <button key={tab.key} onClick={() => setConvTab(tab.key)}
                  className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-all ${convTab === tab.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                  {tab.label} {tab.count > 0 && <span className="ml-1 text-[10px]">({tab.count})</span>}
                </button>
              ))}
            </div>
            {conversations.filter((c: any) => {
              if (convTab === 'blocked') return c.isBlocked;
              if (convTab === 'archived') return c.matchStatus === 'archived' && !c.isBlocked;
              return c.matchStatus !== 'archived' && !c.isBlocked;
            }).map((c: any) => {
              const isActive = selectedConv === c.id;
              const otherName = c.otherParty?.name || (user?.role === 'worker' ? 'Επιχείρηση' : 'Εργαζόμενος');
              const lastMsg = formatMessagePreview(c.lastMessage?.content || c.lastMessage?.text);
              const dateStr = c.updatedAt || c.createdAt;
              return (
                <div key={c.id} className={`relative rounded-xl p-4 transition-all ${isActive ? 'bg-blue-50 border-2 border-blue-500' : 'bg-white border border-gray-100 hover:border-gray-300'} ${c.matchStatus === 'archived' ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSelectedConv(c.id)}>
                    {c.otherParty?.avatar ? (
                      <img src={c.otherParty.avatar} alt="" className="h-10 w-10 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600 flex-shrink-0">
                        {otherName[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`truncate text-sm ${c.unreadCount > 0 && !isActive ? 'font-bold text-gray-900' : 'font-semibold text-gray-900'}`}>{otherName}</p>
                        {c.matchStatus === 'archived' && <span className="text-[10px] text-amber-600 font-medium">Αρχείο</span>}
                      </div>
                      {lastMsg && <p className={`text-xs truncate ${c.unreadCount > 0 && !isActive ? 'font-semibold text-gray-700' : 'text-gray-500'}`}>{lastMsg}</p>}
                      {dateStr && (() => { const d = new Date(dateStr); return !isNaN(d.getTime()) ? <p className="text-xs text-gray-400">{d.toLocaleDateString('el-GR')}</p> : null; })()}
                    </div>
                    {c.unreadCount > 0 && !isActive && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white animate-pulse">{c.unreadCount}</span>
                    )}
                    {/* 3-dot menu */}
                    <button onClick={(e) => { e.stopPropagation(); setConvMenuId(convMenuId === c.id ? null : c.id); }}
                      className="flex-shrink-0 rounded-lg p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" /></svg>
                    </button>
                  </div>

                  {/* Context menu */}
                  {convMenuId === c.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setConvMenuId(null)} />
                      <div className="absolute right-2 top-12 z-20 w-44 rounded-xl bg-white border border-gray-200 shadow-xl overflow-hidden">
                        <button onClick={(e) => {
                          e.stopPropagation(); setConvMenuId(null);
                          const otherId = c.otherParty?.id;
                          if (user?.role === 'worker') {
                            setViewBusinessProfile(otherId);
                          } else {
                            setViewWorkerProfile(otherId);
                          }
                        }}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-blue-700 hover:bg-blue-50">
                          <span>👤</span> Προβολή Προφίλ
                        </button>
                        {c.matchStatus !== 'archived' ? (
                          <button onClick={(e) => { e.stopPropagation(); convAction(c.id, 'archive'); }}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                            <span>📦</span> Αρχειοθέτηση
                          </button>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); convAction(c.id, 'restore'); }}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50">
                            <span>↩️</span> Επαναφορά
                          </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); convAction(c.id, 'clear_messages'); }}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-orange-600 hover:bg-orange-50 border-t border-gray-100">
                          <span>🧹</span> Διαγραφή μηνυμάτων
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); convAction(c.id, 'delete'); }}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100">
                          <span>🗑️</span> Διαγραφή συνομιλίας
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setConvMenuId(null); setReportModal(c.id); }}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-50 border-t border-gray-100">
                          <span>⚠️</span> Αναφορά
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); convAction(c.id, 'block'); }}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-700 hover:bg-red-50 border-t border-gray-100">
                          <span>🚫</span> Αποκλεισμός
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2">
            {selectedConv ? (
              <Card className={`flex flex-col overflow-hidden ${videoCallRoom ? 'h-[700px]' : 'h-[550px]'}`}>
                {/* Chat header — clickable to view profile */}
                <div className="border-b border-gray-100 px-5 py-3 flex items-center gap-3">
                  <button
                    onClick={() => {
                      const conv = conversations.find((c) => c.id === selectedConv);
                      const otherId = conv?.otherParty?.id;
                      if (user?.role === 'worker') setViewBusinessProfile(otherId);
                      else setViewWorkerProfile(otherId);
                    }}
                    className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity cursor-pointer text-left"
                  >
                    {(() => {
                      const conv = conversations.find((c) => c.id === selectedConv);
                      const avatar = conv?.otherParty?.avatar;
                      const name = conv?.otherParty?.name || 'Συνομιλία';
                      return avatar ? (
                        <img src={avatar} alt="" className="h-8 w-8 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 flex-shrink-0">
                          {name[0]?.toUpperCase() || '?'}
                        </div>
                      );
                    })()}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {conversations.find((c) => c.id === selectedConv)?.otherParty?.name || 'Συνομιλία'}
                      </p>
                      {isTyping ? (
                        <p className="text-[11px] text-blue-500 animate-pulse">Πληκτρολογεί...</p>
                      ) : (
                        <p className="text-[10px] text-gray-400">Πάτα για προβολή προφίλ</p>
                      )}
                    </div>
                  </button>
                  {/* Video call button */}
                  {!conversations.find((c) => c.id === selectedConv)?.isBlocked && (
                    <button
                      onClick={async () => {
                        if (videoCallRoom) {
                          setVideoCallRoom(null);
                        } else {
                          try {
                            const room = `staffnow-${selectedConv?.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}-${Date.now().toString(36)}`;
                            setVideoCallRoom(room);
                            const callUrl = `https://jitsi.member.fsf.org/${room}`;
                            api.conversations.sendMessage(selectedConv!, { content: `📹 Video κλήση: ${callUrl}` });
                            setMessages((prev) => [...prev, {
                              id: `call_${Date.now()}`,
                              sender_id: user?.id,
                              content: `📹 Video κλήση: ${callUrl}`,
                              created_at: new Date().toISOString(),
                              status: 'sent',
                            }]);
                          } catch (err: any) {
                            toast.error('Σφάλμα. Δοκίμασε ξανά.');
                          }
                        }
                      }}
                      className={`rounded-lg p-2 transition-colors ${videoCallRoom ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
                      title={videoCallRoom ? 'Τερματισμός κλήσης' : 'Video κλήση'}
                    >
                      {videoCallRoom ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /><line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} /></svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>
                      )}
                    </button>
                  )}
                </div>

                {/* Incoming Call Banner */}
                {incomingCall && !videoCallRoom && (
                  <div className="bg-gradient-to-r from-emerald-600 to-blue-600 px-4 py-3 flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-3 text-white">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold">📹 Εισερχόμενη Video Κλήση</p>
                        <p className="text-xs opacity-80">Από {incomingCall.callerName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setVideoCallRoom(incomingCall.roomName);
                          setIncomingCall(null);
                        }}
                        className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 shadow-lg"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>
                        Αποδοχή
                      </button>
                      <button
                        onClick={() => {
                          dismissedCallRef.current = incomingCall.roomName;
                          setIncomingCall(null);
                        }}
                        className="flex items-center gap-1 rounded-full bg-red-500 px-3 py-2 text-sm font-bold text-white hover:bg-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}

                {/* Video Call iframe */}
                {videoCallRoom && (() => {
                  const conv = conversations.find((c) => c.id === selectedConv);
                  const myName = encodeURIComponent(
                    user?.role === 'worker' ? (conv?.worker_name || 'User') : (conv?.business_name || 'User')
                  );
                  const src = `https://jitsi.member.fsf.org/${videoCallRoom}#config.prejoinConfig.enabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false&config.disableDeepLinking=true&config.hideConferenceSubject=true&config.hideConferenceTimer=true&config.requireDisplayName=false&userInfo.displayName=%22${myName}%22&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.MOBILE_APP_PROMO=false`;
                  return (
                    <div className="relative bg-gray-900">
                      <iframe
                        src={src}
                        className="w-full h-[400px]"
                        allow="camera *; microphone *; fullscreen; display-capture; autoplay"
                        style={{ border: 'none' }}
                      />
                      <button onClick={() => setVideoCallRoom(null)}
                        className="absolute top-2 right-2 flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 shadow-lg z-10">
                        📞 Τέλος κλήσης
                      </button>
                    </div>
                  );
                })()}

                {/* Messages */}
                <div className={`flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50/50 ${videoCallRoom ? 'max-h-[120px]' : ''}`}>
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
                            {m.content?.startsWith('📹') && (m.content.includes('jitsi.member.fsf.org') || m.content.includes('8x8.vc') || m.content.includes('daily.co') || m.content.includes('meet.jit.si')) ? (
                              /* Video call — join button */
                              (() => {
                                const urlMatch = m.content.match(/https:\/\/(?:jitsi\.member\.fsf\.org|meet\.jit\.si)\/([^\s#]+)/);
                                const room = urlMatch?.[1] || '';
                                return (
                                  <div className={`rounded-2xl px-4 py-3 ${isMine ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 shadow-sm'}`}>
                                    <p className="text-sm mb-2">📹 Video κλήση</p>
                                    {videoCallRoom === room ? (
                                      <span className="text-xs opacity-75">Σε κλήση...</span>
                                    ) : (
                                      <button onClick={() => setVideoCallRoom(room)}
                                        className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${isMine ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                                        📹 Συμμετοχή
                                      </button>
                                    )}
                                  </div>
                                );
                              })()
                            ) : m.content?.startsWith('📷') && m.content.includes('](') ? (
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

                {/* Upload loading bar */}
                {uploadingFiles && (
                  <div className="border-t border-gray-200 px-4 py-3 bg-blue-50">
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      <p className="text-sm font-medium text-blue-700">Ανέβασμα αρχείων...</p>
                    </div>
                  </div>
                )}

                {/* Input or Blocked message */}
                {(() => {
                  const conv = conversations.find((c) => c.id === selectedConv);
                  if (conv?.blockedByThem) return (
                    <div className="border-t border-gray-200 p-4 bg-red-50">
                      <p className="text-center text-sm text-red-600 font-medium">🚫 Αυτός ο χρήστης σας έχει αποκλείσει</p>
                    </div>
                  );
                  if (conv?.blockedByMe) return (
                    <div className="border-t border-gray-200 p-4 bg-amber-50">
                      <p className="text-center text-sm text-amber-700 font-medium">🚫 Αποκλείστηκε</p>
                    </div>
                  );
                  return null;
                })()}
                {!conversations.find((c) => c.id === selectedConv)?.isBlocked && (
                <>
                {/* Quick reply chips */}
                {messages.length > 0 && (
                  <div className="border-t border-gray-100 px-4 py-2 bg-white flex flex-wrap gap-1.5">
                    {[
                      'Είσαι διαθέσιμος σήμερα;',
                      'Πόσο ζητάς;',
                      'Μπορείς να ξεκινήσεις άμεσα;',
                      'Έχεις εμπειρία;',
                      'Στείλε μου το βιογραφικό σου',
                    ].map((q) => (
                      <button key={q} onClick={() => sendQuickReply(q)}
                        className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors">
                        {q}
                      </button>
                    ))}
                  </div>
                )}
                <div className="border-t border-gray-200 p-4 bg-white">
                  {/* Hidden file inputs */}
                  <input ref={photoInputRef} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { if (e.target.files) handleFilesUpload(e.target.files); e.target.value = ''; }} />
                  <input ref={fileInputRef} type="file" accept="application/pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" multiple className="sr-only" onChange={(e) => { if (e.target.files) handleFilesUpload(e.target.files); e.target.value = ''; }} />

                  <div className="flex gap-2">
                    {/* Attach button with popup menu */}
                    <div className="relative">
                      <button onClick={() => setShowAttachMenu(!showAttachMenu)} disabled={uploadingFiles}
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition-colors disabled:opacity-50">
                        {uploadingFiles ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                        ) : (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                        )}
                      </button>

                      {/* Popup menu */}
                      {showAttachMenu && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setShowAttachMenu(false)} />
                          <div className="absolute bottom-12 left-0 z-20 w-48 rounded-xl bg-white border border-gray-200 shadow-xl overflow-hidden">
                            <button onClick={() => { photoInputRef.current?.click(); setShowAttachMenu(false); }}
                              className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                              <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
                              Φωτογραφία
                              <span className="text-[10px] text-gray-400 ml-auto">έως 5</span>
                            </button>
                            <button onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }}
                              className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors border-t border-gray-100">
                              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                              Αρχείο
                              <span className="text-[10px] text-gray-400 ml-auto">έως 5</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    <input
                      value={newMsg}
                      onChange={(e) => setNewMsg(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      placeholder="Γράψε μήνυμα..."
                      className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-gray-50"
                    />
                    <button onClick={() => sendMessage()} disabled={sending || !newMsg.trim()}
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
                </>
                )}
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
      {/* Report Modal */}
      {reportModal && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setReportModal(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-gray-900 mb-2">⚠️ Αναφορά χρήστη</h3>
              <p className="text-sm text-gray-500 mb-4">Περίγραψε τον λόγο της αναφοράς</p>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                rows={3}
                placeholder="π.χ. Ανάρμοστη συμπεριφορά..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 mb-4"
              />
              <div className="flex gap-3">
                <button onClick={() => setReportModal(null)}
                  className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Ακύρωση
                </button>
                <button onClick={() => { convAction(reportModal, 'report', reportReason); setReportReason(''); }}
                  className="flex-1 rounded-lg bg-amber-600 py-2.5 text-sm font-semibold text-white hover:bg-amber-700">
                  Αποστολή αναφοράς
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {viewWorkerProfile && (
        <WorkerProfilePanel workerId={viewWorkerProfile} onClose={() => setViewWorkerProfile(null)} />
      )}
      {viewBusinessProfile && (
        <BusinessProfilePanel businessUserId={viewBusinessProfile} onClose={() => setViewBusinessProfile(null)} />
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
