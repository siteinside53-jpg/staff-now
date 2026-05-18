'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useCredits } from './credits-context';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Optional: what action triggered the modal (for context messaging) */
  trigger?: { action: string; label: string; cost: number };
}

export function PricingModal({ open, onClose, trigger }: Props) {
  const { balance, packages, buyPackage } = useCredits();
  const [loading, setLoading] = useState<string | null>(null);

  if (!open) return null;

  const handleBuy = async (packageId: string) => {
    setLoading(packageId);
    try {
      const result = await buyPackage(packageId);
      if (result.ok) {
        toast.success(result.message || 'Credits αγοράστηκαν! 🎉');
        onClose();
      } else {
        toast.error(result.message || 'Αποτυχία αγοράς');
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto p-4">
        <div className="relative w-full max-w-lg animate-in zoom-in-95 fade-in duration-300">
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute -top-3 -right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-600 shadow-lg hover:bg-gray-50"
          >
            ✕
          </button>

          <div className="rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-2xl shadow-lg">
                💎
              </div>
              <h2 className="text-xl font-extrabold text-gray-900">
                {trigger ? 'Χρειάζεσαι credits' : 'Αγορά Credits'}
              </h2>
              {trigger && (
                <p className="mt-1 text-sm text-gray-600">
                  Η ενέργεια <span className="font-bold text-gray-900">"{trigger.label}"</span> κοστίζει{' '}
                  <span className="font-bold text-amber-600">{trigger.cost} credits</span>.
                  Έχεις{' '}
                  <span className={`font-bold ${balance >= trigger.cost ? 'text-emerald-600' : 'text-red-600'}`}>
                    {balance}
                  </span>.
                </p>
              )}
              {!trigger && (
                <p className="mt-1 text-sm text-gray-500">
                  Τρέχον υπόλοιπο:{' '}
                  <span className="font-bold text-gray-900">{balance} 💎</span>
                </p>
              )}
            </div>

            {/* Packages */}
            <div className="space-y-3">
              {packages.map((pkg, i) => {
                const isPopular = i === 1; // 15 credits = popular
                const isBest = i === 2;    // 50 credits = best value
                return (
                  <button
                    key={pkg.id}
                    onClick={() => handleBuy(pkg.id)}
                    disabled={loading !== null}
                    className={`relative flex w-full items-center justify-between rounded-2xl border-2 p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] disabled:opacity-50 ${
                      isPopular
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : isBest
                          ? 'border-amber-400 bg-amber-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    {/* Popular/Best badge */}
                    {isPopular && (
                      <span className="absolute -top-2.5 left-4 rounded-full bg-blue-600 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                        Δημοφιλές
                      </span>
                    )}
                    {isBest && (
                      <span className="absolute -top-2.5 left-4 rounded-full bg-amber-500 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                        Καλύτερη αξία
                      </span>
                    )}

                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold ${
                        isPopular ? 'bg-blue-600 text-white' : isBest ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {pkg.credits}
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-gray-900">{pkg.credits} credits</p>
                        <p className="text-xs text-gray-500">{pkg.perCredit} / credit</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-extrabold text-gray-900">{pkg.priceDisplay}</p>
                      {i > 0 && (
                        <p className="text-[10px] font-bold text-emerald-600">
                          -{Math.round((1 - pkg.price / pkg.credits / (packages[0].price / packages[0].credits)) * 100)}%
                        </p>
                      )}
                    </div>

                    {loading === pkg.id && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/80">
                        <div className="h-6 w-6 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-[10px] text-gray-400">
                Ασφαλής πληρωμή μέσω Stripe · Δεν αποθηκεύουμε δεδομένα κάρτας · Χωρίς συνδρομή
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
