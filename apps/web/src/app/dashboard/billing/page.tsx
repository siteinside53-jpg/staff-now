'use client';

/**
 * /dashboard/billing — user-facing billing & subscription dashboard.
 *
 *  • Workers  → "δωρεάν, καμία χρέωση". Τέλος.
 *  • Businesses → SubscriptionSection (current plan, profile, history, invoices)
 *                  + secondary "credits add-on" expander για όσους θέλουν
 *                    extra usage πέρα από το πλάνο τους.
 */

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { SubscriptionSection } from '@/components/billing/subscription-section';
import { WorkerBillingSection } from '@/components/billing/worker-billing-section';
import { FoundingMembersCard } from '@/components/billing/founding-members-card';
import { useT } from '@/i18n/locale-provider';

export default function BillingPage() {
  const t = useT();
  const { user } = useAuth();
  const isWorker = user?.role === 'worker';

  // ---------------- Worker view ----------------
  if (isWorker) {
    return (
      <div className="max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t('billingPage.workerTitle')}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {t('billingPage.workerSubtitle')}
          </p>
        </div>
        <WorkerBillingSection />
      </div>
    );
  }

  // ---------------- Business view ----------------
  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('billingPage.businessTitle')}</h1>
        <p className="mt-1 text-sm text-gray-600">
          {t('billingPage.businessSubtitle')}
        </p>
      </div>

      <FoundingMembersCard />

      <SubscriptionSection />

      {/* ====== Compare-plans CTA ====== */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-blue-900">{t('billingPage.thinkingUpgrade')}</p>
          <p className="text-xs text-blue-700">{t('billingPage.comparePlans')}</p>
        </div>
        <Link
          href="/pricing"
          className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
        >
          {t('billingPage.seeAllPlans')}
        </Link>
      </div>
    </div>
  );
}
