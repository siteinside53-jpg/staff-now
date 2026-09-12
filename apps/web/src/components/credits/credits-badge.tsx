'use client';

import { useState } from 'react';
import { useCredits } from './credits-context';
import { PricingModal } from './pricing-modal';
import { useT } from '@/i18n/locale-provider';

/**
 * Small badge showing credit balance. Click to open pricing modal.
 * Designed for dashboard header / sidebar.
 */
export function CreditsBadge() {
  const t = useT();
  const { balance, loading } = useCredits();
  const [showPricing, setShowPricing] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowPricing(true)}
        className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1.5 text-xs font-bold text-white shadow-md hover:shadow-lg hover:scale-105 transition-all"
        title={t('creditsUi.badgeTitle')}
      >
        <span>💎</span>
        <span className="tabular-nums">
          {loading ? '...' : balance}
        </span>
      </button>

      <PricingModal open={showPricing} onClose={() => setShowPricing(false)} />
    </>
  );
}
