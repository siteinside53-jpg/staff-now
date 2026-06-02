'use client';

import { useEffect, useState } from 'react';
import { AuthGatePopup } from './auth-gate-popup';
import { API_URL } from '@/lib/config';

type Job = {
  id: string;
  title: string;
  companyName: string;
  location: string;
  salaryMin: number | null;
  salaryMax: number | null;
  employmentType: string;
  housingProvided: boolean;
  mealsProvided: boolean;
  postedAgo: string;
  verified: boolean;
  isBoosted: boolean;
};

function employmentLabel(t: string): string {
  const map: Record<string, string> = {
    full_time: 'Full-time',
    part_time: 'Part-time',
    seasonal: 'Σεζόν',
  };
  return map[t] ?? t;
}

function salaryStr(j: Job): string {
  if (j.salaryMin && j.salaryMax) return `${Math.round(j.salaryMin)}-${Math.round(j.salaryMax)}€`;
  if (j.salaryMin) return `Από ${Math.round(j.salaryMin)}€`;
  if (j.salaryMax) return `Έως ${Math.round(j.salaryMax)}€`;
  return 'Συζητήσιμος';
}

const SAMPLE: Job[] = [
  {
    id: 'sample-1',
    title: 'Σερβιτόρος/α',
    companyName: 'Sunset Beach Bar',
    location: 'Μύκονος',
    salaryMin: 1200,
    salaryMax: 1500,
    employmentType: 'seasonal',
    housingProvided: true,
    mealsProvided: true,
    postedAgo: 'πριν 2 ώρες',
    verified: true,
    isBoosted: true,
  },
  {
    id: 'sample-2',
    title: 'Πωλητής/τρια',
    companyName: 'Fashion Store',
    location: 'Αθήνα',
    salaryMin: 900,
    salaryMax: 1200,
    employmentType: 'full_time',
    housingProvided: false,
    mealsProvided: false,
    postedAgo: 'πριν 4 ώρες',
    verified: true,
    isBoosted: false,
  },
  {
    id: 'sample-3',
    title: 'Αποθηκάριος',
    companyName: 'Express Logistics',
    location: 'Θεσσαλονίκη',
    salaryMin: 1100,
    salaryMax: 1400,
    employmentType: 'full_time',
    housingProvided: false,
    mealsProvided: true,
    postedAgo: 'πριν 6 ώρες',
    verified: true,
    isBoosted: false,
  },
  {
    id: 'sample-4',
    title: 'Bartender',
    companyName: 'Rooftop Lounge',
    location: 'Σαντορίνη',
    salaryMin: 1400,
    salaryMax: 1700,
    employmentType: 'seasonal',
    housingProvided: true,
    mealsProvided: true,
    postedAgo: 'πριν 8 ώρες',
    verified: false,
    isBoosted: false,
  },
  {
    id: 'sample-5',
    title: 'Καμαριέρα',
    companyName: 'Grecotel Resort',
    location: 'Κρήτη',
    salaryMin: 1000,
    salaryMax: 1250,
    employmentType: 'seasonal',
    housingProvided: true,
    mealsProvided: true,
    postedAgo: 'πριν 1 ημέρα',
    verified: true,
    isBoosted: false,
  },
];

export function PublicJobsList() {
  const [items, setItems] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateContext, setGateContext] = useState<{ jobId: string } | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/public/jobs?limit=20`)
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
            title: r.title,
            companyName: r.companyName,
            location: r.location ?? 'Ελλάδα',
            salaryMin: r.salaryMin ?? null,
            salaryMax: r.salaryMax ?? null,
            employmentType: r.employmentType ?? 'full_time',
            housingProvided: !!r.housingProvided,
            mealsProvided: !!r.mealsProvided,
            postedAgo: r.postedAgo ?? '',
            verified: !!r.verified,
            isBoosted: !!r.isBoosted,
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
            className="h-28 animate-pulse rounded-2xl bg-white border border-gray-100"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-center text-gray-500">
        Δεν υπάρχουν διαθέσιμες αγγελίες αυτή τη στιγμή.
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-3">
        {items.map((j) => (
          <li key={j.id}>
            <button
              type="button"
              onClick={() => {
                setGateContext({ jobId: j.id });
                setGateOpen(true);
              }}
              className="w-full flex items-center gap-4 rounded-2xl bg-white p-4 sm:p-5 shadow-sm border border-gray-100 hover:border-emerald-300 hover:shadow-md transition text-left"
              aria-label={`Δες αγγελία ${j.title} στην εταιρεία ${j.companyName}`}
            >
              <div
                className="flex h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 font-bold text-[11px] sm:text-xs text-center px-1 leading-tight"
                aria-hidden="true"
              >
                {employmentLabel(j.employmentType)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-gray-900 truncate">{j.title}</p>
                  {j.verified && (
                    <span className="text-blue-600 text-xs" title="Επαληθευμένη επιχείρηση">
                      ✓
                    </span>
                  )}
                  {j.isBoosted && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                      PROMOTED
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 truncate">
                  {j.companyName} · {j.location}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {j.postedAgo}
                  {j.housingProvided ? ' · 🏠 Στέγη' : ''}
                  {j.mealsProvided ? ' · 🍽️ Φαγητό' : ''}
                </p>
              </div>

              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="font-bold text-gray-900 text-sm sm:text-base whitespace-nowrap">
                  {salaryStr(j)}
                  <span className="text-xs font-normal text-gray-500">/μήνα</span>
                </span>
                <span className="hidden sm:inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
                  Δες αγγελία →
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
        role="worker"
        action="apply"
        redirectAfter={
          gateContext
            ? `/dashboard/discover?focus=${encodeURIComponent(gateContext.jobId)}`
            : '/dashboard'
        }
      />
    </>
  );
}
