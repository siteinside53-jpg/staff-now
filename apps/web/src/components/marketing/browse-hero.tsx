'use client';

import { useEffect, useState } from 'react';
import { API_URL } from '@/lib/config';

/**
 * Το χρωματιστό «καπέλο» των σελίδων /find-job και /find-staff, στο στιλ του
 * app2/version4/browse.
 *
 * ΣΗΜΑΝΤΙΚΟ: σε αντίθεση με το mockup του version4 (που είχε σταθερούς αριθμούς
 * τύπου «50.000+ εργαζόμενοι» και τυχαίο online counter), εδώ ΟΛΑ τα νούμερα
 * έρχονται από το /public/activity και είναι πραγματικά. Ό,τι δεν υπάρχει,
 * απλώς δεν εμφανίζεται — κανένα fake.
 */

type Stats = {
  totalJobs: number;
  totalWorkers: number;
  onlineNow: number;
};

type ActivityItem = {
  type: string;
  text: string;
  location?: string;
};

const ACCENT = {
  emerald: {
    band: 'from-emerald-600 via-teal-600 to-cyan-600',
    marquee: 'text-emerald-300',
  },
  blue: {
    band: 'from-blue-600 via-indigo-700 to-purple-700',
    marquee: 'text-blue-300',
  },
} as const;

export function BrowseHero({
  accent,
  metric,
  icon,
  noun,
  headline,
  subtitle,
}: {
  accent: keyof typeof ACCENT;
  /** Ποιο πραγματικό μέγεθος δείχνει ο μεγάλος αριθμός */
  metric: 'jobs' | 'workers';
  icon: string;
  /** π.χ. ['θέση εργασίας', 'θέσεις εργασίας'] */
  noun: [string, string];
  /** Τίτλος όταν δεν έχουμε ακόμα αριθμούς */
  headline: string;
  subtitle: string;
}) {
  const a = ACCENT[accent];
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/public/activity`);
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        if (json?.data?.stats) setStats(json.data.stats);
        if (Array.isArray(json?.data?.activity)) setActivity(json.data.activity);
      } catch {
        /* κανένα fake — ο τίτλος μένει χωρίς αριθμό */
      }
    };

    load();

    // Ανανέωση μόνο όσο η καρτέλα είναι ορατή, ώστε να μη φορτώνουμε το API
    // με ανοιχτές αλλά αδρανείς καρτέλες.
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 30_000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const count = stats ? (metric === 'jobs' ? stats.totalJobs : stats.totalWorkers) : 0;
  const online = stats?.onlineNow ?? 0;

  const messages = activity
    .map((x) => {
      const loc = x.location ? ` · ${x.location}` : '';
      return `${x.type === 'signup' ? '🟢' : '💼'} ${x.text}${loc}`;
    })
    .filter(Boolean);

  return (
    <div className={`overflow-hidden rounded-3xl bg-gradient-to-br ${a.band} text-white shadow-xl`}>
      <div className="px-5 py-6 sm:px-8 sm:py-8">
        <h1 className="text-2xl font-black leading-tight sm:text-3xl lg:text-4xl">
          {count > 0
            ? `${icon} ${count.toLocaleString('el-GR')} ${count === 1 ? noun[0] : noun[1]}`
            : `${icon} ${headline}`}
        </h1>
        <p className="mt-1.5 text-sm text-white/85 sm:text-base">{subtitle}</p>

        {online > 0 && (
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 backdrop-blur">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-300" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-300" />
              </span>
              <span className="font-bold tabular-nums">{online.toLocaleString('el-GR')}</span>
              online τώρα
            </span>
          </div>
        )}
      </div>

      {/* Ταινία πραγματικής δραστηριότητας — κρύβεται αν δεν υπάρχει τίποτα */}
      {messages.length > 0 && (
        <div className="overflow-hidden border-t border-white/10 bg-black/25 py-2">
          <div
            className="relative flex whitespace-nowrap"
            style={{ animation: 'browse-marquee 90s linear infinite', width: 'max-content' }}
          >
            {[...messages, ...messages].map((m, i) => (
              <span key={i} className={`mx-6 text-xs font-medium ${a.marquee}`}>
                {m}
              </span>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes browse-marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}

/** Η μπάντα με τα 3 μικρά νούμερα κάτω από το hero. Δέχεται μόνο υπολογισμένες τιμές. */
export function BrowseStatBand({
  stats,
}: {
  stats: { label: string; value: string; color: string }[];
}) {
  if (stats.length === 0) return null;
  // Σταθερές κλάσεις (όχι δυναμικές) ώστε να μη τις κόψει το Tailwind.
  const cols = stats.length === 1 ? 'grid-cols-1' : stats.length === 2 ? 'grid-cols-2' : 'grid-cols-3';
  return (
    <div className={`mb-4 grid ${cols} gap-2 sm:gap-3`}>
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-2.5 text-center shadow-sm">
          <p className={`text-sm font-black sm:text-base ${s.color}`}>{s.value}</p>
          <p className="text-[10px] font-medium leading-tight text-gray-500 sm:text-[11px]">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
