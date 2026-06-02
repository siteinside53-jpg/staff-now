'use client';

import { useEffect, useState } from 'react';
import { AuthGatePopup } from './auth-gate-popup';
import { API_URL } from '@/lib/config';

type Worker = {
  id: string;
  firstName: string;
  role: string | null;
  region: string;
  experienceYears: number;
  expectedSalary: number | null;
  verified: boolean;
  isPremium: boolean;
  isBoosted: boolean;
  avatarColor: string;
  initials: string;
};

const PALETTE = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-pink-100 text-pink-700',
  'bg-amber-100 text-amber-700',
  'bg-purple-100 text-purple-700',
  'bg-rose-100 text-rose-700',
];

function colorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i)) % 1000;
  return PALETTE[h % PALETTE.length] ?? PALETTE[0]!;
}

function initialsFrom(name: string) {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function roleLabel(role: string | null): string {
  if (!role) return 'Εργαζόμενος/η';
  const map: Record<string, string> = {
    waiter: 'Σερβιτόρος/α',
    barista: 'Barista',
    chef: 'Μάγειρας',
    maid: 'Καμαριέρα',
    receptionist: 'Ρεσεψιονίστ',
    bartender: 'Bartender',
    cleaner: 'Καθαρίστρια',
    kitchen_assistant: 'Βοηθός Κουζίνας',
    lifeguard: 'Ναυαγοσώστης',
    tour_guide: 'Ξεναγός',
    driver: 'Οδηγός',
    host: 'Host',
    sommelier: 'Sommelier',
    dj: 'DJ',
    animator: 'Animator',
    other: 'Εργαζόμενος/η',
  };
  return map[role] ?? role;
}

// Sample fallback ώστε η σελίδα να μη φαίνεται άδεια όταν είμαστε
// σε νωρίς στάδιο (καμία πραγματική εγγραφή ακόμη).
const SAMPLE: Worker[] = [
  {
    id: 'sample-1',
    firstName: 'Μαρία Κ.',
    role: 'waiter',
    region: 'Μύκονος',
    experienceYears: 5,
    expectedSalary: 1200,
    verified: true,
    isPremium: true,
    isBoosted: false,
    avatarColor: colorFor('sample-1'),
    initials: 'ΜΚ',
  },
  {
    id: 'sample-2',
    firstName: 'Αλέξης Ρ.',
    role: 'bartender',
    region: 'Σαντορίνη',
    experienceYears: 3,
    expectedSalary: 1350,
    verified: true,
    isPremium: false,
    isBoosted: true,
    avatarColor: colorFor('sample-2'),
    initials: 'ΑΡ',
  },
  {
    id: 'sample-3',
    firstName: 'Κώστας Δ.',
    role: 'chef',
    region: 'Κρήτη',
    experienceYears: 7,
    expectedSalary: 1800,
    verified: true,
    isPremium: false,
    isBoosted: false,
    avatarColor: colorFor('sample-3'),
    initials: 'ΚΔ',
  },
  {
    id: 'sample-4',
    firstName: 'Ελένη Μ.',
    role: 'receptionist',
    region: 'Αθήνα',
    experienceYears: 4,
    expectedSalary: 1100,
    verified: false,
    isPremium: false,
    isBoosted: false,
    avatarColor: colorFor('sample-4'),
    initials: 'ΕΜ',
  },
  {
    id: 'sample-5',
    firstName: 'Γιάννης Σ.',
    role: 'maid',
    region: 'Ρόδος',
    experienceYears: 2,
    expectedSalary: 950,
    verified: false,
    isPremium: false,
    isBoosted: false,
    avatarColor: colorFor('sample-5'),
    initials: 'ΓΣ',
  },
];

export function PublicWorkersList() {
  const [items, setItems] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateContext, setGateContext] = useState<{ workerId: string } | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/public/workers?limit=20`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { success: boolean; data: any[] }) => {
        if (!active) return;
        const raw = Array.isArray(d?.data) ? d.data : [];
        if (raw.length === 0) {
          setItems(SAMPLE);
          return;
        }
        setItems(
          raw.map((r) => ({
            id: r.id,
            firstName: r.firstName,
            role: r.role ?? null,
            region: r.region ?? 'Ελλάδα',
            experienceYears: Number(r.experienceYears ?? 0),
            expectedSalary: r.expectedSalary ?? null,
            verified: !!r.verified,
            isPremium: !!r.isPremium,
            isBoosted: !!r.isBoosted,
            avatarColor: colorFor(r.id),
            initials: initialsFrom(r.firstName),
          })),
        );
      })
      .catch(() => {
        if (active) setItems(SAMPLE);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl bg-white border border-gray-100"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-center text-gray-500">
        Δεν υπάρχουν διαθέσιμοι εργαζόμενοι αυτή τη στιγμή.
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {items.map((w) => (
          <li key={w.id}>
            <button
              type="button"
              onClick={() => {
                setGateContext({ workerId: w.id });
                setGateOpen(true);
              }}
              className="w-full flex items-center gap-4 rounded-2xl bg-white p-4 sm:p-5 shadow-sm border border-gray-100 hover:border-blue-300 hover:shadow-md transition text-left"
              aria-label={`Δες προφίλ ${w.firstName}`}
            >
              <div
                className={`flex h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0 items-center justify-center rounded-full font-bold text-lg ${w.avatarColor}`}
                aria-hidden="true"
              >
                {w.initials}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-gray-900 truncate">{w.firstName}</p>
                  {w.verified && (
                    <span
                      className="text-blue-600 text-xs font-semibold"
                      title="Επαληθευμένος"
                    >
                      ✓ Επαληθευμένος
                    </span>
                  )}
                  {w.isPremium && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                      PREMIUM
                    </span>
                  )}
                  {w.isBoosted && (
                    <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">
                      BOOSTED
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 truncate">
                  <span className="font-semibold">{roleLabel(w.role)}</span>
                  {' · '}
                  {w.region}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {w.experienceYears} χρόν
                  {w.experienceYears === 1 ? 'ος' : 'ια'} εμπειρία
                  {w.expectedSalary
                    ? ` · Από ${Math.round(w.expectedSalary)}€/μήνα`
                    : ''}
                </p>
              </div>

              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <span className="hidden sm:inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white">
                  Δες προφίλ →
                </span>
                <span className="sm:hidden text-gray-400 text-2xl leading-none">›</span>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <AuthGatePopup
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        role="business"
        action="profile"
        redirectAfter={
          gateContext
            ? `/dashboard/discover?focus=${encodeURIComponent(gateContext.workerId)}`
            : '/dashboard'
        }
      />
    </>
  );
}
