'use client';

import { PostTaskButton } from './post-trigger';

/**
 * Τα κουμπιά του μπλοκ ταυτότητας, στο τέλος της σελίδας.
 *
 * Το hero μετακόμισε κάτω: πάνω από τη ροή δεν μένει τίποτα που να μιλάει για
 * εμάς. Ο επισκέπτης ρωτάει «τι βγάζω» — του απαντάμε με ποσά, όχι με λόγια.
 */
export function HeroCtas() {
  return (
    <PostTaskButton className="rounded-xl bg-amber-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition hover:bg-amber-600">
      Ανέβασε δουλειά — δωρεάν
    </PostTaskButton>
  );
}
