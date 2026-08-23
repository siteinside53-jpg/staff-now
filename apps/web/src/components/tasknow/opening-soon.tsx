'use client';

/**
 * Τι βλέπει ο ΣΥΝΔΕΔΕΜΕΝΟΣ χρήστης στο TaskNow όσο δεν έχει ανοίξει.
 *
 * Χωριστό αρχείο ώστε να μπορεί να ελεγχθεί στην οθόνη χωρίς λογαριασμό: όλα
 * τα `/dashboard/*` θέλουν σύνδεση, οπότε αν ζούσε μέσα στη σελίδα δεν θα
 * μπορούσε να δει κανείς πώς δείχνει πριν ανέβει.
 *
 * Λέει δύο πράγματα και τα λέει καθαρά: δεν έχει ανοίξει ακόμη, και δεν
 * υπάρχει καμία μικροδουλειά — ούτε δική σου. Η προηγούμενη εκδοχή έδειχνε
 * εδώ ολόκληρη τη μακέτα με κουμπί «Ανέβασε μικροδουλειά» που δεν ανέβαζε
 * τίποτα πουθενά.
 */

import Link from 'next/link';
import { TaskNowLogo } from './logo';

export function TaskNowOpeningSoon() {
  return (
    <div className="rounded-3xl border border-amber-200 bg-white p-6 text-center shadow-sm sm:p-10">
      <div className="flex justify-center">
        <TaskNowLogo />
      </div>

      <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-1.5 text-sm font-semibold text-amber-800">
        Ανοίγει σύντομα στη Θεσσαλονίκη
      </span>

      <h1 className="mt-4 text-2xl font-bold leading-tight tracking-tight text-gray-900">
        Οι μικροδουλειές δεν έχουν ανοίξει ακόμη.
      </h1>

      <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-gray-600">
        Ετοιμάζουμε το κομμάτι όπου ανεβάζεις μια μικρή δουλειά — βόλτα με τον σκύλο,
        μεταφορά, καθάρισμα, θέλημα, μαστόρεμα — και δέχεσαι προσφορές με ποσό. Ξεκινάμε
        από τη Θεσσαλονίκη. Έχεις ήδη λογαριασμό, οπότε θα είσαι από τους πρώτους που θα
        μπορούν να ανεβάσουν και να αναλάβουν.
      </p>

      <p className="mx-auto mt-3 max-w-xl text-xs leading-relaxed text-gray-400">
        Δεν σου κρύβουμε τίποτα: αυτή τη στιγμή δεν υπάρχει καμία ανοιχτή μικροδουλειά,
        ούτε δική σου ούτε άλλου.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/tasknow"
          className="rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition hover:bg-amber-600"
        >
          Δες πώς θα δουλεύει
        </Link>
        <Link
          href="/dashboard/jobs"
          className="rounded-xl bg-gray-100 px-6 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-200"
        >
          Πήγαινε στις αγγελίες
        </Link>
      </div>
    </div>
  );
}
