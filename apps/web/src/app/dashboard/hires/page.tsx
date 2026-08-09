'use client';

/**
 * «Προσλήψεις» — το πλήρες ιστορικό, μόνιμα στο μενού.
 *
 * Μέχρι τώρα η πρόσληψη φαινόταν μόνο (α) μέσα στη συγκεκριμένη συνομιλία και
 * (β) στο κουτάκι «Χρειάζονται την προσοχή σου» της αρχικής — που εξαφανίζεται
 * μόλις δεν εκκρεμεί τίποτα. Δηλαδή μια πρόσληψη που τελείωσε δεν φαινόταν
 * πουθενά. Εδώ φαίνονται όλες, για πάντα.
 *
 * Δεν εφευρίσκουμε τίποτα στην οθόνη: κάθε γραμμή είναι μια πραγματική εγγραφή
 * του `hires`. Αν δεν υπάρχει πρόσληψη, η σελίδα το λέει καθαρά αντί να δείξει
 * παραδείγματα.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { RatingModal } from '@/components/dashboard/rating-modal';

interface Hire {
  id: string;
  status: 'pending' | 'confirmed' | 'declined' | 'cancelled';
  job_title: string | null;
  worker_name: string | null;
  worker_avatar: string | null;
  business_name: string | null;
  business_logo: string | null;
  declared_at: string | null;
  confirmed_at: string | null;
  rating_opens_at: string | null;
  i_rated: number;
  they_rated: number;
  job_target: number | null;
  job_confirmed: number | null;
  /** 1 = τη δήλωσα εγώ, 0 = τη δήλωσε η άλλη πλευρά. Το λέει ο server. */
  i_declared: number;
}

function greekDate(iso?: string | null): string {
  if (!iso) return '—';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '—';
  return new Date(t).toLocaleDateString('el-GR', { day: 'numeric', month: 'long', year: 'numeric' });
}

const STATUS_BADGE: Record<Hire['status'], { label: string; className: string }> = {
  pending: { label: 'Εκκρεμεί επιβεβαίωση', className: 'bg-amber-100 text-amber-800' },
  confirmed: { label: 'Επιβεβαιωμένη', className: 'bg-emerald-100 text-emerald-800' },
  declined: { label: 'Δεν επιβεβαιώθηκε', className: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Ακυρώθηκε', className: 'bg-gray-100 text-gray-600' },
};

export default function HiresPage() {
  const { user } = useAuth();
  const isWorker = user?.role !== 'business';

  const [hires, setHires] = useState<Hire[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [rating, setRating] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = (await api.hires.list()) as any;
      setHires(res?.data?.hires || []);
      setFailed(false);
    } catch {
      // Δεν δείχνουμε άδεια λίστα σαν να μην έχει προσλήψεις — λέμε ότι δεν
      // φόρτωσε. Άλλο «καμία πρόσληψη», άλλο «δεν ξέρουμε».
      setFailed(true);
    } finally {
      setLoading(false);
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
        window.dispatchEvent(new Event('staffnow:badges-refresh'));
      } else {
        toast.error(res?.error?.message || 'Σφάλμα');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Σφάλμα σύνδεσης');
    }
    setBusy(null);
  };

  const cancelDeclaration = async (id: string) => {
    if (busy) return;
    setBusy(id);
    try {
      await api.hires.cancel(id);
      toast.success('Η δήλωση αποσύρθηκε');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Δεν αποσύρθηκε');
    }
    setBusy(null);
  };

  const otherName = (h: Hire) =>
    (isWorker ? h.business_name : h.worker_name) || (isWorker ? 'Επιχείρηση' : 'Εργαζόμενος/η');
  const otherAvatar = (h: Hire) => (isWorker ? h.business_logo : h.worker_avatar) || null;

  const pending = hires.filter((h) => h.status === 'pending');
  const confirmed = hires.filter((h) => h.status === 'confirmed');
  const closed = hires.filter((h) => h.status === 'declined' || h.status === 'cancelled');

  const renderCard = (h: Hire) => {
    const badge = STATUS_BADGE[h.status];
    const opensAt = h.rating_opens_at ? Date.parse(h.rating_opens_at) : null;
    const ratingOpen = h.status === 'confirmed' && opensAt !== null && Date.now() >= opensAt;

    return (
      <div key={h.id} className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
        <div className="flex items-start gap-3">
          {otherAvatar(h) ? (
            <img src={otherAvatar(h)!} alt="" className="h-11 w-11 shrink-0 rounded-full border border-gray-200 object-cover" />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
              {otherName(h).trim()[0]?.toUpperCase() || '?'}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-bold text-gray-900">{otherName(h)}</p>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}>
                {badge.label}
              </span>
            </div>

            {h.job_title && (
              <p className="mt-0.5 truncate text-sm text-gray-600">για «{h.job_title}»</p>
            )}

            <p className="mt-1 text-xs text-gray-500">
              Δηλώθηκε {greekDate(h.declared_at)}
              {h.confirmed_at ? ` · Επιβεβαιώθηκε ${greekDate(h.confirmed_at)}` : ''}
            </p>

            {/* Ενέργειες */}
            <div className="mt-3 flex flex-wrap gap-2">
              {/*
                Ποιος απαντάει δεν το ορίζει ο ρόλος αλλά το ποιος τη δήλωσε:
                πλέον μπορεί και ο εργαζόμενος. Όποιος τη δήλωσε περιμένει,
                ο άλλος επιβεβαιώνει.
              */}
              {h.status === 'pending' && !h.i_declared && (
                <>
                  <button
                    onClick={() => answer(h.id, 'confirm')}
                    disabled={busy === h.id}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isWorker ? '✅ Ναι, ξεκίνησα' : '✅ Ναι, τον/την προσέλαβα'}
                  </button>
                  <button
                    onClick={() => answer(h.id, 'decline')}
                    disabled={busy === h.id}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {isWorker ? 'Όχι, δεν ξεκίνησα' : 'Όχι, δεν έγινε'}
                  </button>
                </>
              )}

              {h.status === 'pending' && !!h.i_declared && (
                <>
                  <span className="text-xs text-gray-500">
                    Περιμένουμε την επιβεβαίωσή του/της. Μέχρι τότε δεν μετράει στις θέσεις.
                  </span>
                  <button
                    onClick={() => cancelDeclaration(h.id)}
                    disabled={busy === h.id}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Απόσυρση δήλωσης
                  </button>
                </>
              )}

              {ratingOpen && !h.i_rated && (
                <button
                  onClick={() => setRating({ id: h.id, name: otherName(h) })}
                  className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-bold text-white hover:bg-yellow-600"
                >
                  ⭐ Γράψε αξιολόγηση
                </button>
              )}

              {ratingOpen && !!h.i_rated && (
                <button
                  onClick={() => setRating({ id: h.id, name: otherName(h) })}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold text-gray-800 hover:bg-gray-50"
                >
                  ⭐ Δες τις αξιολογήσεις
                </button>
              )}

              {h.status === 'confirmed' && !ratingOpen && (
                <span className="text-xs text-gray-500">
                  Η αξιολόγηση ανοίγει {opensAt ? `στις ${greekDate(h.rating_opens_at)}` : '15 μέρες μετά την έναρξη'}.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const section = (title: string, list: Hire[]) =>
    list.length === 0 ? null : (
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
          {title} <span className="text-gray-400">({list.length})</span>
        </h2>
        <div className="space-y-3">{list.map(renderCard)}</div>
      </section>
    );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Προσλήψεις</h1>
        <p className="mt-1 text-sm text-gray-600">
          Κάθε πρόσληψη που δηλώθηκε μέσω StaffNow. Μετράει μόνο όταν την επιβεβαιώσει
          και ο/η εργαζόμενος/η.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
      ) : failed ? (
        <EmptyState
          icon={<span className="text-2xl">⚠️</span>}
          title="Δεν φόρτωσε το ιστορικό"
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
      ) : hires.length === 0 ? (
        <EmptyState
          icon={<span className="text-2xl">🤝</span>}
          title="Καμία πρόσληψη ακόμη"
          description={
            isWorker
              ? 'Όταν σε προσλάβουν, δήλωσέ το μέσα στη συνομιλία — ή περίμενε να το δηλώσει η επιχείρηση. Θα εμφανιστεί εδώ για επιβεβαίωση.'
              : 'Όταν προσλάβεις κάποιον/α, δήλωσέ το μέσα στη συνομιλία — ή περίμενε να το δηλώσει ο/η ίδιος/α. Θα εμφανιστεί εδώ για επιβεβαίωση.'
          }
          action={
            <Link
              href="/dashboard/messages"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
            >
              Στις συνομιλίες
            </Link>
          }
        />
      ) : (
        <>
          {section('Εκκρεμούν', pending)}
          {section('Επιβεβαιωμένες', confirmed)}
          {section('Δεν προχώρησαν', closed)}
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
