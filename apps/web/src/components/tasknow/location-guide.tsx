'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/i18n/locale-provider';

type TFn = ReturnType<typeof useT>;

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

function stepsFor(reason: Reason, t: TFn): { title: string; steps: string[]; note?: string } {
  const dev = detect();
  const noReask = t('tasknow.guide.noReask');

  if (reason === 'timeout') {
    return {
      title: t('tasknow.guide.timeoutTitle'),
      steps: [t('tasknow.guide.timeoutStep1'), t('tasknow.guide.timeoutStep2')],
      note: t('tasknow.guide.timeoutNote'),
    };
  }

  if (reason === 'unavailable') {
    if (dev === 'mac-safari' || dev === 'chrome' || dev === 'other') {
      return {
        title: t('tasknow.guide.pcTitle'),
        steps: [
          t('tasknow.guide.pcStep1'),
          t('tasknow.guide.pcStep2'),
          t('tasknow.guide.pcStep3'),
          t('tasknow.guide.pcStep4'),
        ],
        note: t('tasknow.guide.pcNote'),
      };
    }
    return {
      title: t('tasknow.guide.deviceTitle'),
      steps: [t('tasknow.guide.deviceStep1'), t('tasknow.guide.deviceStep2')],
    };
  }

  // reason === 'denied'
  switch (dev) {
    case 'ios':
      return {
        title: t('tasknow.guide.iosTitle'),
        steps: [
          t('tasknow.guide.iosStep1'),
          t('tasknow.guide.iosStep2'),
          t('tasknow.guide.iosStep3'),
          t('tasknow.guide.iosStep4'),
        ],
        note: noReask,
      };
    case 'android':
      return {
        title: t('tasknow.guide.androidTitle'),
        steps: [t('tasknow.guide.androidStep1'), t('tasknow.guide.androidStep2'), t('tasknow.guide.androidStep3')],
        note: noReask,
      };
    case 'chrome':
      return {
        title: t('tasknow.guide.chromeTitle'),
        steps: [t('tasknow.guide.chromeStep1'), t('tasknow.guide.chromeStep2'), t('tasknow.guide.chromeStep3')],
        note: noReask,
      };
    default:
      return {
        title: t('tasknow.guide.safariTitle'),
        steps: [
          t('tasknow.guide.safariStep1'),
          t('tasknow.guide.safariStep2'),
          t('tasknow.guide.safariStep3'),
          t('tasknow.guide.safariStep4'),
        ],
        note: noReask,
      };
  }
}

export function LocationGuide({
  reason,
  onRetry,
  onClose,
  onWriteAddress,
}: {
  reason: Reason;
  onRetry: () => void;
  onClose: () => void;
  /** «Γράψε τη διεύθυνσή σου» — η διέξοδος που δεν θέλει καμία άδεια. */
  onWriteAddress?: () => void;
}) {
  const t = useT();
  const { title, steps, note } = stepsFor(reason, t);
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
              {t('tasknow.guide.intro')}
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
            {checking ? t('tasknow.guide.trying') : t('tasknow.guide.fixed')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
          >
            {t('tasknow.guide.pickArea')}
          </button>
        </div>

        {/*
          Η ΔΙΕΞΟΔΟΣ ΠΟΥ ΔΕΝ ΕΞΑΡΤΑΤΑΙ ΑΠΟ ΚΑΜΙΑ ΑΔΕΙΑ.

          Ο οδηγός εξηγούσε πώς να φτιάξεις τις ρυθμίσεις και προσέφερε λίστα με
          γειτονιές. Σε κάποιους όμως — χαρακτηριστικά στο Safari σε Mac — η
          τοποθεσία δεν δίνεται όσες ρυθμίσεις κι αν αλλάξεις. Τότε το μόνο που
          δουλεύει σίγουρα είναι να γράψει ο ίδιος τη διεύθυνσή του, και μέχρι
          τώρα το κουτί αυτό ήταν κρυμμένο ΠΙΣΩ από αυτό εδώ το παράθυρο.
        */}
        {onWriteAddress && (
          <button
            type="button"
            onClick={onWriteAddress}
            className="mt-3 w-full rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            {t('tasknow.guide.writeAddress')}
          </button>
        )}
      </div>
    </div>
  );
}
