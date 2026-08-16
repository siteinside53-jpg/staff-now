/**
 * Ο ήχος που χτυπάει όταν σε καλούν.
 *
 * Φτιάχνεται από τον ίδιο τον browser, δεν κατεβαίνει αρχείο ήχου: παίζει
 * ακαριαία, δουλεύει και χωρίς internet, και δεν προσθέτει βάρος στη σελίδα.
 *
 * Δύο νότες που εναλλάσσονται (σαν κλασικό κουδούνισμα), ενάμισι δευτερόλεπτο
 * ήχος και μιάμιση σιωπή.
 */

const TONE_A = 480;
const TONE_B = 620;
const CYCLE_MS = 3000;

export class Ringtone {
  private ctx: AudioContext | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private stopped = true;

  /**
   * Ξεκινάει το κουδούνισμα. Οι browsers μπλοκάρουν τον ήχο αν ο χρήστης δεν
   * έχει αγγίξει ποτέ τη σελίδα — σε αυτή την περίπτωση απλώς δεν ακούγεται
   * τίποτα και μένει η οθόνη που χτυπάει. Δεν σκάει τίποτα.
   */
  start() {
    if (!this.stopped) return;
    this.stopped = false;
    try {
      const Ctor =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      void this.ctx.resume().catch(() => {});
    } catch {
      this.ctx = null;
    }

    this.buzz();
    this.ring();
    this.timer = setInterval(() => {
      this.buzz();
      this.ring();
    }, CYCLE_MS);
  }

  /** Δόνηση στο κινητό — εκεί μετράει περισσότερο από τον ήχο. */
  private buzz() {
    try {
      navigator.vibrate?.([400, 200, 400]);
    } catch {
      /* δεν το υποστηρίζουν όλες οι συσκευές */
    }
  }

  private ring() {
    const ctx = this.ctx;
    if (!ctx || this.stopped) return;
    const now = ctx.currentTime;
    // Τέσσερα σύντομα «ντιν-νταν» και μετά σιωπή μέχρι τον επόμενο κύκλο.
    for (let i = 0; i < 4; i++) {
      const at = now + i * 0.36;
      this.beep(ctx, i % 2 === 0 ? TONE_A : TONE_B, at, 0.3);
    }
  }

  private beep(ctx: AudioContext, freq: number, at: number, dur: number) {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      // Απαλό ανέβασμα και κατέβασμα: χωρίς αυτό ακούγεται ένα ενοχλητικό
      // «κλικ» στην αρχή και στο τέλος κάθε νότας.
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.18, at + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + dur + 0.02);
    } catch {
      /* ignore */
    }
  }

  stop() {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    try {
      navigator.vibrate?.(0);
    } catch {
      /* ignore */
    }
    try {
      void this.ctx?.close();
    } catch {
      /* ignore */
    }
    this.ctx = null;
  }
}
