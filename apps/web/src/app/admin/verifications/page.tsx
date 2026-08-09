'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { MetricCard } from '@/components/admin/ui/metric-card';
import { StatusPill } from '@/components/admin/ui/status-pill';
import { EmptyState } from '@/components/admin/ui/empty-state';
import { ConfirmDialog } from '@/components/admin/ui/confirm-dialog';
import { adminApi } from '@/components/admin/lib/admin-api';

interface VerificationRow {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  document_url: string;
  document_type: string;
  /** 'id' | 'passport' | 'license' — κενό στις αιτήσεις πριν το 0048. */
  document_kind: string | null;
  /** Πίσω όψη — κενή σε διαβατήριο και στις παλιές αιτήσεις. */
  document_back_url: string | null;
  vat_number: string | null;
  registry_number: string | null;
  notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
  email: string;
  role: string;
  worker_full_name: string | null;
  worker_phone: string | null;
  company_name: string | null;
  email_confirmed_at: string | null;
  phone_confirmed_at: string | null;
}

type Tab = 'pending' | 'approved' | 'rejected';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'pending', label: 'Εκκρεμείς', icon: '⏳' },
  { id: 'approved', label: 'Εγκρίθηκαν', icon: '✓' },
  { id: 'rejected', label: 'Απορρίφθηκαν', icon: '✕' },
];

const displayName = (r: VerificationRow) =>
  r.company_name || r.worker_full_name || r.email || '—';

const DOC_KIND_LABELS: Record<string, string> = {
  id: '🪪 Ταυτότητα',
  passport: '📘 Διαβατήριο',
  license: '🚗 Δίπλωμα οδήγησης',
};

/** Παλιές αιτήσεις δεν έχουν τύπο — δείχνουμε ουδέτερη ετικέτα, όχι κενό. */
const docKindLabel = (r: VerificationRow) =>
  DOC_KIND_LABELS[r.document_kind || ''] || '📄 Έγγραφο ταυτοποίησης';

export default function VerificationsPage() {
  const [tab, setTab] = useState<Tab>('pending');
  const [rows, setRows] = useState<VerificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<VerificationRow | null>(null);
  const [confirm, setConfirm] = useState<'approved' | 'rejected' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const load = async (status: Tab) => {
    setLoading(true);
    try {
      const { items } = await adminApi.getVerifications(status);
      setRows(items as VerificationRow[]);
      if (status === 'pending') setPendingCount(items.length);
    } catch (err: any) {
      toast.error(err?.message || 'Αποτυχία φόρτωσης');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(tab);
  }, [tab]);

  const handleDecision = async (reason?: string) => {
    if (!selected || !confirm) return;
    setActionLoading(true);
    try {
      await adminApi.reviewVerification(selected.id, confirm, reason);
      toast.success(
        confirm === 'approved'
          ? 'Εγκρίθηκε — ο χρήστης πήρε το σήμα ✓'
          : 'Το αίτημα απορρίφθηκε',
      );
      setConfirm(null);
      setSelected(null);
      await load(tab);
    } catch (err: any) {
      toast.error(err?.message || 'Σφάλμα κατά την αξιολόγηση');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard
          label="Εκκρεμείς αιτήσεις"
          value={pendingCount}
          icon="⏳"
          tone={pendingCount > 0 ? 'warning' : 'default'}
        />
        <MetricCard
          label="Σε προβολή"
          value={rows.length}
          icon="📋"
          context={TABS.find((t) => t.id === tab)?.label}
          tone="info"
        />
      </div>

      <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
              tab === t.id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="mr-1">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-gray-100 bg-white" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon="✓"
          title="Καμία αίτηση"
          description={
            tab === 'pending'
              ? 'Όλα καθαρά! Καμία εκκρεμής αίτηση επαλήθευσης.'
              : 'Δεν υπάρχουν αιτήσεις σε αυτή την κατηγορία'
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {rows.map((r) => (
            <div
              key={r.id}
              onClick={() => setSelected(r)}
              className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900">{displayName(r)}</p>
                  <p className="truncate text-xs text-gray-500">{r.email}</p>
                </div>
                <StatusPill status={r.status} size="sm" />
              </div>

              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-md bg-gray-100 px-2 py-0.5 font-semibold text-gray-700">
                  {r.role === 'business' ? '🏢 Επιχείρηση' : '👤 Εργαζόμενος'}
                </span>
                {r.vat_number && (
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 font-semibold text-blue-700">
                    ΑΦΜ {r.vat_number}
                  </span>
                )}
                {r.registry_number && (
                  <span className="rounded-md bg-gray-100 px-2 py-0.5 text-gray-700">
                    ΓΕΜΗ {r.registry_number}
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between text-[10px] text-gray-400">
                <span className="font-mono">#{r.id.substring(0, 10)}</span>
                <span>{new Date(r.created_at).toLocaleString('el-GR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSelected(null)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto bg-white shadow-2xl">
            <div className="border-b border-gray-100 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <StatusPill status={selected.status} size="sm" />
                  <h2 className="mt-2 truncate text-lg font-bold text-gray-900">{displayName(selected)}</h2>
                  <p className="mt-1 font-mono text-xs text-gray-400">#{selected.id}</p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-5 p-6">
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Χρήστης</p>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="font-semibold text-gray-900">{displayName(selected)}</p>
                  <p className="text-xs text-gray-600">{selected.email}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {selected.role === 'business' ? 'Επιχείρηση' : 'Εργαζόμενος'}
                  </p>
                </div>
              </div>

              {/* Ο εργαζόμενος δεν έχει ΑΦΜ/ΓΕΜΗ. Του ζητάμε τηλέφωνο + email,
                  οπότε αυτά ακριβώς πρέπει να βλέπει εδώ ο ελεγκτής. */}
              {selected.role === 'business' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">ΑΦΜ</p>
                    <p className="mt-1 font-mono text-sm font-semibold text-gray-900">
                      {selected.vat_number || '—'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">ΓΕΜΗ</p>
                    <p className="mt-1 font-mono text-sm font-semibold text-gray-900">
                      {selected.registry_number || '—'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Κινητό</p>
                    <p className="mt-1 font-mono text-sm font-semibold text-gray-900">
                      {selected.worker_phone || '—'}
                    </p>
                    {/* Αν έχει σταλεί κωδικός SMS και επιβεβαιώθηκε, δεν χρειάζεται
                        να κάνει τίποτα ο ελεγκτής. Αλλιώς το κινητό είναι απλώς
                        δηλωμένο και θέλει τηλεφωνική επιβεβαίωση. */}
                    <p
                      className={`mt-1 text-[10px] font-semibold ${
                        selected.phone_confirmed_at ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {selected.phone_confirmed_at
                        ? '✓ Επιβεβαιωμένο με SMS'
                        : '⏳ Χρειάζεται τηλεφωνική επιβεβαίωση'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Email</p>
                    <p
                      className={`mt-1 text-sm font-semibold ${
                        selected.email_confirmed_at ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {selected.email_confirmed_at ? '✓ Επιβεβαιωμένο' : '⏳ Μη επιβεβαιωμένο'}
                    </p>
                    {selected.email_confirmed_at && (
                      <p className="mt-1 text-[10px] text-gray-500">
                        {new Date(selected.email_confirmed_at).toLocaleDateString('el-GR')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {selected.notes && (
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Σημειώσεις χρήστη</p>
                  <p className="whitespace-pre-line rounded-lg bg-gray-50 p-3 text-sm leading-relaxed text-gray-700">
                    {selected.notes}
                  </p>
                </div>
              )}

              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Δικαιολογητικό</p>
                {selected.role !== 'business' && (
                  <p className="mb-2 inline-block rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                    {docKindLabel(selected)}
                  </p>
                )}
                <div className="space-y-2">
                  <a
                    href={selected.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    📎 {selected.role === 'business'
                      ? 'Άνοιγμα σε νέα καρτέλα'
                      : selected.document_kind === 'passport'
                        ? 'Σελίδα με τη φωτογραφία'
                        : 'Μπροστινή όψη'}
                  </a>
                  {/* Ο δεύτερος σύνδεσμος μόνο αν υπάρχει: οι αιτήσεις πριν το
                      0048 και τα διαβατήρια έχουν μία μόνο όψη. */}
                  {selected.document_back_url && (
                    <a
                      href={selected.document_back_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      📎 Πίσω όψη
                    </a>
                  )}
                </div>
              </div>

              {selected.rejection_reason && (
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Λόγος απόρριψης</p>
                  <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{selected.rejection_reason}</p>
                </div>
              )}

              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Υποβλήθηκε</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {new Date(selected.created_at).toLocaleString('el-GR')}
                </p>
              </div>
            </div>

            {selected.status === 'pending' && (
              <div className="sticky bottom-0 space-y-2 border-t border-gray-100 bg-gray-50 p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Λήψη απόφασης</p>
                <button
                  onClick={() => setConfirm('approved')}
                  className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  ✓ Έγκριση — δώσε το σήμα
                </button>
                <button
                  onClick={() => setConfirm('rejected')}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  ✕ Απόρριψη
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {confirm && selected && (
        <ConfirmDialog
          open
          title={confirm === 'approved' ? 'Έγκριση επαλήθευσης' : 'Απόρριψη αιτήματος'}
          description={
            confirm === 'approved'
              ? 'Ο χρήστης θα πάρει αμέσως το πιστοποιημένο σήμα ✓. Η ενέργεια καταγράφεται στο audit log.'
              : 'Γράψε τον λόγο ώστε ο χρήστης να μπορέσει να υποβάλει ξανά σωστά στοιχεία.'
          }
          tone={confirm === 'approved' ? 'primary' : 'danger'}
          reasonRequired={confirm === 'rejected'}
          loading={actionLoading}
          onConfirm={handleDecision}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
