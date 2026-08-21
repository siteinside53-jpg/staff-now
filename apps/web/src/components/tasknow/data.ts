/**
 * ΜΑΚΕΤΑ TaskNow — τα δεδομένα της ροής.
 *
 * ΠΡΟΣΟΧΗ: όλα όσα ακολουθούν είναι ΠΑΡΑΔΕΙΓΜΑΤΑ, γραμμένα στο χέρι για να
 * φανεί η ιδέα. Δεν έρχονται από το API και δεν είναι αληθινές αγγελίες.
 * Η ετικέτα «ΜΑΚΕΤΑ» στην κορυφή της σελίδας δεν αφαιρείται όσο ισχύει αυτό.
 *
 * ── ΣΥΜΒΟΛΑΙΟ ΑΡΙΘΜΩΝ ──────────────────────────────────────────────────────
 * ΕΠΙΤΡΕΠΟΝΤΑΙ (όλα υπολογισμένα από τις ανοιχτές, δημόσιες δουλειές):
 *   πλήθος · άθροισμα · μικρότερη/μεγαλύτερη αμοιβή · πλήθος και μέγιστο ανά
 *   γειτονιά ή κατηγορία · πλήθος προσφορών · αποστάσεις · πόσο παλιά ανέβηκε.
 * ΑΠΑΓΟΡΕΥΟΝΤΑΙ ΡΗΤΑ:
 *   μέσος χρόνος απάντησης · «Χ άτομα εγγράφηκαν» · ποσοστά ολοκλήρωσης ·
 *   συγκεντρωτικές βαθμολογίες · «συνήθως απαντούν σε…» · πιθανότητα επιτυχίας.
 * ΚΑΝΟΝΑΣ ΕΠΙΛΟΓΗΣ: κάθε προεπισκόπηση παίρνει τις ΠΙΟ ΠΡΟΣΦΑΤΕΣ, ποτέ τις
 *   ακριβότερες. Το να διαλέγεις τα μεγάλα ποσά είναι σιωπηλό ψέμα.
 * ΚΑΝΟΝΑΣ ΚΛΙΜΑΚΑΣ: ποτέ «έως {max}€» ως τίτλος έξω από το TaskNow — μόνο
 *   εύρος «{min}€–{max}€ ανά δουλειά», και το «ανά δουλειά» δεν κόβεται.
 */

/**
 * Ο έλεγχος γράφεται ΕΔΩ και όχι με εισαγωγή από τα flags, επίτηδες.
 *
 * Το Next αντικαθιστά τις `process.env.*` με σταθερές την ώρα του χτισίματος,
 * οπότε ο συμπιεστής βλέπει `false ? [...] : []` και ΠΕΤΑΕΙ τα δείγματα έξω
 * από το πακέτο. Αν ο έλεγχος ερχόταν από άλλο αρχείο, δεν θα μπορούσε να το
 * αποφασίσει και τα δείγματα θα ταξίδευαν στον browser κάθε επισκέπτη —
 * αόρατα μεν, αλλά εκεί. Το επιβεβαίωσα: πριν την αλλαγή βρίσκονταν μέσα στο
 * κατεβασμένο JavaScript.
 */
const DEMO =
  process.env.NEXT_PUBLIC_TASKNOW_DEMO === '1' || process.env.NODE_ENV === 'development';

export type Task = {
  id: string;
  title: string;
  /**
   * Τι ακριβώς θέλει να γίνει, με δικά του λόγια.
   *
   * Προαιρετική αλλά καθοριστική: ένας τίτλος λέει «Μεταφορά καναπέ», η
   * περιγραφή λέει αν υπάρχει ασανσέρ. Χωρίς αυτήν, οι προσφορές έρχονται
   * στα τυφλά και αλλάζουν μετά — που είναι η βασική αιτία διαφωνίας.
   */
  description?: string;
  category: string;
  area: string;
  budget: number;
  budgetNote?: string;
  when: string;
  postedAgo: string;
  /**
   * Πόσα λεπτά πριν ανέβηκε. Γραμμένο στο χέρι ώστε να συμφωνεί με το
   * `postedAgo` — χωρίς αυτό το «Πιο πρόσφατα» δεν έχει τι να ταξινομήσει
   * και η ετικέτα «Νέο» δεν μπορεί να υπολογιστεί.
   */
  postedMinutesAgo: number;
  offers: number;
  urgent?: boolean;
  remote?: boolean;
  /** Γιατί σημαδεύτηκε για έλεγχο (αυτόματα ή από αναφορά χρήστη). */
  flagReason?: string;
  /** Κρυμμένη από τη δημόσια ροή μέχρι να κριθεί. */
  hidden?: boolean;
};

export type Category = {
  key: string;
  label: string;
  icon: string;
  /**
   * Κατηγορία που θέλει επαγγελματική άδεια.
   *
   * ΔΕΝ την κόβουμε: η ζήτηση υπάρχει. Αλλάζει όμως η ροή —
   *  · όποιος κάνει προσφορά ΥΠΟΧΡΕΩΤΙΚΑ ανεβάζει την άδειά του,
   *  · η άδεια φαίνεται «δηλωμένη» μέχρι να την ελέγξει άνθρωπος,
   *  · κι αυτός που διαλέγει υπογράφει ξεχωριστά ότι το κάνει με δική του
   *    ευθύνη.
   */
  licensed?: boolean;
};

export const CATEGORIES: Category[] = [
  { key: 'pets', label: 'Κατοικίδια', icon: '🐕' },
  { key: 'moving', label: 'Μεταφορές', icon: '🚚' },
  { key: 'cleaning', label: 'Καθαριότητα', icon: '🧹' },
  { key: 'errands', label: 'Θελήματα', icon: '🛒' },
  { key: 'assembly', label: 'Επισκευές', icon: '🔧' },
  { key: 'garden', label: 'Κήπος', icon: '🌿' },
  { key: 'tech', label: 'Τεχνολογία', icon: '💻' },
  { key: 'events', label: 'Εκδηλώσεις', icon: '🎉' },
  { key: 'photo', label: 'Φωτογραφία', icon: '📸' },
  { key: 'electrical', label: 'Ηλεκτρολογικά', icon: '⚡', licensed: true },
  { key: 'plumbing', label: 'Υδραυλικά', icon: '🚿', licensed: true },
  { key: 'gas', label: 'Φυσικό αέριο', icon: '🔥', licensed: true },
  { key: 'hvac', label: 'Ψύξη & κλιματισμός', icon: '❄️', licensed: true },
];

/** Είναι η κατηγορία από αυτές που θέλουν άδεια; */
export function isLicensedCategory(key: string): boolean {
  return CATEGORY_BY_KEY[key]?.licensed === true;
}

/** Ποια άδεια ζητάμε ανά κατηγορία — φαίνεται στη φόρμα της προσφοράς. */
export const REQUIRED_LICENCE: Record<string, string> = {
  electrical: 'Άδεια ηλεκτρολόγου εγκαταστάτη',
  plumbing: 'Άδεια υδραυλικού',
  gas: 'Άδεια εγκαταστάτη φυσικού αερίου',
  hvac: 'Άδεια ψυκτικού / τεχνικού κλιματισμού',
};

export const CATEGORY_BY_KEY: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c]),
);

/** Οι περιοχές της μακέτας — μόνο Θεσσαλονίκη, όπως συμφωνήθηκε για την αρχή. */
export const AREAS = [
  'Κέντρο',
  'Άνω Πόλη',
  'Άνω Τούμπα',
  'Καλαμαριά',
  'Χαριλάου',
  'Ντεπώ',
  'Τριανδρία',
  'Πυλαία',
  'Πανόραμα',
  'Εύοσμος',
  'Σταυρούπολη',
  'Εξ αποστάσεως',
];

/** Προεπιλογές της φόρμας — γραμμένες ρητά, ώστε να μην εξαρτώνται από σειρά. */
export const DEFAULT_CATEGORY = 'errands';
export const DEFAULT_AREA = 'Κέντρο';

/**
 * Παραδείγματα — ΟΧΙ αληθινές αγγελίες.
 *
 * Δεν διαβάζονται ποτέ απευθείας: όλοι περνούν από το `seedTasks()`, που τα
 * επιστρέφει μόνο όταν τρέχει η μακέτα. Στο live η λίστα είναι άδεια, οπότε
 * δεν υπάρχει τίποτα να παρεξηγηθεί ως αληθινό.
 */
const SAMPLE_TASKS_RAW: Task[] = [
  {
    id: 't1',
    title: 'Βόλτα με τον σκύλο μου κάθε απόγευμα',
    description:
      'Ο σκύλος είναι μεσαίου μεγέθους, ήρεμος, συνηθισμένος στο λουρί. Η βόλτα θέλει περίπου 30 λεπτά στη γειτονιά. Κλειδιά δίνονται στον φύλακα της πολυκατοικίας.',
    category: 'pets',
    area: 'Άνω Τούμπα',
    budget: 10,
    budgetNote: 'ανά βόλτα',
    when: 'Καθημερινά 18:00',
    postedAgo: 'πριν 12 λεπτά',
    postedMinutesAgo: 12,
    offers: 3,
  },
  {
    id: 't2',
    title: 'Μεταφορά καναπέ από Καλαμαριά σε Χαριλάου',
    description:
      'Τριθέσιος καναπές, δεν αποσυναρμολογείται. Από 2ο όροφο με ασανσέρ σε ισόγειο. Χρειάζονται δύο άτομα και όχημα.',
    category: 'moving',
    area: 'Καλαμαριά',
    budget: 60,
    when: 'Σάββατο πρωί',
    postedAgo: 'πριν 40 λεπτά',
    postedMinutesAgo: 40,
    offers: 5,
    urgent: true,
  },
  {
    id: 't3',
    title: 'Καθαρισμός διαμερίσματος 70τ.μ. μετά από μετακόμιση',
    description:
      'Διαμέρισμα άδειο μετά από μετακόμιση: δύο δωμάτια, σαλόνι, κουζίνα, ένα μπάνιο. Θέλει και τζάμια. Τα υλικά τα δίνω εγώ.',
    category: 'cleaning',
    area: 'Ντεπώ',
    budget: 80,
    when: 'Μέχρι την Παρασκευή',
    postedAgo: 'πριν 2 ώρες',
    postedMinutesAgo: 120,
    offers: 7,
  },
  {
    id: 't4',
    title: 'Ψώνια σούπερ μάρκετ για τη μητέρα μου',
    category: 'errands',
    area: 'Άνω Πόλη',
    budget: 15,
    when: 'Δευτέρα & Πέμπτη',
    postedAgo: 'πριν 3 ώρες',
    postedMinutesAgo: 180,
    offers: 2,
  },
  {
    id: 't5',
    title: 'Συναρμολόγηση δύο ντουλαπών ΙΚΕΑ',
    category: 'assembly',
    area: 'Πυλαία',
    budget: 50,
    when: 'Όποτε βολεύει',
    postedAgo: 'πριν 5 ώρες',
    postedMinutesAgo: 300,
    offers: 4,
  },
  {
    id: 't6',
    title: 'Κλάδεμα και πότισμα φυτών σε ταράτσα',
    category: 'garden',
    area: 'Εύοσμος',
    budget: 40,
    when: 'Αυτή τη βδομάδα',
    postedAgo: 'πριν 8 ώρες',
    postedMinutesAgo: 480,
    offers: 1,
  },
  {
    id: 't7',
    title: 'Στήσιμο νέου laptop και μεταφορά αρχείων',
    category: 'tech',
    area: 'Κέντρο',
    budget: 30,
    when: 'Απόψε αν γίνεται',
    postedAgo: 'πριν 9 ώρες',
    postedMinutesAgo: 540,
    offers: 6,
    urgent: true,
  },
  {
    id: 't8',
    title: 'Βοήθεια στο σερβίρισμα σε παιδικό πάρτι (4 ώρες)',
    category: 'events',
    area: 'Πανόραμα',
    budget: 60,
    when: 'Κυριακή 12:00',
    postedAgo: 'χθες',
    postedMinutesAgo: 1440,
    offers: 9,
  },
  {
    id: 't9',
    title: 'Φωτογράφιση 30 προϊόντων για e-shop',
    category: 'photo',
    area: 'Σταυρούπολη',
    budget: 120,
    when: 'Μέσα στον μήνα',
    postedAgo: 'χθες',
    postedMinutesAgo: 1440,
    offers: 3,
  },
  {
    id: 't10',
    title: 'Καταχώρηση 200 προϊόντων σε Excel',
    category: 'tech',
    area: 'Εξ αποστάσεως',
    budget: 70,
    when: 'Μέσα σε 5 μέρες',
    postedAgo: 'πριν 2 μέρες',
    postedMinutesAgo: 2880,
    offers: 11,
    remote: true,
  },
  {
    id: 't11',
    title: 'Ταΐσμα γάτας για 4 μέρες όσο λείπω',
    category: 'pets',
    area: 'Τριανδρία',
    budget: 45,
    when: '3–7 Σεπτεμβρίου',
    postedAgo: 'πριν 2 μέρες',
    postedMinutesAgo: 2880,
    offers: 8,
  },
  {
    id: 't15',
    title: 'Συνοδεία σε βραδινή έξοδο',
    category: 'events',
    area: 'Κέντρο',
    budget: 150,
    when: 'Σαββατόβραδο',
    postedAgo: 'χθες',
    postedMinutesAgo: 1440,
    offers: 0,
    hidden: true,
    flagReason: 'Ύποπτο για συνοδευτικό περιεχόμενο — απαγορεύεται ρητά',
  },
  {
    id: 't16',
    title: 'Δάνειο 500€ με επιστροφή σε έναν μήνα',
    category: 'errands',
    area: 'Χαριλάου',
    budget: 500,
    when: 'Άμεσα',
    postedAgo: 'πριν 5 ώρες',
    postedMinutesAgo: 300,
    offers: 0,
    hidden: true,
    flagReason: 'Δεν είναι υπηρεσία — οικονομική συναλλαγή',
  },
  {
    id: 't13',
    title: 'Αλλαγή πίνακα και δύο πριζών σε διαμέρισμα',
    description:
      'Παλιός πίνακας με ασφάλειες, θέλει αντικατάσταση με αυτόματες. Επιπλέον δύο πρίζες στο σαλόνι. Ζητείται άδεια και υπεύθυνη δήλωση εγκαταστάτη.',
    category: 'electrical',
    area: 'Κέντρο',
    budget: 200,
    when: 'Μέσα στη βδομάδα',
    postedAgo: 'πριν 1 ώρα',
    postedMinutesAgo: 60,
    offers: 2,
  },
  {
    id: 't14',
    title: 'Διαρροή στο καζανάκι — αλλαγή μηχανισμού',
    description:
      'Τρέχει συνέχεια το καζανάκι. Το μπάνιο είναι μικρό, ο μηχανισμός φαίνεται παλιός. Θα ήθελα να αλλαχτεί ολόκληρος, όχι μπάλωμα.',
    category: 'plumbing',
    area: 'Καλαμαριά',
    budget: 90,
    when: 'Το συντομότερο',
    postedAgo: 'πριν 4 ώρες',
    postedMinutesAgo: 240,
    offers: 3,
    urgent: true,
  },
  {
    id: 't12',
    title: 'Βάψιμο ενός δωματίου 12τ.μ.',
    category: 'assembly',
    area: 'Χαριλάου',
    budget: 150,
    when: 'Επόμενη βδομάδα',
    postedAgo: 'πριν 3 μέρες',
    postedMinutesAgo: 4320,
    offers: 5,
  },
];

/**
 * Ο σπόρος της ροής. Άδειος όταν δεν τρέχει η μακέτα.
 *
 * Το ίδιο ισχύει και στο χτίσιμο: χωρίς δείγματα δεν φτιάχνονται ούτε
 * σελίδες ανά μικροδουλειά ούτε εικόνες κοινοποίησης.
 */
export const SAMPLE_TASKS: Task[] = DEMO ? SAMPLE_TASKS_RAW : [];

// ── Παραδείγματα για τον πίνακα ελέγχου του χρήστη ──────────────────────────
// ΟΧΙ αληθινά δεδομένα. Υπάρχουν για να φανεί η διάταξη της οθόνης.

export type MyTaskStatus = 'open' | 'assigned' | 'delivered' | 'done' | 'cancelled';

export const MY_TASK_STATUS_LABEL: Record<MyTaskStatus, string> = {
  open: 'Ανοιχτή',
  assigned: 'Ανατέθηκε',
  delivered: 'Παραδόθηκε',
  done: 'Ολοκληρώθηκε',
  cancelled: 'Ακυρώθηκε',
};

export const MY_TASK_STATUS_CLASS: Record<MyTaskStatus, string> = {
  open: 'bg-amber-50 text-amber-700',
  assigned: 'bg-blue-50 text-blue-700',
  delivered: 'bg-violet-50 text-violet-700',
  done: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export type MyTask = {
  id: string;
  title: string;
  status: MyTaskStatus;
  budget: number;
  offers: number;
  updated: string;
};

export type MyOffer = {
  id: string;
  title: string;
  amount: number;
  status: 'pending' | 'accepted' | 'rejected';
  sent: string;
};

export const MY_TASKS: MyTask[] = [
  { id: 'm1', title: 'Μεταφορά πλυντηρίου στον 3ο όροφο', status: 'open', budget: 50, offers: 4, updated: 'πριν 1 ώρα' },
  { id: 'm2', title: 'Καθάρισμα μπαλκονιού 20τ.μ.', status: 'assigned', budget: 35, offers: 6, updated: 'χθες' },
  { id: 'm3', title: 'Στήσιμο τραπεζιών για γενέθλια', status: 'done', budget: 40, offers: 3, updated: 'πριν 6 μέρες' },
];

export const MY_OFFERS: MyOffer[] = [
  { id: 'o1', title: 'Βόλτα με τον σκύλο μου κάθε απόγευμα', amount: 10, status: 'pending', sent: 'πριν 20 λεπτά' },
  { id: 'o2', title: 'Συναρμολόγηση δύο ντουλαπών ΙΚΕΑ', amount: 55, status: 'accepted', sent: 'πριν 2 μέρες' },
  { id: 'o3', title: 'Φωτογράφιση 30 προϊόντων για e-shop', amount: 130, status: 'rejected', sent: 'πριν 4 μέρες' },
];

// ── Τοποθεσίες ──────────────────────────────────────────────────────────────
// Πραγματικές (κατά προσέγγιση) συντεταγμένες γειτονιών της Θεσσαλονίκης.
// Με αυτές ο χάρτης της μακέτας δείχνει ΑΛΗΘΙΝΕΣ αποστάσεις: το «σε ακτίνα
// 3 χλμ» υπολογίζεται κανονικά, δεν είναι διακοσμητικό.

export type Coords = { lat: number; lon: number };

export const AREA_COORDS: Record<string, Coords> = {
  'Κέντρο': { lat: 40.6333, lon: 22.9403 },
  'Άνω Πόλη': { lat: 40.642, lon: 22.953 },
  'Άνω Τούμπα': { lat: 40.6155, lon: 22.972 },
  'Καλαμαριά': { lat: 40.58, lon: 22.95 },
  'Χαριλάου': { lat: 40.6, lon: 22.965 },
  'Ντεπώ': { lat: 40.606, lon: 22.956 },
  'Τριανδρία': { lat: 40.622, lon: 22.964 },
  'Πυλαία': { lat: 40.593, lon: 22.988 },
  'Πανόραμα': { lat: 40.585, lon: 23.04 },
  'Εύοσμος': { lat: 40.664, lon: 22.902 },
  'Σταυρούπολη': { lat: 40.669, lon: 22.927 },
};

export const DEFAULT_CENTER: Coords = AREA_COORDS['Κέντρο']!;

/** Απόσταση σε χιλιόμετρα (haversine). */
export function distanceKm(a: Coords, b: Coords): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Από πού μετριέται η απόσταση που δείχνουμε. */
export type CenterSource = 'default' | 'area' | 'geo';

/**
 * Πώς γράφεται μια απόσταση — ΠΑΝΤΑ με το σημείο αναφοράς δίπλα της.
 *
 * Βρέθηκε στη δοκιμή: η καρτέλα έγραφε «6,0 χλμ από σένα» ενώ κανείς δεν
 * είχε δώσει τοποθεσία — μετρούσε από το κέντρο Θεσσαλονίκης. Απόσταση χωρίς
 * σημείο αναφοράς είναι απλώς λάθος νούμερο.
 */
export function distanceLabel(
  km: number | null,
  source: CenterSource,
  centerLabel: string,
): string {
  if (km === null) return 'Εξ αποστάσεως';
  const from =
    source === 'geo' ? 'από σένα' : source === 'area' ? `από ${centerLabel}` : 'από το κέντρο';
  // Κάτω από 150 μέτρα δεν τυπώνουμε αριθμό: το «0 μ.» δεν λέει τίποτα.
  if (km < 0.15) return `εδώ κοντά ${from}`;
  return `${formatKm(km)} ${from}`;
}

export function formatKm(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} μ.` : `${km.toFixed(1).replace('.', ',')} χλμ`;
}

// ── Επίπεδα και φήμη ────────────────────────────────────────────────────────
// Ο λόγος να ξαναμπαίνει κάποιος: η φήμη που χτίζει τον ακολουθεί και του
// δίνει κάτι πραγματικό. Χωρίς σκοτεινά κόλπα — τα κριτήρια είναι γραμμένα
// και ορατά, και κανένα «προνόμιο» δεν υπόσχεται δουλειά.

export type Level = {
  key: string;
  label: string;
  icon: string;
  minCompleted: number;
  minRating: number;
  perk: string;
  className: string;
};

export const LEVELS: Level[] = [
  {
    key: 'new',
    label: 'Νέος',
    icon: '🌱',
    minCompleted: 0,
    minRating: 0,
    perk: 'Ξεκινάς — οι πρώτες δουλειές χτίζουν τη βαθμολογία σου.',
    className: 'bg-gray-100 text-gray-600',
  },
  {
    key: 'bronze',
    label: 'Χάλκινο',
    icon: '🥉',
    minCompleted: 3,
    minRating: 4,
    perk: 'Το σήμα φαίνεται δίπλα στην προσφορά σου.',
    className: 'bg-amber-100 text-amber-800',
  },
  {
    key: 'silver',
    label: 'Ασημένιο',
    icon: '🥈',
    minCompleted: 10,
    minRating: 4.3,
    perk: 'Ειδοποιείσαι πρώτος για νέες δουλειές στην περιοχή σου.',
    className: 'bg-slate-200 text-slate-700',
  },
  {
    key: 'gold',
    label: 'Χρυσό',
    icon: '🥇',
    minCompleted: 25,
    minRating: 4.6,
    perk: 'Η προσφορά σου εμφανίζεται ψηλότερα στη λίστα.',
    className: 'bg-yellow-100 text-yellow-800',
  },
  {
    key: 'top',
    label: 'Κορυφαίος',
    icon: '👑',
    minCompleted: 50,
    minRating: 4.8,
    perk: 'Ξεχωριστό σήμα και πρόσβαση σε δουλειές μεγάλου προϋπολογισμού.',
    className: 'bg-violet-100 text-violet-800',
  },
];

export function levelFor(completed: number, rating: number | null): Level {
  let current = LEVELS[0]!;
  for (const level of LEVELS) {
    if (completed >= level.minCompleted && (rating ?? 0) >= level.minRating) current = level;
  }
  return current;
}

export function nextLevel(current: Level): Level | null {
  const i = LEVELS.findIndex((l) => l.key === current.key);
  return i >= 0 && i < LEVELS.length - 1 ? LEVELS[i + 1]! : null;
}

// ── Λέξεις που κόβουν το ανέβασμα ───────────────────────────────────────────
// ΓΙΑΤΙ ΣΤΟ ΑΝΕΒΑΣΜΑ ΚΑΙ ΟΧΙ ΜΕΤΑ: μια αγγελία για «συνοδεία» που μένει
// ορατή δύο ώρες μέχρι να τη δει διαχειριστής, έχει ήδη κάνει τη ζημιά. Ο
// έλεγχος γίνεται τη στιγμή που πατιέται το κουμπί.
//
// Δεν είναι τέλειος και δεν προσπαθεί να είναι: πιάνει το προφανές και αφήνει
// τα υπόλοιπα στον άνθρωπο. Καλύτερα να περάσει κάτι και να κοπεί μετά, παρά
// να κόβουμε αθώες αγγελίες με «έξυπνο» φιλτράρισμα.

export const DEFAULT_BLOCKED_WORDS = [
  'συνοδεία',
  'συνοδός',
  'escort',
  'ερωτικ',
  'sex',
  'δάνειο',
  'δανεικ',
  'μετρητά έναντι',
  'ναρκωτικ',
  'όπλο',
  'πλαστ',
];

/** Επιστρέφει την πρώτη απαγορευμένη λέξη που βρέθηκε, αλλιώς null. */
export function findBlockedWord(text: string, words: string[]): string | null {
  const clean = text.toLowerCase();
  for (const w of words) {
    const needle = w.trim().toLowerCase();
    if (needle && clean.includes(needle)) return w.trim();
  }
  return null;
}

// ── Πόσο κρατάει το «Επείγον» ───────────────────────────────────────────────
// Το «Επείγον» δεν είναι διακοσμητικό: κρατά την αγγελία στην κορυφή για
// λίγες ώρες. Αν κρατούσε για πάντα, σε μία βδομάδα θα ήταν όλες επείγουσες
// και δεν θα σήμαινε τίποτα.
export const URGENT_HOURS = 6;


// ── Πόσο παλιά είναι μια αγγελία ────────────────────────────────────────────

/** Πόσο καιρό μετράει μια αγγελία ως «Νέο» — ίδια σύμβαση με τις αγγελίες. */
export const NEW_MINUTES = 48 * 60;

export function formatPostedAgo(minutes: number): string {
  if (minutes < 1) return 'μόλις τώρα';
  if (minutes < 60) return `πριν ${Math.round(minutes)} λεπτά`;
  if (minutes < 120) return 'πριν 1 ώρα';
  if (minutes < 1440) return `πριν ${Math.round(minutes / 60)} ώρες`;
  if (minutes < 2880) return 'χθες';
  return `πριν ${Math.round(minutes / 1440)} μέρες`;
}
