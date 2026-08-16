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
   * Κάμερα και μικρόφωνο. Αν ο χρήστης αρνηθεί ή η συσκευή δεν έχει κάμερα,
   * δοκιμάζουμε μόνο με ήχο — καλύτερα μια κλήση χωρίς εικόνα παρά καθόλου.
   */
  private async getMedia(): Promise<MediaStream | null> {
    const withVideo: MediaStreamConstraints = {
      audio: { echoCancellation: true, noiseSuppression: true },
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
    };
    try {
      return await navigator.mediaDevices.getUserMedia(withVideo);
    } catch {
      try {
        return await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        return null;
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
  async call(conversationId: string): Promise<{ ok: boolean; message?: string }> {
    this.setStatus('preparing');

    const media = await this.getMedia();
    if (!media) {
      this.finish('no_media', false);
      return { ok: false, message: 'Χρειάζεται άδεια για κάμερα και μικρόφωνο.' };
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
  async accept(callId: string): Promise<{ ok: boolean; message?: string }> {
    this.callId = callId;
    this.setStatus('preparing');

    // Πρώτα η πρόταση της άλλης πλευράς — χωρίς αυτήν δεν στήνεται τίποτα.
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

    const media = await this.getMedia();
    if (!media) {
      await this.api.decline(callId).catch(() => {});
      this.finish('no_media', false);
      return { ok: false, message: 'Χρειάζεται άδεια για κάμερα και μικρόφωνο.' };
    }
    this.local = media;
    this.events.onLocalStream(media);

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
