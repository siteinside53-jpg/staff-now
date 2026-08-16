/**
 * Η μηχανή της βιντεοκλήσης.
 *
 * Εικόνα και ήχος πηγαίνουν ΑΠΕΥΘΕΙΑΣ από συσκευή σε συσκευή. Ο server μας δεν
 * τα βλέπει ποτέ — μεταφέρει μόνο τα κείμενα «χειραψίας» που χρειάζονται οι δύο
 * browsers για να βρεθούν, και για αυτά ρωτάμε κάθε δευτερόλεπτο όσο στήνεται
 * η κλήση. Μόλις συνδεθούν, το ρώτημα αραιώνει: δεν έχει πια τι να πει.
 *
 * Γιατί δεν χρησιμοποιούμε ξένη υπηρεσία: πριν ανοίγαμε δημόσιο Jitsi μέσα σε
 * πλαίσιο, που έδειχνε τα δικά του μηνύματα και λογότυπα μέσα στη σελίδα μας.
 */

export type CallStatus =
  | 'idle'
  | 'preparing' // ζητάμε κάμερα/μικρόφωνο
  | 'calling' // χτυπάει στον άλλον
  | 'connecting' // απάντησε, ψάχνουν δρόμο
  | 'connected'
  | 'ended';

export type CallEndReason = 'hangup' | 'declined' | 'missed' | 'failed' | 'busy' | 'no_media';

/** Γιατί δεν πήραμε κάμερα/μικρόφωνο — καθορίζει τι οδηγία δίνουμε στον χρήστη. */
export type MediaFailure = 'denied' | 'notfound' | 'unsupported' | 'other';

/** Το iPhone και το Android λένε τα ίδια πράγματα σε διαφορετικά μέρη. */
function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPad από iPadOS 13 και μετά δηλώνεται ως Mac με οθόνη αφής.
    (navigator.platform === 'MacIntel' && (navigator as { maxTouchPoints?: number }).maxTouchPoints! > 1)
  );
}

/**
 * Ζητάει άδεια για κάμερα και μικρόφωνο ΚΑΙ ΤΙΠΟΤΑ ΑΛΛΟ.
 *
 * Χρησιμεύει στο κουμπί «Ξαναδοκίμασε»: αν ο browser είναι διατεθειμένος να
 * ρωτήσει, εμφανίζεται εκείνη τη στιγμή το κανονικό παράθυρο «Να επιτρέπεται;».
 * Αν ο χρήστης έχει ήδη αρνηθεί μόνιμα, γυρνάει 'denied' χωρίς να ρωτήσει —
 * καμία ιστοσελίδα δεν μπορεί να ανοίξει τις ρυθμίσεις της συσκευής, το
 * απαγορεύουν Apple και Google.
 *
 * Η ροή κλείνει αμέσως: εδώ μας ενδιαφέρει μόνο η απάντηση, όχι η εικόνα.
 */
export async function requestMediaAccess(): Promise<{ ok: boolean; failure?: MediaFailure }> {
  if (!navigator.mediaDevices?.getUserMedia) return { ok: false, failure: 'unsupported' };
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    s.getTracks().forEach((t) => t.stop());
    return { ok: true };
  } catch (err) {
    const name = (err as { name?: string })?.name || '';
    if (name === 'NotAllowedError' || name === 'SecurityError') return { ok: false, failure: 'denied' };
    if (name === 'NotFoundError') {
      // Χωρίς κάμερα, αλλά ίσως με μικρόφωνο — αρκεί για κλήση μόνο με φωνή.
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        s.getTracks().forEach((t) => t.stop());
        return { ok: true };
      } catch {
        return { ok: false, failure: 'notfound' };
      }
    }
    return { ok: false, failure: 'other' };
  }
}

/** Τα βήματα που πρέπει να πατήσει ο χρήστης, ένα-ένα. */
export function mediaFailureSteps(failure: MediaFailure): { title: string; steps: string[] } {
  if (failure === 'unsupported') {
    return isIOS()
      ? {
          title: 'Άνοιξέ το στο Safari',
          steps: [
            'Είσαι μέσα σε άλλη εφαρμογή (π.χ. Facebook ή Instagram) — εκεί η κάμερα είναι κλειδωμένη.',
            'Πάτα το εικονίδιο «…» πάνω δεξιά.',
            'Διάλεξε «Άνοιγμα στο Safari» και ξαναδοκίμασε την κλήση.',
          ],
        }
      : {
          title: 'Άνοιξέ το στο Chrome',
          steps: [
            'Είσαι μέσα σε άλλη εφαρμογή — εκεί η κάμερα είναι κλειδωμένη.',
            'Πάτα το μενού «⋮» πάνω δεξιά.',
            'Διάλεξε «Άνοιγμα στο Chrome» και ξαναδοκίμασε την κλήση.',
          ],
        };
  }
  if (failure === 'notfound') {
    return {
      title: 'Δεν βρέθηκε κάμερα',
      steps: ['Η συσκευή δεν έχει διαθέσιμη κάμερα ή μικρόφωνο αυτή τη στιγμή.'],
    };
  }
  if (failure === 'denied') {
    return isIOS()
      ? {
          title: 'Ξεκλείδωσε την κάμερα για το StaffNow',
          steps: [
            'Πάτα το «ΑΑ» αριστερά στη γραμμή διεύθυνσης, πάνω στην οθόνη.',
            'Διάλεξε «Ρυθμίσεις ιστότοπου».',
            'Βάλε Κάμερα και Μικρόφωνο σε «Να επιτρέπεται».',
            'Γύρνα εδώ και πάτα «Ξαναδοκίμασε».',
          ],
        }
      : {
          title: 'Ξεκλείδωσε την κάμερα για το StaffNow',
          steps: [
            'Πάτα το λουκέτο δίπλα στη διεύθυνση, πάνω στην οθόνη.',
            'Διάλεξε «Άδειες» ή «Ρυθμίσεις ιστότοπου».',
            'Βάλε Κάμερα και Μικρόφωνο σε «Να επιτρέπεται».',
            'Γύρνα εδώ και πάτα «Ξαναδοκίμασε».',
          ],
        };
  }
  return {
    title: 'Δεν άνοιξε η κάμερα',
    steps: [
      'Κλείσε άλλες εφαρμογές που μπορεί να χρησιμοποιούν την κάμερα.',
      'Μετά πάτα «Ξαναδοκίμασε».',
    ],
  };
}

/**
 * Η ίδια πληροφορία σε μία γραμμή, για όπου δεν χωράει ολόκληρος οδηγός.
 * Το σκέτο «χρειάζεται άδεια» δεν βοηθάει σε τίποτα: αν ο χρήστης έχει ήδη
 * αρνηθεί μία φορά, ο browser ΔΕΝ ξαναρωτάει και το κουμπί μοιάζει χαλασμένο.
 */
export function mediaFailureMessage(failure: MediaFailure): string {
  if (failure === 'unsupported') {
    return isIOS()
      ? 'Άνοιξε το staffnow.gr στο Safari για να γίνει η κλήση. Μέσα από άλλη εφαρμογή (π.χ. Facebook) η κάμερα δεν επιτρέπεται.'
      : 'Άνοιξε το staffnow.gr στο Chrome για να γίνει η κλήση. Μέσα από άλλη εφαρμογή η κάμερα δεν επιτρέπεται.';
  }
  if (failure === 'notfound') {
    return 'Δεν βρέθηκε κάμερα ή μικρόφωνο στη συσκευή.';
  }
  if (failure === 'denied') {
    return isIOS()
      ? 'Η κάμερα είναι κλειστή για το staffnow.gr. Πάτα το «ΑΑ» αριστερά στη γραμμή διεύθυνσης → Ρυθμίσεις ιστότοπου → Κάμερα και Μικρόφωνο → Να επιτρέπεται. Μετά ξαναδοκίμασε.'
      : 'Η κάμερα είναι κλειστή για το staffnow.gr. Πάτα το λουκέτο δίπλα στη διεύθυνση → Άδειες → Κάμερα και Μικρόφωνο → Να επιτρέπεται. Μετά ξαναδοκίμασε.';
  }
  return 'Δεν άνοιξε η κάμερα. Κλείσε άλλες εφαρμογές που μπορεί να τη χρησιμοποιούν και ξαναδοκίμασε.';
}

/** Το αποτέλεσμα μιας προσπάθειας κλήσης. Το `mediaFailure` μπαίνει μόνο όταν
 *  φταίει η άδεια κάμερας/μικροφώνου — τότε αξίζει οδηγός, όχι σκέτο μήνυμα. */
export interface CallAttempt {
  ok: boolean;
  message?: string;
  mediaFailure?: MediaFailure;
}

export interface CallEngineEvents {
  onStatus: (status: CallStatus) => void;
  onLocalStream: (stream: MediaStream) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onEnded: (reason: CallEndReason) => void;
}

/** Το κομμάτι του API που χρειάζεται η μηχανή. Περνιέται απ' έξω για να μένει
 *  αυτό το αρχείο καθαρό από εξαρτήσεις και εύκολο να δοκιμαστεί. */
export interface CallTransport {
  iceServers: () => Promise<any>;
  start: (body: { conversationId: string; offer: string }) => Promise<any>;
  poll: (id: string, since: number) => Promise<any>;
  answer: (id: string, body: { answer: string }) => Promise<any>;
  addCandidates: (id: string, body: { candidates: string[] }) => Promise<any>;
  hangup: (id: string) => Promise<any>;
  decline: (id: string) => Promise<any>;
}

/** Όσο στήνεται η κλήση ρωτάμε γρήγορα· μόλις συνδεθεί, χαλαρώνουμε. */
const POLL_SETUP_MS = 1000;
const POLL_CONNECTED_MS = 5000;
/** Οι δρόμοι σύνδεσης έρχονται σε ριπές — τους στέλνουμε μαζεμένους. */
const CANDIDATE_FLUSH_MS = 600;

export class CallEngine {
  private pc: RTCPeerConnection | null = null;
  private local: MediaStream | null = null;
  private remote: MediaStream | null = null;
  private callId: string | null = null;
  private cursor = 0;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private outbox: string[] = [];
  /** Δρόμοι που ήρθαν πριν προλάβουμε να στήσουμε την άλλη πλευρά. */
  private earlyCandidates: RTCIceCandidateInit[] = [];
  private remoteReady = false;
  private status: CallStatus = 'idle';
  private closed = false;

  constructor(
    private readonly api: CallTransport,
    private readonly events: CallEngineEvents
  ) {}

  getCallId(): string | null {
    return this.callId;
  }

  private setStatus(s: CallStatus) {
    if (this.closed && s !== 'ended') return;
    this.status = s;
    this.events.onStatus(s);
  }

  /**
   * Κάμερα και μικρόφωνο. Αν η συσκευή δεν έχει κάμερα, δοκιμάζουμε μόνο με
   * ήχο — καλύτερα μια κλήση χωρίς εικόνα παρά καθόλου.
   *
   * ΠΡΟΣΟΧΗ ΣΤΗ ΣΤΙΓΜΗ ΤΗΣ ΚΛΗΣΗΣ: πρέπει να τρέξει ΑΜΕΣΩΣ μόλις πατήσει ο
   * χρήστης, πριν από οποιοδήποτε αίτημα στον server. Το iPhone δείχνει το
   * παράθυρο άδειας μόνο όσο θεωρεί ότι η ενέργεια είναι άμεσο αποτέλεσμα του
   * αγγίγματος· αν μεσολαβήσει αναμονή δικτύου, αρνείται ΣΙΩΠΗΛΑ — ο χρήστης
   * βλέπει «χρειάζεται άδεια» χωρίς να του εμφανιστεί ποτέ ερώτηση.
   */
  private async getMedia(): Promise<{ stream: MediaStream | null; failure?: MediaFailure }> {
    // Σε παλιό browser, σε σύνδεση χωρίς κρυπτογράφηση ή μέσα σε ενσωματωμένο
    // browser (π.χ. του Facebook) η δυνατότητα λείπει εντελώς.
    if (!navigator.mediaDevices?.getUserMedia) {
      return { stream: null, failure: 'unsupported' };
    }

    const withVideo: MediaStreamConstraints = {
      audio: { echoCancellation: true, noiseSuppression: true },
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
    };
    try {
      return { stream: await navigator.mediaDevices.getUserMedia(withVideo) };
    } catch (err) {
      const name = (err as { name?: string })?.name || '';
      // Άρνηση του χρήστη: δεν έχει νόημα να ξαναρωτήσουμε για μόνο ήχο, θα
      // αποτύχει κι αυτό. Θέλει αλλαγή ρύθμισης στη συσκευή.
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        return { stream: null, failure: 'denied' };
      }
      // Χωρίς κάμερα ή κατειλημμένη κάμερα: δοκιμάζουμε μόνο με ήχο.
      try {
        return { stream: await navigator.mediaDevices.getUserMedia({ audio: true }) };
      } catch (err2) {
        const name2 = (err2 as { name?: string })?.name || '';
        if (name2 === 'NotAllowedError' || name2 === 'SecurityError') {
          return { stream: null, failure: 'denied' };
        }
        return { stream: null, failure: name2 === 'NotFoundError' ? 'notfound' : 'other' };
      }
    }
  }

  private async buildConnection(): Promise<RTCPeerConnection> {
    let iceServers: RTCIceServer[] = [{ urls: 'stun:stun.cloudflare.com:3478' }];
    try {
      const res = await this.api.iceServers();
      const list = res?.data?.iceServers;
      if (Array.isArray(list) && list.length) iceServers = list;
    } catch {
      // Κρατάμε τον δημόσιο STUN. Χειρότερο σενάριο: κάποιες κλήσεις δεν
      // συνδέονται — όχι να μη λειτουργεί καθόλου το κουμπί.
    }

    const pc = new RTCPeerConnection({ iceServers, bundlePolicy: 'max-bundle' });

    this.remote = new MediaStream();
    pc.ontrack = (ev) => {
      if (!this.remote) return;
      ev.streams[0]?.getTracks().forEach((t) => {
        if (!this.remote!.getTracks().includes(t)) this.remote!.addTrack(t);
      });
      this.events.onRemoteStream(this.remote);
    };

    pc.onicecandidate = (ev) => {
      if (!ev.candidate) return;
      this.outbox.push(JSON.stringify(ev.candidate.toJSON()));
      this.scheduleFlush();
    };

    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === 'connected') this.setStatus('connected');
      // «disconnected» συμβαίνει και σε στιγμιαία απώλεια δικτύου και συχνά
      // επανέρχεται μόνο του — δεν κλείνουμε την κλήση για αυτό. Το «failed»
      // είναι οριστικό.
      if (st === 'failed') this.finish('failed', true);
    };

    return pc;
  }

  private scheduleFlush() {
    if (this.flushTimer || this.closed) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flushCandidates();
    }, CANDIDATE_FLUSH_MS);
  }

  private async flushCandidates() {
    if (!this.callId || !this.outbox.length) return;
    const batch = this.outbox.splice(0, 30);
    try {
      await this.api.addCandidates(this.callId, { candidates: batch });
    } catch {
      // Χάθηκε μια ριπή: η σύνδεση απλώς αργεί λίγο περισσότερο.
    }
  }

  private async applyCandidate(raw: string) {
    let init: RTCIceCandidateInit;
    try {
      init = JSON.parse(raw);
    } catch {
      return;
    }
    if (!this.pc) return;
    if (!this.remoteReady) {
      this.earlyCandidates.push(init);
      return;
    }
    try {
      await this.pc.addIceCandidate(init);
    } catch {
      /* ένας άχρηστος δρόμος δεν χαλάει την κλήση */
    }
  }

  private async drainEarly() {
    const list = this.earlyCandidates.splice(0);
    for (const init of list) {
      try {
        await this.pc?.addIceCandidate(init);
      } catch {
        /* ignore */
      }
    }
  }

  private scheduleNextPoll() {
    if (this.closed) return;
    const delay = this.status === 'connected' ? POLL_CONNECTED_MS : POLL_SETUP_MS;
    this.pollTimer = setTimeout(() => void this.pollOnce(), delay);
  }

  private async pollOnce() {
    if (this.closed || !this.callId) return;
    try {
      const res = await this.api.poll(this.callId, this.cursor);
      const d = res?.data;
      if (!d) return;

      if (typeof d.cursor === 'number') this.cursor = d.cursor;

      // Ο καλών περιμένει την απάντηση της άλλης πλευράς.
      if (d.answer && this.pc && !this.remoteReady) {
        await this.pc.setRemoteDescription(JSON.parse(d.answer));
        this.remoteReady = true;
        await this.drainEarly();
        if (this.status === 'calling') this.setStatus('connecting');
      }

      if (Array.isArray(d.candidates)) {
        for (const cand of d.candidates) await this.applyCandidate(cand);
      }

      if (d.status === 'ended') {
        this.finish((d.endReason as CallEndReason) || 'hangup', false);
        return;
      }
    } catch {
      // Μια χαμένη ερώτηση δεν σημαίνει τίποτα — ξαναρωτάμε.
    }
    this.scheduleNextPoll();
  }

  /** Ξεκίνα κλήση προς τον άλλον της συνομιλίας. */
  async call(conversationId: string): Promise<CallAttempt> {
    this.setStatus('preparing');

    // Ίδιος κανόνας με την απάντηση: η κάμερα ζητιέται πρώτη, χωρίς να
    // μεσολαβήσει αναμονή δικτύου, αλλιώς το iPhone δεν δείχνει ερώτηση.
    const { stream: media, failure } = await this.getMedia();
    if (!media) {
      this.finish('no_media', false);
      return { ok: false, mediaFailure: failure || 'other', message: mediaFailureMessage(failure || 'other') };
    }
    this.local = media;
    this.events.onLocalStream(media);

    this.pc = await this.buildConnection();
    media.getTracks().forEach((t) => this.pc!.addTrack(t, media));

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    try {
      const res = await this.api.start({
        conversationId,
        offer: JSON.stringify(this.pc.localDescription),
      });
      this.callId = res?.data?.id || null;
    } catch (e: any) {
      const busy = e?.status === 409;
      this.finish(busy ? 'busy' : 'failed', false);
      return {
        ok: false,
        message: busy ? 'Ο άλλος μιλάει ήδη σε άλλη κλήση.' : 'Δεν μπόρεσε να ξεκινήσει η κλήση.',
      };
    }

    if (!this.callId) {
      this.finish('failed', false);
      return { ok: false, message: 'Δεν μπόρεσε να ξεκινήσει η κλήση.' };
    }

    this.setStatus('calling');
    void this.flushCandidates();
    this.scheduleNextPoll();
    return { ok: true };
  }

  /** Απάντησε σε κλήση που χτυπάει. */
  async accept(callId: string): Promise<CallAttempt> {
    this.callId = callId;
    this.setStatus('preparing');

    // ΠΡΩΤΑ η κάμερα, ΠΡΙΝ από κάθε αίτημα στον server. Δεν είναι θέμα
    // κομψότητας: παλιά ρωτούσαμε πρώτα τον server για την πρόταση σύνδεσης και
    // μετά τη συσκευή. Στο iPhone αυτό σήμαινε ότι η ερώτηση άδειας δεν
    // εμφανιζόταν ΠΟΤΕ — μεσολαβούσε αναμονή δικτύου και το Safari έπαυε να
    // θεωρεί την ενέργεια αποτέλεσμα του αγγίγματος, οπότε αρνιόταν σιωπηλά.
    const { stream: media, failure } = await this.getMedia();
    if (!media) {
      await this.api.decline(callId).catch(() => {});
      this.finish('no_media', false);
      return { ok: false, mediaFailure: failure || 'other', message: mediaFailureMessage(failure || 'other') };
    }
    this.local = media;
    this.events.onLocalStream(media);

    // Τώρα η πρόταση της άλλης πλευράς — χωρίς αυτήν δεν στήνεται τίποτα.
    let offer: string | null = null;
    try {
      const res = await this.api.poll(callId, 0);
      offer = res?.data?.offer || null;
      if (typeof res?.data?.cursor === 'number') this.cursor = res.data.cursor;
      if (res?.data?.status === 'ended') {
        this.finish((res.data.endReason as CallEndReason) || 'hangup', false);
        return { ok: false, message: 'Η κλήση τερματίστηκε.' };
      }
    } catch {
      this.finish('failed', false);
      return { ok: false, message: 'Δεν μπόρεσε να συνδεθεί η κλήση.' };
    }
    if (!offer) {
      this.finish('failed', false);
      return { ok: false, message: 'Δεν μπόρεσε να συνδεθεί η κλήση.' };
    }

    this.pc = await this.buildConnection();
    await this.pc.setRemoteDescription(JSON.parse(offer));
    this.remoteReady = true;
    media.getTracks().forEach((t) => this.pc!.addTrack(t, media));

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    try {
      await this.api.answer(callId, { answer: JSON.stringify(this.pc.localDescription) });
    } catch {
      this.finish('failed', false);
      return { ok: false, message: 'Δεν μπόρεσε να συνδεθεί η κλήση.' };
    }

    this.setStatus('connecting');
    await this.drainEarly();
    void this.flushCandidates();
    this.scheduleNextPoll();
    return { ok: true };
  }

  /** Σίγαση μικροφώνου. Επιστρέφει την κατάσταση μετά την αλλαγή. */
  toggleMic(): boolean {
    const track = this.local?.getAudioTracks()[0];
    if (!track) return false;
    track.enabled = !track.enabled;
    return track.enabled;
  }

  /** Άνοιγμα/κλείσιμο κάμερας. */
  toggleCamera(): boolean {
    const track = this.local?.getVideoTracks()[0];
    if (!track) return false;
    track.enabled = !track.enabled;
    return track.enabled;
  }

  hasVideo(): boolean {
    return !!this.local?.getVideoTracks().length;
  }

  /** Κλείσιμο από τον χρήστη. */
  async hangup(): Promise<void> {
    const id = this.callId;
    this.finish('hangup', false);
    if (id) await this.api.hangup(id).catch(() => {});
  }

  /**
   * Καθάρισμα. Σβήνει χρονόμετρα, κλείνει κάμερα και μικρόφωνο (αλλιώς μένει
   * αναμμένο το λαμπάκι της κάμερας) και ειδοποιεί τον server όταν χρειάζεται.
   */
  private finish(reason: CallEndReason, tellServer: boolean) {
    if (this.closed) return;
    this.closed = true;

    if (this.pollTimer) clearTimeout(this.pollTimer);
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.pollTimer = null;
    this.flushTimer = null;

    this.local?.getTracks().forEach((t) => t.stop());
    this.remote?.getTracks().forEach((t) => t.stop());
    try {
      this.pc?.close();
    } catch {
      /* ignore */
    }
    this.pc = null;

    if (tellServer && this.callId) void this.api.hangup(this.callId).catch(() => {});

    this.status = 'ended';
    this.events.onStatus('ended');
    this.events.onEnded(reason);
  }

  /** Για το ξεφόρτωμα του component — δεν στέλνει τίποτα, απλώς καθαρίζει. */
  destroy() {
    if (this.closed) return;
    const id = this.callId;
    this.finish('hangup', false);
    if (id) void this.api.hangup(id).catch(() => {});
  }
}
