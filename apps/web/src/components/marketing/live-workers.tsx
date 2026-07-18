'use client';

import { useEffect, useState, useCallback } from 'react';

/* ── Image-with-fallback ───────────────────────────
 * Renders an <img>; if it fails to load (404, decode error, etc.) silently
 * swaps to the supplied initials/letter placeholder so broken upload URLs
 * never leave a blank avatar in the live preview.
 */
function AvatarImg({ src, alt, fallback, className, fallbackClassName }: {
  src: string;
  alt: string;
  fallback: React.ReactNode;
  className: string;
  fallbackClassName: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className={fallbackClassName}>{fallback}</div>;
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';

/* ── Types ─────────────────────────────────────── */

interface Worker {
  id: string;
  name: string;
  role: string;
  rating?: number;
  exp: string;
  initials: string;
  color: string;
  city: string;
  photo?: string | null;
}

interface Job {
  id: string;
  title: string;
  company: string;
  city: string;
  salary: string;
  type: string;
  color: string;
  logo?: string | null;
}

/* ── Helpers ───────────────────────────────────── */

const COLORS = [
  'bg-pink-100 text-pink-700', 'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700', 'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700', 'bg-cyan-100 text-cyan-700',
  'bg-rose-100 text-rose-700', 'bg-indigo-100 text-indigo-700',
];

const TYPE_COLORS: Record<string, string> = {
  seasonal: 'bg-amber-50 text-amber-700',
  full_time: 'bg-blue-50 text-blue-700',
  part_time: 'bg-purple-50 text-purple-700',
  freelance: 'bg-emerald-50 text-emerald-700',
};

const TYPE_LABELS: Record<string, string> = {
  seasonal: 'Σεζόν', full_time: 'Full-time', part_time: 'Part-time', freelance: 'Freelance',
};

const ROLE_LABELS: Record<string, string> = {
  waiter: 'Σερβιτόρος/α', chef: 'Σεφ', bartender: 'Bartender',
  receptionist: 'Ρεσεψιονίστ', housekeeper: 'Καμαριέρα',
  cook: 'Μάγειρας', barista: 'Barista', driver: 'Οδηγός',
  sales: 'Πωλητής', warehouse: 'Αποθηκάριος', cleaner: 'Καθαριστής',
};

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function expLabel(years: number | null): string {
  if (!years || years <= 0) return 'Νέος/α';
  if (years === 1) return '1 χρόνος';
  return `${years} χρόνια`;
}

function pickRandom<T extends { id: string }>(pool: T[], count: number, excludeIds: Set<string> = new Set()): T[] {
  const available = pool.filter((w) => !excludeIds.has(w.id));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/* ── Dev-only demo lists ───────────────────────────
 * Στο localhost το production API μπλοκάρεται από CORS, οπότε δείχνουμε
 * αντιπροσωπευτικούς εργαζόμενους/θέσεις ώστε το live card να φαίνεται όπως
 * στο staffnow.gr. Tree-shaken σε production — ΔΕΝ φτάνει στους χρήστες.
 */
const DEV_DEMO_WORKERS: Worker[] =
  process.env.NODE_ENV !== 'production'
    ? [
        { id: 'dw1', name: 'Μαρία Κ.', role: 'Σερβιτόρος/α', exp: '3 χρόνια', initials: 'ΜΚ', color: COLORS[0], city: 'Θεσσαλονίκη' },
        { id: 'dw2', name: 'Γιώργος Π.', role: 'Μάγειρας', exp: '5 χρόνια', initials: 'ΓΠ', color: COLORS[1], city: 'Αθήνα' },
        { id: 'dw3', name: 'Ελένη Δ.', role: 'Ρεσεψιονίστ', exp: '2 χρόνια', initials: 'ΕΔ', color: COLORS[2], city: 'Ρόδος' },
        { id: 'dw4', name: 'Νίκος Α.', role: 'Bartender', exp: '4 χρόνια', initials: 'ΝΑ', color: COLORS[3], city: 'Μύκονος' },
        { id: 'dw5', name: 'Σοφία Μ.', role: 'Barista', exp: '1 χρόνος', initials: 'ΣΜ', color: COLORS[4], city: 'Πάτρα' },
        { id: 'dw6', name: 'Δημήτρης Ρ.', role: 'Οδηγός', exp: '6 χρόνια', initials: 'ΔΡ', color: COLORS[5], city: 'Λάρισα' },
      ]
    : [];

const DEV_DEMO_JOBS: Job[] =
  process.env.NODE_ENV !== 'production'
    ? [
        { id: 'dj1', title: 'Σερβιτόρος/α', company: 'Sunset Beach Bar', city: 'Μύκονος', salary: '1000-1300€', type: 'Σεζόν', color: TYPE_COLORS.seasonal },
        { id: 'dj2', title: 'Μάγειρας', company: 'Taverna Ελιά', city: 'Αθήνα', salary: '1400-1800€', type: 'Full-time', color: TYPE_COLORS.full_time },
        { id: 'dj3', title: 'Ρεσεψιονίστ', company: 'Aegean Hotel', city: 'Ρόδος', salary: '1100-1400€', type: 'Σεζόν', color: TYPE_COLORS.seasonal },
        { id: 'dj4', title: 'Πωλητής', company: 'Urban Store', city: 'Θεσσαλονίκη', salary: '900-1200€', type: 'Part-time', color: TYPE_COLORS.part_time },
        { id: 'dj5', title: 'Barista', company: 'Coffee Lab', city: 'Πάτρα', salary: '850-1050€', type: 'Full-time', color: TYPE_COLORS.full_time },
        { id: 'dj6', title: 'Καμαριέρα', company: 'Blue Villas', city: 'Κρήτη', salary: '1000-1250€', type: 'Σεζόν', color: TYPE_COLORS.seasonal },
      ]
    : [];

/* ── Component ─────────────────────────────────── */

export function LiveWorkersHeroCard() {
  const [tab, setTab] = useState<'workers' | 'jobs'>('workers');
  // Production: ξεκινά άδειο, γεμίζει μόνο με πραγματικά δεδομένα.
  // Dev: ξεκινά με demo ώστε το localhost να δείχνει το live card όπως το staffnow.gr.
  const [allWorkers, setAllWorkers] = useState<Worker[]>(DEV_DEMO_WORKERS);
  const [allJobs, setAllJobs] = useState<Job[]>(DEV_DEMO_JOBS);
  const [displayedWorkers, setDisplayedWorkers] = useState<Worker[]>(DEV_DEMO_WORKERS.slice(0, 4));
  const [displayedJobs, setDisplayedJobs] = useState<Job[]>(DEV_DEMO_JOBS.slice(0, 4));
  const [newWorkerIds, setNewWorkerIds] = useState<Set<string>>(new Set());
  const [newJobIds, setNewJobIds] = useState<Set<string>>(new Set());

  // Fetch real data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [wRes, jRes] = await Promise.all([
          fetch(`${API_BASE}/public/workers?limit=20`),
          fetch(`${API_BASE}/public/jobs?limit=20`),
        ]);

        if (wRes.ok) {
          const wJson = await wRes.json();
          const data = wJson?.data;
          if (Array.isArray(data) && data.length > 0 && !cancelled) {
            const real: Worker[] = data.map((w: any, i: number) => {
              const name = w.full_name || 'Χρήστης';
              const firstName = name.split(' ')[0];
              const lastInitial = name.split(' ')[1]?.[0] || '';
              const displayName = lastInitial ? `${firstName} ${lastInitial}.` : firstName;
              const roleKey = w.roles?.[0] || '';
              return {
                id: w.user_id || `rw_${i}`,
                name: displayName,
                role: ROLE_LABELS[roleKey] || roleKey || 'Εργαζόμενος',
                exp: expLabel(w.years_of_experience),
                initials: getInitials(name),
                color: COLORS[i % COLORS.length],
                city: w.city || w.region || '',
                photo: w.photo_url || null,
              };
            });
            setAllWorkers(real);
            setDisplayedWorkers(pickRandom(real, 4));
          }
        }

        if (jRes.ok) {
          const jJson = await jRes.json();
          const data = jJson?.data;
          if (Array.isArray(data) && data.length > 0 && !cancelled) {
            const real: Job[] = data.map((j: any, i: number) => {
              const salary = j.salary_min && j.salary_max
                ? `${j.salary_min}-${j.salary_max}€`
                : j.salary_min ? `${j.salary_min}€+` : '';
              return {
                id: j.id?.toString() || `rj_${i}`,
                title: j.title || 'Θέση εργασίας',
                company: j.display_company_name || j.company_name || 'Επιχείρηση',
                city: j.city || j.region || '',
                salary,
                type: TYPE_LABELS[j.employment_type] || j.employment_type || '',
                color: TYPE_COLORS[j.employment_type] || 'bg-blue-50 text-blue-700',
                logo: j.company_logo || null,
              };
            });
            setAllJobs(real);
            setDisplayedJobs(pickRandom(real, 4));
          }
        }
      } catch { /* κανένα fake — μένει άδειο μέχρι να έρθουν πραγματικά */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Auto-rotate tabs every 8s
  useEffect(() => {
    const interval = setInterval(() => {
      setTab((t) => (t === 'workers' ? 'jobs' : 'workers'));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Rotate one item every ~5s
  useEffect(() => {
    const interval = setInterval(() => {
      if (tab === 'workers') {
        setDisplayedWorkers((prev) => {
          const ids = new Set(prev.map((w) => w.id));
          const newW = pickRandom(allWorkers, 1, ids)[0];
          if (!newW) return prev;
          const idx = Math.floor(Math.random() * prev.length);
          const next = [...prev];
          next[idx] = newW;
          setNewWorkerIds((s) => new Set(s).add(newW.id));
          setTimeout(() => setNewWorkerIds((s) => { const n = new Set(s); n.delete(newW.id); return n; }), 3000);
          return next;
        });
      } else {
        setDisplayedJobs((prev) => {
          const ids = new Set(prev.map((j) => j.id));
          const newJ = pickRandom(allJobs, 1, ids)[0];
          if (!newJ) return prev;
          const idx = Math.floor(Math.random() * prev.length);
          const next = [...prev];
          next[idx] = newJ;
          setNewJobIds((s) => new Set(s).add(newJ.id));
          setTimeout(() => setNewJobIds((s) => { const n = new Set(s); n.delete(newJ.id); return n; }), 3000);
          return next;
        });
      }
    }, 5000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, [tab, allWorkers, allJobs]);

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/80 backdrop-blur p-6 shadow-2xl">
      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-xl bg-gray-800/50 p-1 mb-4">
        <button
          onClick={() => setTab('workers')}
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
            tab === 'workers' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
          }`}
        >
          👤 Εργαζόμενοι
        </button>
        <button
          onClick={() => setTab('jobs')}
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
            tab === 'jobs' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'
          }`}
        >
          💼 Θέσεις εργασίας
        </button>
      </div>

      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {tab === 'workers' ? 'Διαθέσιμοι τώρα' : 'Ανοιχτές θέσεις'}
        </p>
        <span className="flex items-center gap-1.5 text-[10px] text-emerald-400">
          <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      </div>

      {/* Workers list */}
      {tab === 'workers' && (
        <div className="space-y-2.5">
          {displayedWorkers.map((w) => {
            const isNew = newWorkerIds.has(w.id);
            return (
              <div
                key={w.id}
                className={`relative flex items-center gap-3 rounded-xl p-3 transition-all duration-500 ${
                  isNew ? 'bg-emerald-500/15 border border-emerald-500/30 scale-[1.02]' : 'bg-gray-800/50 hover:bg-gray-800'
                }`}
              >
                {isNew && (
                  <span className="absolute -top-1.5 -right-1.5 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-extrabold uppercase text-white shadow-lg animate-pulse">
                    ΝΕΟΣ
                  </span>
                )}
                {w.photo ? (
                  <AvatarImg
                    src={w.photo}
                    alt=""
                    fallback={w.initials}
                    className="h-10 w-10 flex-shrink-0 rounded-full object-cover ring-1 ring-white/10"
                    fallbackClassName={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${w.color}`}
                  />
                ) : (
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${w.color}`}>
                    {w.initials}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
                    {w.name}
                    <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                  </p>
                  <p className="text-xs text-gray-400 truncate">{w.role} · {w.exp}{w.city ? ` · ${w.city}` : ''}</p>
                </div>
                {w.rating != null && (
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-yellow-400">★</span>
                    <span className="text-white font-medium">{w.rating}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Jobs list */}
      {tab === 'jobs' && (
        <div className="space-y-2.5">
          {displayedJobs.map((j) => {
            const isNew = newJobIds.has(j.id);
            return (
              <div
                key={j.id}
                className={`relative flex items-center justify-between rounded-xl p-3 transition-all duration-500 ${
                  isNew ? 'bg-blue-500/15 border border-blue-500/30 scale-[1.02]' : 'bg-gray-800/50 hover:bg-gray-800'
                }`}
              >
                {isNew && (
                  <span className="absolute -top-1.5 -right-1.5 rounded-full bg-blue-500 px-2 py-0.5 text-[9px] font-extrabold uppercase text-white shadow-lg animate-pulse">
                    ΝΕΑ
                  </span>
                )}
                {j.logo ? (
                  <AvatarImg
                    src={j.logo}
                    alt=""
                    fallback={(j.company || '?')[0]?.toUpperCase()}
                    className="h-10 w-10 flex-shrink-0 rounded-lg object-cover ring-1 ring-white/10"
                    fallbackClassName="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-700 text-sm font-bold text-gray-300"
                  />
                ) : (
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-700 text-sm font-bold text-gray-300">
                    {(j.company || '?')[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1 ml-3">
                  <p className="text-sm font-semibold text-white truncate">{j.title}</p>
                  <p className="text-xs text-gray-400 truncate">{j.company}{j.city ? ` · ${j.city}` : ''}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  {j.salary && <p className="text-xs font-bold text-white">{j.salary}</p>}
                  {j.type && <span className={`inline-block mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${j.color}`}>{j.type}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CTA */}
      <a
        href={tab === 'workers' ? '/auth/register?role=business' : '/auth/register?role=worker'}
        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-colors ${
          tab === 'workers' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
        }`}
      >
        {tab === 'workers' ? 'Βρες προσωπικό' : 'Βρες δουλειά'}
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </a>
    </div>
  );
}

// Compat export
export function LiveWorkersGrid() { return null; }
