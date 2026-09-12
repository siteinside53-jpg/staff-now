'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useT } from '@/i18n/locale-provider';

/**
 * Επαλήθευση κινητού — ΕΝΑ μπλοκ, κοινό για εργαζόμενους και επιχειρήσεις.
 *
 * ΓΙΑΤΙ ΦΤΙΑΧΤΗΚΕ: η σελίδα επαλήθευσης της ΕΠΙΧΕΙΡΗΣΗΣ δεν είχε καθόλου βήμα
 * κινητού. Το ταμπλό του TaskNow όμως έδειχνε «○ Κινητό» με κουμπί «Επαλήθευσε
 * το κινητό →» που οδηγούσε ακριβώς εκεί. Αν η επιχείρηση ήταν ήδη
 * επαληθευμένη, έβλεπε μόνο το πράσινο «είσαι επαληθευμένη» — δηλαδή το κουμπί
 * κατέληγε σε αδιέξοδο και το «○ Κινητό» δεν γινόταν ✓ ποτέ.
 *
 * ΕΙΛΙΚΡΙΝΕΙΑ: όταν δεν υπάρχει πάροχος SMS, ΔΕΝ λέμε ότι στείλαμε κωδικό και
 * ΔΕΝ βάζουμε ✓. Το νούμερο μένει «δηλωμένο» — ίδια λογική με την άδεια στο
 * TaskNow. Σήμα επαλήθευσης μπαίνει μόνο όταν ο έλεγχος έχει όντως γίνει.
 */
export function PhoneVerification({
  phone: initialPhone,
  phoneConfirmed,
  smsAvailable,
  emailConfirmed,
  onConfirmed,
}: {
  phone: string;
  phoneConfirmed: boolean;
  smsAvailable: boolean;
  emailConfirmed: boolean;
  onConfirmed?: () => void;
}) {
  const t = useT();
  const [phone, setPhone] = useState(initialPhone || '');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmed, setConfirmed] = useState(phoneConfirmed);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const inputClass =
    'w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

  if (confirmed) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-semibold text-emerald-900">{t('phoneVerification.confirmed')}</p>
        {phone && <p className="mt-1 text-xs text-emerald-800">{phone}</p>}
      </div>
    );
  }

  async function send() {
    const clean = phone.replace(/\s+/g, '');
    if (!/^69\d{8}$/.test(clean)) {
      setErr(t('phoneVerification.invalidPhone'));
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const res: any = await (api as any).auth.sendPhoneCode({ phone: clean });
      const d = res?.data || {};
      if (d.smsAvailable === false) {
        // Δεν στάλθηκε τίποτα και δεν το κρύβουμε.
        setSaved(true);
        setSent(false);
      } else {
        setSent(true);
      }
    } catch (e: any) {
      setErr(e?.message || t('phoneVerification.codeNotSent'));
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    // Ο κωδικός του server είναι ΕΞΑΨΗΦΙΟΣ.
    if (!/^\d{6}$/.test(code.trim())) {
      setErr(t('phoneVerification.code6'));
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      await (api as any).auth.confirmPhone({ code: code.trim() });
      setConfirmed(true);
      onConfirmed?.();
    } catch (e: any) {
      setErr(e?.message || t('phoneVerification.wrongCode'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm font-bold text-gray-900">{t('phoneVerification.title')}</p>
      <p className="mt-0.5 text-xs text-gray-500">
        {t('phoneVerification.subtitle')}
      </p>

      {!emailConfirmed && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
          {t('phoneVerification.emailFirst')}
        </p>
      )}

      {saved ? (
        <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2.5 text-xs leading-relaxed text-gray-600">
          {t('phoneVerification.savedPrefix')} <strong>{phone}</strong> {t('phoneVerification.savedMiddle')}{' '}
          <strong>{t('phoneVerification.declared')}</strong> {t('phoneVerification.savedSuffix')}
        </p>
      ) : sent ? (
        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-gray-900">{t('phoneVerification.codeLabel')}</span>
            <span className="mt-0.5 block text-xs text-gray-500">
              {t('phoneVerification.sentTo', { phone: phone.replace(/\s+/g, '') })}
            </span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className={`mt-1.5 ${inputClass} text-center text-lg tracking-[0.4em]`}
            />
          </label>

          {err && <p className="text-xs font-medium text-red-600">{err}</p>}

          <button
            type="button"
            onClick={() => void confirm()}
            disabled={busy}
            className="w-full rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? t('phoneVerification.checking') : t('phoneVerification.confirm')}
          </button>
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setCode('');
              setErr(null);
            }}
            className="w-full text-center text-xs font-medium text-gray-500 hover:text-gray-700"
          >
            {t('phoneVerification.changeNumber')}
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setErr(null);
            }}
            placeholder="69XXXXXXXX"
            aria-label={t('phoneVerification.phoneAria')}
            className={inputClass}
          />

          {err && <p className="text-xs font-medium text-red-600">{err}</p>}

          <button
            type="button"
            onClick={() => void send()}
            disabled={busy || !emailConfirmed}
            className="w-full rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? t('phoneVerification.sending') : smsAvailable ? t('phoneVerification.sendCode') : t('phoneVerification.registerPhone')}
          </button>

          {!smsAvailable && (
            <p className="rounded-lg bg-gray-50 px-3 py-2.5 text-xs leading-relaxed text-gray-600">
              {t('phoneVerification.noSmsPrefix')} <strong>{t('phoneVerification.declared')}</strong>{' '}
              {t('phoneVerification.noSmsSuffix')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
