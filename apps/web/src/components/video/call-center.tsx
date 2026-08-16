'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { api } from '@/lib/api';
import { Avatar } from '@/components/ui/avatar';
import { CallEngine, type CallEndReason, type CallStatus, type MediaFailure } from '@/lib/call-engine';
import { PermissionGuide } from './permission-guide';
import { Ringtone } from '@/lib/ringtone';
import { CallWindow } from './call-window';

/**
 * Το «κέντρο κλήσεων» της εφαρμογής.
 *
 * Κάθεται πάνω από ΟΛΕΣ τις σελίδες του λογαριασμού, όχι μέσα στη συνομιλία.
 * Έτσι η κλήση χτυπάει όπου κι αν βρίσκεται ο χρήστης — πριν, έπρεπε να έχει
 * ανοιχτή ακριβώς εκείνη τη συνομιλία για να καταλάβει ότι τον καλούν.
 */

interface IncomingCall {
  id: string;
  conversationId: string;
  callerName: string;
  callerAvatar: string | null;
}

interface CallCenterValue {
  /** Ξεκίνα βιντεοκλήση με τον άλλον αυτής της συνομιλίας. */
  startCall: (conversationId: string, peerName: string, peerAvatar?: string | null) => void;
  /** Είναι ήδη σε κλήση; (για να μη δείχνει δύο φορές το κουμπί) */
  busy: boolean;
}

const CallCenterContext = createContext<CallCenterValue>({
  startCall: () => {},
  busy: false,
});

export function useCallCenter() {
  return useContext(CallCenterContext);
}

/** Τι γράφουμε στη συνομιλία αφού τελειώσει η κλήση. */
function endMessage(reason: CallEndReason, wasConnected: boolean): string | null {
  if (wasConnected) return '📞 Η βιντεοκλήση ολοκληρώθηκε';
  switch (reason) {
    case 'declined':
      return '📞 Η βιντεοκλήση απορρίφθηκε';
    case 'missed':
      return '📞 Αναπάντητη βιντεοκλήση';
    case 'hangup':
      return '📞 Αναπάντητη βιντεοκλήση';
    default:
      return null; // τεχνική αποτυχία — δεν τη γράφουμε στη συνομιλία
  }
}

export function CallCenter({ children, enabled }: { children: React.ReactNode; enabled: boolean }) {
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const [status, setStatus] = useState<CallStatus>('idle');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [peer, setPeer] = useState<{ name: string; avatar: string | null }>({
    name: '',
    avatar: null,
  });
  const [notice, setNotice] = useState<string | null>(null);
  /** Όταν φταίει η άδεια κάμερας, δείχνουμε οδηγό με βήματα αντί για μήνυμα. */
  const [permissionIssue, setPermissionIssue] = useState<MediaFailure | null>(null);

  const engineRef = useRef<CallEngine | null>(null);
  const ringtoneRef = useRef<Ringtone | null>(null);
  const conversationRef = useRef<string | null>(null);
  const connectedRef = useRef(false);
  /** Κλήσεις που ο χρήστης απέρριψε — να μην ξαναχτυπήσουν στο επόμενο ρώτημα. */
  const handledRef = useRef<Set<string>>(new Set());
  /** Η τελευταία κλήση που θέλησε ο χρήστης — για να ξαναρχίσει μόνη της μόλις
   *  δοθεί η άδεια, χωρίς να ψάχνει πάλι το κουμπί. */
  const lastIntentRef = useRef<{ conversationId: string; peerName: string; peerAvatar: string | null } | null>(null);

  const inCall = status !== 'idle' && status !== 'ended';

  const stopRinging = useCallback(() => {
    ringtoneRef.current?.stop();
    ringtoneRef.current = null;
  }, []);

  /** Καθαρίζει τα πάντα και γράφει, αν χρειάζεται, μια γραμμή στη συνομιλία. */
  const teardown = useCallback(
    (reason: CallEndReason) => {
      stopRinging();
      const convId = conversationRef.current;
      const wasConnected = connectedRef.current;

      engineRef.current = null;
      conversationRef.current = null;
      connectedRef.current = false;

      setLocalStream(null);
      setRemoteStream(null);
      setStatus('idle');

      // Για την κάμερα ΔΕΝ γράφουμε μήνυμα εδώ: η μηχανή ξέρει την ακριβή αιτία
      // (άρνηση, δεν υπάρχει κάμερα, ενσωματωμένος browser) και επιστρέφει
      // οδηγία που μπορεί πραγματικά να ακολουθήσει ο χρήστης. Ένα γενικό
      // «χρειάζεται άδεια» εδώ θα την έσβηνε.
      if (reason === 'failed') {
        setNotice('Η σύνδεση δεν ήταν εφικτή. Δοκίμασε ξανά.');
      }

      const text = endMessage(reason, wasConnected);
      if (convId && text) {
        api.conversations.sendMessage(convId, { content: text }).catch(() => {});
        window.dispatchEvent(new Event('staffnow:badges-refresh'));
      }
    },
    [stopRinging]
  );

  const buildEngine = useCallback(() => {
    const engine = new CallEngine(api.calls, {
      onStatus: (s) => {
        setStatus(s);
        if (s === 'connected') connectedRef.current = true;
      },
      onLocalStream: setLocalStream,
      onRemoteStream: (s) => setRemoteStream(s),
      onEnded: (reason) => teardown(reason),
    });
    engineRef.current = engine;
    return engine;
  }, [teardown]);

  // ── Ο καλών ────────────────────────────────────────────────────────────
  const startCall = useCallback(
    (conversationId: string, peerName: string, peerAvatar?: string | null) => {
      if (engineRef.current) return;
      setNotice(null);
      setPermissionIssue(null);
      setPeer({ name: peerName, avatar: peerAvatar || null });
      conversationRef.current = conversationId;
      // Το κρατάμε ώστε, αν χρειαστεί άδεια κάμερας, να ξαναρχίσει η κλήση μόνη
      // της μόλις τη δώσει ο χρήστης — χωρίς να ψάχνει πάλι το κουμπί.
      lastIntentRef.current = { conversationId, peerName, peerAvatar: peerAvatar || null };
      const engine = buildEngine();
      void engine.call(conversationId).then((res) => {
        if (res.ok) return;
        if (res.mediaFailure) setPermissionIssue(res.mediaFailure);
        else if (res.message) setNotice(res.message);
      });
    },
    [buildEngine]
  );

  // ── Ο παραλήπτης ───────────────────────────────────────────────────────
  const acceptIncoming = useCallback(() => {
    const call = incoming;
    if (!call || engineRef.current) return;
    stopRinging();
    handledRef.current.add(call.id);
    setIncoming(null);
    setNotice(null);
    setPermissionIssue(null);
    setPeer({ name: call.callerName, avatar: call.callerAvatar });
    conversationRef.current = call.conversationId;
    const engine = buildEngine();
    void engine.accept(call.id).then((res) => {
      if (res.ok) return;
      if (res.mediaFailure) setPermissionIssue(res.mediaFailure);
      else if (res.message) setNotice(res.message);
    });
  }, [incoming, buildEngine, stopRinging]);

  const declineIncoming = useCallback(() => {
    const call = incoming;
    if (!call) return;
    stopRinging();
    handledRef.current.add(call.id);
    setIncoming(null);
    api.calls.decline(call.id).catch(() => {});
  }, [incoming, stopRinging]);

  // ── «Με καλεί κανείς;» ─────────────────────────────────────────────────
  //
  // ΔΕΝ χρησιμοποιούμε το usePoll εδώ, επίτηδες. Εκείνο σταματάει όταν η
  // καρτέλα πάει σε δεύτερο πλάνο — σωστό για κόκκινα σημαδάκια, λάθος για
  // κλήση: ο κόσμος έχει το StaffNow ανοιχτό σε μια καρτέλα ΚΑΙ δουλεύει σε
  // άλλη. Αν σιωπούσαμε εκεί, το τηλέφωνο δεν θα χτυπούσε ποτέ στην πιο συχνή
  // πραγματική περίπτωση.
  //
  // Σε δεύτερο πλάνο απλώς αραιώνουμε: 3 δευτ. μπροστά, 8 πίσω.
  const POLL_VISIBLE_MS = 3000;
  const POLL_HIDDEN_MS = 8000;

  const checkPending = useCallback(async () => {
    if (engineRef.current) return;
    try {
      const res = (await api.calls.pending()) as any;
      const call = res?.data?.call;
      if (!call || handledRef.current.has(call.id)) return;
      setIncoming((prev) =>
        prev?.id === call.id
          ? prev
          : {
              id: call.id,
              conversationId: call.conversationId,
              callerName: call.callerName || 'Κάποιος',
              callerAvatar: call.callerAvatar || null,
            }
      );
    } catch {
      // Χαμένο ρώτημα — ξαναρωτάμε στον επόμενο κύκλο.
    }
  }, []);

  useEffect(() => {
    if (!enabled || inCall) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      if (cancelled) return;
      await checkPending();
      if (cancelled) return;
      timer = setTimeout(tick, document.hidden ? POLL_HIDDEN_MS : POLL_VISIBLE_MS);
    };

    // Μόλις γυρίσει ο χρήστης στην καρτέλα, ρωτάμε αμέσως: μπορεί να τον
    // καλούν αυτή τη στιγμή και να μην το ξέρει.
    const onVisible = () => {
      if (cancelled || document.hidden) return;
      if (timer) clearTimeout(timer);
      void tick();
    };

    void tick();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, inCall, checkPending]);

  // Το κουδούνισμα ζει όσο η οθόνη που χτυπάει.
  useEffect(() => {
    if (!incoming) return;
    const tone = new Ringtone();
    ringtoneRef.current = tone;
    tone.start();
    return () => {
      tone.stop();
      if (ringtoneRef.current === tone) ringtoneRef.current = null;
    };
  }, [incoming]);

  // Αν φύγει η σελίδα στη μέση της κλήσης, κλείνουμε καθαρά — αλλιώς ο άλλος
  // θα κοιτάζει μια παγωμένη εικόνα μέχρι να λήξει μόνη της.
  useEffect(() => {
    const bye = () => engineRef.current?.destroy();
    window.addEventListener('pagehide', bye);
    return () => {
      window.removeEventListener('pagehide', bye);
      engineRef.current?.destroy();
    };
  }, []);

  const value = useMemo<CallCenterValue>(
    () => ({ startCall, busy: inCall }),
    [startCall, inCall]
  );

  return (
    <CallCenterContext.Provider value={value}>
      {children}

      {/* Η οθόνη που χτυπάει */}
      {incoming && !inCall && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-blue-600 to-blue-800 p-6 text-white">
          <Avatar
            src={incoming.callerAvatar}
            name={incoming.callerName}
            size="xl"
            className="ring-4 ring-white/30"
          />
          <div className="text-center">
            <p className="text-sm uppercase tracking-widest text-white/70">Εισερχόμενη κλήση</p>
            <p className="mt-1 text-3xl font-bold">{incoming.callerName}</p>
          </div>

          <div className="mt-4 flex items-center gap-10">
            <button
              type="button"
              onClick={declineIncoming}
              className="flex flex-col items-center gap-2"
            >
              <span className="flex h-16 w-16 rotate-[135deg] items-center justify-center rounded-full bg-red-600 text-2xl shadow-lg transition-colors hover:bg-red-700">
                📞
              </span>
              <span className="text-sm">Απόρριψη</span>
            </button>

            <button
              type="button"
              onClick={acceptIncoming}
              className="flex flex-col items-center gap-2"
            >
              <span className="flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-emerald-500 text-2xl shadow-lg transition-colors hover:bg-emerald-600">
                📞
              </span>
              <span className="text-sm">Απάντηση</span>
            </button>
          </div>
        </div>
      )}

      {/* Η ίδια η κλήση */}
      {inCall && engineRef.current && (
        <CallWindow
          engine={engineRef.current}
          status={status}
          peerName={peer.name}
          peerAvatar={peer.avatar}
          localStream={localStream}
          remoteStream={remoteStream}
          onHangup={() => void engineRef.current?.hangup()}
        />
      )}

      {/* Άδεια κάμερας: οδηγός με βήματα και κουμπί που ξαναζητάει την άδεια.
          Αν ο browser είναι διατεθειμένος να ρωτήσει, το πάτημα εμφανίζει
          εκείνη τη στιγμή το κανονικό παράθυρο «Να επιτρέπεται;». */}
      {permissionIssue && !inCall && (
        <PermissionGuide
          failure={permissionIssue}
          onClose={() => setPermissionIssue(null)}
          onGranted={() => {
            setPermissionIssue(null);
            const intent = lastIntentRef.current;
            // Η άδεια δόθηκε: συνεχίζουμε την κλήση που ήθελε εξαρχής, αντί να
            // τον αφήσουμε να ψάχνει ξανά το κουμπί.
            if (intent) startCall(intent.conversationId, intent.peerName, intent.peerAvatar);
            else setNotice('Η κάμερα ξεκλείδωσε. Τώρα μπορείς να καλέσεις.');
          }}
        />
      )}

      {/* Μήνυμα όταν κάτι δεν πήγε καλά. Οι οδηγίες για την άδεια κάμερας είναι
          δύο-τρεις σειρές: στοιχισμένες αριστερά, με το κουμπί από κάτω, ώστε
          να διαβάζονται σε κινητό. */}
      {notice && (
        <div className="fixed inset-x-4 bottom-24 z-[80] mx-auto max-w-md rounded-2xl bg-gray-900 px-4 py-3 text-white shadow-xl">
          <p className="text-sm leading-snug">{notice}</p>
          <div className="mt-2 text-right">
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="font-bold text-blue-300"
            >
              Εντάξει
            </button>
          </div>
        </div>
      )}
    </CallCenterContext.Provider>
  );
}
