'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { usePoll } from '@/lib/use-poll';
import { api, apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { WorkerProfilePanel } from '@/components/dashboard/worker-profile-panel';
import { BusinessProfilePanel } from '@/components/dashboard/business-profile-panel';
import { RatingModal } from '@/components/dashboard/rating-modal';
// Η διεύθυνση του server έμπαινε γραμμένη στο χέρι μέσα στη σελίδα, οπότε ακόμη
// και όταν δοκιμάζαμε τοπικά, οι κλήσεις έφευγαν στον ΖΩΝΤΑΝΟ server. Στην
// παραγωγή η τιμή είναι ακριβώς η ίδια, άρα δεν αλλάζει τίποτα εκεί.
import { API_URL } from '@/lib/config';

// Στο κινητό η συνομιλία πιάνει όλη την οθόνη, οπότε η μπάρα γραφής ακουμπά
// στο κάτω άκρο. Το env(safe-area-inset-bottom) την κρατά πάνω από τη γραμμή
// πλοήγησης του τηλεφώνου (π.χ. το home indicator του iPhone).
const SAFE_BOTTOM = { paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)' };

function ChatMenuItem({ icon, label, onClick, color = 'text-gray-900' }: { icon: string; label: string; onClick: () => void; color?: string }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left hover:bg-gray-50 ${color}`}>
      <span className="text-lg">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

/**
 * Η κάρτα της πρόσληψης μέσα στη συνομιλία — δείχνει σε ποιο από τα 4 βήματα
 * βρισκόμαστε και τι μπορεί να πατήσει ο καθένας:
 *
 *   pending   → ο εργαζόμενος απαντάει «Ναι, ξεκίνησα» ή «Όχι»
 *   confirmed → η επιχείρηση βλέπει «1 από 3» και κλείνει την αγγελία
 *   declined  → μένει ως ιστορικό, χωρίς κουμπιά
 */
function HireCard({
  hire, isWorker, busy, onAnswer, onCloseJob, onRate, timeStr,
}: {
  hire: any;
  isWorker: boolean;
  busy: string | null;
  onAnswer: (id: string, answer: 'confirm' | 'decline') => void;
  onCloseJob: (jobId: string) => void;
  onRate: (hire: any) => void;
  timeStr: string;
}) {
  const shell = 'w-full max-w-sm rounded-2xl border px-4 py-3 shadow-sm';

  if (!hire) {
    return (
      <div className={`${shell} border-gray-200 bg-white text-center text-sm text-gray-400`}>
        🤝 Δήλωση πρόσληψης
      </div>
    );
  }

  const jobLine = hire.job_title ? ` για «${hire.job_title}»` : '';
  /*
    Δύο εκδοχές γιατί το όνομα μπαίνει άλλοτε ως υποκείμενο («Ο Γιάννης
    επιβεβαίωσε») κι άλλοτε ως αντικείμενο («προσέλαβες τον Γιάννη»). Όταν το
    προφίλ δεν έχει όνομα, χωρίς αυτό βγαίνει «προσέλαβες Ο/Η εργαζόμενος/η».
  */
  const who = isWorker ? (hire.business_name || 'Η επιχείρηση') : (hire.worker_name || 'Ο/Η εργαζόμενος/η');
  const whoAcc = isWorker ? (hire.business_name || 'την επιχείρηση') : (hire.worker_name || 'τον/την εργαζόμενο/η');
  const working = busy === hire.id || busy === hire.job_id;

  if (hire.status === 'pending') {
    return (
      <div className={`${shell} border-emerald-200 bg-emerald-50`}>
        <p className="text-sm font-semibold text-emerald-900">🤝 Δήλωση πρόσληψης</p>
        {isWorker ? (
          <>
            <p className="mt-1 text-sm text-emerald-800">
              {who} δηλώνει ότι σε προσέλαβε{jobLine}. Επιβεβαίωσε για να μετρήσει.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                disabled={working}
                onClick={() => onAnswer(hire.id, 'confirm')}
                className="flex-1 rounded-xl bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Ναι, ξεκίνησα
              </button>
              <button
                disabled={working}
                onClick={() => onAnswer(hire.id, 'decline')}
                className="flex-1 rounded-xl border border-emerald-300 bg-white py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
              >
                Όχι
              </button>
            </div>
          </>
        ) : (
          <p className="mt-1 text-sm text-emerald-800">
            Δήλωσες ότι προσέλαβες {whoAcc}{jobLine}. Περιμένουμε την επιβεβαίωσή του/της.
          </p>
        )}
        {timeStr && <p className="mt-2 text-right text-[10px] text-emerald-600">{timeStr}</p>}
      </div>
    );
  }

  if (hire.status === 'confirmed') {
    const target = Number(hire.job_target) || 1;
    const done = Number(hire.job_confirmed) || 0;
    const isFilled = hire.job_status === 'filled';
    const ratingOpen = Boolean(hire.rating_opens_at) && Date.now() >= Date.parse(hire.rating_opens_at);
    const iRated = Number(hire.i_rated) > 0;
    return (
      <div className={`${shell} border-emerald-300 bg-emerald-50`}>
        <p className="text-sm font-semibold text-emerald-900">✅ Η πρόσληψη επιβεβαιώθηκε</p>
        <p className="mt-1 text-sm text-emerald-800">
          {/*
            «στην επιχείρηση <όνομα>» και όχι «στη <όνομα>»: το άρθρο δεν μπορεί
            να μαντέψει το γένος της επωνυμίας («στη Ουζερί Το Στέκι» = λάθος).
          */}
          {isWorker ? `Ξεκίνησες στην επιχείρηση ${who}${jobLine}.` : `${who} επιβεβαίωσε${jobLine}.`}
        </p>
        {!isWorker && hire.job_id && (
          <>
            <p className="mt-2 text-sm font-medium text-emerald-900">
              Καλύφθηκαν {done} από {target} {target === 1 ? 'θέση' : 'θέσεις'}.
            </p>
            {isFilled ? (
              <p className="mt-1 text-xs text-emerald-700">Η αγγελία είναι κλειστή («Καλύφθηκε»).</p>
            ) : (
              <button
                disabled={working}
                onClick={() => onCloseJob(hire.job_id)}
                className="mt-2 w-full rounded-xl bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {done >= target ? 'Κλείσε την αγγελία' : 'Κλείσε την αγγελία τώρα'}
              </button>
            )}
          </>
        )}
        {/*
          Βήμα 4. Το κουμπί εμφανίζεται μόνο όταν έχει ανοίξει η αξιολόγηση
          (15 μέρες). Ο server ξαναελέγχει την ημερομηνία — η οθόνη δεν αρκεί.
        */}
        {ratingOpen ? (
          <button
            onClick={() => onRate(hire)}
            className="mt-3 w-full rounded-xl border border-amber-300 bg-amber-50 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
          >
            {iRated ? '⭐ Δες τις αξιολογήσεις' : '⭐ Γράψε αξιολόγηση'}
          </button>
        ) : (
          <p className="mt-2 text-xs text-emerald-700">
            Σε 15 μέρες θα μπορείτε να αξιολογήσετε ο ένας τον άλλον.
          </p>
        )}
        {timeStr && <p className="mt-1 text-right text-[10px] text-emerald-600">{timeStr}</p>}
      </div>
    );
  }

  return (
    <div className={`${shell} border-gray-200 bg-white text-center`}>
      <p className="text-sm text-gray-500">
        {hire.status === 'declined'
          ? 'Η πρόσληψη δεν επιβεβαιώθηκε — η αγγελία μένει ανοιχτή.'
          : 'Η δήλωση πρόσληψης ακυρώθηκε.'}
      </p>
      {timeStr && <p className="mt-1 text-[10px] text-gray-400">{timeStr}</p>}
    </div>
  );
}

/** Στρογγυλή φωτογραφία με αρχικό γράμμα ως εφεδρεία, ίδια με τα Matches. */
function Avatar({ name, src, className = '' }: { name: string; src?: string | null; className?: string }) {
  return (
    <div className={`flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 font-bold text-blue-600 ${className}`}>
      {src
        ? <img src={src} alt="" className="h-full w-full object-cover" />
        : name.charAt(0).toUpperCase()}
    </div>
  );
}

// Format message content for display (strip markdown links)
/** Πρόθεμα του μηνύματος-κάρτας της πρόσληψης, ίδιο μοτίβο με το «📹». */
const HIRE_PREFIX = '🤝 Πρόσληψη:';

function formatMessagePreview(content: string | undefined): string {
  if (!content) return '';
  if (content.startsWith(HIRE_PREFIX)) return '🤝 Δήλωση πρόσληψης';
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
  // Δύο ονόματα για την ίδια παράμετρο: οι παλιοί σύνδεσμοι στέλνουν `?id=`,
  // οι ειδοποιήσεις των προσλήψεων στέλνουν `?c=`. Χωρίς το `c` η σελίδα άνοιγε
  // στη λίστα και η συνομιλία έμενε κλειστή.
  const convId = searchParams.get('id') || searchParams.get('c');
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(convId);
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [failedMsgs, setFailedMsgs] = useState<Set<string>>(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [convMenuId, setConvMenuId] = useState<string | null>(null);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [reportModal, setReportModal] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [convTab, setConvTab] = useState<'active' | 'archived' | 'blocked'>('active');
  const [videoCallRoom, setVideoCallRoom] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<{ roomName: string; callerName: string; convId: string } | null>(null);
  const dismissedCallRef = useRef<string | null>(null);
  const [viewWorkerProfile, setViewWorkerProfile] = useState<string | null>(null);
  const [viewBusinessProfile, setViewBusinessProfile] = useState<string | null>(null);
  // Οι προσλήψεις αυτής της συνομιλίας, με κλειδί το id — τις διαβάζει η κάρτα
  // μέσα στο chat για να ξέρει σε ποιο από τα 4 βήματα βρισκόμαστε.
  const [hires, setHires] = useState<Record<string, any>>({});
  const [hireBusy, setHireBusy] = useState<string | null>(null);
  // Ποια πρόσληψη αξιολογούμε αυτή τη στιγμή (Βήμα 4).
  const [ratingHire, setRatingHire] = useState<any>(null);
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
          await fetch(`${API_URL}/conversations/${selectedConv}`, {
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

  // Οι προσλήψεις της ανοιχτής συνομιλίας. Ξαναδιαβάζονται μετά από κάθε
  // ενέργεια, ώστε η κάρτα να δείχνει πάντα το σωστό βήμα.
  const refreshHires = useCallback(async () => {
    if (!selectedConv) return;
    try {
      const res = (await api.hires.list({ conversation_id: selectedConv })) as any;
      const list: any[] = res?.data?.hires || [];
      setHires(Object.fromEntries(list.map((h) => [h.id, h])));
    } catch {}
  }, [selectedConv]);

  useEffect(() => {
    setHires({});
    refreshHires();
  }, [selectedConv, refreshHires]);

  // Αν έφτασε μήνυμα-κάρτα πρόσληψης που δεν το ξέρουμε ακόμη (π.χ. μόλις το
  // έστειλε η άλλη πλευρά), ξαναδιαβάζουμε — αλλιώς η κάρτα μένει άδεια.
  // Το `triedHiresRef` κρατάει ποια id έχουμε ήδη ζητήσει, ώστε αν κάποιο δεν
  // επιστρέψει ποτέ να ΜΗΝ ξαναρωτάμε τον server ασταμάτητα.
  const triedHiresRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    triedHiresRef.current = new Set();
  }, [selectedConv]);
  useEffect(() => {
    const missing = messages.some((m: any) => {
      if (!m.content?.startsWith(HIRE_PREFIX)) return false;
      const id = m.content.slice(HIRE_PREFIX.length).trim();
      if (hires[id] || triedHiresRef.current.has(id)) return false;
      triedHiresRef.current.add(id);
      return true;
    });
    if (missing) refreshHires();
  }, [messages, hires, refreshHires]);

  // Poll for new messages + detect incoming calls.
  // Μένει στα 5 δευτ. — εδώ χρειάζεται η ταχύτητα. Το κέρδος έρχεται από την
  // παύση του usePoll όταν η καρτέλα είναι κρυφή.
  const lastKnownMsgId = useRef<string | null>(null);
  const pollMessages = useCallback(async () => {
    if (!selectedConv) return;
    const cId = selectedConv;
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
  }, [selectedConv, user?.id, videoCallRoom]);
  usePoll(pollMessages, 5_000, !!selectedConv);

  // Λίστα συνομιλιών: 20 δευτ. αντί για 8. Είναι μόνο η στήλη αριστερά — τα
  // μηνύματα της ανοιχτής συνομιλίας ανανεώνονται πιο πάνω κάθε 5 δευτ.
  const pollConversations = useCallback(async () => {
    const res = await api.conversations.list() as any;
    setConversations(res?.data || []);
  }, []);
  usePoll(pollConversations, 20_000);

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
        const uploadRes = await fetch(`${API_URL}/uploads`, {
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
      const res = await fetch(`${API_URL}/conversations/${selectedConv}/messages/${msgId}`, {
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
    const base = API_URL;
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

  // ── Πρόσληψη σε 4 βήματα ────────────────────────────────────────────────
  // Βήμα 1: η επιχείρηση δηλώνει. Στέλνει και το μήνυμα-κάρτα στη συνομιλία.
  const declareHire = async () => {
    if (!selectedConv || hireBusy) return;
    setHireBusy('new');
    try {
      const res = (await api.hires.create({ conversationId: selectedConv })) as any;
      if (res?.data?.hire) {
        toast.success('Δηλώθηκε. Περιμένουμε την επιβεβαίωσή του/της.');
        await refreshHires();
        const r = (await api.conversations.getMessages(selectedConv)) as any;
        const msgs = r?.data || [];
        setMessages(Array.isArray(msgs) ? [...msgs].reverse() : []);
      } else {
        toast.error(res?.error?.message || 'Δεν έγινε η δήλωση');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Σφάλμα σύνδεσης');
    }
    setHireBusy(null);
  };

  // Βήμα 2: ο εργαζόμενος απαντάει. Χωρίς αυτό δεν μετράει τίποτα.
  const answerHire = async (hireId: string, answer: 'confirm' | 'decline') => {
    if (hireBusy) return;
    setHireBusy(hireId);
    try {
      const res = (await (answer === 'confirm' ? api.hires.confirm(hireId) : api.hires.decline(hireId))) as any;
      if (res?.data?.hire) {
        toast.success(answer === 'confirm' ? 'Επιβεβαιώθηκε!' : 'Καταγράφηκε');
        await refreshHires();
      } else {
        toast.error(res?.error?.message || 'Σφάλμα');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Σφάλμα σύνδεσης');
    }
    setHireBusy(null);
  };

  // Βήμα 3: η επιχείρηση κλείνει την αγγελία όταν καλυφθούν οι θέσεις.
  const closeJob = async (jobId: string) => {
    if (hireBusy) return;
    setHireBusy(jobId);
    try {
      const res = (await api.jobs.fill(jobId)) as any;
      if (res?.data?.filled) {
        toast.success('Η αγγελία έκλεισε — δεν θα δέχεσαι άλλα μηνύματα για αυτή.');
        await refreshHires();
      } else {
        toast.error(res?.error?.message || 'Σφάλμα');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Σφάλμα σύνδεσης');
    }
    setHireBusy(null);
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  const activeConv = conversations.find((c) => c.id === selectedConv);
  const activeName = activeConv?.otherParty?.name || 'Συνομιλία';

  // Κλείσιμο της συνομιλίας (κουμπί «πίσω» στο κινητό)
  const closeChat = () => {
    setSelectedConv(null);
    setMessages([]);
    setVideoCallRoom(null);
    setShowChatMenu(false);
  };

  const openOtherProfile = () => {
    const otherId = activeConv?.otherParty?.id;
    if (user?.role === 'worker') setViewBusinessProfile(otherId);
    else setViewWorkerProfile(otherId);
  };

  return (
    <div>
      <div className="mb-6"><h1 className="text-2xl font-bold text-gray-900">💬 Συνομιλίες</h1></div>

      {conversations.length === 0 && !selectedConv ? (
        <EmptyState title="Δεν έχεις μηνύματα ακόμα" description="Κάνε match για να ξεκινήσεις συνομιλία!" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Conversation List — στο κινητό κρύβεται όσο είναι ανοιχτή μια
              συνομιλία, ώστε να μην κυλάει η σελίδα πίσω από το chat. */}
          <div className={`min-w-0 lg:col-span-1 space-y-1 ${selectedConv ? 'hidden lg:block' : ''}`}>
            {/* Καρτέλες σε ίδιο ύφος με τα Matches: στρογγυλά «χάπια» με εικονίδιο. */}
            <div className="mb-3 flex rounded-full bg-gray-100 p-1">
              {[
                { key: 'active' as const, icon: '💬', label: 'Ενεργές', count: conversations.filter((c) => c.matchStatus !== 'archived' && !c.isBlocked).length },
                { key: 'archived' as const, icon: '📦', label: 'Αρχείο', count: conversations.filter((c) => c.matchStatus === 'archived' && !c.isBlocked).length },
                { key: 'blocked' as const, icon: '🚫', label: 'Blocked', count: conversations.filter((c) => c.isBlocked).length },
              ].map((tab) => (
                <button key={tab.key} onClick={() => setConvTab(tab.key)}
                  className={`min-w-0 flex-1 rounded-full py-2 text-xs font-bold transition-all ${convTab === tab.key ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700'}`}>
                  <span className="mr-1">{tab.icon}</span>{tab.label}{tab.count > 0 && <span className="ml-1 font-semibold opacity-70">({tab.count})</span>}
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
                <div key={c.id} className={`flex items-center ${c.matchStatus === 'archived' ? 'opacity-60' : ''}`}>
                  {/* Η σειρά δεν έχει πλαίσιο· η επιλεγμένη ξεχωρίζει μόνο με γαλάζιο φόντο. */}
                  <div
                    className={`flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg py-3 pl-2 pr-1 ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50 active:bg-gray-50'}`}
                    onClick={() => setSelectedConv(c.id)}
                  >
                    <Avatar name={otherName} src={c.otherParty?.avatar} className="h-14 w-14 text-lg" />
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
                  </div>

                  {/*
                    Οι τρεις τελίτσες είναι αδελφός της σειράς, χωρίς transform:
                    έτσι το μενού δεν πέφτει πίσω από τις επόμενες συνομιλίες.
                  */}
                  <div className={`relative flex-shrink-0 ${convMenuId === c.id ? 'z-30' : ''}`}>
                    <button onClick={(e) => { e.stopPropagation(); setConvMenuId(convMenuId === c.id ? null : c.id); }}
                      aria-label="Επιλογές"
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" /></svg>
                    </button>

                  {/* Context menu */}
                  {convMenuId === c.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setConvMenuId(null)} />
                      <div className="absolute right-0 top-10 z-20 w-44 rounded-xl bg-white border border-gray-200 shadow-xl overflow-hidden">
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
                </div>
              );
            })}
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2">
            {selectedConv ? (
              /* Στο κινητό η συνομιλία ανοίγει σε ΟΛΗ την οθόνη (fixed inset-0),
                 πάνω από την πάνω μπάρα και το κάτω μενού του dashboard (z-30),
                 όπως σε κανονική εφαρμογή μηνυμάτων. Από lg: και πάνω γυρίζει
                 στην κανονική κάρτα δίπλα στη λίστα. */
              <div className={`fixed inset-0 z-40 flex flex-col bg-white lg:static lg:z-auto lg:overflow-hidden lg:rounded-2xl lg:border lg:border-gray-100 lg:shadow-sm ${videoCallRoom ? 'lg:h-[700px]' : 'lg:h-[550px]'}`}>
                {/* Chat header — clickable to view profile */}
                <div className="flex flex-shrink-0 items-center gap-2 border-b border-gray-100 bg-white px-3 py-2.5">
                  {/* Πίσω — μόνο στο κινητό, όπου το chat καλύπτει τη λίστα */}
                  <button onClick={closeChat} className="-ml-1.5 p-1.5 lg:hidden" title="Πίσω">
                    <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={openOtherProfile}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left transition-opacity hover:opacity-80"
                  >
                    {activeConv?.otherParty?.avatar ? (
                      <img src={activeConv.otherParty.avatar} alt="" className="h-10 w-10 flex-shrink-0 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-purple-100 font-bold text-purple-700">
                        {activeName[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-gray-900">{activeName}</p>
                      {isTyping ? (
                        <p className="animate-pulse text-[11px] text-blue-500">Πληκτρολογεί...</p>
                      ) : (
                        <p className="text-[11px] text-gray-400">Πάτα για προβολή προφίλ</p>
                      )}
                    </div>
                  </button>
                  {/* Video call button */}
                  {!activeConv?.isBlocked && (
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
                      className={`flex-shrink-0 rounded-full p-2 transition-colors ${videoCallRoom ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                      title={videoCallRoom ? 'Τερματισμός κλήσης' : 'Video κλήση'}
                    >
                      {videoCallRoom ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /><line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} /></svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>
                      )}
                    </button>
                  )}
                  {/* Μενού συνομιλίας */}
                  <button onClick={() => setShowChatMenu(true)} className="flex-shrink-0 rounded-full p-2 hover:bg-gray-100" title="Επιλογές">
                    <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                    </svg>
                  </button>
                </div>

                {/* Incoming Call Banner */}
                {incomingCall && !videoCallRoom && (
                  <div className="flex flex-shrink-0 animate-pulse items-center justify-between gap-2 bg-gradient-to-r from-emerald-600 to-blue-600 px-4 py-3">
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
                    <div className="relative flex-shrink-0 bg-gray-900">
                      <iframe
                        src={src}
                        className="h-[280px] w-full sm:h-[400px]"
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
                <div className={`flex-1 space-y-2.5 overflow-y-auto bg-gray-50 p-3 sm:px-5 sm:py-4 ${videoCallRoom ? 'max-h-[140px]' : ''}`}>
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
                      const isHire = m.content?.startsWith(HIRE_PREFIX);
                      const isText = !(isHire || m.content?.startsWith('📹') || (m.content?.startsWith('📷') && m.content.includes('](')) || (m.content?.startsWith('📎') && m.content.includes('](')));

                      // Η κάρτα της πρόσληψης πιάνει όλο το πλάτος — έχει κουμπιά
                      // και κείμενο, δεν χωράει σε φούσκα 75%.
                      if (isHire) {
                        return (
                          <div key={m.id} className="flex justify-center">
                            <HireCard
                              hire={hires[m.content.slice(HIRE_PREFIX.length).trim()]}
                              isWorker={user?.role === 'worker'}
                              busy={hireBusy}
                              onAnswer={answerHire}
                              onCloseJob={closeJob}
                              onRate={setRatingHire}
                              timeStr={timeStr}
                            />
                          </div>
                        );
                      }

                      return (
                        <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
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
                              <div className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                                isMine ? 'rounded-br-md bg-blue-600 text-white' : 'rounded-bl-md border border-gray-100 bg-white text-gray-900'
                              } ${isFailed ? 'opacity-60' : ''}`}>
                                <p className="whitespace-pre-wrap break-words text-sm">{m.content}</p>
                                <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${isMine ? 'text-blue-100' : 'text-gray-400'}`}>
                                  {timeStr && <span>{timeStr}</span>}
                                  {isMine && !isFailed && !isSending && <span>{m.read_at ? '✓✓' : '✓'}</span>}
                                  {isSending && <span>⏳</span>}
                                </div>
                              </div>
                            )}
                            {/* Ώρα κάτω από φωτογραφίες / αρχεία / κλήσεις,
                                όπου δεν υπάρχει φούσκα να τη χωρέσει. */}
                            {!isText && (
                              <div className={`mt-1 flex items-center gap-1 px-1 text-[10px] text-gray-400 ${isMine ? 'justify-end' : 'justify-start'}`}>
                                {timeStr && <span>{timeStr}</span>}
                                {isMine && !isFailed && !isSending && <span>{m.read_at ? '✓✓' : '✓'}</span>}
                                {isSending && <span>⏳</span>}
                              </div>
                            )}

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
                  <div className="flex-shrink-0 px-4 py-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <div className="flex gap-0.5">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0ms' }} />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '150ms' }} />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '300ms' }} />
                      </div>
                      Πληκτρολογεί...
                    </div>
                  </div>
                )}

                {/* Upload loading bar */}
                {uploadingFiles && (
                  <div className="flex-shrink-0 border-t border-gray-200 bg-blue-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      <p className="text-sm font-medium text-blue-700">Ανέβασμα αρχείων...</p>
                    </div>
                  </div>
                )}

                {/* Input or Blocked message */}
                {activeConv?.blockedByThem && (
                  <div className="flex-shrink-0 border-t border-gray-200 bg-red-50 p-4" style={SAFE_BOTTOM}>
                    <p className="text-center text-sm font-medium text-red-600">🚫 Αυτός ο χρήστης σας έχει αποκλείσει</p>
                  </div>
                )}
                {activeConv?.blockedByMe && !activeConv?.blockedByThem && (
                  <div className="flex-shrink-0 border-t border-gray-200 bg-amber-50 p-4" style={SAFE_BOTTOM}>
                    <p className="text-center text-sm font-medium text-amber-700">🚫 Αποκλείστηκε</p>
                  </div>
                )}
                {!activeConv?.isBlocked && (
                <>
                {/* Quick reply chips — μία σειρά που κυλάει, για να μη φαγωθεί
                    ύψος από την οθόνη στο κινητό. */}
                {messages.length > 0 && (
                  <div className="flex flex-shrink-0 gap-1.5 overflow-x-auto border-t border-gray-100 bg-white px-3 py-2">
                    {[
                      'Είσαι διαθέσιμος σήμερα;',
                      'Πόσο ζητάς;',
                      'Μπορείς να ξεκινήσεις άμεσα;',
                      'Έχεις εμπειρία;',
                      'Στείλε μου το βιογραφικό σου',
                    ].map((q) => (
                      <button key={q} onClick={() => sendQuickReply(q)}
                        className="flex-shrink-0 whitespace-nowrap rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700">
                        {q}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex flex-shrink-0 items-center gap-1.5 border-t border-gray-100 bg-white px-2 py-2" style={SAFE_BOTTOM}>
                  {/* Hidden file inputs — δέχονται έως 5 αρχεία μαζί */}
                  <input ref={photoInputRef} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { if (e.target.files) handleFilesUpload(e.target.files); e.target.value = ''; }} />
                  <input ref={fileInputRef} type="file" accept="application/pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" multiple className="sr-only" onChange={(e) => { if (e.target.files) handleFilesUpload(e.target.files); e.target.value = ''; }} />

                  <button onClick={() => photoInputRef.current?.click()} disabled={uploadingFiles}
                    className="flex-shrink-0 p-2 text-gray-500 transition-colors hover:text-blue-600 disabled:opacity-50" title="Φωτογραφία (έως 5)">
                    {uploadingFiles ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                    )}
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFiles}
                    className="flex-shrink-0 p-2 text-gray-500 transition-colors hover:text-blue-600 disabled:opacity-50" title="Αρχείο (έως 5)">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.122 2.122l7.81-7.81" />
                    </svg>
                  </button>

                  <input
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="Μήνυμα..."
                    className="min-w-0 flex-1 rounded-full bg-gray-100 px-4 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/30"
                  />
                  <button onClick={() => sendMessage()} disabled={sending || !newMsg.trim()}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-50">
                    {sending ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                      </svg>
                    )}
                  </button>
                </div>
                </>
                )}

                {/* Μενού συνομιλίας — φύλλο που ανεβαίνει από κάτω */}
                {showChatMenu && (
                  <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowChatMenu(false)}>
                    <div className="absolute inset-0 bg-black/50" />
                    <div className="relative z-10 w-full space-y-1 rounded-t-3xl bg-white p-4" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}>
                      <div className="mb-2 flex justify-center"><div className="h-1.5 w-10 rounded-full bg-gray-300" /></div>
                      <ChatMenuItem icon="👤" label="Προβολή προφίλ" onClick={() => { setShowChatMenu(false); openOtherProfile(); }} />
                      {/* Βήμα 1 της πρόσληψης — μόνο η επιχείρηση τη δηλώνει. */}
                      {user?.role === 'business' && (
                        <ChatMenuItem
                          icon="🤝"
                          label="Τον/την προσέλαβα"
                          color="text-emerald-700"
                          onClick={() => { setShowChatMenu(false); declareHire(); }}
                        />
                      )}
                      {activeConv?.matchStatus === 'archived' ? (
                        <ChatMenuItem icon="↩️" label="Επαναφορά" color="text-emerald-700" onClick={() => { setShowChatMenu(false); convAction(selectedConv!, 'restore'); }} />
                      ) : (
                        <ChatMenuItem icon="📦" label="Αρχειοθέτηση" onClick={() => { setShowChatMenu(false); convAction(selectedConv!, 'archive'); }} />
                      )}
                      <ChatMenuItem icon="🧹" label="Διαγραφή μηνυμάτων" color="text-orange-600" onClick={() => { setShowChatMenu(false); convAction(selectedConv!, 'clear_messages'); }} />
                      <ChatMenuItem icon="🗑️" label="Διαγραφή συνομιλίας" color="text-red-600" onClick={() => { setShowChatMenu(false); convAction(selectedConv!, 'delete'); }} />
                      <ChatMenuItem icon="⚠️" label="Αναφορά" color="text-amber-700" onClick={() => { setShowChatMenu(false); setReportModal(selectedConv); }} />
                      <ChatMenuItem icon="🚫" label="Αποκλεισμός" color="text-red-700" onClick={() => { setShowChatMenu(false); convAction(selectedConv!, 'block'); }} />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Κενή κατάσταση — μόνο στον υπολογιστή· στο κινητό βλέπεις τη λίστα */
              <Card className="hidden h-[550px] items-center justify-center lg:flex">
                <div className="text-center text-gray-400">
                  <p className="mb-2 text-4xl">💬</p>
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
      {ratingHire && (
        <RatingModal
          hireId={ratingHire.id}
          isWorker={user?.role === 'worker'}
          otherName={
            (user?.role === 'worker' ? ratingHire.business_name : ratingHire.worker_name) || 'τον/την συνεργάτη'
          }
          onClose={() => setRatingHire(null)}
          onSaved={refreshHires}
        />
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
