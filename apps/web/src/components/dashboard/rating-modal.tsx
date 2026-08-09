'use client';

/**
 * Βήμα 4 — η αξιολόγηση, διπλά τυφλή.
 *
 * Ανοίγει 15 μέρες μετά την επιβεβαιωμένη πρόσληψη. Ο καθένας βλέπει την
 * αξιολόγηση που πήρε ΜΟΝΟ αφού γράψει τη δική του (ή μετά από 14 μέρες).
 * Ο έλεγχος γίνεται στον server — εδώ απλώς δείχνουμε ό,τι μας στείλει.
 */

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';

// Οι τρεις υποβαθμολογίες αλλάζουν νόημα ανάλογα με το ποιος γράφει.
export const LABELS = {
  worker: ['Οργάνωση', 'Πληρωμή στην ώρα της', 'Επικοινωνία'],
  business: ['Επαγγελματισμός', 'Συνέπεια', 'Επικοινωνία'],
} as const;

function StarPicker({
  value, onChange, size = 'text-3xl',
}: { value: number; onChange: (v: number) => void; size?: string }) {
  return (
    <div className={`flex gap-1 ${size}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} στα 5`}
          onClick={() => onChange(n)}
          className={`leading-none transition-transform hover:scale-110 ${n <= value ? 'text-yellow-400' : 'text-gray-300'}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function ReadOnlyRating({ title, rating, labels }: { title: string; rating: any; labels: readonly string[] }) {
  const full = Math.round(Number(rating.overall) || 0);
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{title}</p>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-lg">
          <span className="text-yellow-400">{'★'.repeat(full)}</span>
          <span className="text-gray-300">{'★'.repeat(Math.max(0, 5 - full))}</span>
        </span>
        <span className="text-xl font-bold text-gray-900">{Number(rating.overall).toFixed(1)}</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[rating.score_a, rating.score_b, rating.score_c].map((v, i) => (
          <div key={labels[i]}>
            <p className="text-[10px] uppercase tracking-wide text-gray-500">{labels[i]}</p>
            <p className="mt-0.5 text-sm font-bold text-gray-900">{v == null ? '—' : Number(v).toFixed(1)}</p>
          </div>
        ))}
      </div>
      {rating.comment && <p className="mt-3 text-sm italic text-gray-700">«{rating.comment}»</p>}
    </div>
  );
}

interface RatingModalProps {
  hireId: string;
  /** Ο χρήστης που βλέπει τη φόρμα είναι εργαζόμενος; Αλλάζει τα κριτήρια. */
  isWorker: boolean;
  otherName: string;
  onClose: () => void;
  /** Καλείται μετά από επιτυχή υποβολή, για να ανανεωθεί η κάρτα στο chat. */
  onSaved?: () => void;
}

export function RatingModal({ hireId, isWorker, otherName, onClose, onSaved }: RatingModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<any>(null);

  const [overall, setOverall] = useState(0);
  const [scores, setScores] = useState<[number, number, number]>([0, 0, 0]);
  const [comment, setComment] = useState('');

  // Τα κριτήρια που γράφω εγώ αφορούν την άλλη πλευρά.
  const myLabels = isWorker ? LABELS.worker : LABELS.business;
  const theirLabels = isWorker ? LABELS.business : LABELS.worker;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = (await api.hires.getRating(hireId)) as any;
      setState(res?.data || null);
    } catch {
      toast.error('Δεν φόρτωσε η αξιολόγηση');
    } finally {
      setLoading(false);
    }
  }, [hireId]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (overall < 1) { toast.error('Διάλεξε πόσα αστέρια'); return; }
    setSaving(true);
    try {
      await api.hires.rate(hireId, {
        overall,
        ...(scores[0] > 0 ? { score_a: scores[0] } : {}),
        ...(scores[1] > 0 ? { score_b: scores[1] } : {}),
        ...(scores[2] > 0 ? { score_c: scores[2] } : {}),
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      });
      toast.success('Η αξιολόγησή σου καταχωρήθηκε');
      onSaved?.();
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Δεν αποθηκεύτηκε');
    } finally {
      setSaving(false);
    }
  };

  const setScore = (i: number, v: number) =>
    setScores((prev) => {
      const next = [...prev] as [number, number, number];
      next[i] = v;
      return next;
    });

  const opensAtLabel = state?.opensAt
    ? new Date(state.opensAt).toLocaleDateString('el-GR', { day: 'numeric', month: 'long' })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg font-bold text-gray-900">Αξιολόγηση</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100" aria-label="Κλείσιμο">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner className="h-7 w-7" /></div>
        ) : (
          <div className="space-y-4 px-5 py-5">
            {state?.canRate ? (
              <>
                <p className="text-sm text-gray-600">
                  Πώς πήγε με <span className="font-semibold text-gray-900">{otherName}</span>;
                  Η αξιολόγησή σου δεν φαίνεται μέχρι να γράψει και ο άλλος.
                </p>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Συνολικά</p>
                  <div className="mt-2"><StarPicker value={overall} onChange={setOverall} /></div>
                </div>

                <div className="space-y-3 rounded-2xl border border-gray-200 p-4">
                  {myLabels.map((label, i) => (
                    <div key={label} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-700">{label}</span>
                      <StarPicker value={scores[i]!} onChange={(v) => setScore(i, v)} size="text-xl" />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-gray-400" htmlFor="hire-comment">
                    Σχόλιο (προαιρετικό)
                  </label>
                  <textarea
                    id="hire-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value.slice(0, 500))}
                    rows={3}
                    placeholder="Δυο λόγια για τη συνεργασία…"
                    className="mt-1 w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                  />
                  <p className="mt-1 text-right text-[11px] text-gray-400">{comment.length}/500</p>
                </div>

                <button
                  onClick={submit}
                  disabled={saving}
                  className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? 'Αποθήκευση…' : 'Υποβολή αξιολόγησης'}
                </button>
              </>
            ) : state?.mine ? (
              <>
                <ReadOnlyRating title="Η αξιολόγησή σου" rating={state.mine} labels={myLabels} />
                {state.theirs ? (
                  <ReadOnlyRating title={`Τι έγραψε ${otherName}`} rating={state.theirs} labels={theirLabels} />
                ) : (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-center">
                    <p className="text-2xl">⏳</p>
                    <p className="mt-1 text-sm text-gray-600">
                      {state.theyRated
                        ? 'Η αξιολόγησή του/της θα φανεί σε λίγο.'
                        : `${otherName} δεν έχει γράψει ακόμη.`}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-center">
                <p className="text-2xl">⏳</p>
                <p className="mt-1 text-sm font-semibold text-gray-700">Η αξιολόγηση δεν έχει ανοίξει ακόμη</p>
                <p className="mt-1 text-xs text-gray-500">
                  {opensAtLabel
                    ? `Ανοίγει στις ${opensAtLabel}, 15 μέρες μετά την έναρξη.`
                    : 'Ανοίγει 15 μέρες μετά την έναρξη της συνεργασίας.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
