'use client';

/**
 * «Χρειάζονται την προσοχή σου» — το κουτάκι στην αρχική του πίνακα ελέγχου.
 *
 * Γιατί υπάρχει: μέχρι τώρα η επιβεβαίωση πρόσληψης και η αξιολόγηση ζούσαν
 * ΜΟΝΟ μέσα σε μια συγκεκριμένη συνομιλία. Αν δεν άνοιγες ακριβώς εκείνη τη
 * συνομιλία, δεν έβλεπες ποτέ ότι σε περιμένει κάτι. Εδώ μαζεύονται όλα σε ένα
 * σημείο, με τα κουμπιά πάνω στην κάρτα.
 *
 * Δεν εμφανίζεται καθόλου όταν δεν εκκρεμεί τίποτα — καμία άδεια κάρτα.
 */

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { RatingModal } from '@/components/dashboard/rating-modal';

interface Hire {
  id: string;
  status: 'pending' | 'confirmed' | 'declined' | 'cancelled';
  job_title: string | null;
  worker_name: string | null;
  business_name: string | null;
  rating_opens_at: string | null;
  i_rated: number;
  they_rated: number;
  job_target: number | null;
  job_confirmed: number | null;
}

/** Τι ακριβώς περιμένει τον χρήστη σε αυτή την πρόσληψη. */
type Kind = 'confirm' | 'awaiting' | 'rate' | 'view' | 'waiting-them' | null;

function classify(h: Hire, isWorker: boolean): Kind {
  if (h.status === 'pending') return isWorker ? 'confirm' : 'awaiting';
  if (h.status !== 'confirmed') return null;
  const opensAt = h.rating_opens_at ? Date.parse(h.rating_opens_at) : null;
  const open = opensAt != null && Date.now() >= opensAt;
  if (!open) return null;              // δεν άνοιξε ακόμη — δεν το δείχνουμε
  if (!h.i_rated) return 'rate';
  if (h.they_rated) return 'view';
  return 'waiting-them';
}

export function HireActionsCard({ isWorker }: { isWorker: boolean }) {
  const [hires, setHires] = useState<Hire[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [rating, setRating] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = (await api.hires.list()) as any;
      setHires(res?.data?.hires || []);
    } catch {
      // Σιωπηλά: το κουτάκι είναι βοηθητικό, δεν πρέπει να χαλάει την αρχική.
      setHires([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const answer = async (id: string, ans: 'confirm' | 'decline') => {
    if (busy) return;
    setBusy(id);
    try {
      const res = (await (ans === 'confirm' ? api.hires.confirm(id) : api.hires.decline(id))) as any;
      if (res?.data?.hire) {
        toast.success(ans === 'confirm' ? 'Επιβεβαιώθηκε!' : 'Καταγράφηκε');
        await load();
      } else {
        toast.error(res?.error?.message || 'Σφάλμα');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Σφάλμα σύνδεσης');
    }
    setBusy(null);
  };

  const rows = hires
    .map((h) => ({ h, kind: classify(h, isWorker) }))
    .filter((r): r is { h: Hire; kind: Exclude<Kind, null> } => r.kind !== null);

  if (rows.length === 0) return null;

  const other = (h: Hire) =>
    (isWorker ? h.business_name : h.worker_name) || (isWorker ? 'η επιχείρηση' : 'ο/η εργαζόμενος/η');

  return (
    <>
      <div className="mb-8 rounded-2xl border-2 border-blue-200 bg-blue-50/60 p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xl">🤝</span>
          <h2 className="text-base font-bold text-gray-900">Χρειάζονται την προσοχή σου</h2>
          <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">{rows.length}</span>
        </div>

        <div className="space-y-3">
          {rows.map(({ h, kind }) => {
            const job = h.job_title ? ` για «${h.job_title}»` : '';
            return (
              <div key={h.id} className="rounded-xl border border-gray-200 bg-white p-4">
                {kind === 'confirm' && (
                  <>
                    <p className="text-sm font-semibold text-gray-900">
                      Η {other(h)} δηλώνει ότι σε προσέλαβε{job}.
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Μετράει μόνο αν το επιβεβαιώσεις εσύ.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => answer(h.id, 'confirm')}
                        disabled={busy === h.id}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        ✅ Ναι, ξεκίνησα
                      </button>
                      <button
                        onClick={() => answer(h.id, 'decline')}
                        disabled={busy === h.id}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Όχι, δεν ξεκίνησα
                      </button>
                    </div>
                  </>
                )}

                {kind === 'awaiting' && (
                  <>
                    <p className="text-sm font-semibold text-gray-900">
                      Δήλωσες ότι προσέλαβες {other(h)}{job}.
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Περιμένουμε την επιβεβαίωσή του/της. Μέχρι τότε δεν μετράει στις θέσεις.
                    </p>
                  </>
                )}

                {kind === 'rate' && (
                  <>
                    <p className="text-sm font-semibold text-gray-900">
                      Αξιολόγησε {isWorker ? 'την' : 'τον/την'} {other(h)}{job}.
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Θα δεις τι σου έγραψε μόλις γράψεις τη δική σου.
                    </p>
                    <button
                      onClick={() => setRating({ id: h.id, name: other(h) })}
                      className="mt-3 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-bold text-white hover:bg-yellow-600"
                    >
                      ⭐ Γράψε αξιολόγηση
                    </button>
                  </>
                )}

                {kind === 'view' && (
                  <>
                    <p className="text-sm font-semibold text-gray-900">
                      Ήρθε η αξιολόγηση από {other(h)}{job}.
                    </p>
                    <button
                      onClick={() => setRating({ id: h.id, name: other(h) })}
                      className="mt-3 rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold text-gray-800 hover:bg-gray-50"
                    >
                      ⭐ Δες τις αξιολογήσεις
                    </button>
                  </>
                )}

                {kind === 'waiting-them' && (
                  <>
                    <p className="text-sm font-semibold text-gray-900">
                      Έγραψες την αξιολόγησή σου για {other(h)}{job}.
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Θα εμφανιστεί η δική του/της μόλις τη γράψει.
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {rating && (
        <RatingModal
          hireId={rating.id}
          isWorker={isWorker}
          otherName={rating.name}
          onClose={() => setRating(null)}
          onSaved={load}
        />
      )}
    </>
  );
}
