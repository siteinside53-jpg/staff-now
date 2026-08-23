'use client';

import { useEffect, useReducer } from 'react';
import { api } from '@/lib/api';
import {
  AREA_COORDS,
  DEFAULT_BLOCKED_WORDS,
  REQUIRED_LICENCE,
  distanceKm,
  type Task,
} from './data';

/**
 * Η μνήμη των μικροδουλειών — ΠΛΕΟΝ ΠΑΝΩ ΑΠΟ ΤΗ ΒΑΣΗ.
 *
 * ΤΙ ΗΤΑΝ ΜΕΧΡΙ ΤΩΡΑ: μακέτα. Ό,τι ανέβαζες ζούσε μέσα στον browser σου, στη
 * μία εκείνη συσκευή, και χανόταν με το καθάρισμα. Κανείς άλλος δεν έβλεπε τη
 * δουλειά σου — άρα καμία προσφορά δεν ερχόταν ποτέ.
 *
 * ΤΙ ΕΙΝΑΙ ΤΩΡΑ: ένα λεπτό στρώμα πάνω από τον server. Οι μικροδουλειές, οι
 * προσφορές και η συνομιλία ζουν στη βάση, όπως οι αγγελίες εργασίας. Στον
 * browser μένει ΜΟΝΟ μία προσωπική ρύθμιση οθόνης: για τι θέλεις ειδοποιήσεις.
 *
 * ΓΙΑΤΙ ΚΡΑΤΗΘΗΚΑΝ ΤΑ ΟΝΟΜΑΤΑ: δεκατρείς οθόνες καλούν αυτές τις λειτουργίες.
 * Αλλάζοντας μόνο το ΤΙ κάνουν από μέσα, όλες πέρασαν στη βάση χωρίς να
 * ξαναγραφτεί καμία τους.
 *
 * ΓΙΑΤΙ ΧΕΙΡΟΓΡΑΦΟ ΚΑΤΑΣΤΗΜΑ ΚΑΙ ΟΧΙ CONTEXT: οι οθόνες ζουν σε τρία
 * διαφορετικά μέρη του site (δημόσια ροή, πίνακας χρήστη, διαχειριστικό).
 * Ένα module-level store συγχρονίζει και τα τρία χωρίς να τυλίξουμε τίποτα.
 */

export type MockCredential = { label: string; verified: boolean };

export type MockOffer = {
  id: string;
  name: string;
  amount: number;
  message: string;
  rating: number | null;
  completed: number;
  verifiedPhone: boolean;
  verifiedId: boolean;
  credentials: MockCredential[];
  /** Δηλώνει ότι εκδίδει παραστατικό (μπλοκάκι). */
  invoice: boolean;
  createdAgo: string;
  /** Προσφορά που έκανε ο ίδιος ο επισκέπτης της μακέτας. */
  mine?: boolean;
  status: 'pending' | 'accepted' | 'rejected';
  /**
   * Η άδεια που ανέβηκε, όταν η δουλειά ανήκει σε αδειοδοτούμενη κατηγορία.
   * `verified: false` σημαίνει «δηλωμένη» — ποτέ δεν εμφανίζεται ως ελεγμένη
   * πριν την κοιτάξει άνθρωπος από το διαχειριστικό.
   */
  licence?: { label: string; fileName: string; verified: boolean };
};

/** Μήνυμα στη συνομιλία της δουλειάς. */
export type MockMessage = {
  id: string;
  from: 'owner' | 'worker';
  text: string;
  at: string;
};

export type MockTaskStatus =
  | 'open'
  /** Σε παύση: δεν φαίνεται δημόσια, αλλά κρατάει τις προσφορές της. */
  | 'paused'
  | 'assigned'
  | 'done'
  | 'cancelled'
  | 'disputed';

export type MockTask = Task & {
  status: MockTaskStatus;
  /** Κρυμμένη από τη δημόσια ροή με απόφαση διαχειριστή ή αυτόματου ελέγχου. */
  hidden: boolean;
  /** Δουλειά που ανέβασε ο ίδιος ο επισκέπτης της μακέτας. */
  mine: boolean;
  offersList: MockOffer[];
  chosenOfferId: string | null;
  /** Η συνομιλία ανοίγει μόλις γίνει η επιλογή. */
  messages: MockMessage[];
  /** Δήλωση «πληρώθηκε» — χρειάζονται ΚΑΙ ΟΙ ΔΥΟ για να μετρήσει. */
  paidByOwner: boolean;
  paidByWorker: boolean;
  cancelReason?: string;
  disputeReason?: string;
  disputeBy?: 'owner' | 'worker';
};

/** Τι θέλει να ειδοποιείται ο χρήστης. */
export type NotifyPrefs = {
  enabled: boolean;
  /** Άδειο = όλες οι κατηγορίες. */
  categories: string[];
  area: string;
  radiusKm: number;
};

export type MockState = {
  tasks: MockTask[];
  blockedWords: string[];
  notify: NotifyPrefs;
};

const STORAGE_KEY = 'tasknow_mock_state_v2';

/**
 * Η αρχική, ΑΔΕΙΑ κατάσταση.
 *
 * Οι μικροδουλειές δεν φτιάχνονται πια εδώ: έρχονται από τη βάση, όπως οι
 * αγγελίες εργασίας. Ό,τι μένει σε αυτό το αρχείο είναι προτιμήσεις οθόνης.
 */
function seed(): MockState {
  return {
    tasks: [],
    blockedWords: [...DEFAULT_BLOCKED_WORDS],
    notify: {
      enabled: true,
      categories: [],
      area: 'Κέντρο',
      radiusKm: 5,
    },
  };
}

/** «πριν 12 λεπτά» — ο server στέλνει λεπτά, η οθόνη θέλει φράση. */
function agoLabel(minutes: number): string {
  if (minutes < 1) return 'μόλις τώρα';
  if (minutes < 60) return `πριν ${minutes} λεπτά`;
  const h = Math.floor(minutes / 60);
  if (h < 24) return `πριν ${h} ${h === 1 ? 'ώρα' : 'ώρες'}`;
  const d = Math.floor(h / 24);
  return `πριν ${d} ${d === 1 ? 'μέρα' : 'μέρες'}`;
}

/** Η μικροδουλειά όπως έρχεται από τον server → όπως τη θέλει η οθόνη. */
function fromServer(t: any): MockTask {
  const minutes = Number(t.postedMinutesAgo) || 0;
  return {
    ...t,
    postedAgo: agoLabel(minutes),
    postedMinutesAgo: minutes,
    offersList: Array.isArray(t.offersList) ? t.offersList : [],
    messages: Array.isArray(t.messages) ? t.messages : [],
  } as MockTask;
}

// ── Το store ────────────────────────────────────────────────────────────────
let state: MockState = seed();
let hydrated = false;
const listeners = new Set<() => void>();

/**
 * Στον browser μένουν ΜΟΝΟ οι προτιμήσεις ειδοποιήσεων.
 *
 * Είναι προσωπική ρύθμιση οθόνης — «ειδοποίησέ με για Καθαριότητα σε 5 χλμ» —
 * όχι δεδομένα που πρέπει να δει κάποιος άλλος. Οι μικροδουλειές, οι προσφορές
 * και η συνομιλία ζουν πλέον ΟΛΕΣ στη βάση.
 */
function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ notify: state.notify }));
  } catch {}
}

/**
 * Φέρνει τα δεδομένα ΑΠΟ ΤΟΝ SERVER.
 *
 * Δύο διαδρομές, επίτηδες:
 *   • Συνδεδεμένος → `state`: η δημόσια ροή ΜΑΖΙ με τις δικές του δουλειές και
 *     τις δικές του προσφορές, με μία κλήση.
 *   • Χωρίς σύνδεση → `feed`: μόνο η δημόσια ροή. Τη βλέπει ο καθένας, όπως
 *     ζητήθηκε — δεν κρύβουμε το προϊόν πίσω από εγγραφή.
 *
 * Αν η κλήση αποτύχει, ΔΕΝ αδειάζουμε την οθόνη: κρατάμε ό,τι ήδη δείχνει.
 * Μια στιγμιαία διακοπή δικτύου δεν σημαίνει ότι χάθηκαν οι δουλειές.
 */
let loading = false;

export async function refreshTasks(): Promise<void> {
  if (loading) return;
  loading = true;
  try {
    const signedIn =
      typeof localStorage !== 'undefined' && !!localStorage.getItem('staffnow_token');
    const res: any = signedIn
      ? await (api as any).tasknow.state()
      : await (api as any).tasknow.feed();
    const list = res?.data?.tasks;
    if (Array.isArray(list)) {
      state = { ...state, tasks: list.map(fromServer) };
      listeners.forEach((l) => l());
    }
  } catch {
    /* Κρατάμε ό,τι δείχνει η οθόνη. */
  } finally {
    loading = false;
  }
}

/** Οι προτιμήσεις ειδοποιήσεων ζουν στον browser — είναι ρύθμιση οθόνης. */
function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<MockState>;
      if (parsed?.notify) state = { ...state, notify: { ...state.notify, ...parsed.notify } };
    }
  } catch {
    /* χαλασμένη εγγραφή — μένουν οι προεπιλογές */
  }
}

function emit() {
  persist();
  listeners.forEach((l) => l());
}

export function getMockState(): MockState {
  return state;
}

/**
 * Συνδρομή στο store. Επιστρέφει το τρέχον state και ξανασχεδιάζει σε αλλαγή.
 *
 * Η πρώτη απόδοση (server και browser) χρησιμοποιεί πάντα τον σπόρο, ώστε να
 * μη διαφωνήσει το HTML με το localStorage. Το πραγματικό περιεχόμενο μπαίνει
 * αμέσως μετά, μέσα σε useEffect.
 */
export function useMockTasks(): MockState {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    hydrate();
    force();
    listeners.add(force);
    // Με το που ανοίγει η οθόνη, ρωτάμε τη βάση.
    void refreshTasks();
    return () => {
      listeners.delete(force);
    };
  }, []);
  return state;
}

/**
 * Ανέβασμα μικροδουλειάς.
 *
 * Επιστρέφει τη δουλειά ΑΦΟΥ την καταχωρήσει ο server, ώστε η οθόνη
 * επιβεβαίωσης να δείχνει ό,τι πραγματικά αποθηκεύτηκε — όχι ό,τι νομίζαμε ότι
 * στείλαμε.
 */
export async function addTask(input: {
  title: string;
  description?: string;
  category: string;
  area: string;
  budget: number;
  when: string;
  urgent?: boolean;
  /** Μένουν για συμβατότητα με την οθόνη· ο server ξέρει ποιος ανεβάζει. */
  postedByName?: string;
  postedByPhoto?: string;
  postedByRole?: 'worker' | 'business';
}): Promise<MockTask | null> {
  const res: any = await (api as any).tasknow.create({
    title: input.title,
    description: input.description,
    category: input.category,
    area: input.area,
    budget: input.budget,
    when: input.when,
    urgent: input.urgent === true,
    remote: input.area === 'Εξ αποστάσεως',
  });
  const id = res?.data?.id;
  await refreshTasks();
  return state.tasks.find((t) => t.id === id) ?? null;
}

/** Προσφορά σε ξένη μικροδουλειά. */
export async function addOffer(
  taskId: string,
  input: { amount: number; message: string; licenceFileName?: string },
): Promise<void> {
  const task = state.tasks.find((t) => t.id === taskId);
  await (api as any).tasknow.offer(taskId, {
    amount: input.amount,
    message: input.message,
    // Η ετικέτα της άδειας βγαίνει από την κατηγορία, όπως και στον server.
    licenceLabel: input.licenceFileName
      ? (task && REQUIRED_LICENCE[task.category]) || 'Επαγγελματική άδεια'
      : undefined,
    licenceFileName: input.licenceFileName,
  });
  await refreshTasks();
}

/** «Σε διαλέγω» — με δική σου ευθύνη, όπως γράφει η οθόνη τη στιγμή αυτή. */
export async function chooseOffer(_taskId: string, offerId: string): Promise<void> {
  await (api as any).tasknow.acceptOffer(offerId);
  await refreshTasks();
}

export async function sendMessage(
  taskId: string,
  _from: 'owner' | 'worker',
  text: string,
): Promise<void> {
  // Ποιος γράφει το ξέρει ο server από τη σύνδεση — δεν το δηλώνει ο browser.
  await (api as any).tasknow.sendMessage(taskId, text);
  await refreshTasks();
}

export async function completeTask(taskId: string): Promise<void> {
  await (api as any).tasknow.complete(taskId);
  await refreshTasks();
}

/**
 * Δήλωση «πληρώθηκε» από τη μία πλευρά.
 *
 * ΓΙΑΤΙ ΥΠΑΡΧΕΙ ΧΩΡΙΣ ΝΑ ΑΓΓΙΖΟΥΜΕ ΧΡΗΜΑΤΑ: δεν κρατάμε ευρώ και δεν
 * αναλαμβάνουμε ευθύνη πληρωμής — αλλά αποκτάμε ιστορικό. Όποιος συστηματικά
 * δεν επιβεβαιώνει πληρωμή, φαίνεται.
 */
export async function declarePaid(taskId: string, _side: 'owner' | 'worker'): Promise<void> {
  await (api as any).tasknow.declarePaid(taskId);
  await refreshTasks();
}

/** Παύση: σταματάει να φαίνεται, κρατάει τα πάντα, γυρίζει πίσω όποτε θες. */
export async function pauseTask(taskId: string): Promise<void> {
  await (api as any).tasknow.pause(taskId);
  await refreshTasks();
}

export async function resumeTask(taskId: string): Promise<void> {
  await (api as any).tasknow.resume(taskId);
  await refreshTasks();
}

export async function cancelTask(taskId: string, reason: string): Promise<void> {
  await (api as any).tasknow.cancel(taskId, reason);
  await refreshTasks();
}

export async function openDispute(
  taskId: string,
  _by: 'owner' | 'worker',
  reason: string,
): Promise<void> {
  await (api as any).tasknow.dispute(taskId, reason);
  await refreshTasks();
}

/** Ο διαχειριστής κλείνει τη διαφωνία — επιστρέφει τη δουλειά σε ολοκληρωμένη. */
export async function resolveDispute(taskId: string): Promise<void> {
  await (api as any).tasknow.adminResolve(taskId);
  await refreshTasks();
}

/** Απόκρυψη ή επαναφορά μιας μικροδουλειάς — απόφαση διαχειριστή. */
export async function setTaskHidden(taskId: string, hidden: boolean): Promise<void> {
  await (api as any).tasknow.adminHide(taskId, hidden);
  await refreshTasks();
}

/** Οριστική διαγραφή της δικής σου μικροδουλειάς. */
export async function deleteTask(taskId: string): Promise<void> {
  await (api as any).tasknow.remove(taskId);
  await refreshTasks();
}

/**
 * Έλεγχος άδειας από άνθρωπο.
 *
 * ΤΟ ΚΡΙΣΙΜΟ: μόνο από εδώ μπορεί μια άδεια να γίνει «ελεγμένη». Ούτε ο
 * browser ούτε καμία αυτόματη διαδικασία δεν την ανάβει — αυτό κρατάει τη
 * διαφορά «δηλωμένο» / «ελεγμένο» αληθινή.
 */
export async function setLicenceVerified(
  _taskId: string,
  offerId: string,
  verified: boolean,
): Promise<void> {
  await (api as any).tasknow.adminLicence(offerId, verified);
  await refreshTasks();
}

/**
 * Οι απαγορευμένες λέξεις.
 *
 * ΕΠΙΒΑΛΛΟΝΤΑΙ ΣΤΟΝ SERVER, όχι εδώ — ο browser παρακάμπτεται. Αυτό το σημείο
 * μένει μόνο για να τις δείχνει το διαχειριστικό. Η επεξεργασία τους από την
 * οθόνη δεν έχει ακόμη αντίκρισμα στον server και είναι σημειωμένη ως εκκρεμής.
 */
export function setBlockedWords(words: string[]): void {
  state = { ...state, blockedWords: words };
  emit();
}

export function setNotifyPrefs(next: Partial<NotifyPrefs>): void {
  state = { ...state, notify: { ...state.notify, ...next } };
  emit();
}

/** Ξαναρωτάει τη βάση. Κρατά το παλιό όνομα για να μην αλλάξουν οι οθόνες. */
export function resetMock(): void {
  void refreshTasks();
}

// ── Παράγωγα ────────────────────────────────────────────────────────────────

/**
 * Φαίνεται δημόσια; Κρυμμένες, σε παύση, ακυρωμένες και σε διαφωνία όχι.
 *
 * Η παύση είναι ΔΙΚΗ ΣΟΥ απόφαση και αναστρέψιμη· η ακύρωση είναι τελική και
 * το ξέρουν όσοι έκαναν προσφορά. Γι' αυτό είναι δύο διαφορετικά πράγματα.
 */
export function isPublic(t: MockTask): boolean {
  return (
    !t.hidden &&
    t.status !== 'paused' &&
    t.status !== 'cancelled' &&
    t.status !== 'disputed'
  );
}

/** Δέχεται ακόμη προσφορές; */
export function isOpen(t: MockTask): boolean {
  return isPublic(t) && t.status === 'open';
}

/** Οι δουλειές που ανέβασε ο επισκέπτης. */
export function myTasks(s: MockState): MockTask[] {
  return s.tasks.filter((t) => t.mine);
}

/** Οι προσφορές που έστειλε ο επισκέπτης, μαζί με τη δουλειά τους. */
export function myOffers(s: MockState): { task: MockTask; offer: MockOffer }[] {
  const out: { task: MockTask; offer: MockOffer }[] = [];
  for (const task of s.tasks) {
    for (const offer of task.offersList) {
      if (offer.mine) out.push({ task, offer });
    }
  }
  return out;
}

/** Όλες οι άδειες που έχουν ανέβει, με τη δουλειά και την προσφορά τους. */
export function allLicences(s: MockState): { task: MockTask; offer: MockOffer }[] {
  const out: { task: MockTask; offer: MockOffer }[] = [];
  for (const task of s.tasks) {
    for (const offer of task.offersList) {
      if (offer.licence) out.push({ task, offer });
    }
  }
  return out;
}

/**
 * Ποιες ανοιχτές δουλειές ταιριάζουν με τις προτιμήσεις ειδοποίησης.
 *
 * ΔΕΝ αποθηκεύουμε «ειδοποιήσεις» σαν ψεύτικα αντικείμενα: η λίστα βγαίνει
 * κάθε φορά από τα πραγματικά δεδομένα. Έτσι είναι αδύνατο να δείξουμε
 * ειδοποίηση για κάτι που δεν υπάρχει.
 */
export function matchingTasks(s: MockState): MockTask[] {
  const prefs = s.notify;
  if (!prefs.enabled) return [];
  const center = AREA_COORDS[prefs.area];
  return s.tasks.filter((t) => {
    if (!isOpen(t) || t.mine) return false;
    if (prefs.categories.length && !prefs.categories.includes(t.category)) return false;
    const coords = AREA_COORDS[t.area];
    if (!coords || !center) return true; // εξ αποστάσεως — δεν το κόβει η ακτίνα
    return distanceKm(center, coords) <= prefs.radiusKm;
  });
}

// ── Κοινοί επιλογείς ────────────────────────────────────────────────────────
// ΜΙΑ πηγή αλήθειας για κάθε δημόσιο νούμερο. Το λάθος που έγινε μία φορά
// (το μπάνερ της αρχικής μετρούσε αλλιώς από τη ροή, οπότε τα δύο νούμερα
// διαφωνούσαν μπροστά στον χρήστη) δεν επαναλαμβάνεται αν όλοι περνούν από εδώ.

/** Οι δουλειές που δέχονται ακόμη προσφορές και φαίνονται δημόσια. */
export function publicOpenTasks(s: MockState): MockTask[] {
  return s.tasks.filter(isOpen);
}

export type BoardStats = {
  count: number;
  sum: number;
  min: number | null;
  max: number | null;
};

export function boardStats(list: MockTask[]): BoardStats {
  if (list.length === 0) return { count: 0, sum: 0, min: null, max: null };
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const t of list) {
    sum += t.budget;
    if (t.budget < min) min = t.budget;
    if (t.budget > max) max = t.budget;
  }
  return { count: list.length, sum, min, max };
}

/**
 * Οι εγγραφές που δείχνουμε ως δείγμα έξω από το TaskNow.
 *
 * ΠΑΝΤΑ οι πιο πρόσφατες, ποτέ οι ακριβότερες — το να διαλέγεις τα μεγάλα
 * ποσά για προεπισκόπηση είναι σιωπηλό ψέμα. Και ποτέ οι δικές σου: το
 * `addTask` τις βάζει πρώτες, οπότε η δοκιμαστική σου αγγελία θα κατέληγε
 * στην αρχική σελίδα.
 */
export function previewTasks(s: MockState, n: number): MockTask[] {
  return publicOpenTasks(s)
    .filter((t) => !t.mine)
    .sort((a, b) => a.postedMinutesAgo - b.postedMinutesAgo)
    .slice(0, n);
}

/** Πόσες δουλειές και τι ανώτατη αμοιβή έχει κάθε γειτονιά αυτή τη στιγμή. */
export function areaStats(list: MockTask[]): { area: string; count: number; max: number }[] {
  const map = new Map<string, { count: number; max: number }>();
  for (const t of list) {
    const cur = map.get(t.area) ?? { count: 0, max: 0 };
    map.set(t.area, { count: cur.count + 1, max: Math.max(cur.max, t.budget) });
  }
  return [...map.entries()]
    .map(([area, v]) => ({ area, ...v }))
    .sort((a, b) => b.count - a.count || b.max - a.max);
}
