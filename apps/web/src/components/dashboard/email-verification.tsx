'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

/**
 * Επαλήθευση email — ξεχωριστό μπλοκ, δίπλα σε αυτό του κινητού.
 *
 * ΓΙΑΤΙ ΦΤΙΑΧΤΗΚΕ: το μπλοκ του κινητού έλεγε «επιβεβαίωσε πρώτα το email σου»
 * — σωστά, γιατί αυτό απαιτεί ο server — αλλά πουθενά στη σελίδα δεν υπήρχε
 * τρόπος να γίνει. Ο χρήστης διάβαζε τι του λείπει και δεν είχε κουμπί να το
 * κάνει. Ακριβώς το ίδιο αδιέξοδο με το κουμπί «Επαλήθευσε το κινητό» που
 * οδηγούσε σε σελίδα χωρίς κινητό.
 *
 * Ο κωδικός είναι ΕΞΑΨΗΦΙΟΣ, όπως και του κινητού.
 */
export function EmailVerification({
  email,
  emailConfirmed,
  onConfirmed,
}: {
  email: string;
  emailConfirmed: boolean;
  onConfirmed?: () => void;
}) {
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [confirmed, setConfirmed] = useState(emailConfirmed);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const inputClass =
    'w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

  if (confirmed) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-semibold text-emerald-900">✓ Το email σου είναι επιβεβαιωμένο</p>
        {email && <p className="mt-1 text-xs text-emerald-800">{email}</p>}
      </div>
    );
  }

  async function send() {
    setErr(null);
    setBusy(true);
    try {
      await (api as any).auth.sendEmailCode();
      setSent(true);
    } catch (e: any) {
      setErr(e?.message || 'Δεν στάλθηκε το email. Δοκίμασε ξανά.');
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!/^\d{6}$/.test(code.trim())) {
      setErr('Ο κωδικός είναι 6 ψηφία.');
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      await (api as any).auth.confirmEmail({ code: code.trim() });
      setConfirmed(true);
      onConfirmed?.();
    } catch (e: any) {
      setErr(e?.message || 'Λάθος κωδικός.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm font-bold text-gray-900">Επαλήθευση email</p>
      <p className="mt-0.5 text-xs text-gray-500">
        Χρειάζεται πριν από την επαλήθευση κινητού. Γίνεται μία φορά.
      </p>
      {email && <p className="mt-1.5 text-xs font-medium text-gray-700">{email}</p>}

      {sent ? (
        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-gray-900">Ο κωδικός που έλαβες</span>
            <span className="mt-0.5 block text-xs text-gray-500">
              Στάλθηκε στο {email}. Κοίτα και τα ανεπιθύμητα.
            </span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              aria-label="Κωδικός email"
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
            {busy ? 'Ελέγχουμε…' : 'Επιβεβαίωση email'}
          </button>
          <button
            type="button"
            onClick={() => void send()}
            disabled={busy}
            className="w-full text-center text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-60"
          >
            Ξαναστείλε τον κωδικό
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {err && <p className="text-xs font-medium text-red-600">{err}</p>}
          <button
            type="button"
            onClick={() => void send()}
            disabled={busy}
            className="w-full rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Στέλνουμε…' : 'Στείλε μου κωδικό στο email'}
          </button>
        </div>
      )}
    </div>
  );
}
