'use client';

/**
 * «Αξιολογήσεις» — τι πήρα και τι έδωσα, μόνιμα στο μενού.
 *
 * Ο κανόνας της διπλής τυφλότητας ΔΕΝ επιβάλλεται εδώ: ο server στέλνει την
 * αξιολόγηση του άλλου μόνο όταν επιτρέπεται (`revealed`). Αν την κρύβαμε στην
 * οθόνη, θα φαινόταν στο δίκτυο. Εδώ απλώς δείχνουμε ό,τι μας έστειλε.
 *
 * Ο μέσος όρος υπολογίζεται ΜΟΝΟ από τις αξιολογήσεις που έχουν όντως
 * αποκαλυφθεί — δεν δείχνουμε νούμερο που δεν στηρίζεται σε ορατά δεδομένα.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { LABELS, ReadOnlyRating, RatingModal } from '@/components/dashboard/rating-modal';

interface RatingRow {
  overall: number;
  score_a: number | null;
  score_b: number | null;
  score_c: number | null;
  comment: string | null;
  created_at: string | null;
}

interface Item {
  hire_id: string;
  job_title: string | null;
  other_name: string | null;
  other_avatar: string | null;
  rating_opens_at: string | null;
  confirmed_at: string | null;
  open: boolean;
  canRate: boolean;
  revealed: boolean;
  theyRated: boolean;
  mine: RatingRow | null;
  theirs: RatingRow | null;
}

type Tab = 'received' | 'given';

function greekDate(iso?: string | null): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  return new Date(t).toLocaleDateString('el-GR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function RatingsPage() {
  const { user } = useAuth();
  const isWorker = user?.role !== 'business';

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<Tab>('received');
  const [rating, setRating] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = (await (api as any).hires.myRatings()) as any;
      setItems(res?.data?.items || []);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Τα κριτήρια που γράφω εγώ αφορούν την άλλη πλευρά — ίδια λογική με τη φόρμα.
  const myLabels = isWorker ? LABELS.worker : LABELS.business;
  const theirLabels = isWorker ? LABELS.business : LABELS.worker;

  const received = items.filter((i) => i.theirs);
  const given = items.filter((i) => i.mine);
  const pendingMine = items.filter((i) => i.canRate);

  const avg = (list: RatingRow[]) =>
    list.length === 0 ? null : list.reduce((s, r) => s + Number(r.overall || 0), 0) / list.length;

  const receivedAvg = avg(received.map((i) => i.theirs!));

  const other = (i: Item) => i.other_name || (isWorker ? 'Επιχείρηση' : 'Εργαζόμενος/η');

  const card = (i: Item, which: Tab) => {
    const r = which === 'received' ? i.theirs : i.mine;
    if (!r) return null;
    return (
      <div key={i.hire_id} className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-3">
          {i.other_avatar ? (
            <img src={i.other_avatar} alt="" className="h-10 w-10 shrink-0 rounded-full border border-gray-200 object-cover" />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
              {other(i).trim()[0]?.toUpperCase() || '?'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-gray-900">{other(i)}</p>
            <p className="truncate text-xs text-gray-500">
              {i.job_title ? `«${i.job_title}»` : 'Συνεργασία'}
              {r.created_at ? ` · ${greekDate(r.created_at)}` : ''}
            </p>
          </div>
        </div>
        <ReadOnlyRating
          title={which === 'received' ? `Τι έγραψε ${other(i)}` : 'Η αξιολόγησή σου'}
          rating={r}
          labels={which === 'received' ? theirLabels : myLabels}
        />
      </div>
    );
  };

  const list = tab === 'received' ? received : given;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Αξιολογήσεις</h1>
        <p className="mt-1 text-sm text-gray-600">
          Ανοίγουν 15 μέρες μετά την έναρξη της συνεργασίας. Βλέπεις τι σου έγραψαν
          μόλις γράψεις κι εσύ τη δική σου.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
      ) : failed ? (
        <EmptyState
          icon={<span className="text-2xl">⚠️</span>}
          title="Δεν φόρτωσαν οι αξιολογήσεις"
          description="Κάτι πήγε στραβά με τη σύνδεση. Δοκίμασε ξανά."
          action={
            <button
              onClick={() => { setLoading(true); load(); }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
            >
              Δοκίμασε ξανά
            </button>
          }
        />
      ) : (
        <>
          {/* Εκκρεμείς — μόνο όσες μπορώ όντως να γράψω τώρα */}
          {pendingMine.length > 0 && (
            <div className="mb-6 rounded-2xl border-2 border-yellow-300 bg-yellow-50/70 p-4">
              <p className="mb-3 text-sm font-bold text-gray-900">
                ⭐ Περιμένουν την αξιολόγησή σου ({pendingMine.length})
              </p>
              <div className="space-y-2">
                {pendingMine.map((i) => (
                  <div key={i.hire_id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3">
                    <span className="text-sm text-gray-800">
                      {other(i)}
                      {i.job_title ? ` — «${i.job_title}»` : ''}
                    </span>
                    <button
                      onClick={() => setRating({ id: i.hire_id, name: other(i) })}
                      className="rounded-lg bg-yellow-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-yellow-600"
                    >
                      Γράψε αξιολόγηση
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Μέσος όρος — μόνο από ό,τι είναι πραγματικά ορατό */}
          {receivedAvg !== null && (
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
              <span className="text-3xl font-extrabold text-gray-900">{receivedAvg.toFixed(1)}</span>
              <div>
                <p className="text-lg leading-none">
                  <span className="text-yellow-400">{'★'.repeat(Math.round(receivedAvg))}</span>
                  <span className="text-gray-300">{'★'.repeat(Math.max(0, 5 - Math.round(receivedAvg)))}</span>
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Μέσος όρος από {received.length} {received.length === 1 ? 'αξιολόγηση' : 'αξιολογήσεις'}
                </p>
              </div>
            </div>
          )}

          {/* Καρτέλες */}
          <div className="mb-4 inline-flex rounded-xl border border-gray-200 bg-white p-1">
            {(['received', 'given'] as Tab[]).map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  tab === k ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {k === 'received' ? `Πήρα (${received.length})` : `Έδωσα (${given.length})`}
              </button>
            ))}
          </div>

          {list.length === 0 ? (
            <EmptyState
              icon={<span className="text-2xl">⭐</span>}
              title={tab === 'received' ? 'Καμία αξιολόγηση ακόμη' : 'Δεν έχεις γράψει αξιολόγηση'}
              description={
                tab === 'received'
                  ? 'Θα εμφανιστούν εδώ μόλις αξιολογηθείς — και αφού γράψεις κι εσύ τη δική σου.'
                  : 'Οι αξιολογήσεις ανοίγουν 15 μέρες μετά την έναρξη μιας επιβεβαιωμένης πρόσληψης.'
              }
              action={
                <Link
                  href="/dashboard/hires"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                >
                  Δες τις προσλήψεις
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">{list.map((i) => card(i, tab))}</div>
          )}
        </>
      )}

      {rating && (
        <RatingModal
          hireId={rating.id}
          isWorker={isWorker}
          otherName={rating.name}
          onClose={() => setRating(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
