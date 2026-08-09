'use client';

import { useCallback, useState } from 'react';
import { usePoll } from '@/lib/use-poll';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';

/**
 * Dev-only demo stats. Στο localhost το production API μπλοκάρεται από CORS,
 * οπότε δείχνουμε αντιπροσωπευτικούς αριθμούς για να φαίνεται το section όπως
 * στο staffnow.gr. Το branch `NODE_ENV !== 'production'` κάνει tree-shake σε
 * production build — ΔΕΝ φτάνει ποτέ στους πραγματικούς χρήστες.
 */
const DEV_DEMO_STATS =
  process.env.NODE_ENV !== 'production'
    ? { totalUsers: 130, totalJobs: 10, totalMatches: 6, totalBusinesses: 34 }
    : null;

interface Counter {
  label: string;
  shortLabel: string;
  value: number;
  icon: string;
  color: 'blue' | 'emerald' | 'amber' | 'purple';
}

const COLOR_MAP = {
  blue:    { bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    text: 'text-blue-400',    glow: 'text-blue-300' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', glow: 'text-emerald-300' },
  amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400',   glow: 'text-amber-300' },
  purple:  { bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  text: 'text-purple-400',  glow: 'text-purple-300' },
};

function buildCounters(stats: { totalUsers: number; totalJobs: number; totalMatches: number; totalBusinesses?: number }): Counter[] {
  return [
    {
      label: 'Χρήστες εγγεγραμμένοι',
      shortLabel: 'Χρήστες',
      value: stats.totalUsers || 0,
      icon: '⚡',
      color: 'blue',
    },
    {
      label: 'Matches μέχρι τώρα',
      shortLabel: 'Matches',
      value: stats.totalMatches || 0,
      icon: '🎯',
      color: 'emerald',
    },
    {
      label: 'Ενεργές αγγελίες',
      shortLabel: 'Αγγελίες',
      value: stats.totalJobs || 0,
      icon: '💼',
      color: 'amber',
    },
    {
      label: 'Επιχειρήσεις εγγεγραμμένες',
      shortLabel: 'Επιχειρήσεις',
      value: stats.totalBusinesses || 0,
      icon: '🏢',
      color: 'purple',
    },
  ];
}

export function LiveCounters() {
  // Production: ξεκινά κρυφό, γεμίζει με πραγματικά δεδομένα.
  // Dev: ξεκινά με demo ώστε το localhost να δείχνει το ίδιο section με το staffnow.gr.
  const [counters, setCounters] = useState<Counter[] | null>(
    DEV_DEMO_STATS ? buildCounters(DEV_DEMO_STATS) : null,
  );
  const [values, setValues] = useState<number[]>(
    DEV_DEMO_STATS ? buildCounters(DEV_DEMO_STATS).map((c) => c.value) : [],
  );

  // Ανανέωση ΠΡΑΓΜΑΤΙΚΩΝ στατιστικών κάθε 25s (χωρίς fake drift).
  // Το usePoll κάνει το πρώτο φόρτωμα, παύει όταν η καρτέλα είναι κρυφή και
  // υποχωρεί αν ο server μας μπλοκάρει.
  const load = useCallback(async () => {
    const res = await fetch(`${API_BASE}/public/activity`);
    if (res.status === 429) throw Object.assign(new Error('rate limited'), { status: 429 });
    if (!res.ok) return; // κανένα fake — κρατάμε τις τελευταίες πραγματικές τιμές
    const json = await res.json();
    const stats = json?.data?.stats;
    if (stats) {
      const c = buildCounters(stats);
      setCounters(c);
      setValues(c.map((x) => x.value));
    }
  }, []);
  usePoll(load, 25_000);

  // Κρύβεται τελείως αν δεν υπάρχουν πραγματικά δεδομένα (ή όλα 0)
  if (!counters || values.every((v) => !v)) return null;

  return (
    <>
      {/* ===== MOBILE: compact inline strip ===== */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:hidden">
        {counters.map((c, i) => {
          return (
            <div key={c.label} className="flex items-center gap-1.5">
              <span className="text-sm">{c.icon}</span>
              <span className="text-sm font-bold tabular-nums text-white">
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
          return (
            <div
              key={c.label}
              className={`rounded-2xl border backdrop-blur-sm p-4 ${colors.bg} ${colors.border}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{c.icon}</span>
              </div>
              <p className="text-2xl font-extrabold tabular-nums text-white">
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
