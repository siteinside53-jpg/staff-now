'use client';

import Link from 'next/link';
import { useEffect } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  role: 'business' | 'worker';
  action: 'profile' | 'apply';
  redirectAfter?: string;
};

/**
 * Modal που εμφανίζεται όταν ένας μη-εγγεγραμμένος επισκέπτης
 * προσπαθεί να ανοίξει προφίλ εργαζομένου ή αγγελία.
 *
 * Δεν φράζει την προβολή της λίστας — μόνο το βήμα της επαφής /
 * αίτησης που χρειάζεται λογαριασμό.
 */
export function AuthGatePopup({
  open,
  onClose,
  role,
  action,
  redirectAfter = '/dashboard',
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const title =
    action === 'profile' ? 'Δες ολόκληρο το προφίλ' : 'Κάνε αίτηση τώρα';
  const subtitle =
    action === 'profile'
      ? 'Συνδέσου ή κάνε εγγραφή για να δεις στοιχεία επικοινωνίας και να ξεκινήσεις chat.'
      : 'Συνδέσου ή κάνε εγγραφή για να στείλεις την αίτησή σου άμεσα στην επιχείρηση.';

  const registerHref = `/auth/register?role=${role}&next=${encodeURIComponent(
    redirectAfter,
  )}`;
  const loginHref = `/auth/login?next=${encodeURIComponent(redirectAfter)}`;

  const accent =
    role === 'business'
      ? { bg: 'bg-blue-600', hover: 'hover:bg-blue-700', tint: 'bg-blue-50 text-blue-600' }
      : { bg: 'bg-emerald-600', hover: 'hover:bg-emerald-700', tint: 'bg-emerald-50 text-emerald-600' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-gate-title"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 sm:p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Κλείσιμο"
          className="float-right -mt-2 -mr-2 text-gray-400 hover:text-gray-700 text-2xl leading-none px-2"
        >
          ×
        </button>

        <div className="flex items-center justify-center mb-4">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl ${accent.tint}`}
            aria-hidden="true"
          >
            🔐
          </div>
        </div>

        <h2
          id="auth-gate-title"
          className="text-xl sm:text-2xl font-bold text-gray-900 text-center"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm text-gray-600 text-center">{subtitle}</p>

        <div className="mt-6 space-y-2.5">
          <Link
            href={registerHref}
            className={`block w-full rounded-xl ${accent.bg} ${accent.hover} px-5 py-3 text-center text-sm font-semibold text-white shadow transition`}
          >
            Δωρεάν εγγραφή σε 30''
          </Link>
          <Link
            href={loginHref}
            className="block w-full rounded-xl border border-gray-300 hover:bg-gray-50 px-5 py-3 text-center text-sm font-semibold text-gray-800 transition"
          >
            Έχω ήδη λογαριασμό — Σύνδεση
          </Link>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          Χωρίς πιστωτική κάρτα · Χωρίς δεσμεύσεις
        </p>
      </div>
    </div>
  );
}
