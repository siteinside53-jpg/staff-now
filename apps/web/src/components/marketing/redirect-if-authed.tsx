'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Αν ο επισκέπτης είναι ήδη συνδεδεμένος (υπάρχει token), τον στέλνει
 * αυτόματα στο discover του πίνακα ελέγχου του — ώστε ο συνδεδεμένος
 * που πατάει «Βρες προσωπικό / Βρες εργασία» να πάει κατευθείαν στην
 * εύρεση αντί για τη δημόσια προεπισκόπηση.
 */
export function RedirectIfAuthed({ to = '/dashboard/discover' }: { to?: string }) {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('staffnow_token');
    if (token) router.replace(to);
  }, [router, to]);

  return null;
}
