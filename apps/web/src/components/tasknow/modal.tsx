'use client';

import { useEffect, useRef } from 'react';

/**
 * Απλό παράθυρο για τη μακέτα του TaskNow.
 *
 * Δεν χρησιμοποιεί καμία εξωτερική βιβλιοθήκη και δεν αγγίζει τίποτα άλλο
 * στο site: κλείνει με Escape, με κλικ στο φόντο και με το ✕. Όσο είναι
 * ανοιχτό, η σελίδα από κάτω δεν κυλάει.
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
}) {
  const panelRef = useRef<HTMLDivElement>(null);

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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-gray-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
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
  );
}

/** Η κίτρινη υπενθύμιση ότι βλέπεις μακέτα και όχι αληθινή λειτουργία. */
export function MockNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
      <strong className="font-semibold">ΜΑΚΕΤΑ:</strong> {children}
    </p>
  );
}
