/**
 * /pricing — public-facing pricing page.
 *
 * Pure subscription model (no credit confusion):
 *   Free / Starter 29€ / Pro 79€ / Elite 149€
 *   Annual toggle (-25%)
 *   Founding Members banner (Pro 39€/μήνα for first 100)
 *   Seasonal Pass (6 months — Greek hospitality)
 *   ROI calculator
 *   Workers-free callout
 *   FAQ
 */
'use client';

import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import { useT } from '@/i18n/locale-provider';

const CHECK = (
  <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const LOCK = (
  <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

interface PlanDef {
  id: string;
  monthly: number;
  yearly: number;
  /** Κανονική τιμή όταν το plan προσφέρεται δωρεάν στο launch (καθαρή, χωρίς ΦΠΑ). */
  normallyMonthly?: number;
  badge?: 'popular' | 'enterprise';
  featureCount: number;
}

const PLAN_DEFS: PlanDef[] = [
  { id: 'free', monthly: 0, yearly: 0, normallyMonthly: 19, featureCount: 7 },
  { id: 'business_basic', monthly: 29, yearly: 261, featureCount: 7 },
  { id: 'business_pro', monthly: 79, yearly: 711, badge: 'popular', featureCount: 7 },
  { id: 'business_elite', monthly: 149, yearly: 1341, badge: 'enterprise', featureCount: 7 },
];

function fmtMoney(n: number): string {
  return n === 0 ? '0€' : `${n}€`;
}

const VAT_PERCENT = 24;

/** Μικτή τιμή (με ΦΠΑ) από καθαρή, μορφοποιημένη με ελληνικό κόμμα: 79 → "97,96€". */
function fmtGross(net: number): string {
  const gross = net * (1 + VAT_PERCENT / 100);
  return `${gross.toFixed(2).replace('.', ',')}€`;
}

export default function PricingPage() {
  const t = useT();
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [foundingSpots, setFoundingSpots] = useState<{
    total: number;
    used: number;
    pending: number;
    remaining: number;
    available: boolean;
  } | null>(null);

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';
    fetch(`${API}/billing/founding-spots`)
      .then((r) => r.json())
      .then((j: any) => {
        if (j?.success && j.data) setFoundingSpots(j.data);
      })
      .catch(() => {});
  }, []);

  const plans = PLAN_DEFS.map((p) => ({
    ...p,
    name: t(`pricing.plans.${p.id}.name`),
    description: t(`pricing.plans.${p.id}.description`),
    cta: p.id === 'free' ? t('pricing.plans.free.cta') : t(`pricing.plans.${p.id}.cta`),
    features: Array.from({ length: p.featureCount }, (_, i) => ({
      label: t(`pricing.plans.${p.id}.features.${i}`),
      on: Boolean(FEATURE_ON[p.id]?.[i]),
    })),
  }));

  return (
    <div className="py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* HEADER */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 ring-1 ring-blue-200 px-4 py-1.5 text-sm font-semibold text-blue-700">
            {t('pricing.header.badge')}
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            {t('pricing.header.title')}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-gray-600">
            {t('pricing.header.subtitle')}
          </p>
        </div>

        {/* FOUNDING MEMBERS */}
        {(!foundingSpots || foundingSpots.available) && (
          <div className="mt-8 mx-auto max-w-3xl">
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 p-4">
              <span className="text-2xl">🏆</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-900">
                  {t('pricing.founding.title', { total: foundingSpots?.total ?? 100 })}
                  {foundingSpots && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-600/10 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                      {t('pricing.founding.spotsLeft', { remaining: foundingSpots.remaining })}
                    </span>
                  )}
                </p>
                <p className="text-xs text-amber-800" dangerouslySetInnerHTML={{ __html: t('pricing.founding.subtitle') }} />
                {foundingSpots && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-amber-200/60">
                    <div
                      className="h-full bg-amber-600 transition-all duration-500"
                      style={{
                        width: `${Math.min(100, ((foundingSpots.used + foundingSpots.pending) / foundingSpots.total) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>
              <Link
                href="/?register=1&founding=1"
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
              >
                {t('pricing.founding.cta')}
              </Link>
            </div>
          </div>
        )}
        {foundingSpots && !foundingSpots.available && (
          <div className="mt-8 mx-auto max-w-3xl">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-center">
              <p className="text-sm font-semibold text-gray-700">
                {t('pricing.foundingDone.title')}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {t('pricing.foundingDone.subtitle')}
              </p>
            </div>
          </div>
        )}

        {/* TOGGLE */}
        <div className="mt-8 flex justify-center">
          <div className="inline-flex rounded-xl bg-gray-100 p-1 text-sm">
            <button
              type="button"
              onClick={() => setPeriod('monthly')}
              className={`rounded-lg px-4 py-2 font-semibold transition-colors ${
                period === 'monthly' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'
              }`}
            >
              {t('pricing.toggle.monthly')}
            </button>
            <button
              type="button"
              onClick={() => setPeriod('yearly')}
              className={`rounded-lg px-4 py-2 font-semibold transition-colors ${
                period === 'yearly' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'
              }`}
            >
              {t('pricing.toggle.yearly')}
              <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-700">
                {t('pricing.toggle.discount')}
              </span>
            </button>
          </div>
        </div>

        {/* PLAN CARDS */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => (
            <PlanCard key={p.id} plan={p} period={period} t={t} />
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-gray-500">
          {t('pricing.vatNote')}
        </p>

        {/* ROI */}
        <RoiSection t={t} />

        {/* COMPARISON */}
        <ComparisonTable period={period} plans={plans} t={t} />

        {/* WORKERS — Free + Premium */}
        <div className="mt-16 mx-auto max-w-5xl">
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 ring-1 ring-emerald-200 px-4 py-1.5 text-sm font-semibold text-emerald-700">
              {t('pricing.worker.badge')}
            </span>
            <h2 className="mt-3 text-2xl font-extrabold text-gray-900 sm:text-3xl">
              {t('pricing.worker.title')}
            </h2>
            <p
              className="mx-auto mt-3 max-w-2xl text-sm text-gray-600 sm:text-base"
              dangerouslySetInnerHTML={{ __html: t('pricing.worker.subtitle') }}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* WORKER FREE */}
            <div className="relative flex flex-col rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">{t('pricing.worker.free.badge')}</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-gray-900">0€</span>
                  <span className="text-gray-500">{t('pricing.worker.free.perForever')}</span>
                </div>
                <p className="mt-2 text-sm text-gray-600">{t('pricing.worker.free.description')}</p>
              </div>
              <ul className="mb-6 flex-1 space-y-2.5">
                {Array.from({ length: 6 }, (_, i) => t(`pricing.worker.free.features.${i}`)).map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    {CHECK}
                    <span className="text-sm text-gray-700">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/?register=1"
                className="flex items-center justify-center rounded-xl border-2 border-emerald-600 bg-white py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-50 transition-colors"
              >
                {t('pricing.worker.free.cta')}
              </Link>
            </div>

            {/* WORKER PREMIUM */}
            <div className="relative flex flex-col rounded-2xl border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-cyan-50 p-6 shadow-xl shadow-blue-500/10">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
                {t('pricing.worker.premium.ribbon')}
              </span>
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-700">{t('pricing.worker.premium.badge')}</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-gray-900">4,99€</span>
                  <span className="text-gray-500">{t('pricing.worker.premium.priceUnit')}</span>
                </div>
                <p className="mt-1 text-xs text-emerald-700" dangerouslySetInnerHTML={{ __html: t('pricing.worker.premium.note') }} />
                <p className="mt-2 text-sm text-gray-700">{t('pricing.worker.premium.description')}</p>
              </div>
              <ul className="mb-6 flex-1 space-y-2.5">
                {Array.from({ length: 8 }, (_, i) => t(`pricing.worker.premium.features.${i}`)).map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    {CHECK}
                    <span className="text-sm text-gray-700">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/?register=1&plan=worker_premium"
                className="flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-colors"
              >
                {t('pricing.worker.premium.cta')}
              </Link>
              <p className="mt-2 text-center text-[11px] text-gray-500">
                {t('pricing.worker.premium.footnote')}
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 mx-auto max-w-3xl">
          <h2 className="mb-6 text-center text-2xl font-bold text-gray-900">{t('pricing.faqTitle')}</h2>
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <Faq key={i} q={t(`pricing.faq.${i}.q`)} a={t(`pricing.faq.${i}.a`)} />
            ))}
          </div>
        </div>

        <div className="mt-12 text-center text-sm text-gray-500">
          {t('pricing.otherQuestions')}{' '}
          <Link href="/contact" className="font-semibold text-blue-600 hover:underline">
            {t('pricing.contactCta')}
          </Link>
        </div>
      </div>
    </div>
  );
}

// ====================== feature availability (unchanged across languages) ======================

const FEATURE_ON: Record<string, boolean[]> = {
  free: [true, true, true, false, false, false, false],
  business_basic: [true, true, true, true, false, false, false],
  business_pro: [true, true, true, true, true, true, true],
  business_elite: [true, true, true, true, true, true, true],
};

// ====================== sub-components ======================

interface PlanView {
  id: string;
  name: string;
  description: string;
  cta: string;
  monthly: number;
  yearly: number;
  normallyMonthly?: number;
  badge?: 'popular' | 'enterprise';
  features: { label: string; on: boolean }[];
}

function PlanCard({ plan, period, t }: { plan: PlanView; period: 'monthly' | 'yearly'; t: (k: string, p?: any) => string }) {
  const showMonthly = period === 'monthly' ? plan.monthly : Math.round(plan.yearly / 12);
  const yearlyTotal = plan.yearly;

  const isPopular = plan.badge === 'popular';
  const isEnterprise = plan.badge === 'enterprise';
  const cardCls = isPopular
    ? 'border-2 border-blue-500 shadow-xl shadow-blue-500/10'
    : isEnterprise
      ? 'border-2 border-purple-300 shadow-lg shadow-purple-500/5'
      : 'border border-gray-200';

  return (
    <div className={`relative flex flex-col rounded-2xl bg-white p-6 ${cardCls}`}>
      {isPopular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
          {t('pricing.badges.popular')}
        </span>
      )}
      {isEnterprise && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-purple-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
          {t('pricing.badges.enterprise')}
        </span>
      )}

      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{plan.name}</p>
        {plan.monthly === 0 ? (
          <>
            <div className="mt-2 flex items-baseline gap-2">
              {plan.normallyMonthly && (
                <span className="text-xl font-bold text-gray-400 line-through">
                  {plan.normallyMonthly}€
                </span>
              )}
              <span className="text-4xl font-extrabold text-emerald-600">{t('pricing.plans.free.name')}</span>
            </div>
            {plan.normallyMonthly && (
              <p className="mt-1 text-xs font-semibold text-emerald-700">
                {t('pricing.plan.launchOffer')}
              </p>
            )}
          </>
        ) : (
          <>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-gray-900">{fmtMoney(showMonthly)}</span>
              <span className="text-gray-500">{t('pricing.plan.perMonth')}</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {t('pricing.plan.vatIncluded', { gross: fmtGross(showMonthly) })}
            </p>
            {period === 'yearly' && (
              <p className="mt-1 text-xs text-emerald-700">
                <strong>{fmtMoney(yearlyTotal)}{t('pricing.plan.perYear')}</strong> · {t('pricing.plan.savingsLabel', { amount: plan.monthly * 12 - yearlyTotal })}
              </p>
            )}
          </>
        )}
        <p className="mt-2 text-sm text-gray-600">{plan.description}</p>
      </div>

      <ul className="mb-6 flex-1 space-y-2.5">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5">
            {f.on ? CHECK : LOCK}
            <span className={`text-sm ${f.on ? 'text-gray-700' : 'text-gray-400'}`}>{f.label}</span>
          </li>
        ))}
      </ul>

      <Link
        href={plan.id === 'business_elite' ? '/contact?plan=elite' : `/?register=1&plan=${plan.id}`}
        className={`flex items-center justify-center rounded-xl py-3 text-sm font-bold transition-colors ${
          isPopular
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700'
            : isEnterprise
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25 hover:bg-purple-700'
              : 'border-2 border-gray-200 text-gray-700 hover:bg-gray-50'
        }`}
      >
        {plan.cta}
      </Link>
    </div>
  );
}

function RoiSection({ t }: { t: (k: string, p?: any) => string }) {
  const [hires, setHires] = useState(2);
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const proPriceMonthly = 79;
  const proPriceYearly = 711;
  const cost = period === 'monthly' ? proPriceMonthly : proPriceYearly;
  const periodLabel = period === 'monthly' ? t('pricing.roi.periodMonthly') : t('pricing.roi.periodYearly');
  const savedPerHire = 600;
  const monthlySaved = hires * savedPerHire;
  const yearlySaved = hires * savedPerHire * 12;
  const saved = period === 'monthly' ? monthlySaved : yearlySaved;
  const roi = useMemo(() => (cost > 0 ? Math.round((saved / cost) * 10) / 10 : 0), [saved, cost]);

  return (
    <div className="mt-16 mx-auto max-w-4xl">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{t('pricing.roi.badge')}</p>
        <h3 className="mt-1 text-xl font-bold text-gray-900">
          {t('pricing.roi.title')}
        </h3>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-gray-600">
              {t('pricing.roi.hiresLabel', { period: periodLabel })}
            </label>
            <input
              type="range"
              min={1}
              max={20}
              value={hires}
              onChange={(e) => setHires(parseInt(e.target.value, 10))}
              className="mt-2 w-full accent-blue-600"
            />
            <p className="mt-1 text-2xl font-extrabold text-blue-700">
              {hires} {hires === 1 ? t('pricing.roi.hiresSingular') : t('pricing.roi.hiresPlural')}
            </p>
            <div className="mt-3 inline-flex rounded-lg bg-gray-100 p-1 text-xs">
              {(['monthly', 'yearly'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`rounded-md px-3 py-1.5 font-semibold ${
                    period === p ? 'bg-white text-gray-900 shadow' : 'text-gray-600'
                  }`}
                >
                  {p === 'monthly' ? t('pricing.toggle.monthly') : t('pricing.toggle.yearly')}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-blue-50 p-5">
            <p className="text-xs text-gray-600">{t('pricing.roi.investment')}</p>
            <p className="text-xl font-bold text-gray-900">
              {cost}€ <span className="text-xs font-medium text-gray-500">/ {period === 'monthly' ? t('pricing.roi.perMonth') : t('pricing.roi.perYear')}</span>
            </p>
            <p className="mt-3 text-xs text-gray-600">{t('pricing.roi.savings')}</p>
            <p className="text-2xl font-extrabold text-emerald-700">{saved}€</p>
            <p className="mt-3 text-xs text-gray-600">{t('pricing.roi.roiLabel')}</p>
            <p className="text-3xl font-extrabold text-blue-700">{roi}x</p>
          </div>
        </div>

        <p className="mt-4 text-[11px] text-gray-400">
          {t('pricing.roi.footnote')}
        </p>
      </div>
    </div>
  );
}

function ComparisonTable({ period, plans, t }: { period: 'monthly' | 'yearly'; plans: PlanView[]; t: (k: string, p?: any) => string }) {
  const valueRow = (rowIdx: number): string[] =>
    Array.from({ length: 4 }, (_, col) => t(`pricing.comparison.values.${rowIdx}.${col}`));

  const rows: Array<[string, (string | boolean)[]]> = [
    [t('pricing.comparison.rows.0'), valueRow(0)],
    [t('pricing.comparison.rows.1'), valueRow(1)],
    [t('pricing.comparison.rows.2'), valueRow(2)],
    [t('pricing.comparison.rows.3'), [false, true, true, true]],
    [t('pricing.comparison.rows.4'), [false, false, true, true]],
    [t('pricing.comparison.rows.5'), [false, false, true, true]],
    [t('pricing.comparison.rows.6'), [false, false, true, true]],
    [t('pricing.comparison.rows.7'), [false, false, true, true]],
    [t('pricing.comparison.rows.8'), [false, true, true, true]],
    [t('pricing.comparison.rows.9'), [false, false, true, true]],
    [t('pricing.comparison.rows.10'), [false, false, false, true]],
    [t('pricing.comparison.rows.11'), [false, false, false, true]],
  ];

  const priceLabel = (p: PlanView) =>
    p.monthly === 0 ? t('pricing.comparison.priceFree') : t('pricing.comparison.pricePerMonthVat', { price: period === 'monthly' ? p.monthly : Math.round(p.yearly / 12) });

  const renderCell = (c: string | boolean) =>
    typeof c === 'boolean' ? (
      c ? <span className="text-emerald-600">✓</span> : <span className="text-gray-300">—</span>
    ) : (
      <span className="text-gray-700">{c}</span>
    );

  return (
    <div className="mt-16 mx-auto max-w-5xl">
      <h2 className="text-center text-2xl font-bold text-gray-900">{t('pricing.comparison.title')}</h2>

      {/* Desktop / tablet: full table */}
      <div className="mt-6 hidden overflow-hidden rounded-2xl border border-gray-200 bg-white sm:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500"></th>
              {plans.map((p) => (
                <th key={p.id} className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-700">
                  <div>{p.name}</div>
                  <div className="mt-0.5 text-sm font-extrabold text-gray-900 normal-case">{priceLabel(p)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(([label, cells]) => (
              <tr key={label}>
                <td className="px-4 py-3 text-sm font-semibold text-gray-700">{label}</td>
                {cells.map((c, i) => (
                  <td key={i} className="px-4 py-3 text-center">{renderCell(c)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked per-feature, no horizontal scroll */}
      <div className="mt-6 space-y-3 sm:hidden">
        {rows.map(([label, cells]) => (
          <div key={label} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <p className="border-b border-gray-100 bg-gray-50 px-4 py-2.5 text-sm font-bold text-gray-800">{label}</p>
            <div className="grid grid-cols-2 divide-x divide-y divide-gray-100">
              {plans.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <span className="text-xs font-semibold text-gray-500">
                    {p.name} <span className="text-gray-400">· {priceLabel(p)}</span>
                  </span>
                  <span className="text-sm font-medium">{renderCell(cells[i] ?? '—')}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-xl border border-gray-200 bg-white">
      <summary className="flex cursor-pointer items-start justify-between gap-3 px-5 py-4 text-sm font-bold text-gray-900 [&::-webkit-details-marker]:hidden">
        {q}
        <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="px-5 pb-4 text-sm leading-relaxed text-gray-600">{a}</div>
    </details>
  );
}
