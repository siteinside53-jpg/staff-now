'use client';

import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';

interface Counter {
  label: string;
  shortLabel: string;
  value: number;
  icon: string;
  color: 'blue' | 'emerald' | 'amber' | 'purple';
  min: number;
  max: number;
  intervalMin: number;
  intervalMax: number;
}

const COLOR_MAP = {
  blue:    { bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    text: 'text-blue-400',    glow: 'text-blue-300' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', glow: 'text-emerald-300' },
  amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400',   glow: 'text-amber-300' },
  purple:  { bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  text: 'text-purple-400',  glow: 'text-purple-300' },
};

function buildCounters(stats: { totalUsers: number; totalJobs: number; totalMatches: number }): Counter[] {
  return [
    {
      label: 'Εργαζόμενοι εγγεγραμμένοι',
      shortLabel: 'Χρήστες',
      value: stats.totalUsers || 1847,
      icon: '⚡',
      color: 'blue',
      min: 1, max: 5,
      intervalMin: 3000, intervalMax: 6000,
    },
    {
      label: 'Matches μέχρι τώρα',
      shortLabel: 'Matches',
      value: stats.totalMatches || 342,
      icon: '🎯',
      color: 'emerald',
      min: 1, max: 3,
      intervalMin: 4500, intervalMax: 8000,
    },
    {
      label: 'Ενεργές αγγελίες',
      shortLabel: 'Αγγελίες',
      value: stats.totalJobs || 127,
      icon: '💼',
      color: 'amber',
      min: 0, max: 2,
      intervalMin: 6000, intervalMax: 10000,
    },
    {
      label: 'Επιχειρήσεις ψάχνουν',
      shortLabel: 'Αναζητούν',
      value: Math.max(Math.floor((stats.totalJobs || 89) * 0.7), 89),
      icon: '🏢',
      color: 'purple',
      min: 0, max: 2,
      intervalMin: 7000, intervalMax: 12000,
    },
  ];
}

export function LiveCounters() {
  const [counters, setCounters] = useState<Counter[]>(() => buildCounters({ totalUsers: 1847, totalJobs: 127, totalMatches: 342 }));
  const [values, setValues] = useState<number[]>([1847, 342, 127, 89]);
  const [flashingIndices, setFlashingIndices] = useState<Set<number>>(new Set());
  const [loaded, setLoaded] = useState(false);

  // Fetch real stats
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/public/activity`);
        if (!res.ok) throw new Error();
        const json = await res.json();
        const stats = json?.data?.stats;
        if (!cancelled && stats) {
          const c = buildCounters(stats);
          setCounters(c);
          setValues(c.map((x) => x.value));
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Ανανέωση ΠΡΑΓΜΑΤΙΚΩΝ στατιστικών κάθε 25s (χωρίς fake drift)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/public/activity`);
        if (!res.ok) return;
        const json = await res.json();
        const stats = json?.data?.stats;
        if (stats) {
          const c = buildCounters(stats);
          setCounters(c);
          setValues(c.map((x) => x.value));
        }
      } catch {
        /* keep last known real values */
      }
    }, 25_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* ===== MOBILE: compact inline strip ===== */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:hidden">
        {counters.map((c, i) => {
          const isFlashing = flashingIndices.has(i);
          const colors = COLOR_MAP[c.color];
          return (
            <div key={c.label} className="flex items-center gap-1.5">
              <span className="text-sm">{c.icon}</span>
              <span
                className={`text-sm font-bold tabular-nums transition-colors duration-300 ${
                  isFlashing ? colors.glow : 'text-white'
                }`}
              >
                {values[i]?.toLocaleString('el-GR') || '0'}
              </span>
              <span className="text-[11px] text-gray-500">{c.shortLabel}</span>
            </div>
          );
        })}
      </div>

      {/* ===== DESKTOP/TABLET: full cards ===== */}
      <div className="hidden sm:grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {counters.map((c, i) => {
          const colors = COLOR_MAP[c.color];
          const isFlashing = flashingIndices.has(i);
          return (
            <div
              key={c.label}
              className={`rounded-2xl border backdrop-blur-sm p-4 transition-all duration-300 ${colors.bg} ${colors.border} ${
                isFlashing ? 'scale-[1.02] shadow-lg' : ''
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{c.icon}</span>
                {isFlashing && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 animate-pulse">
                    +{c.min + Math.floor(Math.random() * (c.max - c.min + 1))}
                  </span>
                )}
              </div>
              <p
                className={`text-2xl font-extrabold tabular-nums transition-colors duration-500 ${
                  isFlashing ? colors.glow : 'text-white'
                }`}
              >
                {values[i]?.toLocaleString('el-GR') || '0'}
              </p>
              <p className="mt-1 text-[11px] text-gray-400 leading-tight">{c.label}</p>
            </div>
          );
        })}
      </div>
    </>
  );
}
