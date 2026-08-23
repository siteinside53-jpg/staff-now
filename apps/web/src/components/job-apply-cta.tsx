'use client';

/**
 * Η σειρά ενεργειών κάτω από μια δημόσια αγγελία.
 *
 * ΓΙΑΤΙ ΔΕΝ ΕΙΝΑΙ ΑΠΛΟ ΚΟΥΜΠΙ ΜΕΣΑ ΣΤΗ ΣΕΛΙΔΑ:
 *
 * Η σελίδα της αγγελίας φτιάχνεται μία φορά στο χτίσιμο και είναι ίδια για
 * όλους — δεν ξέρει ποιος την ανοίγει. Το «Κάνε αίτηση δωρεάν» όμως δεν έχει
 * νόημα για επιχείρηση: επιχείρηση δεν κάνει αίτηση σε αγγελία. Χειρότερα, ο
 * σύνδεσμος οδηγούσε σε εγγραφή ΕΡΓΑΖΟΜΕΝΟΥ, οπότε μια συνδεδεμένη επιχείρηση
 * που το πατούσε καταλήγαινε να της ζητείται να φτιάξει δεύτερο λογαριασμό σε
 * λάθος ρόλο.
 *
 * Οπότε το κουμπί ζει εδώ, σε κομμάτι που τρέχει στον browser και ξέρει ποιος
 * είναι συνδεδεμένος.
 *
 * ΓΙΑΤΙ ΦΑΙΝΕΤΑΙ ΟΣΟ ΦΟΡΤΩΝΕΙ Η ΣΥΝΔΕΣΗ: οι περισσότεροι επισκέπτες αυτής της
 * σελίδας έρχονται από τη Google χωρίς λογαριασμό, και είναι η κύρια σελίδα
 * που φέρνει εγγραφές. Αν το κουμπί περίμενε να μάθει ποιος είσαι, θα έλειπε
 * για μια στιγμή από όλους. Έτσι λείπει μόνο από την επιχείρηση, μόλις γίνει
 * γνωστό ότι είναι επιχείρηση.
 */

import Link from 'next/link';
import type React from 'react';
import { useAuth } from '@/lib/auth-context';

export function JobApplyCta({ jobId, children }: { jobId: string; children?: React.ReactNode }) {
  const { user } = useAuth();
  const isBusiness = user?.role === 'business';

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {!isBusiness && (
          <Link
            href={`/auth/register?role=worker&next=${encodeURIComponent(`/dashboard/discover?focus=${jobId}`)}`}
            className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-8 py-3.5 text-sm font-semibold text-white shadow transition hover:bg-emerald-700 sm:w-auto"
          >
            Κάνε αίτηση δωρεάν →
          </Link>
        )}
        {children}
      </div>
      {!isBusiness && (
        <p className="mt-2 text-xs text-gray-400">
          Δωρεάν εγγραφή σε 30&apos;&apos; · Χωρίς πιστωτική κάρτα
        </p>
      )}
    </>
  );
}
