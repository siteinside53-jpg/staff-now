'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://staffnow-api-production.siteinside53.workers.dev';

interface PlanRow {
  id: string;
  name: string;
  nameEl?: string;
  priceMonthly?: number;
  priceYearly?: number;
  badge?: 'popular' | 'founding' | null;
  features?: {
    maxJobListings?: number | null;
    monthlyCredits?: number;
    maxSwipesPerMonth?: number | null;
    maxActiveMatches?: number | null;
    advancedFilters?: boolean;
    boostedVisibility?: boolean;
    verifiedBadge?: boolean;
    favoriteLists?: boolean;
    prioritySupport?: boolean;
    aiShortlist?: boolean;
    aiHiringChat?: boolean;
    apiAccess?: boolean;
    accountManager?: boolean;
  };
}

/** Feature rows — kept in sync with the public /pricing page. */
const FEATURE_ROWS: { label: string; key: keyof NonNullable<PlanRow['features']>; format?: (v: any) => string }[] = [
  { label: 'Αγγελίες', key: 'maxJobListings', format: (v) => (v === null || v === undefined ? 'Απεριόριστες' : `Έως ${v}`) },
  { label: 'Αναζητήσεις', key: 'maxSwipesPerMonth', format: (v) => (v === null || v === undefined ? 'Απεριόριστες' : `${v}/ημέρα`) },
  { label: 'AI Top-5 Shortlist', key: 'aiShortlist' },
  { label: 'AI Hiring Chat', key: 'aiHiringChat' },
  { label: 'Boost αγγελίας', key: 'boostedVisibility' },
  { label: 'Verified Badge', key: 'verifiedBadge' },
  { label: 'Priority support (24h)', key: 'prioritySupport' },
  { label: 'API access', key: 'apiAccess' },
];

interface Props {
  currentPlanId: string | null;
  /** Billing period of the user's active subscription — used to disambiguate
   *  the "Τρέχον" highlight between monthly and yearly tabs of the same plan. */
  currentPeriod?: 'monthly' | 'yearly' | null;
  onClose: () => void;
  /** Called when the user picks "πληρωμή με κατάθεση" — receives the order. */
  onManualTransfer: (order: any) => void;
}

export function UpgradeModal({ currentPlanId, currentPeriod, onClose, onManualTransfer }: Props) {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [docType, setDocType] = useState<'invoice' | 'receipt'>('receipt');
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/billing/plans`);
        const j = (await res.json()) as any;
        if (j.success) {
          // Plans come from @staffnow/config as a record. Filter to business_*.
          const obj = j.data?.plans || {};
          const arr = Object.values(obj as Record<string, any>).filter(
            (p: any) => p.id && p.id.startsWith('business_'),
          ) as PlanRow[];
          setPlans(arr);
        }
      } catch {}
    })();
  }, []);

  const onCheckout = async (planId: string, mode: 'card' | 'manual') => {
    setSubmitting(planId + ':' + mode);
    try {
      const token = localStorage.getItem('staffnow_token');
      const url = mode === 'card' ? `${API_BASE}/billing/checkout` : `${API_BASE}/billing/manual-transfer`;
      const body =
        mode === 'card'
          ? {
              planId,
              period,
              documentType: docType,
              successUrl: window.location.origin + '/dashboard/billing?success=1',
              cancelUrl: window.location.origin + '/dashboard/billing?canceled=1',
            }
          : { planId, period, documentType: docType };

      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as any;
      if (!j.success) {
        toast.error(j.error?.message || 'Σφάλμα');
        return;
      }
      if (mode === 'card' && j.data?.url) {
        window.location.href = j.data.url;
      } else if (mode === 'manual') {
        onManualTransfer(j.data);
      }
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Επιλέξτε πλάνο</h2>
            <p className="mt-1 text-xs text-gray-500">
              Όλες οι τιμές είναι σε ευρώ και περιλαμβάνουν ΦΠΑ 24%. Σύγκρινε χαρακτηριστικά πλάνων.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
            aria-label="Κλείσιμο"
          >
            ✕
          </button>
        </div>

        {/* Period + document */}
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Toggle
            label="Συχνότητα"
            value={period}
            options={[
              { v: 'monthly', label: 'Μηνιαία' },
              { v: 'yearly',  label: 'Ετήσια (έκπτωση 25%)' },
            ]}
            onChange={(v) => setPeriod(v as any)}
          />
          <Toggle
            label="Τύπος εγγράφου"
            value={docType}
            options={[
              { v: 'receipt', label: 'Απόδειξη' },
              { v: 'invoice', label: 'Τιμολόγιο' },
            ]}
            onChange={(v) => setDocType(v as any)}
          />
        </div>

        {docType === 'invoice' && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Για έκδοση τιμολογίου απαιτούνται <strong>επωνυμία και ΑΦΜ</strong>. Συμπληρώστε τα στοιχεία
            χρέωσης από την προηγούμενη ενότητα πριν προχωρήσετε.
          </div>
        )}

        {/* Plan grid — horizontal, responsive */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => {
            // "Current" only matches when BOTH plan id and billing period match.
            // If currentPeriod is null/unknown, fall back to plan-id match (legacy behavior).
            const isSamePlan = p.id === currentPlanId;
            const isCurrent = isSamePlan && (currentPeriod ? currentPeriod === period : true);
            const isPopular = p.badge === 'popular';
            return (
              <div
                key={p.id}
                className={`relative flex flex-col rounded-2xl border p-5 transition-shadow ${
                  isCurrent
                    ? 'border-blue-300 bg-blue-50/40 ring-2 ring-blue-200'
                    : isPopular
                      ? 'border-amber-300 bg-amber-50/30 shadow-md'
                      : 'border-gray-200 bg-white hover:shadow-md'
                }`}
              >
                {isPopular && !isCurrent && (
                  <span className="absolute -top-3 left-5 rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-sm">
                    🌟 Popular
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute -top-3 left-5 rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-sm">
                    ✓ Τρέχον
                  </span>
                )}

                {/* Header */}
                <div className="border-b border-gray-100 pb-4">
                  <h3 className="text-lg font-bold text-gray-900">{p.nameEl || p.name}</h3>
                  {(() => {
                    // Always show price as €/month. Yearly toggle just divides
                    // the yearly total by 12 (so the headline number drops) and
                    // shows the actual yearly total in small text below.
                    const monthlyHeadlineCents =
                      period === 'yearly'
                        ? Math.round(((p.priceYearly || 0) * 100) / 12)
                        : (p.priceMonthly || 0) * 100;
                    const yearlyTotalCents = (p.priceYearly || 0) * 100;
                    const fullMonthlyCents = (p.priceMonthly || 0) * 100;
                    const savingsPct =
                      period === 'yearly' && (p.priceMonthly ?? 0) > 0
                        ? Math.round(
                            ((p.priceMonthly! * 12 - (p.priceYearly || 0)) /
                              (p.priceMonthly! * 12)) *
                              100,
                          )
                        : 0;
                    return (
                      <>
                        <p className="mt-2">
                          <span className="text-3xl font-extrabold text-gray-900">
                            {fmtMoney(monthlyHeadlineCents)}
                          </span>
                          <span className="ml-1 text-xs font-medium text-gray-500">/ μήνα</span>
                        </p>
                        {period === 'yearly' && yearlyTotalCents > 0 && (
                          <p className="mt-1 text-[11px] text-gray-500">
                            <span className="line-through text-gray-400 mr-1">
                              {fmtMoney(fullMonthlyCents)}/μήνα
                            </span>
                            · {fmtMoney(yearlyTotalCents)} συνολικά/έτος
                            {savingsPct > 0 && (
                              <span className="ml-1 font-semibold text-emerald-600">
                                (−{savingsPct}%)
                              </span>
                            )}
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* Feature comparison */}
                <ul className="mt-4 flex-1 space-y-2.5 text-xs">
                  {FEATURE_ROWS.map((row) => {
                    const rawValue = (p.features || {})[row.key];
                    const isBoolean = typeof rawValue === 'boolean' || rawValue === undefined;
                    const enabled = isBoolean ? Boolean(rawValue) : true;
                    const label = row.format ? row.format(rawValue) : enabled ? '✓' : '—';
                    return (
                      <li key={row.key} className="flex items-start gap-2">
                        {enabled ? (
                          <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                        <span className={`flex-1 ${enabled ? 'text-gray-700' : 'text-gray-400 line-through'}`}>
                          <span className="font-medium">{row.label}</span>
                          {!isBoolean && (
                            <span className="ml-1 text-gray-500">— {label}</span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {/* CTA buttons — same options as before */}
                <div className="mt-5 flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={isCurrent || !!submitting}
                    onClick={() => onCheckout(p.id, 'card')}
                    className={`rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                      isPopular ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {submitting === p.id + ':card'
                      ? '...'
                      : isCurrent
                        ? 'Τρέχον πλάνο'
                        : isSamePlan
                          ? `Αλλαγή σε ${period === 'yearly' ? 'ετήσιο' : 'μηνιαίο'}`
                          : 'Πληρωμή με κάρτα'}
                  </button>
                  <button
                    type="button"
                    disabled={isCurrent || !!submitting}
                    onClick={() => onCheckout(p.id, 'manual')}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting === p.id + ':manual' ? '...' : 'Κατάθεση τραπέζης'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-5 text-[11px] text-gray-400">
          Με την υποβολή αποδέχεστε τους όρους χρήσης. Η συνδρομή ανανεώνεται αυτόματα — μπορείτε να
          ακυρώσετε ανά πάσα στιγμή.
        </p>
      </div>
    </div>
  );
}

function Toggle({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { v: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
      <div className="inline-flex rounded-lg bg-gray-100 p-1">
        {options.map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
              value === o.v ? 'bg-white text-gray-900 shadow' : 'text-gray-600'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function fmtMoney(cents: number, currency = 'EUR'): string {
  const v = (cents / 100).toFixed(2).replace('.', ',');
  return currency === 'EUR' ? `${v} €` : `${v} ${currency}`;
}
