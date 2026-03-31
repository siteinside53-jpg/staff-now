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

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-0 z-50 mx-auto overflow-y-auto bg-white shadow-2xl sm:inset-4 sm:rounded-2xl sm:max-w-3xl lg:inset-y-6 lg:inset-x-auto lg:max-w-[800px]">
        {loading ? (
          <div className="flex h-full items-center justify-center"><Spinner className="h-8 w-8" /></div>
        ) : (
          <div className="flex flex-col min-h-full">

            {/* ====== COVER PHOTO ====== */}
            <div className="relative h-52 sm:h-64 bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 sm:rounded-t-2xl overflow-hidden">
              {/* Pattern overlay */}
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9zdmc+')] opacity-30" />

              {/* Close */}
              <button onClick={onClose} className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              {/* Verified badge */}
              {b.verified === 1 && (
                <div className="absolute top-4 left-4 flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur px-3 py-1.5 shadow-sm">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-bold">✓</span>
                  <span className="text-xs font-semibold text-emerald-700">Επαληθευμένη επιχείρηση</span>
                </div>
              )}

              {/* Logo */}
              <div className="absolute -bottom-12 left-6">
                {b.logo_url ? (
                  <img src={b.logo_url} alt="" className="h-28 w-28 rounded-2xl border-4 border-white bg-white object-cover shadow-xl" />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-2xl border-4 border-white bg-white text-4xl font-bold text-blue-600 shadow-xl">
                    {b.company_name?.[0]?.toUpperCase() || '🏢'}
                  </div>
                )}
              </div>
            </div>

            {/* ====== HEADER ====== */}
            <div className="px-6 pt-16 pb-5 border-b border-gray-100">
              <h1 className="text-2xl font-bold text-gray-900">{b.company_name || 'Επιχείρηση'}</h1>

              {/* Rating */}
              <div className="mt-2 flex items-center gap-2">
                <div className="flex text-yellow-400 text-sm">★★★★★</div>
                <span className="font-bold text-gray-900">4.8</span>
                <span className="text-sm text-gray-400">· 0 αξιολογήσεις</span>
              </div>

              {/* Location + Size */}
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                {(b.address || b.region) && (
                  <span className="flex items-center gap-1.5">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                    {[b.address, b.region].filter(Boolean).join(', ')}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
                  {BIZ_TYPES[b.business_type] || 'Επιχείρηση'}
                </span>
              </div>
            </div>

            {/* ====== DESCRIPTION ====== */}
            {b.description && (
              <div className="px-6 py-5 border-b border-gray-100">
                <p className="text-gray-600 leading-relaxed">{b.description}</p>
              </div>
            )}

            {/* ====== 2-COLUMN: Jobs + Info ====== */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">

              {/* LEFT: Open positions */}
              <div className="px-6 py-5">
                <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-4">
                  <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                  Ανοιχτές θέσεις
                </h2>
                {jobs.length > 0 ? (
                  <div className="space-y-3">
                    {jobs.map((job: any, i: number) => (
                      <div key={job.id || i} className="flex items-center justify-between rounded-xl bg-gray-50 p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{job.title}</p>
                            <p className="text-xs text-gray-500">{job.employment_type === 'seasonal' ? 'Εποχιακή' : job.employment_type === 'full_time' ? 'Πλήρης' : job.employment_type}</p>
                          </div>
                        </div>
                        {(job.salary_min || job.salary_max) && (
                          <div className="text-right">
                            <p className="font-bold text-emerald-600 text-sm">{job.salary_min}-{job.salary_max}€</p>
                            <p className="text-[10px] text-gray-400">{job.salary_type === 'hourly' ? 'την ώρα' : 'τον μήνα'}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-400">
                    Δεν υπάρχουν ανοιχτές θέσεις αυτή τη στιγμή
                  </div>
                )}
              </div>

              {/* RIGHT: Benefits + Info */}
              <div className="px-6 py-5 space-y-5">
                {/* Παροχές */}
                <div>
                  <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-3">
                    <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" /></svg>
                    Παροχές
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {b.staff_housing === 1 && (
                      <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">🏠 Δωρεάν διαμονή</span>
                    )}
                    {b.meals_provided === 1 && (
                      <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">🍽️ Γεύματα</span>
                    )}
                    {b.transportation_assistance === 1 && (
                      <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">🚌 Μεταφορά</span>
                    )}
                    <span className="flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700">⏰ Ωράριο εργασίας</span>
                    {!b.staff_housing && !b.meals_provided && !b.transportation_assistance && (
                      <span className="text-sm text-gray-400">Δεν δηλώθηκαν παροχές</span>
                    )}
                  </div>
                </div>

                {/* Quick Info */}
                <div>
                  <h2 className="text-base font-bold text-gray-900 mb-3">Πληροφορίες</h2>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100"><span className="text-sm">📅</span></div>
                      <div><p className="text-sm font-medium text-gray-900">Περίοδος λειτουργίας</p><p className="text-xs text-gray-500">Μάιος - Οκτώβριος (Σεζόν)</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100"><span className="text-sm">💰</span></div>
                      <div><p className="text-sm font-medium text-gray-900">Μισθοδοσία</p><p className="text-xs text-gray-500">{b.salary_range_min && b.salary_range_max ? `${b.salary_range_min}-${b.salary_range_max}€/μήνα` : 'Ανάλογα τη θέση'}</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100"><span className="text-sm">🌍</span></div>
                      <div><p className="text-sm font-medium text-gray-900">Γλώσσες</p><p className="text-xs text-gray-500">Ελληνικά, Αγγλικά</p></div>
                    </div>
                    {b.phone && (
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100"><span className="text-sm">📞</span></div>
                        <div><p className="text-sm font-medium text-gray-900">Τηλέφωνο</p><p className="text-xs text-gray-500">{b.phone}</p></div>
                      </div>
                    )}
                    {b.website && (
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100"><span className="text-sm">🌐</span></div>
                        <div><p className="text-sm font-medium text-gray-900">Website</p><a href={b.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">{b.website}</a></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ====== STICKY ACTIONS ====== */}
            <div className="sticky bottom-0 border-t border-gray-200 bg-white px-6 py-4">
              <div className="flex gap-3">
                <button className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  🔖
                </button>
                <button onClick={() => { onSkip?.(); onClose(); }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-red-200 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors">
                  ✕ Πέρασε
                </button>
                <button onClick={() => { onLike?.(); onClose(); }}
                  className="flex flex-[1.5] items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20">
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
