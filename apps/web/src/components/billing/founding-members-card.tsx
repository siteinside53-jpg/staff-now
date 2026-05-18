'use client';

/**
 * Eye-catching CTA card for the dashboard billing page.
 *
 * Behavior:
 *   - Fetches /billing/founding-spots (public endpoint).
 *   - If remaining > 0 → renders the animated CTA card.
 *   - If remaining === 0 → renders the "ολοκληρώθηκε" notice (less flashy).
 *   - If fetch fails → renders nothing (graceful degradation).
 *
 * The animation budget is intentionally cheap:
 *   - One CSS conic gradient that rotates (border-glow).
 *   - One pulsing flame.
 *   - One progress bar that animates as state changes.
 */

import { useEffect, useState } from 'react';

interface Spots {
  total: number;
  used: number;
  pending: number;
  remaining: number;
  available: boolean;
}

export function FoundingMembersCard({ onClaim }: { onClaim?: () => void }) {
  const [spots, setSpots] = useState<Spots | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';
    fetch(`${API}/billing/founding-spots`)
      .then((r) => r.json())
      .then((j: any) => {
        if (j?.success && j.data) setSpots(j.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !spots) return null;

  if (!spots.available) {
    return (
      <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-center">
        <p className="text-sm font-semibold text-gray-700">
          ✅ Η προσφορά Founding Members ολοκληρώθηκε — και οι 100 θέσεις γέμισαν.
        </p>
      </div>
    );
  }

  const filledPct = Math.min(100, ((spots.used + spots.pending) / spots.total) * 100);

  const handleClick = async () => {
    if (onClaim) {
      onClaim();
      return;
    }
    try {
      const token = localStorage.getItem('staffnow_token');
      const API = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';
      const res = await fetch(`${API}/billing/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          planId: 'founding_pro',
          period: 'monthly',
          successUrl: `${window.location.origin}/dashboard/billing?founding=1`,
          cancelUrl: `${window.location.origin}/dashboard/billing`,
        }),
      });
      const j: any = await res.json();
      if (j?.data?.url) {
        window.location.href = j.data.url;
      } else if (j?.error?.message) {
        alert(j.error.message);
      }
    } catch {
      window.location.href = '/pricing#founding';
    }
  };

  return (
    <>
      <style jsx>{`
        @keyframes flame {
          0%, 100% {
            transform: scale(1) rotate(-3deg);
          }
          50% {
            transform: scale(1.15) rotate(3deg);
          }
        }
        @keyframes shine {
          to {
            background-position: 200% center;
          }
        }
        @keyframes pop-in {
          0% {
            transform: scale(0.85);
            opacity: 0;
          }
          60% {
            transform: scale(1.04);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes pop-glow {
          0% {
            box-shadow: 0 0 0 0 rgba(251, 146, 60, 0);
          }
          15% {
            box-shadow: 0 0 0 12px rgba(251, 146, 60, 0.45);
          }
          70% {
            box-shadow: 0 0 0 20px rgba(251, 146, 60, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(251, 146, 60, 0);
          }
        }
        @keyframes urgent-pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(217, 119, 6, 0.5);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(217, 119, 6, 0);
          }
        }
        .pop-in {
          position: relative;
          border-radius: 1rem;
          border: 2px solid #fbbf24;
          background: linear-gradient(135deg, #fff7ed 0%, #fef3c7 50%, #fffbeb 100%);
          animation: pop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both,
                     pop-glow 1.2s ease-out 0.3s both;
        }
        .flame {
          display: inline-block;
          animation: flame 1.4s ease-in-out infinite;
          transform-origin: center bottom;
          filter: drop-shadow(0 0 6px rgba(251, 146, 60, 0.6));
        }
        .shine-text {
          background: linear-gradient(
            90deg,
            #92400e 0%,
            #f59e0b 25%,
            #fb923c 50%,
            #f59e0b 75%,
            #92400e 100%
          );
          background-size: 200% auto;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shine 3s linear infinite;
        }
        .cta-btn {
          animation: urgent-pulse 2s ease-out infinite;
        }
      `}</style>

      <div className="mb-6 pop-in">
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-3 sm:gap-4">
            {/* Flame */}
            <div className="flex-shrink-0">
              <span className="flame text-4xl sm:text-5xl">🔥</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-amber-600 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-sm">
                  Founding Members
                </span>
                <span className="rounded-full bg-red-100 border border-red-200 px-2.5 py-0.5 text-[10px] font-bold text-red-700">
                  ⚡ ΠΕΡΙΟΡΙΣΜΕΝΕΣ ΘΕΣΕΙΣ
                </span>
              </div>

              <h3 className="mt-2 text-xl sm:text-2xl font-extrabold leading-tight">
                <span className="shine-text">39€/μήνα για πάντα</span>
                <span className="text-gray-900"> — αντί 79€</span>
              </h3>

              <p className="mt-1 text-sm text-amber-900">
                Πρώτοι <strong>{spots.total}</strong> πελάτες κλειδώνουν το Pro plan για πάντα στα 39€.
                {' '}<strong>Lifetime grandfathered</strong> — δεν αλλάζει η τιμή ποτέ.
              </p>

              {/* Progress */}
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-2 overflow-hidden rounded-full bg-amber-100">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 transition-all duration-1000"
                    style={{ width: `${filledPct}%` }}
                  />
                </div>
                <p className="text-xs font-bold text-amber-900 whitespace-nowrap">
                  Έμειναν <span className="text-base text-red-600">{spots.remaining}</span>/{spots.total}
                </p>
              </div>

              {/* CTA */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  onClick={handleClick}
                  className="cta-btn inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:from-amber-700 hover:to-orange-700 transition-colors"
                >
                  Πάρε τη θέση σου τώρα
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>
                <span className="text-xs text-amber-800">✓ Ακύρωση όποτε θες · ✓ 30 ημέρες δοκιμή</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
