'use client';

import { useEffect, useState } from 'react';
import { MetricCard } from '@/components/admin/ui/metric-card';
import { adminApi } from '@/components/admin/lib/admin-api';

// The PLAN_CONFIG mirrors `packages/config/src/plans.ts` so the admin
// dashboard always reflects the live billing tiers. Prices are monthly
// EUR — yearly is shown elsewhere.
const PLAN_CONFIG: Record<
  string,
  { name: string; price: number; color: 'emerald' | 'blue' | 'purple' | 'amber' }
> = {
  business_basic:   { name: 'Business Starter', price: 29,   color: 'emerald' },
  business_pro:     { name: 'Business Pro',     price: 79,   color: 'blue' },
  business_elite:   { name: 'Business Elite',   price: 149,  color: 'purple' },
  worker_premium:   { name: 'Worker Premium',   price: 4.99, color: 'amber' },
};

interface PlanRow {
  plan_id: string;
  status: string;
  count: number;
}

export default function SubscriptionsPage() {
  const [data, setData] = useState<{ byPlan: PlanRow[]; totals: { active: number; canceled: number }; activePlans: PlanRow[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getSubscriptions()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Compute per-plan stats from byPlan
  const planStats = Object.keys(PLAN_CONFIG).map((planId) => {
    const cfg = PLAN_CONFIG[planId];
    const active = data?.byPlan.find((p) => p.plan_id === planId && p.status === 'active')?.count || 0;
    const trial = data?.byPlan.find((p) => p.plan_id === planId && p.status === 'trialing')?.count || 0;
    const canceled = data?.byPlan.find((p) => p.plan_id === planId && p.status === 'canceled')?.count || 0;
    return { id: planId, ...cfg, active, trial, churn: canceled };
  });

  const totalActive = data?.totals.active || 0;
  const totalCanceled = data?.totals.canceled || 0;
  const mrr = planStats.reduce((s, p) => s + p.active * p.price, 0);
  const arpu = totalActive > 0 ? mrr / totalActive : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="MRR"
          value={`${mrr.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€`}
          icon="💰"
          tone="success"
          loading={loading}
        />
        <MetricCard label="Ενεργές συνδρομές" value={totalActive} icon="🎟️" tone="info" loading={loading} />
        <MetricCard label="Canceled" value={totalCanceled} icon="❌" tone="default" loading={loading} />
        <MetricCard
          label="ARPU"
          value={`${arpu.toFixed(2)}€`}
          icon="👤"
          context="μέσο έσοδο / χρήστη"
          tone="info"
          loading={loading}
        />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">Συνδρομητικά plans</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {planStats.map((plan) => {
            const planMrr = plan.active * plan.price;
            const dotColor =
              plan.color === 'emerald'
                ? 'bg-emerald-500'
                : plan.color === 'blue'
                  ? 'bg-blue-500'
                  : plan.color === 'purple'
                    ? 'bg-purple-500'
                    : 'bg-amber-500';
            return (
              <div key={plan.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
                    <h3 className="text-base font-bold text-gray-900">{plan.name}</h3>
                  </div>
                  <span className="text-lg font-bold text-gray-900">
                    {plan.price}€<span className="text-xs font-normal text-gray-400">/μήνα</span>
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{plan.active}</p>
                    <p className="text-[10px] font-semibold uppercase text-gray-500">Ενεργές</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-600">{plan.trial}</p>
                    <p className="text-[10px] font-semibold uppercase text-gray-500">Trial</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{plan.churn}</p>
                    <p className="text-[10px] font-semibold uppercase text-gray-500">Canceled</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-500">MRR αυτού του plan</span>
                  <span className="text-sm font-bold text-emerald-700">
                    {planMrr.toLocaleString('el-GR', { minimumFractionDigits: 2 })}€
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">Σύνοψη</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-emerald-50 p-4 border border-emerald-100">
            <p className="text-xs font-semibold text-emerald-700 uppercase">Active subscribers</p>
            <p className="mt-1 text-2xl font-bold text-emerald-900">{totalActive}</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-4 border border-amber-100">
            <p className="text-xs font-semibold text-amber-700 uppercase">In trial</p>
            <p className="mt-1 text-2xl font-bold text-amber-900">{planStats.reduce((s, p) => s + p.trial, 0)}</p>
          </div>
          <div className="rounded-lg bg-red-50 p-4 border border-red-100">
            <p className="text-xs font-semibold text-red-700 uppercase">Canceled (lifetime)</p>
            <p className="mt-1 text-2xl font-bold text-red-900">{totalCanceled}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
