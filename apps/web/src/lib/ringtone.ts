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

/**
 * ΓΙΑΤΙ ΔΕΝ ΑΚΟΥΓΟΤΑΝ ΤΙΠΟΤΑ ΣΤΟ ΚΙΝΗΤΟ.
 *
 * Τα κινητά απαγορεύουν σε μια σελίδα να βγάλει ήχο αν ο χρήστης δεν την έχει
 * αγγίξει. Εμείς φτιάχναμε τη «μηχανή ήχου» τη στιγμή που χτυπούσε η κλήση —
 * δηλαδή ακριβώς τότε που ΔΕΝ υπάρχει άγγιγμα. Ο browser τη γεννούσε
 * «κοιμισμένη» και το `resume()` απορριπτόταν σιωπηλά.
 *
 * Τώρα τη φτιάχνουμε με το ΠΡΩΤΟ άγγιγμα οπουδήποτε στην εφαρμογή και τη
 * κρατάμε ζωντανή. Όταν έρθει η κλήση, είναι ήδη ξύπνια και παίζει αμέσως.
 *
 * ΤΙ ΔΕΝ ΛΥΝΕΙ ΑΥΤΟ: αν η οθόνη είναι κλειστή ή ο browser σε δεύτερο πλάνο,
 * καμία ιστοσελίδα δεν μπορεί να χτυπήσει. Εκεί δουλεύει μόνο η ειδοποίηση
 * push, που τη χτυπάει το ίδιο το λειτουργικό.
 */
let shared: AudioContext | null = null;

function makeContext(): AudioContext | null {
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    return Ctor ? new Ctor() : null;
  } catch {
    return null;
  }
}

/** Καλείται μία φορά, από το κέντρο κλήσεων, μόλις φορτώσει η εφαρμογή. */
export function primeRingtone(): () => void {
  if (typeof window === 'undefined') return () => {};
  const wake = () => {
    if (!shared) shared = makeContext();
    void shared?.resume().catch(() => {});
  };
  // `once` όχι: το iPhone ξανακοιμίζει τη μηχανή όταν φεύγεις από την καρτέλα,
  // οπότε κάθε άγγιγμα την ξαναξυπνάει.
  const opts = { passive: true } as AddEventListenerOptions;
  window.addEventListener('pointerdown', wake, opts);
  window.addEventListener('keydown', wake, opts);
  window.addEventListener('touchstart', wake, opts);
  return () => {
    window.removeEventListener('pointerdown', wake);
    window.removeEventListener('keydown', wake);
    window.removeEventListener('touchstart', wake);
  };
}

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
    // Χρησιμοποιούμε τη ΜΟΙΡΑΖΟΜΕΝΗ μηχανή που ξύπνησε με το πρώτο άγγιγμα.
    // Αν για κάποιο λόγο δεν υπάρχει, φτιάχνουμε τώρα — μπορεί να μην ακουστεί,
    // αλλά η δόνηση και η οθόνη που χτυπάει παραμένουν.
    if (!shared) shared = makeContext();
    this.ctx = shared;
    void this.ctx?.resume().catch(() => {});

    this.buzz();
    this.ring();
    this.timer = setInterval(() => {
      this.buzz();
      this.ring();
    }, CYCLE_MS);
  }

  /**
   * Δόνηση στο κινητό — εκεί μετράει περισσότερο από τον ήχο.
   * Android: δουλεύει. iPhone: η Apple δεν το υποστηρίζει καθόλου σε ιστοσελίδα,
   * εκεί μένει ο ήχος και η οθόνη που χτυπάει.
   */
  private buzz() {
    try {
      navigator.vibrate?.([500, 250, 500, 250, 500]);
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
    // ΔΕΝ κλείνουμε τη μηχανή: είναι κοινή και ξύπνησε με άγγιγμα του χρήστη.
    // Αν την κλείναμε, η επόμενη κλήση θα ήταν πάλι βουβή.
    this.ctx = null;
  }
}
