'use client';

import { useState } from 'react';
import {
  requestMediaAccess,
  mediaFailureSteps,
  type BlockedDevice,
  type MediaFailure,
} from '@/lib/call-engine';

/**
 * Ο οδηγός που εμφανίζεται όταν δεν πήραμε κάμερα και μικρόφωνο.
 *
 * ΓΙΑΤΙ ΔΕΝ ΥΠΑΡΧΕΙ ΚΟΥΜΠΙ «ΑΝΟΙΞΕ ΤΙΣ ΡΥΘΜΙΣΕΙΣ»: καμία ιστοσελίδα δεν
 * επιτρέπεται να ανοίξει τις ρυθμίσεις του κινητού ή του browser. Το
 * απαγορεύουν Apple και Google επίτηδες — αλλιώς κάθε σελίδα θα μπορούσε να
 * σπρώχνει τον κόσμο σε ρυθμίσεις. Αυτό γίνεται μόνο από εγκατεστημένη
 * εφαρμογή.
 *
 * Άρα το καλύτερο εφικτό είναι δύο πράγματα:
 *  1. Το «Ξαναδοκίμασε» ζητάει ξανά άδεια. Αν ο browser είναι διατεθειμένος να
 *     ρωτήσει, εμφανίζεται εκείνη τη στιγμή το κανονικό παράθυρο «Να
 *     επιτρέπεται;» — χωρίς να χρειαστεί ο χρήστης να κάνει τίποτα άλλο.
 *  2. Αν έχει ήδη αρνηθεί μόνιμα, ο browser ΔΕΝ ξαναρωτάει ποτέ. Τότε δείχνουμε
 *     τα ακριβή βήματα, αριθμημένα, και το «Ξαναδοκίμασε» επιβεβαιώνει αμέσως
 *     ότι πέτυχε — χωρίς να ξαναρχίσει ο χρήστης την κλήση από την αρχή.
 */

interface PermissionGuideProps {
  failure: MediaFailure;
  /** Ποια συσκευή είναι κλειδωμένη — κάμερα, μικρόφωνο ή και τα δύο. */
  blocked?: BlockedDevice;
  /** Η ωμή ονομασία σφάλματος του browser. Φαίνεται μικρή, κάτω-κάτω. */
  reason?: string;
  /** Καλείται όταν η άδεια δόθηκε τελικά. */
  onGranted: () => void;
  onClose: () => void;
}

export function PermissionGuide({
  failure,
  blocked,
  reason,
  onGranted,
  onClose,
}: PermissionGuideProps) {
  const [current, setCurrent] = useState<MediaFailure>(failure);
  const [currentBlocked, setCurrentBlocked] = useState<BlockedDevice | undefined>(blocked);
  const [currentReason, setCurrentReason] = useState<string | undefined>(reason);
  const [checking, setChecking] = useState(false);
  const [stillBlocked, setStillBlocked] = useState(false);

  const { title, steps } = mediaFailureSteps(current, currentBlocked);

  const retry = async () => {
    setChecking(true);
    setStillBlocked(false);
    const res = await requestMediaAccess();
    setChecking(false);
    if (res.ok) {
      onGranted();
      return;
    }
    setCurrent(res.failure || 'other');
    setCurrentBlocked(res.blocked);
    setCurrentReason(res.reason);
    setStillBlocked(true);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
            📷
          </div>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        </div>

        <ol className="space-y-3">
          {steps.map((step, i) => (
            <li key={step} className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                {i + 1}
              </span>
              <span className="text-sm leading-snug text-gray-700">{step}</span>
            </li>
          ))}
        </ol>

        {stillBlocked && (
          <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Η κάμερα είναι ακόμη κλειστή. Κάνε τα βήματα παραπάνω και ξαναπάτησε.
          </p>
        )}

        {currentReason && (
          <p className="mt-3 text-center text-[11px] text-gray-400">
            Ο browser απαντά: {currentReason}
          </p>
        )}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600"
          >
            Άκυρο
          </button>
          <button
            type="button"
            onClick={retry}
            disabled={checking}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {checking ? 'Έλεγχος…' : 'Ξαναδοκίμασε'}
          </button>
        </div>
      </div>
    </div>
  );
}
