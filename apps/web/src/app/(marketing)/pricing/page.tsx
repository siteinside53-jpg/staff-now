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

interface Plan {
  id: string;
  nameEl: string;
  description: string;
  monthly: number;
  yearly: number;
  badge?: 'popular' | 'enterprise';
  cta: string;
  features: { label: string; on: boolean }[];
}

const PLANS: Plan[] = [
  {
    id: 'free',
    nameEl: 'Δωρεάν',
    description: 'Δοκίμασε πώς δουλεύει χωρίς δέσμευση.',
    monthly: 0,
    yearly: 0,
    cta: 'Ξεκίνα δωρεάν',
    features: [
      { label: '1 ενεργή αγγελία', on: true },
      { label: '5 αναζητήσεις/ημέρα', on: true },
      { label: 'Chat με matched workers', on: true },
      { label: 'AI Top-5 Shortlist', on: false },
      { label: 'AI Hiring Chat', on: false },
      { label: 'Boost αγγελίας', on: false },
      { label: 'Verified Badge', on: false },
    ],
  },
  {
    id: 'business_basic',
    nameEl: 'Starter',
    description: 'Για μικρές επιχειρήσεις σε 1 σημείο.',
    monthly: 29,
    yearly: 261,
    cta: 'Ξεκίνα Starter',
    features: [
      { label: 'Έως 3 αγγελίες', on: true },
      { label: 'Απεριόριστες αναζητήσεις', on: true },
      { label: 'AI Top-5 Shortlist', on: true },
      { label: 'Email υποστήριξη', on: true },
      { label: 'AI Hiring Chat', on: false },
      { label: 'Boost αγγελίας', on: false },
      { label: 'Verified Badge', on: false },
    ],
  },
  {
    id: 'business_pro',
    nameEl: 'Pro',
    description: 'Για μεσαία ξενοδοχεία & εστιατόρια. Sweet spot.',
    monthly: 79,
    yearly: 711,
    badge: 'popular',
    cta: 'Ξεκίνα Pro',
    features: [
      { label: 'Έως 10 αγγελίες', on: true },
      { label: 'Απεριόριστες αναζητήσεις', on: true },
      { label: 'AI Top-5 Shortlist', on: true },
      { label: 'AI Hiring Chat', on: true },
      { label: 'Boost αγγελίας', on: true },
      { label: 'Verified Badge', on: true },
      { label: 'Priority support (24h)', on: true },
    ],
  },
  {
    id: 'business_elite',
    nameEl: 'Elite',
    description: 'Για αλυσίδες & restaurant groups με πολλαπλά υποκαταστήματα.',
    monthly: 149,
    yearly: 1341,
    badge: 'enterprise',
    cta: 'Επικοινωνία',
    features: [
      { label: 'Απεριόριστες αγγελίες', on: true },
      { label: 'Απεριόριστα matches', on: true },
      { label: 'AI Top-5 Shortlist', on: true },
      { label: 'AI Hiring Chat', on: true },
      { label: 'Boost αγγελίας', on: true },
      { label: 'Verified Badge', on: true },
      { label: 'API access', on: true },
    ],
  },
];

function fmtMoney(n: number): string {
  return n === 0 ? '0€' : `${n}€`;
}

export default function PricingPage() {
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

  return (
    <div className="py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* HEADER */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 ring-1 ring-blue-200 px-4 py-1.5 text-sm font-semibold text-blue-700">
            🎯 Πλάνα για κάθε μέγεθος επιχείρησης
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Διαφανείς τιμές. Χωρίς εκπλήξεις.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-gray-600">
            Πληρώνεις μόνο για αυτό που χρησιμοποιείς. Χωρίς setup fees, χωρίς per-job χρεώσεις,
            χωρίς δέσμευση. Ακυρώνεις όποτε θες.
          </p>
        </div>

        {/* FOUNDING MEMBERS */}
        {(!foundingSpots || foundingSpots.available) && (
          <div className="mt-8 mx-auto max-w-3xl">
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 p-4">
              <span className="text-2xl">🏆</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-900">
                  Founding Members — Πρώτοι {foundingSpots?.total ?? 100} πελάτες
                  {foundingSpots && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-600/10 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                      🔥 Έμειναν {foundingSpots.remaining} θέσεις
                    </span>
                  )}
                </p>
                <p className="text-xs text-amber-800">
                  Pro plan για πάντα στα <strong>39€/μήνα</strong> (αντί 79€). Lifetime grandfathered.
                </p>
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
                Πάρε τη θέση σου
              </Link>
            </div>
          </div>
        )}
        {foundingSpots && !foundingSpots.available && (
          <div className="mt-8 mx-auto max-w-3xl">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-center">
              <p className="text-sm font-semibold text-gray-700">
                ✅ Η προσφορά Founding Members ολοκληρώθηκε — και οι 100 θέσεις γέμισαν!
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Ευχαριστούμε όλους τους πρώτους. Η κανονική τιμή Pro 79€/μήνα ισχύει παρακάτω.
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
              Μηνιαία
            </button>
            <button
              type="button"
              onClick={() => setPeriod('yearly')}
              className={`rounded-lg px-4 py-2 font-semibold transition-colors ${
                period === 'yearly' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'
              }`}
            >
              Ετήσια
              <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-700">
                −25%
              </span>
            </button>
          </div>
        </div>

        {/* PLAN CARDS */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => (
            <PlanCard key={p.id} plan={p} period={period} />
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-gray-500">
          Όλες οι τιμές περιλαμβάνουν ΦΠΑ 24%. <strong>30 ημέρες δωρεάν δοκιμή — χωρίς κάρτα.</strong>
        </p>

        {/* ROI */}
        <RoiSection />

        {/* COMPARISON */}
        <ComparisonTable period={period} />

        {/* WORKERS — Free + Premium */}
        <div className="mt-16 mx-auto max-w-5xl">
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 ring-1 ring-emerald-200 px-4 py-1.5 text-sm font-semibold text-emerald-700">
              👤 Για εργαζόμενους
            </span>
            <h2 className="mt-3 text-2xl font-extrabold text-gray-900 sm:text-3xl">
              Δωρεάν για όλους — Premium αν θες extra
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-600 sm:text-base">
              Η βασική χρήση είναι 100% δωρεάν για πάντα. Με το <strong>Worker Premium</strong> (εφάπαξ 4,99€)
              παίρνεις προτεραιότητα και AI εργαλεία για να ξεχωρίζεις στους εργοδότες.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* WORKER FREE */}
            <div className="relative flex flex-col rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Δωρεάν</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-gray-900">0€</span>
                  <span className="text-gray-500">/πάντα</span>
                </div>
                <p className="mt-2 text-sm text-gray-600">Ό,τι χρειάζεσαι για να βρεις δουλειά. Χωρίς κόστος, χωρίς δέσμευση.</p>
              </div>
              <ul className="mb-6 flex-1 space-y-2.5">
                {[
                  'Πλήρες προφίλ με φωτογραφία & bio',
                  'Επιλογή 5 ειδικοτήτων από 250+',
                  'Ανέβασμα CV σε PDF',
                  'Swipe & match σε αγγελίες',
                  'Chat με matched εργοδότες',
                  'Push notifications για νέες ευκαιρίες',
                ].map((f) => (
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
                Ξεκίνα δωρεάν
              </Link>
            </div>

            {/* WORKER PREMIUM */}
            <div className="relative flex flex-col rounded-2xl border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-cyan-50 p-6 shadow-xl shadow-blue-500/10">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
                ✓ Premium
              </span>
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Worker Premium</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-gray-900">4,99€</span>
                  <span className="text-gray-500">εφάπαξ</span>
                </div>
                <p className="mt-1 text-xs text-emerald-700"><strong>Πληρώνεις μία φορά</strong> · για πάντα, χωρίς συνδρομή</p>
                <p className="mt-2 text-sm text-gray-700">Ξεχώρισε από τους χιλιάδες υποψηφίους — προτεραιότητα + AI εργαλεία.</p>
              </div>
              <ul className="mb-6 flex-1 space-y-2.5">
                {[
                  'Όλα τα δωρεάν χαρακτηριστικά',
                  'Μπλε ✓ Premium badge στο προφίλ',
                  'Πρώτη εμφάνιση στις λίστες ανακάλυψης',
                  'AI CV Generator — δημιουργία CV',
                  'AI Profile Optimizer — βελτίωση προφίλ',
                  'Απεριόριστα boosts σε Discover & αγγελίες',
                  'Advanced filters & read receipts',
                  'Unlimited likes — χωρίς ημερήσιο όριο',
                ].map((f) => (
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
                Ξεκλείδωσε για πάντα
              </Link>
              <p className="mt-2 text-center text-[11px] text-gray-500">
                Εφάπαξ πληρωμή · Καμία μηνιαία χρέωση
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 mx-auto max-w-3xl">
          <h2 className="mb-6 text-center text-2xl font-bold text-gray-900">Συχνές ερωτήσεις</h2>
          <div className="space-y-3">
            <Faq q="Πώς λειτουργεί η δωρεάν δοκιμή;" a="30 ημέρες πλήρης πρόσβαση στο Pro plan. Δεν ζητάμε κάρτα κατά την εγγραφή. Αν δεν ταιριάζει, απλά δεν προχωράς. Καμία χρέωση." />
            <Faq q="Μπορώ να αλλάξω πλάνο οποιαδήποτε στιγμή;" a="Ναι. Upgrade άμεσο, downgrade στο τέλος του τρέχοντος κύκλου. Όλα ρυθμίζονται από τη σελίδα χρέωσης." />
            <Faq q="Τι γίνεται αν δεν προσλάβω κανέναν τον πρώτο μήνα;" a="Hire-or-money-back guarantee: αν δεν πετύχεις τουλάχιστον μία ολοκληρωμένη πρόσληψη μέσα στις 30 ημέρες δοκιμής, ο επόμενος μήνας είναι δωρεάν." />
            <Faq q="Εκδίδετε τιμολόγιο ή απόδειξη;" a="Και τα δύο. Επιλέγεις από τις ρυθμίσεις χρέωσης. Για τιμολόγιο χρειαζόμαστε επωνυμία, ΑΦΜ και ΔΟΥ." />
            <Faq q="Παύση συνδρομής για χειμερινούς μήνες;" a="Ναι. Pause subscription από το dashboard για 1–3 μήνες. Δεν χρεώνεσαι, αλλά κρατάς το ιστορικό σου." />
            <Faq q="Οι εργαζόμενοι πληρώνουν;" a="Ποτέ. Η πλατφόρμα είναι 100% δωρεάν για εργαζόμενους — δημιουργία προφίλ, αναζήτηση, μηνύματα. Όλα δωρεάν." />
            <Faq q="Υπάρχει yearly contract dragging;" a="Όχι. Στο annual πληρώνεις εμπρός με 25% έκπτωση. Cancel anytime, χωρίς penalties." />
          </div>
        </div>

        <div className="mt-12 text-center text-sm text-gray-500">
          Άλλες ερωτήσεις;{' '}
          <Link href="/contact" className="font-semibold text-blue-600 hover:underline">
            Επικοινώνησε μαζί μας
          </Link>
        </div>
      </div>
    </div>
  );
}

// ====================== sub-components ======================

function PlanCard({ plan, period }: { plan: Plan; period: 'monthly' | 'yearly' }) {
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
          ⭐ Πιο δημοφιλές
        </span>
      )}
      {isEnterprise && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-purple-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
          Enterprise
        </span>
      )}

      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{plan.nameEl}</p>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-4xl font-extrabold text-gray-900">{fmtMoney(showMonthly)}</span>
          {plan.monthly > 0 && <span className="text-gray-500">/μήνα</span>}
        </div>
        {period === 'yearly' && plan.monthly > 0 && (
          <p className="mt-1 text-xs text-emerald-700">
            <strong>{fmtMoney(yearlyTotal)}/έτος</strong> · εξοικονομείς{' '}
            {plan.monthly * 12 - yearlyTotal}€
          </p>
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

function RoiSection() {
  const [hires, setHires] = useState(2);
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const proPriceMonthly = 79;
  const proPriceYearly = 711;
  const cost = period === 'monthly' ? proPriceMonthly : proPriceYearly;
  const periodLabel = period === 'monthly' ? 'τον μήνα' : 'τον χρόνο';
  const savedPerHire = 600;
  const monthlySaved = hires * savedPerHire;
  const yearlySaved = hires * savedPerHire * 12;
  const saved = period === 'monthly' ? monthlySaved : yearlySaved;
  const roi = useMemo(() => (cost > 0 ? Math.round((saved / cost) * 10) / 10 : 0), [saved, cost]);

  return (
    <div className="mt-16 mx-auto max-w-4xl">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">🧮 ROI Calculator</p>
        <h3 className="mt-1 text-xl font-bold text-gray-900">
          Πόσα γλιτώνεις πραγματικά με το StaffNow Pro
        </h3>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-gray-600">
              Πόσες προσλήψεις {periodLabel};
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
              {hires} {hires === 1 ? 'πρόσληψη' : 'προσλήψεις'}
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
                  {p === 'monthly' ? 'Μηνιαία' : 'Ετήσια'}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-blue-50 p-5">
            <p className="text-xs text-gray-600">Επένδυση</p>
            <p className="text-xl font-bold text-gray-900">
              {cost}€ <span className="text-xs font-medium text-gray-500">/ {period === 'monthly' ? 'μήνα' : 'έτος'}</span>
            </p>
            <p className="mt-3 text-xs text-gray-600">Εξοικονόμηση παραγωγικότητας*</p>
            <p className="text-2xl font-extrabold text-emerald-700">{saved}€</p>
            <p className="mt-3 text-xs text-gray-600">ROI</p>
            <p className="text-3xl font-extrabold text-blue-700">{roi}x</p>
          </div>
        </div>

        <p className="mt-4 text-[11px] text-gray-400">
          *Συντηρητική εκτίμηση: κάθε επιπλέον εβδομάδα κενής θέσης κοστίζει ~200€ σε χαμένη
          παραγωγικότητα + βάρος στο υπόλοιπο προσωπικό. Με μέσο time-to-hire 2 εβδομάδες αντί 5,
          εξοικονομείς ~600€ ανά πρόσληψη.
        </p>
      </div>
    </div>
  );
}

function ComparisonTable({ period }: { period: 'monthly' | 'yearly' }) {
  const rows: Array<[string, (string | boolean)[]]> = [
    ['Ενεργές αγγελίες', ['1', '3', '10', 'Απεριόριστες']],
    ['Αναζητήσεις', ['5/ημέρα', 'Απεριόριστες', 'Απεριόριστες', 'Απεριόριστες']],
    ['Active matches', ['—', '30', '100', 'Απεριόριστα']],
    ['AI Top-5 Shortlist', [false, true, true, true]],
    ['AI Hiring Chat', [false, false, true, true]],
    ['Boost αγγελίας', [false, false, true, true]],
    ['Verified Badge', [false, false, true, true]],
    ['Featured στο Discover', [false, false, true, true]],
    ['Email υποστήριξη', [false, true, true, true]],
    ['Priority support (24h)', [false, false, true, true]],
    ['API access', [false, false, false, true]],
    ['Dedicated Account Manager', [false, false, false, true]],
  ];

  const priceLabel = (p: Plan) =>
    p.monthly === 0 ? '0€' : `${period === 'monthly' ? p.monthly : Math.round(p.yearly / 12)}€/μ`;

  const renderCell = (c: string | boolean) =>
    typeof c === 'boolean' ? (
      c ? <span className="text-emerald-600">✓</span> : <span className="text-gray-300">—</span>
    ) : (
      <span className="text-gray-700">{c}</span>
    );

  return (
    <div className="mt-16 mx-auto max-w-5xl">
      <h2 className="text-center text-2xl font-bold text-gray-900">Αναλυτική σύγκριση πλάνων</h2>

      {/* Desktop / tablet: full table */}
      <div className="mt-6 hidden overflow-hidden rounded-2xl border border-gray-200 bg-white sm:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500"></th>
              {PLANS.map((p) => (
                <th key={p.id} className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-700">
                  <div>{p.nameEl}</div>
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
              {PLANS.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <span className="text-xs font-semibold text-gray-500">
                    {p.nameEl} <span className="text-gray-400">· {priceLabel(p)}</span>
                  </span>
                  <span className="text-sm font-medium">{renderCell(cells[i])}</span>
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
