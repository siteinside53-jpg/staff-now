/**
 * ΜΑΚΕΤΑ — δεδομένα για το διαχειριστικό του TaskNow.
 *
 * ΟΛΑ ΨΕΥΤΙΚΑ, γραμμένα στο χέρι. Καμία γραμμή δεν έρχεται από τη βάση.
 * Υπάρχουν για να φανεί ΤΙ πρέπει να βλέπει και τι να μπορεί να κάνει ο
 * διαχειριστής — όχι για να δείξουν πραγματική κατάσταση της πλατφόρμας.
 */

export type AdminTaskStatus = 'open' | 'assigned' | 'done' | 'hidden' | 'flagged';

export const ADMIN_TASK_STATUS_LABEL: Record<AdminTaskStatus, string> = {
  open: 'Ανοιχτή',
  assigned: 'Ανατέθηκε',
  done: 'Ολοκληρώθηκε',
  hidden: 'Κρυμμένη',
  flagged: 'Για έλεγχο',
};

export const ADMIN_TASK_STATUS_CLASS: Record<AdminTaskStatus, string> = {
  open: 'bg-amber-50 text-amber-700 ring-amber-200',
  assigned: 'bg-blue-50 text-blue-700 ring-blue-200',
  done: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  hidden: 'bg-gray-100 text-gray-500 ring-gray-200',
  flagged: 'bg-red-50 text-red-700 ring-red-200',
};

export type AdminTask = {
  id: string;
  title: string;
  author: string;
  area: string;
  category: string;
  budget: number;
  offers: number;
  status: AdminTaskStatus;
  created: string;
  flagReason?: string;
};

export const ADMIN_TASKS: AdminTask[] = [
  { id: 'TN-1042', title: 'Βόλτα με τον σκύλο μου κάθε απόγευμα', author: 'Μαρία Κ.', area: 'Άνω Τούμπα', category: 'Κατοικίδια', budget: 10, offers: 3, status: 'open', created: 'σήμερα 14:12' },
  { id: 'TN-1041', title: 'Μεταφορά καναπέ από Καλαμαριά σε Χαριλάου', author: 'Γιώργος Π.', area: 'Καλαμαριά', budget: 60, category: 'Μεταφορές', offers: 5, status: 'assigned', created: 'σήμερα 13:40' },
  { id: 'TN-1040', title: 'Αλλαγή πίνακα και πρίζες σε διαμέρισμα', author: 'Νίκος Α.', area: 'Κέντρο', category: 'Επισκευές', budget: 200, offers: 0, status: 'flagged', created: 'σήμερα 11:05', flagReason: 'Ηλεκτρολογική εργασία — θέλει άδεια' },
  { id: 'TN-1039', title: 'Καθαρισμός διαμερίσματος 70τ.μ.', author: 'Ελένη Σ.', area: 'Ντεπώ', category: 'Καθαριότητα', budget: 80, offers: 7, status: 'open', created: 'σήμερα 09:20' },
  { id: 'TN-1038', title: 'Συνοδεία σε βραδινή έξοδο', author: 'Άγνωστος χρήστης', area: 'Κέντρο', category: 'Εκδηλώσεις', budget: 150, offers: 2, status: 'hidden', created: 'χθες 22:48', flagReason: 'Ύποπτο για συνοδευτικό περιεχόμενο' },
  { id: 'TN-1037', title: 'Συναρμολόγηση δύο ντουλαπών ΙΚΕΑ', author: 'Δημήτρης Λ.', area: 'Πυλαία', category: 'Επισκευές', budget: 50, offers: 4, status: 'done', created: 'χθες 18:10' },
  { id: 'TN-1036', title: 'Φωτογράφιση 30 προϊόντων για e-shop', author: 'Ανθή Β.', area: 'Σταυρούπολη', category: 'Φωτογραφία', budget: 120, offers: 3, status: 'open', created: 'χθες 16:55' },
  { id: 'TN-1035', title: 'Καταχώρηση 200 προϊόντων σε Excel', author: 'Στέλιος Μ.', area: 'Εξ αποστάσεως', category: 'Τεχνολογία', budget: 70, offers: 11, status: 'assigned', created: 'πριν 2 μέρες' },
];

export type AdminOffer = {
  id: string;
  taskId: string;
  taskTitle: string;
  user: string;
  amount: number;
  verified: 'phone' | 'id' | 'none';
  status: 'pending' | 'accepted' | 'rejected';
  created: string;
};

export const ADMIN_OFFERS: AdminOffer[] = [
  { id: 'OF-2210', taskId: 'TN-1042', taskTitle: 'Βόλτα με τον σκύλο μου', user: 'Κώστας Ι.', amount: 10, verified: 'phone', status: 'pending', created: 'σήμερα 14:31' },
  { id: 'OF-2209', taskId: 'TN-1039', taskTitle: 'Καθαρισμός διαμερίσματος', user: 'Λίνα Τ.', amount: 75, verified: 'id', status: 'pending', created: 'σήμερα 12:02' },
  { id: 'OF-2208', taskId: 'TN-1041', taskTitle: 'Μεταφορά καναπέ', user: 'Σάββας Ρ.', amount: 55, verified: 'phone', status: 'accepted', created: 'σήμερα 11:47' },
  { id: 'OF-2207', taskId: 'TN-1036', taskTitle: 'Φωτογράφιση προϊόντων', user: 'Ανδρέας Χ.', amount: 130, verified: 'none', status: 'rejected', created: 'χθες 20:15' },
  { id: 'OF-2206', taskId: 'TN-1035', taskTitle: 'Καταχώρηση σε Excel', user: 'Ζωή Ν.', amount: 70, verified: 'phone', status: 'accepted', created: 'χθες 19:03' },
];

export type AdminReport = {
  id: string;
  target: string;
  targetId: string;
  reason: string;
  reporter: string;
  created: string;
  open: boolean;
};

export const ADMIN_REPORTS: AdminReport[] = [
  { id: 'RP-118', target: 'Μικροδουλειά', targetId: 'TN-1038', reason: 'Πιθανό συνοδευτικό περιεχόμενο', reporter: 'Χρήστης #4471', created: 'χθες 23:02', open: true },
  { id: 'RP-117', target: 'Μικροδουλειά', targetId: 'TN-1040', reason: 'Ζητά ηλεκτρολογική εργασία χωρίς άδεια', reporter: 'Αυτόματος έλεγχος', created: 'σήμερα 11:05', open: true },
  { id: 'RP-116', target: 'Χρήστης', targetId: 'U-8823', reason: 'Ζήτησε πληρωμή εκτός πλατφόρμας πριν την ανάθεση', reporter: 'Χρήστης #3390', created: 'πριν 2 μέρες', open: false },
];

export type AdminConsent = {
  id: string;
  user: string;
  kind: 'Όροι TaskNow' | 'Δήλωση νομιμότητας';
  version: string;
  when: string;
  ip: string;
};

export const ADMIN_CONSENTS: AdminConsent[] = [
  { id: 'C-5521', user: 'Κώστας Ι.', kind: 'Δήλωση νομιμότητας', version: 'v1', when: '20/08/2026 14:31', ip: '2a02:587:...:9c1a' },
  { id: 'C-5520', user: 'Κώστας Ι.', kind: 'Όροι TaskNow', version: 'v1', when: '20/08/2026 14:29', ip: '2a02:587:...:9c1a' },
  { id: 'C-5519', user: 'Λίνα Τ.', kind: 'Δήλωση νομιμότητας', version: 'v1', when: '20/08/2026 12:02', ip: '94.66....31' },
  { id: 'C-5518', user: 'Λίνα Τ.', kind: 'Όροι TaskNow', version: 'v1', when: '20/08/2026 11:58', ip: '94.66....31' },
  { id: 'C-5517', user: 'Σάββας Ρ.', kind: 'Όροι TaskNow', version: 'v1', when: '19/08/2026 21:14', ip: '5.55....8' },
];

/** Κατηγορίες που στο MVP μένουν κλειστές επειδή θέλουν επαγγελματική άδεια. */
export const LICENSED_CATEGORIES = [
  'Ηλεκτρολογικά',
  'Φυσικό αέριο',
  'Ιατρικά',
  'Νομικά',
  'Οικονομικές συμβουλές',
];
