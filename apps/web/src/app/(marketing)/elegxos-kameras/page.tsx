'use client';

import { useState } from 'react';

/**
 * Σελίδα ελέγχου κάμερας και μικροφώνου.
 *
 * Γιατί υπάρχει: όταν μια κλήση δεν ξεκινάει, οι πιθανές αιτίες είναι πολλές
 * και μοιάζουν ίδιες από έξω — μπλοκαρισμένο site, μπλοκαρισμένος browser στο
 * λειτουργικό, κάμερα πιασμένη από άλλη εφαρμογή, συσκευή χωρίς κάμερα. Αντί να
 * μαντεύουμε από περιγραφές, ο χρήστης ανοίγει αυτή τη σελίδα στο δικό του
 * κινητό και μας δείχνει ΤΙ ακριβώς απαντά η συσκευή του.
 *
 * Δεν στέλνει τίποτα πουθενά: όλα γίνονται μέσα στη συσκευή και φαίνονται στην
 * οθόνη. Το κουμπί αντιγραφής είναι για να μας το στείλει ο ίδιος.
 */

interface Row {
  label: string;
  value: string;
  ok?: boolean;
}

export default function CameraCheckPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const run = async () => {
    setRunning(true);
    setCopied(false);
    const out: Row[] = [];

    out.push({
      label: 'Ασφαλής σύνδεση',
      value: typeof window !== 'undefined' && window.isSecureContext ? 'ναι' : 'ΟΧΙ',
      ok: typeof window !== 'undefined' && window.isSecureContext,
    });
    out.push({ label: 'Διεύθυνση', value: typeof location !== 'undefined' ? location.origin : '—' });
    const hasApi = typeof navigator.mediaDevices?.getUserMedia === 'function';
    out.push({ label: 'Υποστήριξη κάμερας', value: hasApi ? 'ναι' : 'ΟΧΙ', ok: hasApi });

    // Τι λέει ο browser για το site.
    const perm = async (name: string) => {
      try {
        const p = navigator.permissions as unknown as {
          query?: (d: { name: string }) => Promise<{ state: string }>;
        };
        if (!p?.query) return 'δεν υποστηρίζεται';
        return (await p.query({ name })).state;
      } catch {
        return 'δεν υποστηρίζεται';
      }
    };
    out.push({ label: 'Άδεια site: κάμερα', value: await perm('camera') });
    out.push({ label: 'Άδεια site: μικρόφωνο', value: await perm('microphone') });

    // Οι συσκευές που βλέπει ο browser. Κενές ονομασίες = δεν έχει δοθεί άδεια.
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      const cams = devs.filter((d) => d.kind === 'videoinput');
      const mics = devs.filter((d) => d.kind === 'audioinput');
      out.push({ label: 'Κάμερες που βλέπει', value: String(cams.length), ok: cams.length > 0 });
      out.push({ label: 'Μικρόφωνα που βλέπει', value: String(mics.length), ok: mics.length > 0 });
      out.push({
        label: 'Ονομασίες συσκευών',
        value: cams[0]?.label || mics[0]?.label ? 'ορατές' : 'κρυμμένες (χωρίς άδεια)',
      });
    } catch (e) {
      out.push({ label: 'Λίστα συσκευών', value: `σφάλμα: ${(e as Error)?.name || 'άγνωστο'}` });
    }

    // Ξεχωριστά αιτήματα — εδώ φαίνεται ΠΟΙΟ από τα δύο κολλάει και γιατί.
    const tryGet = async (label: string, c: MediaStreamConstraints) => {
      try {
        const s = await navigator.mediaDevices.getUserMedia(c);
        s.getTracks().forEach((t) => t.stop());
        out.push({ label, value: 'ΟΚ', ok: true });
      } catch (e) {
        const err = e as { name?: string; message?: string };
        out.push({
          label,
          value: `${err?.name || 'σφάλμα'} — ${(err?.message || '').slice(0, 60)}`,
          ok: false,
        });
      }
    };
    await tryGet('Δοκιμή μόνο μικροφώνου', { audio: true });
    await tryGet('Δοκιμή μόνο κάμερας', { video: true });
    await tryGet('Δοκιμή και των δύο', { audio: true, video: true });

    out.push({ label: 'Συσκευή', value: navigator.userAgent.slice(0, 120) });

    setRows(out);
    setRunning(false);
  };

  const copy = async () => {
    if (!rows) return;
    const text = rows.map((r) => `${r.label}: ${r.value}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-extrabold text-gray-900">Έλεγχος κάμερας και μικροφώνου</h1>
      <p className="mt-2 text-sm text-gray-600">
        Αν μια βιντεοκλήση δεν ξεκινάει, πάτα το κουμπί. Ο έλεγχος γίνεται μέσα στη συσκευή σου —
        δεν αποθηκεύεται και δεν στέλνεται τίποτα.
      </p>

      <button
        type="button"
        onClick={run}
        disabled={running}
        className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white disabled:opacity-60"
      >
        {running ? 'Γίνεται έλεγχος…' : 'Ξεκίνα τον έλεγχο'}
      </button>

      {rows && (
        <>
          <ul className="mt-6 divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
            {rows.map((r) => (
              <li key={r.label} className="flex items-start justify-between gap-3 px-4 py-3">
                <span className="text-sm text-gray-600">{r.label}</span>
                <span
                  className={`text-right text-sm font-semibold ${
                    r.ok === true ? 'text-emerald-600' : r.ok === false ? 'text-red-600' : 'text-gray-900'
                  }`}
                >
                  {r.value}
                </span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={copy}
            className="mt-4 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700"
          >
            {copied ? 'Αντιγράφηκε ✓' : 'Αντιγραφή αποτελεσμάτων'}
          </button>
        </>
      )}
    </main>
  );
}
