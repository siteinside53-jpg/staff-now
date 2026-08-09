'use client';

/**
 * Η κάρτα διπλής επαλήθευσης στο /admin/settings.
 *
 * Δύο σχεδιαστικές αποφάσεις που αξίζει να εξηγηθούν:
 *
 * 1. **Δεν υπάρχει κωδικός QR.** Δεν υπάρχει βιβλιοθήκη QR στο έργο, και το να
 *    γραφτεί με το χέρι είναι 500 γραμμές μαθηματικών χωρίς δίχτυ — αν βγει
 *    λάθος, το QR κωδικοποιεί σιωπηλά ΑΛΛΟ μυστικό και ο ιδιοκτήτης κλειδώνεται
 *    έξω. Αντ' αυτού δίνουμε το κλειδί σε ομάδες των 4 (κάθε εφαρμογή έχει
 *    «Εισαγωγή κλειδιού») και τον πλήρη σύνδεσμο `otpauth://` ως πατήσιμο link:
 *    από κινητό, ένα πάτημα και το κλειδί περνάει μόνο του.
 *
 * 2. **Αν το `GET /auth/2fa/status` αποτύχει, η κάρτα λέει «Μη διαθέσιμο»**
 *    αντί να σπάσει η σελίδα. Έτσι ένα ανέβασμα με λάθος σειρά (σελίδα πριν
 *    τον server) είναι καλλωπιστικό πρόβλημα, όχι χαλασμένη οθόνη.
 */

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface Status {
  enabled: boolean;
  enabledAt: string | null;
  recoveryCodesLeft: number;
  recoveryCodesTotal: number;
  serverTime: string;
}

/** `ABCD EFGH IJKL …` — έτσι αντιγράφεται χωρίς λάθη. */
function groupSecret(secret: string): string {
  return secret.replace(/(.{4})/g, '$1 ').trim();
}

function downloadCodes(codes: string[]) {
  const body = [
    'StaffNow — κωδικοί ανάκτησης διπλής επαλήθευσης',
    `Δημιουργήθηκαν: ${new Date().toLocaleString('el-GR')}`,
    '',
    'Κάθε κωδικός δουλεύει ΜΙΑ φορά, στη θέση του 6ψήφιου.',
    'Φύλαξέ τους κάπου εκτός υπολογιστή (εκτύπωση ή διαχειριστή κωδικών).',
    '',
    ...codes,
    '',
  ].join('\n');
  const url = URL.createObjectURL(new Blob([body], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'staffnow-recovery-codes.txt';
  a.click();
  URL.revokeObjectURL(url);
}

export function TwoFactorCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [busy, setBusy] = useState(false);

  // Στήσιμο
  const [setupSecret, setSetupSecret] = useState('');
  const [setupUri, setSetupUri] = useState('');
  const [setupServerTime, setSetupServerTime] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');

  // Οι 10 κωδικοί — φαίνονται ΜΙΑ φορά, εδώ
  const [freshCodes, setFreshCodes] = useState<string[] | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.auth.twoFactorStatus();
      if (res.success && res.data) {
        setStatus(res.data as Status);
        setUnavailable(false);
      } else {
        setUnavailable(true);
      }
    } catch {
      setUnavailable(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForms = () => {
    setSetupSecret('');
    setSetupUri('');
    setSetupServerTime('');
    setPassword('');
    setCode('');
  };

  const handleSetup = async () => {
    if (!password) return toast.error('Γράψε τον κωδικό σου.');
    setBusy(true);
    try {
      const res = await api.auth.twoFactorSetup({ password });
      const data = res.data as { secret: string; otpauthUri: string; serverTime: string };
      setSetupSecret(data.secret);
      setSetupUri(data.otpauthUri);
      setSetupServerTime(data.serverTime);
      setPassword('');
    } catch (err: any) {
      toast.error(err?.message || 'Αποτυχία.');
    } finally {
      setBusy(false);
    }
  };

  const handleEnable = async () => {
    if (code.length !== 6) return toast.error('Ο κωδικός είναι 6 ψηφία.');
    setBusy(true);
    try {
      const res = await api.auth.twoFactorEnable({ code });
      const data = res.data as { recoveryCodes: string[] };
      setFreshCodes(data.recoveryCodes);
      resetForms();
      await load();
      toast.success('Η διπλή επαλήθευση ενεργοποιήθηκε.');
    } catch (err: any) {
      toast.error(err?.message || 'Ο κωδικός δεν είναι σωστός.');
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    if (!password || !code) return toast.error('Χρειάζονται και ο κωδικός σου και ο κωδικός επαλήθευσης.');
    setBusy(true);
    try {
      await api.auth.twoFactorDisable({ password, code });
      resetForms();
      setFreshCodes(null);
      await load();
      toast.success('Η διπλή επαλήθευση απενεργοποιήθηκε.');
    } catch (err: any) {
      toast.error(err?.message || 'Αποτυχία.');
    } finally {
      setBusy(false);
    }
  };

  const handleRegenerate = async () => {
    if (!password || !code) return toast.error('Χρειάζονται και ο κωδικός σου και ο κωδικός επαλήθευσης.');
    setBusy(true);
    try {
      const res = await api.auth.twoFactorRegenerateRecoveryCodes({ password, code });
      const data = res.data as { recoveryCodes: string[] };
      setFreshCodes(data.recoveryCodes);
      resetForms();
      await load();
      toast.success('Νέοι κωδικοί ανάκτησης. Οι παλιοί δεν ισχύουν πια.');
    } catch (err: any) {
      toast.error(err?.message || 'Αποτυχία.');
    } finally {
      setBusy(false);
    }
  };

  const handleRevokeOthers = async () => {
    setBusy(true);
    try {
      const res = await api.auth.revokeOtherSessions();
      const data = res.data as { token?: string };
      // Ο server δίνει αμέσως καινούριο κλειδί στην τρέχουσα καρτέλα, ώστε
      // αυτός που πάτησε το κουμπί να μη βρεθεί ο ίδιος έξω.
      if (data?.token) localStorage.setItem('staffnow_token', data.token);
      toast.success('Όλες οι άλλες συσκευές αποσυνδέθηκαν.');
    } catch (err: any) {
      toast.error(err?.message || 'Αποτυχία.');
    } finally {
      setBusy(false);
    }
  };

  if (unavailable) {
    return (
      <Shell>
        <p className="text-sm text-gray-500">
          Μη διαθέσιμο αυτή τη στιγμή. Δοκίμασε ξανά μετά από ανανέωση της σελίδας.
        </p>
      </Shell>
    );
  }

  if (!status) {
    return (
      <Shell>
        <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
      </Shell>
    );
  }

  return (
    <Shell>
      {/* Κατάσταση */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
            status.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${status.enabled ? 'bg-emerald-600' : 'bg-amber-600'}`} />
          {status.enabled ? 'Ενεργή' : 'Ανενεργή'}
        </span>
        {status.enabled && (
          <span className="text-xs text-gray-500">
            Κωδικοί ανάκτησης: <strong>{status.recoveryCodesLeft}</strong> από {status.recoveryCodesTotal} διαθέσιμοι
          </span>
        )}
        <span className="text-xs text-gray-400">
          Ώρα server: {new Date(status.serverTime).toLocaleTimeString('el-GR')}
        </span>
      </div>

      {/* Οι 10 κωδικοί — φαίνονται ΜΙΑ φορά */}
      {freshCodes && (
        <div className="mb-5 rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
          <p className="mb-2 text-sm font-bold text-amber-900">
            Αποθήκευσέ τους τώρα — δεν θα ξαναφανούν ποτέ.
          </p>
          <div className="mb-3 grid grid-cols-2 gap-1.5 font-mono text-sm text-gray-800 sm:grid-cols-2">
            {freshCodes.map((c) => (
              <div key={c} className="rounded bg-white px-2 py-1 text-center">{c}</div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => downloadCodes(freshCodes)}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
            >
              Κατέβασμα σε αρχείο
            </button>
            <button
              onClick={() => setFreshCodes(null)}
              className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100"
            >
              Τους αποθήκευσα
            </button>
          </div>
        </div>
      )}

      {/* ── ΑΝΕΝΕΡΓΗ: ο οδηγός των 3 βημάτων ── */}
      {!status.enabled && !setupSecret && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            <strong>Βήμα 1.</strong> Γράψε τον κωδικό σου για να ξεκινήσει το στήσιμο. Τίποτα
            δεν αλλάζει στη σύνδεση μέχρι να ολοκληρωθεί και το βήμα 3.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ο κωδικός σου"
              autoComplete="current-password"
              className="w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={handleSetup}
              disabled={busy}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Έναρξη
            </button>
          </div>
        </div>
      )}

      {/* ── ΣΤΗΣΙΜΟ: το κλειδί + η επιβεβαίωση ── */}
      {!status.enabled && setupSecret && (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm text-gray-600">
              <strong>Βήμα 2.</strong> Άνοιξε την εφαρμογή στο κινητό (Google Authenticator, ή τον
              διαχειριστή κωδικών σου), διάλεξε «Εισαγωγή κλειδιού» και γράψε αυτό:
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-lg bg-gray-100 px-3 py-2 font-mono text-sm tracking-wider text-gray-900">
                {groupSecret(setupSecret)}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(setupSecret);
                  toast.success('Αντιγράφηκε.');
                }}
                className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Αντιγραφή
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Αν διαβάζεις αυτή τη σελίδα από το κινητό, πάτα{' '}
              <a href={setupUri} className="font-semibold text-blue-600 underline">
                αυτόν τον σύνδεσμο
              </a>{' '}
              και το κλειδί περνάει μόνο του, χωρίς πληκτρολόγηση.
            </p>
            {setupServerTime && (
              <p className="mt-1 text-xs text-gray-400">
                Ώρα server τη στιγμή του στησίματος:{' '}
                {new Date(setupServerTime).toLocaleTimeString('el-GR')} — αν το ρολόι του κινητού
                διαφέρει πολύ, βάλ' το σε «αυτόματη ώρα».
              </p>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm text-gray-600">
              <strong>Βήμα 3.</strong> Γράψε τον 6ψήφιο που δείχνει τώρα η εφαρμογή. Μόνο αν
              είναι σωστός ενεργοποιείται.
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-center font-mono text-lg tracking-[0.3em] focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={handleEnable}
                disabled={busy}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Ενεργοποίηση
              </button>
              <button
                onClick={resetForms}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
              >
                Ακύρωση
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ΕΝΕΡΓΗ: διαχείριση ── */}
      {status.enabled && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Για τις παρακάτω ενέργειες χρειάζονται και ο κωδικός σου και ένας κωδικός
            επαλήθευσης (6ψήφιος από την εφαρμογή ή κωδικός ανάκτησης).
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ο κωδικός σου"
              autoComplete="current-password"
              className="w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <input
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="6ψήφιος ή ανάκτησης"
              className="w-48 rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleRegenerate}
              disabled={busy}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Νέοι κωδικοί ανάκτησης
            </button>
            <button
              onClick={handleDisable}
              disabled={busy}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Απενεργοποίηση
            </button>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <button
              onClick={handleRevokeOthers}
              disabled={busy}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Αποσύνδεση από όλες τις άλλες συσκευές
            </button>
            <p className="mt-1.5 text-xs text-gray-500">
              Η τρέχουσα καρτέλα παραμένει συνδεδεμένη. Κάθε άλλη συσκευή θα πρέπει να συνδεθεί
              ξανά — και πλέον θα περάσει από τη διπλή επαλήθευση.
            </p>
          </div>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
          <span>🔐</span> Διπλή επαλήθευση (2FA)
        </h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Δεύτερο εμπόδιο στη σύνδεση του λογαριασμού σου: ένας 6ψήφιος κωδικός που παράγεται
          στο κινητό σου και αλλάζει κάθε 30 δευτερόλεπτα. Δεν επηρεάζει τους άλλους χρήστες.
        </p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">{children}</div>
    </section>
  );
}
