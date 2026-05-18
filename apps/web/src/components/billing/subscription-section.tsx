'use client';

/**
 * StaffNow subscription panel for /dashboard/billing.
 *
 * Single component intentionally — keeps the billing flow self-contained
 * and easy to lift into a future standalone page.
 *
 * It shows:
 *   - the current subscription + renewal date + grace period
 *   - "Διαχείριση Stripe" and "Ακύρωση"
 *   - payment history with invoice/receipt download
 *   - billing profile (ΑΦΜ / ΔΟΥ / διεύθυνση) for τιμολόγιο vs απόδειξη
 *   - "Αλλαγή πλάνου" CTA opening the UpgradeModal
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { UpgradeModal } from './upgrade-modal';
import { ManualTransferDialog } from './manual-transfer-dialog';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://staffnow-api-production.siteinside53.workers.dev';

interface BillingMe {
  subscription: any | null;
  plan: any | null;
  payments: Array<{
    id: string;
    provider: string;
    plan_id: string | null;
    amount_cents: number;
    currency: string;
    status: string;
    document_type: string;
    invoice_id: string | null;
    refunded_cents: number;
    created_at: string;
  }>;
  invoices: Array<{
    id: string;
    doc_type: 'invoice' | 'receipt';
    doc_number: string;
    total_cents: number;
    currency: string;
    issued_at: string;
  }>;
  profile: any | null;
}

export function SubscriptionSection() {
  const [data, setData] = useState<BillingMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [transferOrder, setTransferOrder] = useState<any | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);

  const refresh = async () => {
    try {
      const token = localStorage.getItem('staffnow_token');
      const res = await fetch(`${API_BASE}/billing/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = (await res.json()) as any;
      if (j.success) setData(j.data);
    } catch (err: any) {
      toast.error(err?.message || 'Σφάλμα φόρτωσης');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const onPortal = async () => {
    try {
      const token = localStorage.getItem('staffnow_token');
      const res = await fetch(`${API_BASE}/billing/portal`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: window.location.href }),
      });
      const j = (await res.json()) as any;
      if (j.success && j.data?.url) window.location.href = j.data.url;
      else toast.error(j.error?.message || 'Σφάλμα πύλης διαχείρισης');
    } catch {
      toast.error('Σφάλμα πύλης διαχείρισης');
    }
  };

  const onCancel = async () => {
    if (!confirm('Σίγουρα θέλετε να ακυρώσετε τη συνδρομή στο τέλος της περιόδου;')) return;
    try {
      const token = localStorage.getItem('staffnow_token');
      const res = await fetch(`${API_BASE}/billing/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = (await res.json()) as any;
      if (j.success) {
        toast.success('Η συνδρομή θα ακυρωθεί στο τέλος της περιόδου.');
        refresh();
      } else {
        toast.error(j.error?.message || 'Αποτυχία ακύρωσης');
      }
    } catch {
      toast.error('Αποτυχία ακύρωσης');
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="h-5 w-40 animate-pulse rounded bg-gray-100" />
        <div className="mt-3 h-12 w-full animate-pulse rounded bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CurrentPlanCard
        data={data}
        onUpgrade={() => setShowUpgrade(true)}
        onPortal={onPortal}
        onCancel={onCancel}
      />

      <BillingProfileCard
        profile={data?.profile}
        editing={editingProfile}
        onEdit={() => setEditingProfile(true)}
        onClose={() => setEditingProfile(false)}
        onSaved={() => {
          setEditingProfile(false);
          refresh();
        }}
      />

      <PaymentHistoryCard payments={data?.payments || []} invoices={data?.invoices || []} />

      {showUpgrade && (
        <UpgradeModal
          currentPlanId={data?.subscription?.plan_id || null}
          currentPeriod={(() => {
            const start = data?.subscription?.current_period_start;
            const end = data?.subscription?.current_period_end;
            if (!start || !end) return null;
            const diffDays = (new Date(end).getTime() - new Date(start).getTime()) / 86_400_000;
            return diffDays > 180 ? 'yearly' : 'monthly';
          })()}
          onClose={() => setShowUpgrade(false)}
          onManualTransfer={(order) => {
            setShowUpgrade(false);
            setTransferOrder(order);
          }}
        />
      )}

      {transferOrder && (
        <ManualTransferDialog order={transferOrder} onClose={() => setTransferOrder(null)} />
      )}
    </div>
  );
}

// =====================================================================
// Current plan card
// =====================================================================

function CurrentPlanCard({
  data,
  onUpgrade,
  onPortal,
  onCancel,
}: {
  data: BillingMe | null;
  onUpgrade: () => void;
  onPortal: () => void;
  onCancel: () => void;
}) {
  const sub = data?.subscription;
  const plan = data?.plan;
  const planName = plan?.nameEl || plan?.name || 'Free';
  const status: string = sub?.status || 'free';
  const grace: string | null = sub?.grace_period_until || null;
  const periodEnd: string | null = sub?.current_period_end || null;
  const cancelAtEnd: number = sub?.cancel_at_period_end || 0;

  const statusEl = STATUS_LABEL[status] || { label: status, tone: 'gray' };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Τρέχον πλάνο</p>
          <h2 className="mt-1 text-2xl font-extrabold text-gray-900">{planName}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${
                statusEl.tone === 'green'
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : statusEl.tone === 'amber'
                    ? 'bg-amber-50 text-amber-700 ring-amber-200'
                    : statusEl.tone === 'rose'
                      ? 'bg-rose-50 text-rose-700 ring-rose-200'
                      : 'bg-gray-100 text-gray-700 ring-gray-200'
              }`}
            >
              {statusEl.label}
            </span>
            {cancelAtEnd === 1 && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200">
                Ακύρωση στο τέλος της περιόδου
              </span>
            )}
          </div>
          {periodEnd && (
            <p className="mt-2 text-xs text-gray-500">
              {cancelAtEnd === 1 ? 'Λήγει στις' : 'Επόμενη χρέωση'}:{' '}
              <strong>{formatDate(periodEnd)}</strong>
            </p>
          )}
          {grace && (
            <p className="mt-1 text-xs text-rose-700">
              ⚠ Περίοδος χάριτος έως {formatDate(grace)} — αν δεν επιτύχει η πληρωμή, ο λογαριασμός
              θα υποβαθμιστεί στο Free.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onUpgrade}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
          >
            {plan ? 'Αλλαγή πλάνου' : 'Επιλογή πλάνου'}
          </button>
          {sub?.stripe_customer_id && (
            <button
              type="button"
              onClick={onPortal}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Διαχείριση κάρτας (Stripe)
            </button>
          )}
          {plan && status === 'active' && cancelAtEnd !== 1 && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
            >
              Ακύρωση
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<string, { label: string; tone: 'green' | 'amber' | 'rose' | 'gray' }> = {
  active:    { label: 'Ενεργό',                tone: 'green' },
  trialing:  { label: 'Δοκιμαστική περίοδος',   tone: 'green' },
  past_due:  { label: 'Σε καθυστέρηση πληρωμής', tone: 'amber' },
  canceled:  { label: 'Ακυρωμένο',              tone: 'rose'  },
  free:      { label: 'Δωρεάν',                 tone: 'gray'  },
};

// =====================================================================
// Billing profile card
// =====================================================================

function BillingProfileCard({
  profile,
  editing,
  onEdit,
  onClose,
  onSaved,
}: {
  profile: any | null;
  editing: boolean;
  onEdit: () => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const docType: 'invoice' | 'receipt' = profile?.document_type === 'invoice' ? 'invoice' : 'receipt';
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Στοιχεία χρέωσης
          </p>
          <h3 className="mt-1 text-base font-bold text-gray-900">
            {profile?.legal_name || 'Δεν έχουν συμπληρωθεί στοιχεία'}
          </h3>
          <p className="mt-0.5 text-xs text-gray-600">
            Τύπος εγγράφου:{' '}
            <strong>{docType === 'invoice' ? 'Τιμολόγιο' : 'Απόδειξη παροχής υπηρεσιών'}</strong>
          </p>
          {profile && (
            <ul className="mt-2 space-y-0.5 text-xs text-gray-600">
              {profile.vat_number && (
                <li>
                  <strong>ΑΦΜ:</strong> {profile.vat_number}
                  {profile.doy ? ` · ΔΟΥ: ${profile.doy}` : ''}
                </li>
              )}
              {profile.address && (
                <li>
                  {profile.address}
                  {profile.postal_code ? `, ${profile.postal_code}` : ''}
                  {profile.city ? `, ${profile.city}` : ''}
                </li>
              )}
              {profile.phone && <li>Τηλ: {profile.phone}</li>}
              {profile.email && <li>Email χρέωσης: {profile.email}</li>}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          {profile ? 'Επεξεργασία' : 'Συμπλήρωση'}
        </button>
      </div>

      {editing && <BillingProfileForm initial={profile} onSaved={onSaved} onClose={onClose} />}
    </div>
  );
}

function BillingProfileForm({
  initial,
  onSaved,
  onClose,
}: {
  initial: any | null;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [docType, setDocType] = useState<'invoice' | 'receipt'>(
    initial?.document_type === 'invoice' ? 'invoice' : 'receipt',
  );
  const [legalName, setLegalName] = useState(initial?.legal_name || '');
  const [vatNumber, setVatNumber] = useState(initial?.vat_number || '');
  const [doy, setDoy] = useState(initial?.doy || '');
  const [address, setAddress] = useState(initial?.address || '');
  const [postalCode, setPostalCode] = useState(initial?.postal_code || '');
  const [city, setCity] = useState(initial?.city || '');
  const [phone, setPhone] = useState(initial?.phone || '');
  const [email, setEmail] = useState(initial?.email || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('staffnow_token');
      const res = await fetch(`${API_BASE}/billing/profile`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: docType,
          legalName,
          vatNumber,
          doy,
          address,
          postalCode,
          city,
          country: 'GR',
          phone,
          email,
        }),
      });
      const j = (await res.json()) as any;
      if (!j.success) {
        toast.error(j.error?.message || 'Αποτυχία αποθήκευσης');
        return;
      }
      toast.success('Αποθηκεύτηκε');
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl bg-gray-50 p-4">
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setDocType('receipt')}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold ring-1 ${
            docType === 'receipt'
              ? 'bg-blue-600 text-white ring-blue-600'
              : 'bg-white text-gray-700 ring-gray-300'
          }`}
        >
          Απόδειξη
        </button>
        <button
          type="button"
          onClick={() => setDocType('invoice')}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold ring-1 ${
            docType === 'invoice'
              ? 'bg-blue-600 text-white ring-blue-600'
              : 'bg-white text-gray-700 ring-gray-300'
          }`}
        >
          Τιμολόγιο (απαιτεί ΑΦΜ)
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={docType === 'invoice' ? 'Επωνυμία (υποχρεωτικό)' : 'Όνομα / Επωνυμία'}>
          <input value={legalName} onChange={(e) => setLegalName(e.target.value)} className={inputClass} />
        </Field>
        {docType === 'invoice' && (
          <>
            <Field label="ΑΦΜ (υποχρεωτικό)">
              <input value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} className={inputClass} />
            </Field>
            <Field label="ΔΟΥ">
              <input value={doy} onChange={(e) => setDoy(e.target.value)} className={inputClass} />
            </Field>
          </>
        )}
        <Field label="Διεύθυνση">
          <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Τ.Κ.">
          <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Πόλη">
          <input value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Τηλέφωνο">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Email χρέωσης">
          <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </Field>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {saving ? 'Αποθήκευση...' : 'Αποθήκευση'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700"
        >
          Ακύρωση
        </button>
      </div>
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-gray-600">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

// =====================================================================
// Payment history card
// =====================================================================

function PaymentHistoryCard({
  payments,
  invoices,
}: {
  payments: BillingMe['payments'];
  invoices: BillingMe['invoices'];
}) {
  const invoiceById = useMemo(() => {
    const m = new Map<string, BillingMe['invoices'][number]>();
    for (const i of invoices) m.set(i.id, i);
    return m;
  }, [invoices]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Ιστορικό πληρωμών</p>
      {payments.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">Δεν υπάρχουν πληρωμές ακόμη.</p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100">
          {payments.map((p) => {
            const invoice = p.invoice_id ? invoiceById.get(p.invoice_id) : null;
            return (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {fmtMoney(p.amount_cents, p.currency)}
                    {p.refunded_cents > 0 && (
                      <span className="ml-2 text-xs text-rose-600">
                        Επιστροφή: {fmtMoney(p.refunded_cents, p.currency)}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {formatDate(p.created_at)} · {providerLabel(p.provider)} · {paymentStatusLabel(p.status)}
                    {p.plan_id ? ` · ${p.plan_id}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-700">
                    {p.document_type === 'invoice' ? 'Τιμολόγιο' : 'Απόδειξη'}
                  </span>
                  {invoice && (
                    <Link
                      href={`${API_BASE}/billing/invoices/${invoice.id}`}
                      target="_blank"
                      className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Λήψη ({invoice.doc_number})
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
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
  return new Date(s).toLocaleDateString('el-GR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function providerLabel(p: string): string {
  if (p === 'stripe') return 'Κάρτα (Stripe)';
  if (p === 'manual') return 'Κατάθεση τραπέζης';
  if (p === 'paypal') return 'PayPal';
  return p;
}

function paymentStatusLabel(s: string): string {
  return (
    {
      succeeded: 'Επιτυχής',
      pending: 'Σε εκκρεμότητα',
      failed: 'Αποτυχία',
      refunded: 'Επιστράφηκε',
      partially_refunded: 'Μερική επιστροφή',
    } as Record<string, string>
  )[s] || s;
}
