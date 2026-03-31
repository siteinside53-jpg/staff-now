'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';
import { WORKER_JOB_ROLE_LABELS_EL } from '@staffnow/config';

interface Props {
  businessUserId: string | null;
  onClose: () => void;
  onLike?: () => void;
  onSkip?: () => void;
}

const BIZ_TYPES: Record<string, string> = {
  hotel: 'Ξενοδοχείο', restaurant: 'Εστιατόριο', beach_bar: 'Beach Bar',
  bar: 'Μπαρ', cafe: 'Καφετέρια', villa: 'Βίλα',
  tourism_company: 'Τουριστική', resort: 'Resort', technical: 'Τεχνική', other: 'Επιχείρηση',
};

export function BusinessProfilePanel({ businessUserId, onClose, onLike, onSkip }: Props) {
  const [branch, setBranch] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessUserId) return;
    setLoading(true);
    async function load() {
      try {
        const token = localStorage.getItem('staffnow_token');
        const headers: any = { 'Authorization': `Bearer ${token}` };
        const base = 'https://staffnow-api-production.siteinside53.workers.dev';

        // Get business profile
        const bizRes = await fetch(`${base}/businesses/${businessUserId}`, { headers }).then(r => r.json()) as any;
        if (bizRes.success && bizRes.data) {
          setBranch(bizRes.data.profile || bizRes.data);
          setJobs(bizRes.data.recentJobs || bizRes.data.jobs || []);
        }
      } catch {} finally { setLoading(false); }
    }
    load();
  }, [businessUserId]);

  if (!businessUserId) return null;

  const b = branch || {};
  const empLabels: Record<string, string> = { full_time: 'Πλήρης απασχόληση', part_time: 'Μερική', seasonal: 'Πλήρης απασχόληση', freelancer: 'Freelancer' };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-0 z-50 mx-auto overflow-y-auto bg-white shadow-2xl sm:inset-4 sm:rounded-2xl sm:max-w-2xl lg:inset-y-6 lg:inset-x-auto lg:max-w-[700px]">
        {loading ? (
          <div className="flex h-full items-center justify-center"><Spinner className="h-8 w-8" /></div>
        ) : (
          <div className="flex flex-col min-h-full">
            {/* ====== COVER IMAGE ====== */}
            <div className="relative h-48 sm:h-56 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 sm:rounded-t-2xl overflow-hidden">
              {/* Decorative pattern */}
              <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIgZmlsbD0id2hpdGUiLz48L3N2Zz4=')]" />

              {/* Close button */}
              <button onClick={onClose} className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              {/* Verified badge */}
              {b.verified === 1 && (
                <div className="absolute top-4 right-14 rounded-full bg-white/90 backdrop-blur px-3 py-1.5 text-xs font-semibold text-emerald-700 flex items-center gap-1.5 shadow-sm">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white text-[8px]">✓</span>
                  Επαληθευμένη επιχείρηση
                </div>
              )}

              {/* Logo */}
              <div className="absolute -bottom-10 left-6">
                {b.logo_url ? (
                  <img src={b.logo_url} alt="" className="h-24 w-24 rounded-2xl border-4 border-white bg-white object-cover shadow-lg" />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-white text-3xl font-bold text-blue-600 shadow-lg">
                    {b.company_name?.[0]?.toUpperCase() || '🏢'}
                  </div>
                )}
              </div>
            </div>

            {/* ====== HEADER INFO ====== */}
            <div className="px-6 pt-14 pb-4">
              <h1 className="text-2xl font-bold text-gray-900">{b.company_name || 'Επιχείρηση'}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <span className="text-yellow-500">★★★★★</span>
                  <span className="font-semibold text-gray-900">4.8</span>
                  <span>· 0 αξιολογήσεις</span>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                {(b.region || b.address) && (
                  <span className="flex items-center gap-1">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                    {[b.address, b.region].filter(Boolean).join(', ')}
                  </span>
                )}
                {b.business_type && (
                  <span className="flex items-center gap-1">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" /></svg>
                    {BIZ_TYPES[b.business_type] || b.business_type}
                  </span>
                )}
              </div>
            </div>

            {/* ====== DESCRIPTION ====== */}
            {b.description && (
              <div className="px-6 pb-4">
                <p className="text-gray-600 leading-relaxed">{b.description}</p>
              </div>
            )}

            {/* ====== OPEN POSITIONS ====== */}
            {jobs.length > 0 && (
              <div className="px-6 pb-4">
                <h2 className="text-lg font-bold text-gray-900 mb-3">Ανοιχτές θέσεις</h2>
                <div className="space-y-2">
                  {jobs.map((job: any) => (
                    <div key={job.id} className="flex items-center justify-between rounded-xl border border-gray-200 p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-lg">
                          🍸
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{job.title}</p>
                          <p className="text-xs text-gray-500">{empLabels[job.employment_type] || job.employment_type}</p>
                        </div>
                      </div>
                      {(job.salary_min || job.salary_max) && (
                        <div className="text-right">
                          <p className="font-bold text-gray-900">{job.salary_min && job.salary_max ? `${job.salary_min}-${job.salary_max}€` : `${job.salary_min || job.salary_max}€`}</p>
                          <p className="text-xs text-gray-400">{job.salary_type === 'hourly' ? 'την ώρα' : 'τον μήνα'}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ====== ΠΑΡΟΧΕΣ ====== */}
            <div className="px-6 pb-4">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Παροχές</h2>
              <div className="flex flex-wrap gap-2">
                {b.staff_housing === 1 && (
                  <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                    🏠 Δωρεάν διαμονή
                  </span>
                )}
                {b.meals_provided === 1 && (
                  <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                    🍽️ Γεύματα
                  </span>
                )}
                {b.transportation_assistance === 1 && (
                  <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                    🚌 Μεταφορά προσωπικού
                  </span>
                )}
                {!b.staff_housing && !b.meals_provided && !b.transportation_assistance && (
                  <p className="text-sm text-gray-400">Δεν έχουν δηλωθεί παροχές</p>
                )}
              </div>
            </div>

            {/* ====== QUICK INFO ====== */}
            <div className="px-6 pb-6">
              <div className="grid grid-cols-3 divide-x divide-gray-200 rounded-xl border border-gray-200">
                <div className="p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-sm text-gray-500 mb-1">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Σεζόν
                  </div>
                  <p className="text-xs text-gray-400">Μάιος - Οκτώβριος</p>
                </div>
                <div className="p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-sm text-gray-500 mb-1">
                    <span className="text-sm">💰</span>
                    Μισθός
                  </div>
                  <p className="text-xs text-gray-400">
                    {b.salary_range_min && b.salary_range_max ? `${b.salary_range_min}-${b.salary_range_max}€` : 'Συζητήσιμο'}
                  </p>
                </div>
                <div className="p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-sm text-gray-500 mb-1">
                    <span className="text-sm">🌍</span>
                    Γλώσσες
                  </div>
                  <p className="text-xs text-gray-400">Ελληνικά, Αγγλικά</p>
                </div>
              </div>
            </div>

            {/* ====== STICKY ACTIONS ====== */}
            <div className="sticky bottom-0 border-t border-gray-200 bg-white/95 backdrop-blur px-6 py-4 mt-auto">
              <div className="flex gap-3">
                <button className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                  🔖 Αποθήκευση
                </button>
                <button onClick={() => { onSkip?.(); onClose(); }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-red-200 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors">
                  ✕ Πέρασε
                </button>
                <button onClick={() => { onLike?.(); onClose(); }}
                  className="flex flex-[1.5] items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20">
                  ♥ Ενδιαφέρομαι
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
