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

/**
 * Το μικρό όνομα σε αιτιατική, για να χωρέσει μέσα στην ερώτηση.
 *
 * Χωρίς αυτό θα έβγαινε «Προσέλαβες τον Ευγένιος;» — που δεν το λέει κανείς.
 * Ο κανόνας είναι ο απλός κανόνας των ελληνικών μικρών ονομάτων:
 *   τελειώνει σε -ς        → αρσενικό, φεύγει το -ς   (Ευγένιος → τον Ευγένιο)
 *   τελειώνει σε -α -η -ω  → θηλυκό, μένει ίδιο       (Αθανασία → την Αθανασία)
 *
 * Ό,τι δεν πέφτει καθαρά σε αυτά τα δύο — ξενόγλωσσα ονόματα («Ana»), ή
 * ελληνογραμμένα που δεν κλίνονται («Αρντίτ», «Ομάρ») — γυρίζει null και η
 * κάρτα ξαναγράφει το ουδέτερο «Τον/την προσέλαβες;».
 * Προτιμώ να μη γράψω όνομα, παρά να το γράψω λάθος.
 *
 * Χρησιμοποιείται ΜΟΝΟ στη μεριά της επιχείρησης: εκεί ο άλλος είναι πάντα
 * εργαζόμενος, δηλαδή άνθρωπος. Στη μεριά του εργαζομένου ο άλλος είναι
 * επιχείρηση («Ουζερί Το Στέκι») και η πρόταση δεν παίρνει καθόλου όνομα.
 */
function accusative(fullName: string): { phrase: string; clitic: string } | null {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const name = parts[0] || '';
  if (name.length < 2) return null;
  const lower = name.toLowerCase();

  if (lower.endsWith('ς')) {
    return { phrase: `τον ${name.slice(0, -1)}`, clitic: 'τον' };
  }
  if (['α', 'ά', 'η', 'ή', 'ω', 'ώ', 'ου', 'ού'].some((e) => lower.endsWith(e))) {
    // Πολλοί γράφουν ΕΠΩΝΥΜΟ πρώτα. Το «Βούλκογλου Δημήτρης» έβγαζε «τη
    // Βούλκογλου» — λάθος γένος σε άντρα. Το είδα σε αληθινό όνομα της βάσης.
    // Αν λοιπόν κάποιο άλλο κομμάτι είναι φανερά αντρικό, σταματάω εδώ.
    if (parts.slice(1).some(looksMale)) return null;
    return { phrase: `${femArticle(lower)} ${name}`, clitic: 'την' };
  }
  return null;
}

/**
 * «Δημήτρης», «Παπαδόπουλος», «Κώστας» → αντρικό.
 * Το «-ους» εξαιρείται επίτηδες: είναι γυναικείο επώνυμο σε γενική
 * («Κυριακή Χαραλάμπους»), και χωρίς την εξαίρεση θα την έλεγα άντρα.
 */
function looksMale(part: string): boolean {
  const l = part.toLowerCase();
  if (l.endsWith('ους')) return false;
  return /(?:ος|ός|ης|ής|ας|άς)$/.test(l);
}

/**
 * Το τελικό -ν του «την» κρατιέται μόνο πριν από φωνήεν, πριν από κ/π/τ/ξ/ψ
 * και πριν από μπ/ντ/γκ/τσ/τζ. Αλλιώς πέφτει: «τη Μαρία», αλλά «την Κατερίνα».
 */
function femArticle(lower: string): string {
  const first = lower.charAt(0);
  const keepsNu =
    'αεηιουωάέήίόύώϊϋ'.includes(first) ||
    'κπτξψ'.includes(first) ||
    ['μπ', 'ντ', 'γκ', 'τσ', 'τζ'].includes(lower.slice(0, 2));
  return keepsNu ? 'την' : 'τη';
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
          // Μόνο η επιχείρηση ονομάζει τον άλλον μέσα στην πρόταση.
          const acc = isWorker ? null : accusative(p.otherName);
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
                {isWorker
                  ? 'Σε προσέλαβαν;'
                  : acc
                    ? `Προσέλαβες ${acc.phrase};`
                    : 'Τον/την προσέλαβες;'}
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
                  {isWorker
                    ? '✅ Ναι, με προσέλαβαν'
                    : acc
                      ? `✅ Ναι, ${acc.clitic} προσέλαβα`
                      : '✅ Ναι, τον/την προσέλαβα'}
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
