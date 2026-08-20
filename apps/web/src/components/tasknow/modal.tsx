'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Απλό παράθυρο για τη μακέτα του TaskNow.
 *
 * Δεν χρησιμοποιεί καμία εξωτερική βιβλιοθήκη και δεν αγγίζει τίποτα άλλο
 * στο site: κλείνει με Escape, με κλικ στο φόντο και με το ✕. Όσο είναι
 * ανοιχτό, η σελίδα από κάτω δεν κυλάει.
 *
 * ΔΥΟ ΠΑΓΙΔΕΣ ΠΟΥ ΕΧΟΥΝ ΗΔΗ ΔΑΓΚΩΣΕΙ:
 *
 * 1. ΠΟΡΤΑ ΣΤΟ BODY. Το κουμπί «Ανέβασε δουλειά» ζει μέσα στην κολλημένη
 *    μπάρα της ροής, που έχει θόλωμα φόντου. Ένα στοιχείο με θόλωμα ή
 *    μετασχηματισμό γίνεται «σημείο αναφοράς» για ό,τι είναι fixed μέσα
 *    του — οπότε το παράθυρο τοποθετούνταν μέσα στη μπάρα των 56 pixel και
 *    φαινόταν κομμένο. Η μεταφορά στο body το ξεκολλάει από κάθε τέτοιο
 *    σημείο αναφοράς.
 *
 * 2. ΚΕΝΤΡΑΡΙΣΜΑ ΠΟΥ ΚΟΒΕΙ ΤΗΝ ΚΟΡΥΦΗ. Όταν το περιεχόμενο είναι ψηλότερο
 *    από την οθόνη, το κατακόρυφο κεντράρισμα σπρώχνει την κορυφή έξω από
 *    την περιοχή κύλισης και δεν φτάνεις ποτέ σε αυτήν. Γι' αυτό η κύλιση
 *    είναι στο εξωτερικό στρώμα και το κεντράρισμα σε εσωτερικό με
 *    ελάχιστο ύψος — έτσι τα μικρά παράθυρα κεντράρονται και τα μεγάλα
 *    κυλούν από την αρχή τους.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  // Ρητός τύπος επιστροφής: το έργο έχει δύο αντίγραφα των τύπων της React,
  // οπότε ένα σκέτο portal βγάζει ψεύτικο σφάλμα «δεν είναι στοιχείο JSX».
}): React.ReactElement | null {
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    // Κλείδωμα του scroll, με επαναφορά ακριβώς σε ό,τι υπήρχε πριν.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    panelRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-gray-900/60 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div className="flex min-h-full items-end justify-center p-0 sm:items-center sm:p-4">
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="my-0 w-full max-w-lg rounded-t-2xl bg-white shadow-2xl outline-none sm:my-8 sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Κλείσιμο"
              className="-mr-1 -mt-1 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="px-5 py-5">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  ) as unknown as React.ReactElement;
}

/** Η κίτρινη υπενθύμιση ότι βλέπεις μακέτα και όχι αληθινή λειτουργία. */
export function MockNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
      <strong className="font-semibold">ΜΑΚΕΤΑ:</strong> {children}
    </p>
  );
}
