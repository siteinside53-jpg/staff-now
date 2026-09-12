'use client';

import { useState } from 'react';
import { Modal, MockNote } from './modal';
import { useT } from '@/i18n/locale-provider';

/**
 * Όροι χρήσης του TaskNow — η «πύλη» πριν την πρώτη χρήση.
 *
 * ΓΙΑΤΙ ΞΕΧΩΡΙΣΤΟΙ ΟΡΟΙ: το TaskNow φέρνει σε επαφή ιδιώτες για αμειβόμενη
 * εργασία. Οι όροι της πλατφόρμας αγγελιών δεν καλύπτουν ούτε τη φορολογική
 * ευθύνη του εκτελεστή, ούτε το ότι δεν είμαστε συμβαλλόμενο μέρος.
 *
 * ΤΙ ΚΡΑΤΑΜΕ (στην πραγματική έκδοση): ποιος αποδέχτηκε, πότε, από ποια
 * διεύθυνση και ΠΟΙΑ ΕΚΔΟΣΗ των όρων. Χωρίς την έκδοση, μια μελλοντική αλλαγή
 * κειμένου κάνει την παλιά αποδοχή άχρηστη ως αποδεικτικό.
 *
 * Σε αυτή τη μακέτα η αποδοχή μένει μόνο στον browser.
 */

export const TASKNOW_TERMS_VERSION = 'v1';
const STORAGE_KEY = 'tasknow_terms_accepted_version';

export function hasAcceptedTaskNowTerms(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === TASKNOW_TERMS_VERSION;
  } catch {
    return false;
  }
}

export function rememberTaskNowTerms() {
  try {
    localStorage.setItem(STORAGE_KEY, TASKNOW_TERMS_VERSION);
  } catch {}
}

export function forgetTaskNowTerms() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

type Section = { titleKey: string; bodyKey: string };

const TASKNOW_TERMS_KEYS: Section[] = [
  { titleKey: 's1t', bodyKey: 's1b' },
  { titleKey: 's2t', bodyKey: 's2b' },
  { titleKey: 's3t', bodyKey: 's3b' },
  { titleKey: 's4t', bodyKey: 's4b' },
  { titleKey: 's5t', bodyKey: 's5b' },
  { titleKey: 's6t', bodyKey: 's6b' },
  { titleKey: 's7t', bodyKey: 's7b' },
  { titleKey: 's8t', bodyKey: 's8b' },
  { titleKey: 's9t', bodyKey: 's9b' },
  { titleKey: 's10t', bodyKey: 's10b' },
  { titleKey: 's11t', bodyKey: 's11b' },
  { titleKey: 's12t', bodyKey: 's12b' },
];

export function TaskNowTermsGate({
  onAccept,
  onClose,
}: {
  onAccept: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState(false);

  function accept() {
    if (!checked) {
      setError(true);
      return;
    }
    rememberTaskNowTerms();
    onAccept();
  }

  return (
    <Modal open onClose={onClose} title={t('tasknow.terms.title')}>
      <p className="text-sm leading-relaxed text-gray-600">
        {t('tasknow.terms.intro')}
      </p>

      <div className="mt-4 max-h-72 space-y-4 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-4">
        {TASKNOW_TERMS_KEYS.map((s) => (
          <section key={s.titleKey}>
            <h3 className="text-sm font-semibold text-gray-900">{t(`tasknow.terms.${s.titleKey}`)}</h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">{t(`tasknow.terms.${s.bodyKey}`)}</p>
          </section>
        ))}
        <p className="border-t border-gray-200 pt-3 text-[11px] text-gray-500">
          {t('tasknow.terms.version', { v: TASKNOW_TERMS_VERSION })}
        </p>
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 px-4 py-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => {
            setChecked(e.target.checked);
            if (e.target.checked) setError(false);
          }}
          className="mt-0.5 h-4 w-4 shrink-0 accent-amber-500"
        />
        <span className="text-xs leading-relaxed text-gray-700">
          {t('tasknow.terms.accept')}
        </span>
      </label>

      {error && (
        <p className="mt-2 text-xs font-medium text-red-600">
          {t('tasknow.terms.acceptError')}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row-reverse">
        <button
          type="button"
          onClick={accept}
          className="flex-1 rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600"
        >
          {t('tasknow.terms.acceptBtn')}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
        >
          {t('tasknow.terms.notNow')}
        </button>
      </div>

      <div className="mt-4">
        <MockNote>
          {t('tasknow.terms.mockNote')}
        </MockNote>
      </div>
    </Modal>
  );
}
