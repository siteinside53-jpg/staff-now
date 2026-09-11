'use client';

/**
 * Εισερχόμενα — ό,τι έστειλε ο κόσμος: φόρμα επικοινωνίας, newsletter,
 * αξιολογήσεις της πλατφόρμας («Πείτε μας την εμπειρία σας»).
 *
 * Πριν, τα μηνύματα της φόρμας δεν αποθηκεύονταν καν, και αξιολόγηση της
 * ίδιας της σελίδας δεν υπήρχε.
 */

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { EmptyState } from '@/components/admin/ui/empty-state';
import { adminApi } from '@/components/admin/lib/admin-api';
import { fmtWhen } from '@/components/admin/lib/activity-labels';

type Tab = 'contact' | 'feedback';

export default function InboxPage() {
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>(params?.get('tab') === 'feedback' ? 'feedback' : 'contact');
  const [handled, setHandled] = useState<'0' | '1' | ''>('0');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 text-xs font-semibold shadow-sm">
          {(['contact', 'feedback'] as Tab[]).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-md px-3 py-1.5 ${tab === k ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}
            >
              {k === 'contact' ? '✉️ Επικοινωνία & newsletter' : '⭐ Αξιολογήσεις πλατφόρμας'}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 text-xs font-semibold shadow-sm">
          {([
            ['0', 'Εκκρεμούν'],
            ['1', 'Απαντημένα'],
            ['', 'Όλα'],
          ] as const).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setHandled(v)}
              className={`rounded-md px-3 py-1.5 ${handled === v ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      {tab === 'contact' ? <ContactList handled={handled} /> : <FeedbackList handled={handled} />}
    </div>
  );
}

function ContactList({ handled }: { handled: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getInboxContact({ handled, limit: 100 });
      setItems(res.items);
      setPending(res.pending);
    } catch (err: any) {
      toast.error(err?.message || 'Σφάλμα');
    } finally {
      setLoading(false);
    }
  }, [handled]);
  useEffect(() => { load(); }, [load]);

  const toggle = async (id: string, isHandled: boolean) => {
    try {
      await adminApi.setContactHandled(id, !isHandled);
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Σφάλμα');
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">{pending} εκκρεμούν συνολικά</p>
      {loading ? (
        <div className="h-24 animate-pulse rounded-xl border border-gray-100 bg-white" />
      ) : items.length === 0 ? (
        <EmptyState icon="✉️" title="Τίποτα εδώ" description="Δεν υπάρχουν μηνύματα με αυτό το φίλτρο." />
      ) : (
        items.map((m) => (
          <div key={m.id} className={`rounded-xl border p-4 shadow-sm ${m.handled_at ? 'border-gray-100 bg-white' : 'border-amber-200 bg-amber-50/40'}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-gray-900">
                  {m.kind === 'newsletter' ? '📰 Newsletter' : m.subject}
                </p>
                <p className="text-xs text-gray-500">
                  {m.name} · <a href={`mailto:${m.email}`} className="text-blue-600 hover:underline">{m.email}</a> · {fmtWhen(m.created_at)}
                </p>
              </div>
              <button
                onClick={() => toggle(m.id, !!m.handled_at)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                {m.handled_at ? 'Ξανά σε εκκρεμότητα' : '✓ Απαντήθηκε'}
              </button>
            </div>
            {m.kind !== 'newsletter' && <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{m.message}</p>}
          </div>
        ))
      )}
    </div>
  );
}

function FeedbackList({ handled }: { handled: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ total: number; avg: number | null; pending: number }>({ total: 0, avg: null, pending: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getInboxFeedback({ handled, limit: 100 });
      setItems(res.items);
      setStats({ total: res.total, avg: res.avgRating, pending: res.pending });
    } catch (err: any) {
      toast.error(err?.message || 'Σφάλμα');
    } finally {
      setLoading(false);
    }
  }, [handled]);
  useEffect(() => { load(); }, [load]);

  const toggle = async (id: string, isHandled: boolean) => {
    try {
      await adminApi.setFeedbackHandled(id, !isHandled);
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Σφάλμα');
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Συνολικά" value={String(stats.total)} />
        <Stat label="Μέσος όρος" value={stats.avg != null ? `${stats.avg.toFixed(1)} / 5` : '—'} />
        <Stat label="Εκκρεμούν" value={String(stats.pending)} />
      </div>
      {loading ? (
        <div className="h-24 animate-pulse rounded-xl border border-gray-100 bg-white" />
      ) : items.length === 0 ? (
        <EmptyState icon="⭐" title="Καμία αξιολόγηση" description="Όταν κάποιος πατήσει «Πες μας τη γνώμη σου», θα φανεί εδώ." />
      ) : (
        items.map((f) => (
          <div key={f.id} className={`rounded-xl border p-4 shadow-sm ${f.handled_at ? 'border-gray-100 bg-white' : 'border-amber-200 bg-amber-50/40'}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm">
                  {f.rating ? (
                    <>
                      <span className="text-yellow-400">{'★'.repeat(f.rating)}</span>
                      <span className="text-gray-300">{'★'.repeat(5 - f.rating)}</span>
                    </>
                  ) : (
                    <span className="text-gray-400">χωρίς αστέρια</span>
                  )}
                </p>
                <p className="text-xs text-gray-500">
                  {f.user_email ? (
                    <>
                      {f.user_name || f.user_email} ({f.user_role === 'business' ? 'επιχείρηση' : 'εργαζόμενος'})
                    </>
                  ) : (
                    'Ανώνυμος επισκέπτης'
                  )}
                  {f.page ? ` · ${f.page}` : ''} · {fmtWhen(f.created_at)}
                </p>
              </div>
              <button
                onClick={() => toggle(f.id, !!f.handled_at)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                {f.handled_at ? 'Ξανά σε εκκρεμότητα' : '✓ Το είδα'}
              </button>
            </div>
            {f.message && <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{f.message}</p>}
          </div>
        ))
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-gray-900">{value}</p>
    </div>
  );
}
