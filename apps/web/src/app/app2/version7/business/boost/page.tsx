'use client';

import { useState } from 'react';
import {
  AppBar,
  Badge,
  Body,
  Btn,
  Card,
  Chip,
  Section,
} from '../../_lib/ui';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    period: '/μήνα',
    color: 'from-gray-500 to-gray-700',
    features: ['1 αγγελία', '20 matches/μήνα', 'Email support', 'Βασικά analytics'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 79,
    period: '/μήνα',
    color: 'from-blue-500 to-indigo-700',
    features: ['10 αγγελίες', '∞ matches', 'Priority support', 'AI hiring chat', 'Featured badge'],
    popular: true,
  },
  {
    id: 'elite',
    name: 'Elite',
    price: 149,
    period: '/μήνα',
    color: 'from-amber-400 to-orange-600',
    features: ['∞ αγγελίες', '5 boosts/μήνα', '24/7 support', 'Verified badge', 'Custom branding'],
  },
];

const BOOSTS = [
  { id: 'standard', name: 'Standard Boost', price: 9.99, days: 3, mult: '2x' },
  { id: 'premium', name: 'Premium Boost', price: 19.99, days: 7, mult: '5x', popular: true },
  { id: 'mega', name: 'Mega Boost', price: 39.99, days: 14, mult: '10x' },
];

export default function BoostPage() {
  const [tab, setTab] = useState<'plan' | 'boost'>('plan');
  const [selectedPlan, setSelectedPlan] = useState<string>('pro');
  const [selectedBoost, setSelectedBoost] = useState<string>('premium');

  return (
    <div className="fixed inset-0 flex flex-col bg-[#F5F7FB]">
      <AppBar back title="Boost & Συνδρομή" />
      <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex gap-2">
          <Chip active={tab === 'plan'} onClick={() => setTab('plan')}>📋 Συνδρομή</Chip>
          <Chip active={tab === 'boost'} onClick={() => setTab('boost')}>🚀 Boost αγγελίας</Chip>
        </div>
      </div>

      <Body className="pb-32">
        {tab === 'plan' ? (
          <>
            <p className="text-sm text-gray-600 mb-4 px-1">
              Επίλεξε το πλάνο που σου ταιριάζει. Ακύρωση οποτεδήποτε.
            </p>
            <div className="space-y-3">
              {PLANS.map((p) => <PlanCard key={p.id} plan={p} active={selectedPlan === p.id} onSelect={() => setSelectedPlan(p.id)} />)}
            </div>
          </>
        ) : (
          <>
            <Card className="p-4 bg-gradient-to-br from-amber-400 to-orange-500 text-white mb-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/90">Πώς λειτουργεί</p>
              <p className="mt-1 text-base font-extrabold">Boost = Featured στην κορυφή</p>
              <p className="mt-1 text-[12px] text-white/85">Η αγγελία σου εμφανίζεται πρώτη σε κάθε αναζήτηση εργαζόμενου.</p>
            </Card>
            <div className="space-y-3">
              {BOOSTS.map((b) => <BoostCard key={b.id} boost={b} active={selectedBoost === b.id} onSelect={() => setSelectedBoost(b.id)} />)}
            </div>
          </>
        )}
      </Body>

      <div
        className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-3"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
      >
        <Btn full size="lg">
          {tab === 'plan'
            ? `Συνδρομή ${PLANS.find((p) => p.id === selectedPlan)?.price}€/μήνα`
            : `Boost ${BOOSTS.find((b) => b.id === selectedBoost)?.price}€`}
        </Btn>
      </div>
    </div>
  );
}

function PlanCard({ plan, active, onSelect }: { plan: typeof PLANS[number]; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative w-full overflow-hidden rounded-2xl border-2 bg-white p-5 text-left transition-all ${
        active ? 'border-blue-500 ring-4 ring-blue-100 shadow-md' : 'border-gray-200'
      }`}
    >
      {plan.popular && (
        <span className="absolute right-4 top-4 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold text-white">
          POPULAR
        </span>
      )}
      <div className="flex items-baseline gap-2">
        <h3 className={`text-lg font-extrabold bg-gradient-to-r ${plan.color} bg-clip-text text-transparent`}>{plan.name}</h3>
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-3xl font-black text-gray-900">{plan.price}€</span>
        <span className="text-sm text-gray-500">{plan.period}</span>
      </div>
      <ul className="mt-3 space-y-1.5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[12px] text-gray-700">
            <span className="text-emerald-500">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {active && (
        <span className="absolute right-4 bottom-4 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="h-3.5 w-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      )}
    </button>
  );
}

function BoostCard({ boost, active, onSelect }: { boost: typeof BOOSTS[number]; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-2xl border-2 bg-white p-4 text-left transition-all ${
        active ? 'border-amber-400 ring-4 ring-amber-100 shadow-md' : 'border-gray-200'
      }`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-2xl">🚀</span>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-extrabold text-gray-900">{boost.name}</p>
          {boost.popular && <Badge tone="amber">POPULAR</Badge>}
        </div>
        <p className="mt-0.5 text-[12px] text-gray-500">
          {boost.days} μέρες · έως {boost.mult} views
        </p>
      </div>
      <p className="text-base font-black text-gray-900">{boost.price}€</p>
    </button>
  );
}
