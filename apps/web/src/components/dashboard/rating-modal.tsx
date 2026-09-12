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
import { useT, useLocale } from '@/i18n/locale-provider';

// Οι τρεις υποβαθμολογίες αλλάζουν νόημα ανάλογα με το ποιος γράφει.
export const LABELS = {
  worker: ['Οργάνωση', 'Πληρωμή στην ώρα της', 'Επικοινωνία'],
  business: ['Επαγγελματισμός', 'Συνέπεια', 'Επικοινωνία'],
} as const;

/** Ίδιες κατηγορίες με το εξαγόμενο LABELS, μεταφρασμένες. */
function useTranslatedLabels() {
  const t = useT();
  return {
    worker: [t('ratingsUi.labels.worker.a'), t('ratingsUi.labels.worker.b'), t('ratingsUi.labels.worker.c')] as const,
    business: [t('ratingsUi.labels.business.a'), t('ratingsUi.labels.business.b'), t('ratingsUi.labels.business.c')] as const,
  };
}

function StarPicker({
  value, onChange, size = 'text-3xl', t,
}: { value: number; onChange: (v: number) => void; size?: string; t: (k: string, p?: Record<string, string | number>) => string }) {
  return (
    <div className={`flex gap-1 ${size}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={t('ratingsUi.nOf5', { n })}
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
  const t = useT();
  const { locale } = useLocale();
  const translatedLabels = useTranslatedLabels();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<any>(null);

  const [overall, setOverall] = useState(0);
  const [scores, setScores] = useState<[number, number, number]>([0, 0, 0]);
  const [comment, setComment] = useState('');

  // Τα κριτήρια που γράφω εγώ αφορούν την άλλη πλευρά.
  const myLabels = isWorker ? translatedLabels.worker : translatedLabels.business;
  const theirLabels = isWorker ? translatedLabels.business : translatedLabels.worker;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = (await api.hires.getRating(hireId)) as any;
      setState(res?.data || null);
    } catch {
      toast.error(t('ratingsUi.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [hireId, t]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (overall < 1) { toast.error(t('ratingsUi.pickStars')); return; }
    setSaving(true);
    try {
      await api.hires.rate(hireId, {
        overall,
        ...(scores[0] > 0 ? { score_a: scores[0] } : {}),
        ...(scores[1] > 0 ? { score_b: scores[1] } : {}),
        ...(scores[2] > 0 ? { score_c: scores[2] } : {}),
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      });
      toast.success(t('ratingsUi.saved'));
      onSaved?.();
      await load();
    } catch (err: any) {
      toast.error(err?.message || t('ratingsUi.notSaved'));
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
    ? new Date(state.opensAt).toLocaleDateString(locale === 'en' ? 'en-GB' : 'el-GR', { day: 'numeric', month: 'long' })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg font-bold text-gray-900">{t('ratingsUi.title')}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100" aria-label={t('ratingsUi.close')}>
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
                {state.theirs && (
                  <ReadOnlyRating title={t('ratingsUi.whatTheyWrote', { name: otherName })} rating={state.theirs} labels={theirLabels} />
                )}
                <p className="text-sm text-gray-600">
                  {t('ratingsUi.howDidItGo')} <span className="font-semibold text-gray-900">{otherName}</span>{t('ratingsUi.questionMark')}
                  {' '}{t('ratingsUi.visibleOnProfile')}
                </p>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{t('ratingsUi.overall')}</p>
                  <div className="mt-2"><StarPicker value={overall} onChange={setOverall} t={t} /></div>
                </div>

                <div className="space-y-3 rounded-2xl border border-gray-200 p-4">
                  {myLabels.map((label, i) => (
                    <div key={label} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-700">{label}</span>
                      <StarPicker value={scores[i]!} onChange={(v) => setScore(i, v)} size="text-xl" t={t} />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-gray-400" htmlFor="hire-comment">
                    {t('ratingsUi.comment')}
                  </label>
                  <textarea
                    id="hire-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value.slice(0, 500))}
                    rows={3}
                    placeholder={t('ratingsUi.commentPlaceholder')}
                    className="mt-1 w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none"
                  />
                  <p className="mt-1 text-right text-[11px] text-gray-400">{comment.length}/500</p>
                </div>

                <button
                  onClick={submit}
                  disabled={saving}
                  className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? t('ratingsUi.saving') : t('ratingsUi.submit')}
                </button>
              </>
            ) : state?.mine ? (
              <>
                <ReadOnlyRating title={t('ratingsUi.yourReview')} rating={state.mine} labels={myLabels} />
                {state.theirs ? (
                  <ReadOnlyRating title={t('ratingsUi.whatTheyWrote', { name: otherName })} rating={state.theirs} labels={theirLabels} />
                ) : (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-center">
                    <p className="text-2xl">⏳</p>
                    <p className="mt-1 text-sm text-gray-600">
                      {t('ratingsUi.notWrittenYet', { name: otherName })}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-center">
                <p className="text-2xl">⏳</p>
                <p className="mt-1 text-sm font-semibold text-gray-700">{t('ratingsUi.notOpenYet')}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {opensAtLabel
                    ? t('ratingsUi.opensOn', { date: opensAtLabel })
                    : t('ratingsUi.opens15')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
