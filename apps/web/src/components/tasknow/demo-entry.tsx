'use client';

import dynamic from 'next/dynamic';

/**
 * Η είσοδος στη μακέτα — με ΤΕΜΠΕΛΗ φόρτωση, επίτηδες.
 *
 * ΓΙΑΤΙ: αν η ροή εισαγόταν κανονικά, όλος ο κώδικας και τα παραδείγματα θα
 * ταξίδευαν στον browser κάθε επισκέπτη, ακόμη κι όταν δεν εμφανίζονται
 * πουθενά. Το επιβεβαίωσα: τα δείγματα βρίσκονταν μέσα στο κατεβασμένο
 * JavaScript, αόρατα αλλά παρόντα.
 *
 * Με τη δυναμική φόρτωση μπαίνουν σε δικό τους αρχείο, που ζητιέται μόνο όταν
 * όντως τρέχει η μακέτα. Στο live δεν το κατεβάζει κανείς.
 */
const TaskFeedSection = dynamic(
  () => import('./feed-section').then((m) => m.TaskFeedSection),
  { ssr: false },
);

export function TaskNowDemo() {
  return <TaskFeedSection />;
}
