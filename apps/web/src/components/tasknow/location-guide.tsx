'use client';

import { useEffect, useState } from 'react';

/**
 * Οδηγός για την άδεια τοποθεσίας.
 *
 * ΓΙΑΤΙ ΧΡΕΙΑΖΕΤΑΙ ΟΔΗΓΟΣ ΚΑΙ ΔΕΝ ΦΤΑΝΕΙ ΝΑ ΞΑΝΑΡΩΤΗΣΟΥΜΕ:
 *
 * Αν ο χρήστης έχει αρνηθεί την τοποθεσία μία φορά, ο browser ΔΕΝ ξαναρωτάει
 * ποτέ — όσες φορές κι αν πατήσει το κουμπί, η απάντηση έρχεται «όχι» ακαριαία,
 * χωρίς παράθυρο. Δεν υπάρχει εντολή που να το παρακάμπτει· είναι σκόπιμος
 * κανόνας των browsers, ώστε μια σελίδα να μη σε βομβαρδίζει.
 *
 * Άρα η μόνη πραγματική βοήθεια είναι να του πούμε ΑΚΡΙΒΩΣ πού να πατήσει. Ένα
 * κόκκινο κειμενάκι δίπλα στο κουμπί δεν διαβάζεται και δεν ακολουθείται.
 *
 * ΤΑ ΒΗΜΑΤΑ ΕΙΝΑΙ ΑΝΑ ΣΥΣΚΕΥΗ, γιατί διαφέρουν εντελώς: στο iPhone είναι στις
 * Ρυθμίσεις του τηλεφώνου, στο Mac υπάρχουν ΔΥΟ επίπεδα (σύστημα και Safari)
 * και το πρώτο είναι η πιο συχνή σιωπηλή αιτία, στο Chrome είναι το εικονίδιο
 * δίπλα στη διεύθυνση.
 */

type Reason = 'denied' | 'unavailable' | 'timeout';

function detect(): 'ios' | 'android' | 'mac-safari' | 'chrome' | 'other' {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua);
  if (isSafari) return 'mac-safari';
  if (/Chrome|Chromium|Edg/.test(ua)) return 'chrome';
  return 'other';
}

function stepsFor(reason: Reason): { title: string; steps: string[]; note?: string } {
  const dev = detect();

  if (reason === 'timeout') {
    return {
      title: 'Άργησε να απαντήσει η συσκευή',
      steps: [
        'Δοκίμασε ξανά — συνήθως πετυχαίνει με τη δεύτερη.',
        'Αν είσαι σε κλειστό χώρο, βγες κοντά σε παράθυρο ή άναψε το WiFi.',
      ],
      note: 'Αν βιάζεσαι, διάλεξε γειτονιά από τη λίστα — δουλεύει το ίδιο καλά.',
    };
  }

  if (reason === 'unavailable') {
    if (dev === 'mac-safari' || dev === 'chrome' || dev === 'other') {
      return {
        title: 'Η τοποθεσία είναι κλειστή στον υπολογιστή',
        steps: [
          'Άνοιξε τις Ρυθμίσεις Συστήματος του Mac.',
          'Πήγαινε «Απόρρητο και ασφάλεια» → «Υπηρεσίες τοποθεσίας».',
          'Ενεργοποίησέ τες, και βάλε ✓ στον browser που χρησιμοποιείς.',
          'Γύρνα εδώ και πάτα ξανά «Κοντά μου».',
        ],
        note: 'Είναι ρύθμιση του υπολογιστή, όχι του site — γι\u2019 αυτό δεν βγαίνει ερώτηση.',
      };
    }
    return {
      title: 'Η συσκευή δεν βρήκε πού είσαι',
      steps: [
        'Έλεγξε ότι η τοποθεσία (GPS) είναι ανοιχτή στη συσκευή.',
        'Δοκίμασε ξανά σε λίγο ή κοντά σε παράθυρο.',
      ],
    };
  }

  // reason === 'denied'
  switch (dev) {
    case 'ios':
      return {
        title: 'Το iPhone δεν μας δίνει την τοποθεσία',
        steps: [
          'Ρυθμίσεις → Απόρρητο και ασφάλεια → Υπηρεσίες τοποθεσίας → ενεργές.',
          'Στην ίδια λίστα βρες το Safari → «Κατά τη χρήση της εφαρμογής».',
          'Ρυθμίσεις → Apps → Safari → Τοποθεσία → «Ερώτηση» ή «Να επιτρέπεται».',
          'Γύρνα εδώ, ανανέωσε τη σελίδα και πάτα ξανά «Κοντά μου».',
        ],
        note: 'Ο browser δεν ξαναρωτάει από μόνος του αφού έχεις πει «όχι» μία φορά.',
      };
    case 'android':
      return {
        title: 'Το κινητό δεν μας δίνει την τοποθεσία',
        steps: [
          'Πάτα το λουκέτο δίπλα στη διεύθυνση, πάνω στη σελίδα.',
          'Άνοιξε «Άδειες» ή «Ρυθμίσεις ιστότοπου» → Τοποθεσία.',
          'Βάλε «Να επιτρέπεται» και ανανέωσε τη σελίδα.',
        ],
        note: 'Ο browser δεν ξαναρωτάει από μόνος του αφού έχεις πει «όχι» μία φορά.',
      };
    case 'chrome':
      return {
        title: 'Ο Chrome δεν μας δίνει την τοποθεσία',
        steps: [
          'Πάτα το εικονίδιο αριστερά από τη διεύθυνση (λουκέτο ή ρυθμιστικά).',
          'Βρες «Τοποθεσία» και βάλε «Να επιτρέπεται».',
          'Ανανέωσε τη σελίδα και πάτα ξανά «Κοντά μου».',
        ],
        note: 'Ο browser δεν ξαναρωτάει από μόνος του αφού έχεις πει «όχι» μία φορά.',
      };
    default:
      return {
        title: 'Το Safari δεν μας δίνει την τοποθεσία',
        steps: [
          'Safari → Ρυθμίσεις → Ιστότοποι → Τοποθεσία.',
          'Βρες το staffnow.gr και βάλε «Να επιτρέπεται».',
          'Αν δεν εμφανίζεται, έλεγξε και: Ρυθμίσεις Συστήματος → Απόρρητο και ασφάλεια → Υπηρεσίες τοποθεσίας → Safari.',
          'Ανανέωσε τη σελίδα και πάτα ξανά «Κοντά μου».',
        ],
        note: 'Ο browser δεν ξαναρωτάει από μόνος του αφού έχεις πει «όχι» μία φορά.',
      };
  }
}

export function LocationGuide({
  reason,
  onRetry,
  onClose,
}: {
  reason: Reason;
  onRetry: () => void;
  onClose: () => void;
}) {
  const { title, steps, note } = stepsFor(reason);
  const [checking, setChecking] = useState(false);

  // Κλείνει με Esc, όπως κάθε παράθυρο του site.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[110] flex items-end justify-center bg-gray-900/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-xl">
            📍
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-bold leading-tight text-gray-900">{title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">
              Χρειαζόμαστε μόνο να δείξουμε τι υπάρχει κοντά σου. Δεν την αποθηκεύουμε
              πουθενά.
            </p>
          </div>
        </div>

        <ol className="mt-4 space-y-2">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed text-gray-700">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-900 text-[11px] font-bold text-white">
                {i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>

        {note && (
          <p className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-500">
            {note}
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setChecking(true);
              onRetry();
              // Ο οδηγός δεν κλείνει μόνος: αν πάλι δεν πετύχει, ο χρήστης
              // πρέπει να ξαναδεί τα βήματα και όχι να μείνει με άδεια οθόνη.
              setTimeout(() => setChecking(false), 1500);
            }}
            disabled={checking}
            className="flex-1 rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
          >
            {checking ? 'Δοκιμάζω…' : 'Το έφτιαξα — δοκίμασε ξανά'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
          >
            Θα διαλέξω γειτονιά
          </button>
        </div>
      </div>
    </div>
  );
}
