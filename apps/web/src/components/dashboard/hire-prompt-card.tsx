'use client';

/**
 * «Έγινε πρόσληψη;» — η κάρτα που ρωτάει μόνη της, στην αρχική του πίνακα ελέγχου.
 *
 * Γιατί υπάρχει: η υπάρχουσα κάρτα προσλήψεων (`hire-actions-card.tsx`) δείχνει
 * μόνο προσλήψεις που ΕΧΟΥΝ ήδη δηλωθεί. Δηλαδή δεν μπορεί να ρωτήσει πρώτη.
 * Το κουμπί «Τον/την προσέλαβα» ζούσε θαμμένο στις τρεις τελίτσες μιας
 * συγκεκριμένης συνομιλίας — αν δεν άνοιγες ακριβώς εκείνη, δεν το έβλεπες ποτέ.
 *
 * Εδώ μαζεύονται όλες οι συνομιλίες που «περιμένουν απάντηση» (2+ μέρες σιωπή,
 * μίλησαν και οι δύο, καμία δηλωμένη πρόσληψη). Ο server αποφασίζει ποιες —
 * η οθόνη απλώς τις δείχνει.
 *
 * Δεν εμφανίζεται καθόλου όταν δεν εκκρεμεί τίποτα.
 */

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface Prompt {
  conversationId: string;
  otherId: string;
  otherName: string;
  otherAvatar: string | null;
  jobId: string | null;
  jobTitle: string | null;
  lastMessageAt: string | null;
  snoozeCount: number;
}

export function HirePromptCard({ isWorker }: { isWorker: boolean }) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = (await api.hires.prompts()) as any;
      setPrompts(res?.data?.prompts || []);
    } catch {
      // Σιωπηλά: η κάρτα είναι βοηθητική, δεν πρέπει να χαλάει την αρχική.
      setPrompts([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const declare = async (p: Prompt) => {
    if (busy) return;
    setBusy(p.conversationId);
    try {
      const res = (await api.hires.create({
        conversationId: p.conversationId,
        jobId: p.jobId || undefined,
      })) as any;
      if (res?.data?.hire) {
        toast.success(
          isWorker
            ? 'Καταγράφηκε! Περιμένουμε την επιβεβαίωση της επιχείρησης.'
            : 'Καταγράφηκε! Περιμένουμε την επιβεβαίωσή του/της.',
        );
      } else {
        toast.error(res?.error?.message || 'Σφάλμα');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Σφάλμα σύνδεσης');
    }
    // Είτε πέτυχε είτε το πρόλαβε η άλλη πλευρά, η γραμμή φεύγει από την κάρτα.
    await load();
    setBusy(null);
  };

  const snooze = async (p: Prompt) => {
    if (busy) return;
    setBusy(p.conversationId);
    try {
      const res = (await api.hires.snoozePrompt(p.conversationId)) as any;
      const d = res?.data;
      if (d) {
        toast.success(d.stopped ? 'Εντάξει, δεν θα ξαναρωτήσουμε.' : `Θα ξαναρωτήσουμε σε ${d.days} μέρες.`);
      } else {
        toast.error(res?.error?.message || 'Σφάλμα');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Σφάλμα σύνδεσης');
    }
    await load();
    setBusy(null);
  };

  if (prompts.length === 0) return null;

  return (
    <div className="mb-8 rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 p-5">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-xl">🤝</span>
        <h2 className="text-base font-bold text-gray-900">Έγινε πρόσληψη;</h2>
        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">
          {prompts.length}
        </span>
      </div>
      <p className="mb-4 text-xs text-gray-600">
        {prompts.length === 1
          ? '1 συνομιλία περιμένει απάντηση.'
          : `${prompts.length} συνομιλίες περιμένουν απάντηση.`}
      </p>

      <div className="space-y-3">
        {prompts.map((p) => {
          const job = p.jobTitle ? ` για «${p.jobTitle}»` : '';
          return (
            <div key={p.conversationId} className="rounded-xl border border-gray-200 bg-white p-4">
              {/*
                Το όνομα μπαίνει σε ΔΙΚΗ ΤΟΥ γραμμή, χωρίς άρθρο μπροστά. Αν το
                έβαζα μέσα στην πρόταση («Σε προσέλαβε η …») θα έβγαινε λάθος σε
                ονόματα σαν «Ουζερί Το Στέκι» ή «Καφέ Ο Μήτσος».
              */}
              <p className="text-sm font-bold text-gray-900">
                {p.otherName}
                {job}
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {isWorker ? 'Σε προσέλαβαν;' : 'Τον/την προσέλαβες;'}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                {isWorker
                  ? 'Δήλωσέ το — μετράει στο προφίλ σου και ανοίγει η αξιολόγηση.'
                  : 'Δήλωσέ το για να κλείσει η θέση και να ανοίξει η αξιολόγηση.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => declare(p)}
                  disabled={busy === p.conversationId}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isWorker ? '✅ Ναι, με προσέλαβαν' : '✅ Ναι, τον/την προσέλαβα'}
                </button>
                <button
                  onClick={() => snooze(p)}
                  disabled={busy === p.conversationId}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Όχι ακόμη
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
