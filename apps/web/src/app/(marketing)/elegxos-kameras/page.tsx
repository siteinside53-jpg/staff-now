'use client';

import { useState } from 'react';
import { API_URL } from '@/lib/config';
import { useT } from '@/i18n/locale-provider';

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
  const t = useT();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const r = (k: string) => t(`cameraCheck.rows.${k}`);

  const run = async () => {
    setRunning(true);
    setCopied(false);
    const out: Row[] = [];

    out.push({
      label: r('secureContext'),
      value: typeof window !== 'undefined' && window.isSecureContext ? r('yes') : r('no'),
      ok: typeof window !== 'undefined' && window.isSecureContext,
    });
    out.push({ label: r('address'), value: typeof location !== 'undefined' ? location.origin : '—' });
    const hasApi = typeof navigator.mediaDevices?.getUserMedia === 'function';
    out.push({ label: r('cameraSupport'), value: hasApi ? r('yes') : r('no'), ok: hasApi });

    // Τι λέει ο browser για το site.
    const perm = async (name: string) => {
      try {
        const p = navigator.permissions as unknown as {
          query?: (d: { name: string }) => Promise<{ state: string }>;
        };
        if (!p?.query) return r('notSupported');
        return (await p.query({ name })).state;
      } catch {
        return r('notSupported');
      }
    };
    out.push({ label: r('permCamera'), value: await perm('camera') });
    out.push({ label: r('permMic'), value: await perm('microphone') });

    // Οι συσκευές που βλέπει ο browser. Κενές ονομασίες = δεν έχει δοθεί άδεια.
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      const cams = devs.filter((d) => d.kind === 'videoinput');
      const mics = devs.filter((d) => d.kind === 'audioinput');
      out.push({ label: r('camerasSeen'), value: String(cams.length), ok: cams.length > 0 });
      out.push({ label: r('micsSeen'), value: String(mics.length), ok: mics.length > 0 });
      out.push({
        label: r('deviceNames'),
        value: cams[0]?.label || mics[0]?.label ? r('visible') : r('hidden'),
      });
    } catch (e) {
      out.push({ label: r('deviceList'), value: `${r('errorPrefix')}: ${(e as Error)?.name || r('unknown')}` });
    }

    // Ξεχωριστά αιτήματα — εδώ φαίνεται ΠΟΙΟ από τα δύο κολλάει και γιατί.
    const tryGet = async (label: string, c: MediaStreamConstraints) => {
      try {
        const s = await navigator.mediaDevices.getUserMedia(c);
        s.getTracks().forEach((t) => t.stop());
        out.push({ label, value: r('ok'), ok: true });
      } catch (e) {
        const err = e as { name?: string; message?: string };
        out.push({
          label,
          value: `${err?.name || r('genericError')} — ${(err?.message || '').slice(0, 60)}`,
          ok: false,
        });
      }
    };
    await tryGet(r('micOnlyTest'), { audio: true });
    await tryGet(r('cameraOnlyTest'), { video: true });
    await tryGet(r('bothTest'), { audio: true, video: true });

    // Ο αναμεταδότης: χωρίς αυτόν, οι κλήσεις από δεδομένα κινητής συχνά δεν
    // ενώνονται ποτέ. Χρειάζεται σύνδεση, γιατί τα στοιχεία είναι προσωπικά και
    // βραχύβια — γι' αυτό το λέμε καθαρά αντί να δείξουμε σφάλμα.
    try {
      const token = localStorage.getItem('staffnow_token');
      if (!token) {
        out.push({ label: r('callRelay'), value: r('needsLogin') });
      } else {
        const res = await fetch(`${API_URL}/calls/ice`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json()) as { data?: { iceServers?: { urls: string | string[] }[] } };
        const list = data?.data?.iceServers || [];
        const flat = list.flatMap((s0) => (Array.isArray(s0.urls) ? s0.urls : [s0.urls]));
        const hasRelay = flat.some((u) => typeof u === 'string' && u.startsWith('turn:'));
        out.push({
          label: r('callRelay'),
          value: hasRelay ? r('relayActive') : r('relayInactive'),
          ok: hasRelay,
        });
        out.push({ label: r('connectionServers'), value: String(flat.length) });
      }
    } catch {
      out.push({ label: r('callRelay'), value: r('serverNoResponse') });
    }

    out.push({ label: r('device'), value: navigator.userAgent.slice(0, 120) });

    setRows(out);
    setRunning(false);
  };

  const copy = async () => {
    if (!rows) return;
    const text = rows.map((row) => `${row.label}: ${row.value}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-extrabold text-gray-900">{t('cameraCheck.title')}</h1>
      <p className="mt-2 text-sm text-gray-600">
        {t('cameraCheck.subtitle')}
      </p>

      <button
        type="button"
        onClick={run}
        disabled={running}
        className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white disabled:opacity-60"
      >
        {running ? t('cameraCheck.running') : t('cameraCheck.start')}
      </button>

      {rows && (
        <>
          <ul className="mt-6 divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
            {rows.map((row) => (
              <li key={row.label} className="flex items-start justify-between gap-3 px-4 py-3">
                <span className="text-sm text-gray-600">{row.label}</span>
                <span
                  className={`text-right text-sm font-semibold ${
                    row.ok === true ? 'text-emerald-600' : row.ok === false ? 'text-red-600' : 'text-gray-900'
                  }`}
                >
                  {row.value}
                </span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={copy}
            className="mt-4 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700"
          >
            {copied ? t('cameraCheck.copied') : t('cameraCheck.copy')}
          </button>
        </>
      )}
    </main>
  );
}
