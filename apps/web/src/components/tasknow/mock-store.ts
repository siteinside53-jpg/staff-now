'use client';

import { useEffect, useReducer } from 'react';
import {
  AREA_COORDS,
  DEFAULT_BLOCKED_WORDS,
  REQUIRED_LICENCE,
  SAMPLE_TASKS,
  distanceKm,
  isLicensedCategory,
  type Task,
} from './data';

/**
 * ΜΑΚΕΤΑ — η μνήμη της επίδειξης.
 *
 * Κρατάει σε ΕΝΑ σημείο ό,τι κάνει ο επισκέπτης όσο περιηγείται: τι ανέβασε,
 * τι προσφορές έστειλε, ποιον διάλεξε, τι είπανε, τι πήγε στραβά. Έτσι η
 * διαδρομή δουλεύει από την αρχή ως το τέλος και ανάμεσα σε σελίδες.
 *
 * ΤΙ ΔΕΝ ΕΙΝΑΙ: βάση δεδομένων. Όλα μένουν στον browser (localStorage) και
 * σβήνονται με το κουμπί «καθάρισε τη μακέτα». Καμία κλήση στο API, καμία
 * εγγραφή σε πραγματικά δεδομένα.
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

// ── Οι υποψήφιοι της επίδειξης ──────────────────────────────────────────────
// Σταθερή λίστα, ώστε ο server και ο browser να βγάζουν το ίδιο αποτέλεσμα.
const PEOPLE: Omit<MockOffer, 'id' | 'amount' | 'message' | 'createdAgo' | 'status'>[] = [
  {
    name: 'Κώστας Ι.',
    rating: 4.9,
    completed: 23,
    verifiedPhone: true,
    verifiedId: true,
    credentials: [{ label: 'Πιστοποιητικό πρώτων βοηθειών', verified: true }],
    invoice: true,
  },
  {
    name: 'Λίνα Τ.',
    rating: 4.7,
    completed: 11,
    verifiedPhone: true,
    verifiedId: false,
    credentials: [{ label: 'Δίπλωμα οδήγησης', verified: false }],
    invoice: true,
  },
  {
    name: 'Σάββας Ρ.',
    rating: 4.2,
    completed: 6,
    verifiedPhone: true,
    verifiedId: false,
    credentials: [],
    invoice: false,
  },
  {
    name: 'Ζωή Ν.',
    rating: null,
    completed: 0,
    verifiedPhone: true,
    verifiedId: false,
    credentials: [],
    invoice: false,
  },
  {
    name: 'Ανδρέας Χ.',
    rating: 4.5,
    completed: 31,
    verifiedPhone: true,
    verifiedId: true,
    credentials: [{ label: 'Άδεια επαγγελματία φωτογράφου', verified: false }],
    invoice: true,
  },
];

const MESSAGES = [
  'Μένω δίπλα, μπορώ και σήμερα το απόγευμα.',
  'Το έχω κάνει πολλές φορές, έχω και τα εργαλεία μου.',
  'Είμαι διαθέσιμη όλη τη βδομάδα, κανονίζουμε ό,τι σε βολεύει.',
  'Πρώτη μου δουλειά εδώ, αλλά ξέρω καλά τη δουλειά.',
  'Αναλαμβάνω και τη μεταφορά αν χρειαστεί.',
];

const AGO = ['πριν 10 λεπτά', 'πριν 1 ώρα', 'πριν 3 ώρες', 'χθες', 'πριν 2 μέρες'];

/** Φτιάχνει τις προσφορές μιας δουλειάς — ντετερμινιστικά, χωρίς τυχαιότητα. */
function buildOffers(task: Task): MockOffer[] {
  const out: MockOffer[] = [];
  const count = Math.min(task.offers, PEOPLE.length);
  for (let i = 0; i < count; i++) {
    const person = PEOPLE[(i + task.id.length) % PEOPLE.length]!;
    const licence = isLicensedCategory(task.category)
      ? {
          label: REQUIRED_LICENCE[task.category] ?? 'Επαγγελματική άδεια',
          fileName: `adeia-${i + 1}.pdf`,
          // Στα δείγματα μόνο η πρώτη άδεια είναι ελεγμένη — για να φαίνεται
          // καθαρά η διαφορά «ελεγμένο» / «δηλωμένο».
          verified: i === 0,
        }
      : undefined;
    // Οι προσφορές κινούνται γύρω από τον προϋπολογισμό, σταθερά ανά θέση.
    const delta = [0, -0.1, 0.15, -0.2, 0.3][i % 5]!;
    out.push({
      ...person,
      licence,
      id: `${task.id}-o${i + 1}`,
      amount: Math.max(5, Math.round(task.budget * (1 + delta))),
      message: MESSAGES[(i + task.id.length) % MESSAGES.length]!,
      createdAgo: AGO[i % AGO.length]!,
      status: 'pending',
    });
  }
  return out;
}

function seed(): MockState {
  return {
    tasks: SAMPLE_TASKS.map((t) => ({
      ...t,
      status: 'open' as const,
      hidden: t.hidden === true,
      mine: false,
      offersList: buildOffers(t),
      chosenOfferId: null,
      messages: [],
      paidByOwner: false,
      paidByWorker: false,
    })),
    blockedWords: [...DEFAULT_BLOCKED_WORDS],
    notify: {
      enabled: true,
      categories: [],
      area: 'Κέντρο',
      radiusKm: 5,
    },
  };
}

// ── Το store ────────────────────────────────────────────────────────────────
let state: MockState = seed();
let hydrated = false;
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<MockState>;
    if (parsed && Array.isArray(parsed.tasks)) {
      // Συμπληρώνουμε ό,τι λείπει από παλιότερη αποθήκευση, ώστε μια
      // ημιτελής εγγραφή να μη ρίξει τη σελίδα.
      state = {
        tasks: parsed.tasks.map((t) => ({
          ...t,
          messages: t.messages ?? [],
          paidByOwner: t.paidByOwner ?? false,
          paidByWorker: t.paidByWorker ?? false,
        })) as MockTask[],
        blockedWords: parsed.blockedWords ?? [...DEFAULT_BLOCKED_WORDS],
        notify: parsed.notify ?? seed().notify,
      };
    }
  } catch {
    state = seed();
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
    return () => {
      listeners.delete(force);
    };
  }, []);
  return state;
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${(idCounter += 1)}`;
}
let idCounter = 0;

function patch(taskId: string, fn: (t: MockTask) => MockTask): void {
  state = { ...state, tasks: state.tasks.map((t) => (t.id === taskId ? fn(t) : t)) };
  emit();
}

export function addTask(input: {
  title: string;
  category: string;
  area: string;
  budget: number;
  when: string;
  urgent?: boolean;
}): MockTask {
  const task: MockTask = {
    id: newId('my'),
    title: input.title,
    category: input.category,
    area: input.area,
    budget: input.budget,
    when: input.when,
    postedAgo: 'μόλις τώρα',
    offers: 0,
    urgent: input.urgent === true,
    remote: input.area === 'Εξ αποστάσεως',
    status: 'open',
    hidden: false,
    mine: true,
    offersList: [],
    chosenOfferId: null,
    messages: [],
    paidByOwner: false,
    paidByWorker: false,
  };

  // Για να δει ο ιδιοκτήτης της δουλειάς τη διαδικασία επιλογής, η μακέτα
  // βάζει τρεις δείγμα-προσφορές. Στην πραγματική έκδοση έρχονται από κόσμο.
  task.offersList = buildOffers({ ...task, offers: 3 });
  task.offers = task.offersList.length;

  state = { ...state, tasks: [task, ...state.tasks] };
  emit();
  return task;
}

export function addOffer(
  taskId: string,
  input: { amount: number; message: string; licenceFileName?: string },
): void {
  patch(taskId, (t) => {
    const licence = input.licenceFileName
      ? {
          label: REQUIRED_LICENCE[t.category] ?? 'Επαγγελματική άδεια',
          fileName: input.licenceFileName,
          // Μόλις ανέβηκε: δηλωμένη, όχι ελεγμένη.
          verified: false,
        }
      : undefined;
    const offer: MockOffer = {
      id: newId('off'),
      licence,
      name: 'Εσύ',
      amount: input.amount,
      message: input.message,
      rating: 4.8,
      completed: 7,
      verifiedPhone: true,
      verifiedId: false,
      credentials: [],
      invoice: true,
      createdAgo: 'μόλις τώρα',
      mine: true,
      status: 'pending',
    };
    return { ...t, offersList: [offer, ...t.offersList], offers: t.offers + 1 };
  });
}

export function chooseOffer(taskId: string, offerId: string): void {
  patch(taskId, (t) => {
    const chosen = t.offersList.find((o) => o.id === offerId);
    return {
      ...t,
      status: 'assigned',
      chosenOfferId: offerId,
      offersList: t.offersList.map((o) => ({
        ...o,
        status: o.id === offerId ? 'accepted' : 'rejected',
      })),
      // Η συνομιλία ανοίγει μόνη της. Χωρίς αυτό, η επιλογή είναι αδιέξοδο:
      // διαλέγεις κάποιον και δεν έχεις τρόπο να του μιλήσεις.
      messages: [
        {
          id: newId('msg'),
          from: 'owner',
          text: `Γεια σου ${chosen?.name ?? ''}! Σε διάλεξα για «${t.title}». Πες μου πότε σε βολεύει.`,
          at: 'μόλις τώρα',
        },
      ],
    };
  });
}

export function sendMessage(taskId: string, from: 'owner' | 'worker', text: string): void {
  patch(taskId, (t) => ({
    ...t,
    messages: [...t.messages, { id: newId('msg'), from, text, at: 'μόλις τώρα' }],
  }));
}

export function completeTask(taskId: string): void {
  patch(taskId, (t) => ({ ...t, status: 'done' }));
}

/**
 * Δήλωση «πληρώθηκε» από τη μία πλευρά.
 *
 * ΓΙΑΤΙ ΥΠΑΡΧΕΙ ΧΩΡΙΣ ΝΑ ΑΓΓΙΖΟΥΜΕ ΧΡΗΜΑΤΑ: δεν κρατάμε ευρώ και δεν
 * αναλαμβάνουμε ευθύνη πληρωμής — αλλά αποκτάμε ιστορικό. Όποιος συστηματικά
 * δεν επιβεβαιώνει πληρωμή, φαίνεται.
 */
export function declarePaid(taskId: string, side: 'owner' | 'worker'): void {
  patch(taskId, (t) =>
    side === 'owner' ? { ...t, paidByOwner: true } : { ...t, paidByWorker: true },
  );
}

export function cancelTask(taskId: string, reason: string): void {
  patch(taskId, (t) => ({ ...t, status: 'cancelled', cancelReason: reason }));
}

export function openDispute(taskId: string, by: 'owner' | 'worker', reason: string): void {
  patch(taskId, (t) => ({ ...t, status: 'disputed', disputeBy: by, disputeReason: reason }));
}

/** Ο διαχειριστής κλείνει τη διαφωνία — επιστρέφει τη δουλειά σε ολοκληρωμένη. */
export function resolveDispute(taskId: string): void {
  patch(taskId, (t) => ({ ...t, status: 'done', disputeReason: undefined, disputeBy: undefined }));
}

/** Απόκρυψη ή επαναφορά μιας μικροδουλειάς — απόφαση διαχειριστή. */
export function setTaskHidden(taskId: string, hidden: boolean): void {
  patch(taskId, (t) => ({ ...t, hidden }));
}

/** Οριστική διαγραφή. Στην πραγματική έκδοση θα κρατούσαμε ίχνος στο audit log. */
export function deleteTask(taskId: string): void {
  state = { ...state, tasks: state.tasks.filter((t) => t.id !== taskId) };
  emit();
}

/**
 * Έλεγχος άδειας από άνθρωπο.
 *
 * ΤΟ ΚΡΙΣΙΜΟ: μόνο από εδώ μπορεί μια άδεια να γίνει «ελεγμένη». Πουθενά
 * αλλού στον κώδικα δεν μπαίνει `verified: true` σε άδεια — αυτό είναι που
 * κρατάει τη διαφορά «δηλωμένο» / «ελεγμένο» αληθινή.
 */
export function setLicenceVerified(taskId: string, offerId: string, verified: boolean): void {
  patch(taskId, (t) => ({
    ...t,
    offersList: t.offersList.map((o) =>
      o.id === offerId && o.licence ? { ...o, licence: { ...o.licence, verified } } : o,
    ),
  }));
}

export function setBlockedWords(words: string[]): void {
  state = { ...state, blockedWords: words };
  emit();
}

export function setNotifyPrefs(next: Partial<NotifyPrefs>): void {
  state = { ...state, notify: { ...state.notify, ...next } };
  emit();
}

/** Καθαρίζει τα πάντα και ξαναρχίζει την επίδειξη από την αρχή. */
export function resetMock(): void {
  state = seed();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
  listeners.forEach((l) => l());
}

// ── Παράγωγα ────────────────────────────────────────────────────────────────

/** Φαίνεται δημόσια; Κρυμμένες, ακυρωμένες και σε διαφωνία δεν φαίνονται. */
export function isPublic(t: MockTask): boolean {
  return !t.hidden && t.status !== 'cancelled' && t.status !== 'disputed';
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
