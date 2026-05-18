'use client';

/**
 * /admin/payments — billing dashboard for the StaffNow team.
 *
 * Tabs:
 *   - Overview: KPI tiles (MRR, active subs, past_due, refunds, …)
 *   - Πληρωμές: paginated list with refund action
 *   - Καταθέσεις: pending manual transfers — confirm or cancel
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { adminApi } from '@/components/admin/lib/admin-api';
import { MetricCard } from '@/components/admin/ui/metric-card';
import { EmptyState } from '@/components/admin/ui/empty-state';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://staffnow-api-production.siteinside53.workers.dev';

type Tab = 'overview' | 'payments' | 'transfers';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview',  label: 'Επισκόπηση', icon: '📊' },
  { id: 'payments',  label: 'Πληρωμές',   icon: '💳' },
  { id: 'transfers', label: 'Καταθέσεις', icon: '🏦' },
];

export default function AdminPaymentsPage() {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1 text-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg px-3 py-2 font-semibold transition-colors ${
              tab === t.id ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="mr-1">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview'  && <OverviewTab />}
      {tab === 'payments'  && <PaymentsTab />}
      {tab === 'transfers' && <TransfersTab />}
    </div>
  );
}

// =====================================================================
// Overview tab
// =====================================================================
function OverviewTab() {
  const [data, setData] = useState<Awaited<ReturnType<typeof adminApi.getBillingOverview>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getBillingOverview()
      .then(setData)
      .catch((e: any) => toast.error(e?.message || 'Σφάλμα'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="MRR" value={data ? fmtMoney(data.mrrCents) : '—'} icon="💶" tone="success" loading={loading} />
        <MetricCard
          label="Ενεργές συνδρομές"
          value={data?.activeSubscriptions ?? 0}
          icon="✅"
          tone="info"
          loading={loading}
        />
        <MetricCard
          label="Σε καθυστέρηση"
          value={data?.pastDue ?? 0}
          icon="⏰"
          tone={data && data.pastDue > 0 ? 'warning' : 'default'}
          loading={loading}
        />
        <MetricCard
          label="Σε grace period"
          value={data?.inGracePeriod ?? 0}
          icon="🕓"
          tone="warning"
          loading={loading}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Επιτυχείς (24h)"
          value={data?.paid24h.count ?? 0}
          icon="📈"
          tone="success"
          loading={loading}
        />
        <MetricCard
          label="Έσοδα (24h)"
          value={data ? fmtMoney(data.paid24h.amountCents) : '—'}
          icon="💰"
          tone="success"
          loading={loading}
        />
        <MetricCard
          label="Αποτυχίες (24h)"
          value={data?.failed24h ?? 0}
          icon="❌"
          tone={data && data.failed24h > 0 ? 'danger' : 'default'}
          loading={loading}
        />
        <MetricCard
          label="Καταθέσεις σε εκκρεμότητα"
          value={data?.pendingTransfers ?? 0}
          icon="🏦"
          tone={data && data.pendingTransfers > 0 ? 'warning' : 'default'}
          loading={loading}
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 text-xs text-gray-600">
        <p className="font-bold text-gray-900">Πώς υπολογίζεται;</p>
        <ul className="mt-1 list-disc pl-5 space-y-0.5">
          <li>
            <strong>MRR</strong>: άθροισμα τιμών (μηνιαίες) όλων των <code>active</code> συνδρομών.
          </li>
          <li>
            <strong>Grace period</strong>: συνδρομές με <code>past_due</code> και ορίζοντα 3 ημερών
            για επιτυχή πληρωμή πριν υποβαθμιστούν αυτόματα στο Free.
          </li>
          <li>
            <strong>Καταθέσεις</strong>: παραγγελίες που περιμένουν επιβεβαίωση από admin πριν
            ενεργοποιηθεί η συνδρομή.
          </li>
        </ul>
      </div>
    </div>
  );
}

// =====================================================================
// Payments tab
// =====================================================================
function PaymentsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{ total: number; perPage: number; totalPages?: number } | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [providerFilter, setProviderFilter] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminApi.getBillingPayments({
        page,
        limit: 50,
        status: statusFilter || undefined,
        provider: providerFilter || undefined,
      });
      setItems(r.items as any);
      setPagination(r.pagination as any);
    } catch (e: any) {
      toast.error(e?.message || 'Σφάλμα');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, providerFilter]);

  const refund = async (p: any) => {
    if (!confirm(`Επιβεβαίωση επιστροφής ${fmtMoney(p.amount_cents)} στον πελάτη;`)) return;
    try {
      await adminApi.refundPayment(p.id);
      toast.success('Έγινε επιστροφή — ενημερώνεται από Stripe webhook');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Αποτυχία');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-3">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs"
        >
          <option value="">Όλες οι καταστάσεις</option>
          <option value="succeeded">Επιτυχείς</option>
          <option value="failed">Αποτυχίες</option>
          <option value="pending">Εκκρεμότητα</option>
          <option value="refunded">Επιστράφηκαν</option>
          <option value="partially_refunded">Μερική επιστροφή</option>
        </select>
        <select
          value={providerFilter}
          onChange={(e) => {
            setProviderFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs"
        >
          <option value="">Όλοι οι πάροχοι</option>
          <option value="stripe">Stripe</option>
          <option value="manual">Κατάθεση</option>
          <option value="paypal">PayPal</option>
        </select>
        {pagination && (
          <span className="ml-auto text-[11px] text-gray-500">
            <span className="font-bold">{pagination.total}</span> πληρωμές
          </span>
        )}
      </div>

      {!loading && items.length === 0 ? (
        <EmptyState icon="💳" title="Καμία πληρωμή" description="Δεν υπάρχουν πληρωμές με αυτά τα φίλτρα." />
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
          {items.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-xs">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900">
                  {fmtMoney(p.amount_cents, p.currency)} ·{' '}
                  <span className="font-semibold">{providerLabel(p.provider)}</span>
                </p>
                <p className="text-[11px] text-gray-500">
                  {p.user_name || p.user_email}
                  {p.plan_id ? ` · ${p.plan_id}` : ''} · {formatDate(p.created_at)}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${
                  p.status === 'succeeded'
                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                    : p.status === 'failed'
                      ? 'bg-rose-50 text-rose-700 ring-rose-200'
                      : p.status === 'refunded' || p.status === 'partially_refunded'
                        ? 'bg-amber-50 text-amber-700 ring-amber-200'
                        : 'bg-gray-100 text-gray-700 ring-gray-200'
                }`}
              >
                {paymentStatusLabel(p.status)}
              </span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-700">
                {p.document_type === 'invoice' ? 'Τιμολόγιο' : 'Απόδειξη'}
              </span>
              {p.invoice_id && (
                <Link
                  href={`${API_BASE}/billing/invoices/${p.invoice_id}`}
                  target="_blank"
                  className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                >
                  {p.invoice_number || 'Έγγραφο'}
                </Link>
              )}
              {p.status === 'succeeded' && p.provider === 'stripe' && (
                <button
                  type="button"
                  onClick={() => refund(p)}
                  className="rounded-md border border-rose-200 bg-white px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
                >
                  Refund
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {pagination && pagination.total > pagination.perPage && (
        <div className="flex items-center justify-between text-xs">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 disabled:opacity-50"
          >
            ← Προηγ.
          </button>
          <span className="text-gray-500">
            Σελίδα {page} {pagination.totalPages ? `από ${pagination.totalPages}` : ''}
          </span>
          <button
            disabled={pagination.totalPages ? page >= pagination.totalPages : items.length < pagination.perPage}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 disabled:opacity-50"
          >
            Επόμ. →
          </button>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// Manual transfers tab
// =====================================================================
function TransfersTab() {
  const [tab, setTab] = useState<'pending' | 'paid' | 'expired' | 'cancelled'>('pending');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminApi.getManualTransfers(tab);
      setItems(r.items);
    } catch (e: any) {
      toast.error(e?.message || 'Σφάλμα');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const confirm = async (id: string, ref: string) => {
    if (!window.confirm(`Επιβεβαίωση κατάθεσης ${ref}; Η συνδρομή θα ενεργοποιηθεί ΑΜΕΣΩΣ.`)) return;
    try {
      await adminApi.confirmManualTransfer(id);
      toast.success('Επιβεβαιώθηκε — η συνδρομή ενεργοποιήθηκε.');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Αποτυχία');
    }
  };

  const cancel = async (id: string) => {
    const reason = window.prompt('Λόγος ακύρωσης (προαιρετικά):') || '';
    try {
      await adminApi.cancelManualTransfer(id, reason);
      toast.success('Ακυρώθηκε.');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Αποτυχία');
    }
  };

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-lg bg-gray-100 p-1 text-xs">
        {(['pending', 'paid', 'expired', 'cancelled'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setTab(s)}
            className={`rounded-md px-3 py-1.5 font-semibold ${
              tab === s ? 'bg-white text-gray-900 shadow' : 'text-gray-600'
            }`}
          >
            {s === 'pending' ? 'Σε εκκρεμότητα' : s === 'paid' ? 'Εξοφλημένες' : s === 'expired' ? 'Έληξαν' : 'Ακυρωμένες'}
          </button>
        ))}
      </div>

      {!loading && items.length === 0 ? (
        <EmptyState icon="🏦" title="Κενό" description="Δεν υπάρχουν παραγγελίες σε αυτή την κατάσταση." />
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
          {items.map((m) => (
            <li key={m.id} className="px-4 py-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900">
                    {fmtMoney(m.amount_cents)} · {m.plan_id} · {m.billing_period === 'yearly' ? 'ετήσια' : 'μηνιαία'}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {m.user_name || m.user_email} · Λήγει: {formatDate(m.expires_at)}
                  </p>
                </div>
                <code className="rounded bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-900">
                  {m.reference_code}
                </code>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-700">
                  {m.document_type === 'invoice' ? 'Τιμολόγιο' : 'Απόδειξη'}
                </span>
                {tab === 'pending' && (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => confirm(m.id, m.reference_code)}
                      className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                    >
                      ✓ Επιβεβαίωση
                    </button>
                    <button
                      type="button"
                      onClick={() => cancel(m.id)}
                      className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Ακύρωση
                    </button>
                  </div>
                )}
              </div>
              {m.notes && <p className="mt-1 text-[11px] italic text-gray-500">"{m.notes}"</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// =====================================================================
// Helpers
// =====================================================================
function fmtMoney(cents: number, currency = 'EUR'): string {
  const v = (cents / 100).toFixed(2).replace('.', ',');
  return currency === 'EUR' ? `${v} €` : `${v} ${currency}`;
}

function formatDate(s: string): string {
  return new Date(s).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function providerLabel(p: string): string {
  if (p === 'stripe') return 'Stripe';
  if (p === 'manual') return 'Κατάθεση';
  if (p === 'paypal') return 'PayPal';
  return p;
}

function paymentStatusLabel(s: string): string {
  return (
    {
      succeeded: 'Επιτυχής',
      pending: 'Εκκρεμεί',
      failed: 'Αποτυχία',
      refunded: 'Επιστράφηκε',
      partially_refunded: 'Μερική επιστροφή',
    } as Record<string, string>
  )[s] || s;
}
