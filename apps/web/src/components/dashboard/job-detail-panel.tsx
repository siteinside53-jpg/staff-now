'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { WORKER_JOB_ROLE_LABELS_EL } from '@staffnow/config';

interface Props {
  jobId: string;
  /** Extra data from the discover card (company info, cover photo, etc.) */
  jobData?: any;
  onClose: () => void;
  onLike?: () => void;
  onSkip?: () => void;
  isMatched?: boolean;
  swipeStatus?: string | null;
}

const BIZ_TYPES: Record<string, string> = {
  hotel: 'Ξενοδοχείο', restaurant: 'Εστιατόριο', beach_bar: 'Beach Bar',
  bar: 'Μπαρ', cafe: 'Καφετέρια', villa: 'Βίλα',
  tourism_company: 'Τουριστική', resort: 'Resort', technical: 'Τεχνική', other: 'Επιχείρηση',
};

const empLabels: Record<string, string> = {
  seasonal: 'Σεζόν', full_time: 'Πλήρης απασχόληση', part_time: 'Μερική απασχόληση', freelancer: 'Freelancer',
};

export function JobDetailPanel({ jobId, jobData, onClose, onLike, onSkip, isMatched, swipeStatus }: Props) {
  const [job, setJob] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [businessJobs, setBusinessJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;
    setLoading(true);
    async function load() {
      try {
        // Fetch full job details
        const jobRes = await api.jobs.getById(jobId) as any;
        const jobInfo = jobRes?.data?.job || jobRes?.data || {};
        const roles = jobRes?.data?.roles || jobInfo.roles || [];
        setJob({ ...jobInfo, roles });

        // Fetch business profile if we have business_user_id
        const bizUserId = jobData?.businessUserId || jobInfo.business_user_id;
        if (bizUserId) {
          const token = localStorage.getItem('staffnow_token');
          const headers: any = { 'Authorization': `Bearer ${token}` };
          const base = 'https://staffnow-api-production.siteinside53.workers.dev';
          const bizRes = await fetch(`${base}/businesses/${bizUserId}`, { headers }).then(r => r.json()) as any;
          if (bizRes.success && bizRes.data) {
            setBusiness(bizRes.data.profile || bizRes.data);
            setBusinessJobs(bizRes.data.activeJobs || []);
          }
        }
      } catch (err) {
        console.error('JobDetailPanel load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [jobId, jobData?.businessUserId]);

  if (!jobId) return null;

  const j = job || {};
  const b = business || {};
  const coverPhoto = jobData?.coverPhoto || b.cover_photo_url;
  const companyLogo = jobData?.companyLogo || b.branch_logo || b.logo_url;
  const companyName = jobData?.companyName || b.branch_name || b.company_name || j.company_name;
  const companyType = b.branch_business_type || b.business_type;
  const companyDescription = b.branch_description || b.description;
  const companyLocation = [b.address || j.company_address, b.region || j.region].filter(Boolean).join(', ');
  const companyPhone = b.branch_phone || b.phone;
  const companyWebsite = b.branch_website || b.website;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-0 z-50 mx-auto overflow-y-auto bg-white shadow-2xl sm:inset-4 sm:rounded-2xl sm:max-w-3xl lg:inset-y-6 lg:inset-x-auto lg:max-w-[800px]">
        {loading ? (
          <div className="flex h-full items-center justify-center"><Spinner className="h-8 w-8" /></div>
        ) : (
          <div className="flex flex-col min-h-full">

            {/* ====== COVER PHOTO ====== */}
            <div className="relative">
              <div className="h-52 sm:h-64 sm:rounded-t-2xl overflow-hidden">
                {coverPhoto ? (
                  <img src={coverPhoto} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="relative h-full w-full bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9zdmc+')] opacity-30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                {/* Close */}
                <button onClick={onClose} className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                {/* Verified badge */}
                {b.verified === 1 && (
                  <div className="absolute top-4 left-4 flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur px-3 py-1.5 shadow-sm">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-bold">✓</span>
                    <span className="text-xs font-semibold text-emerald-700">Επαληθευμένη</span>
                  </div>
                )}
              </div>

              {/* Logo - OUTSIDE overflow-hidden */}
              <div className="absolute -bottom-12 left-6 z-10">
                {companyLogo ? (
                  <div className="h-24 w-24 rounded-2xl border-4 border-white bg-white shadow-xl overflow-hidden">
                    <img src={companyLogo} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-white text-3xl font-bold text-blue-600 shadow-xl">
                    {companyName?.[0]?.toUpperCase() || '🏢'}
                  </div>
                )}
              </div>
            </div>

            {/* ====== COMPANY HEADER ====== */}
            <div className="px-6 pt-16 pb-4 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">{companyName || 'Επιχείρηση'}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                {companyType && (
                  <span className="flex items-center gap-1">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5M3.75 3v18m16.5-18v18M5.25 3h13.5M5.25 21V3m13.5 18V3" /></svg>
                    {BIZ_TYPES[companyType] || companyType}
                  </span>
                )}
                {companyLocation && (
                  <span className="flex items-center gap-1">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                    {companyLocation}
                  </span>
                )}
              </div>
              {b.verified === 1 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex text-yellow-400 text-sm">★★★★★</div>
                  <span className="font-bold text-gray-900 text-sm">4.8</span>
                  <span className="text-xs text-gray-400">· 0 αξιολογήσεις</span>
                </div>
              )}
            </div>

            {/* ====== JOB DETAILS SECTION ====== */}
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                  <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                </div>
                <h2 className="text-lg font-bold text-gray-900">Θέση Εργασίας</h2>
              </div>

              {/* Job Title */}
              <h3 className="text-xl font-bold text-gray-900 mb-2">{j.title || 'Χωρίς τίτλο'}</h3>

              {/* Job meta info */}
              <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
                {j.employment_type && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700">
                    {j.employment_type === 'seasonal' ? '☀️' : j.employment_type === 'full_time' ? '📅' : '⏰'} {empLabels[j.employment_type] || j.employment_type}
                  </span>
                )}
                {(j.city || j.region) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                    📍 {[j.city, j.region].filter(Boolean).join(', ')}
                  </span>
                )}
                {j.created_at && (
                  <span className="text-xs text-gray-400">
                    {new Date(j.created_at).toLocaleDateString('el-GR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                )}
              </div>

              {/* Salary */}
              {(j.salary_min || j.salary_max) && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-medium text-emerald-800">Μισθός</p>
                    <p className="text-xs text-emerald-600">{j.salary_type === 'hourly' ? 'Ανά ώρα' : 'Ανά μήνα'}</p>
                  </div>
                  <p className="text-2xl font-bold text-emerald-700">
                    {j.salary_min && j.salary_max ? `${j.salary_min}-${j.salary_max}€` : `${j.salary_min || j.salary_max}€`}
                  </p>
                </div>
              )}

              {/* Description */}
              {j.description && (
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-gray-900 mb-1.5">Περιγραφή θέσης</h4>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line text-sm">{j.description}</p>
                </div>
              )}

              {/* Roles */}
              {j.roles && j.roles.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-gray-900 mb-2">Ειδικότητες</h4>
                  <div className="flex flex-wrap gap-2">
                    {j.roles.map((r: string) => (
                      <span key={r} className="rounded-full bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700">
                        {WORKER_JOB_ROLE_LABELS_EL[r] || r}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Conditions */}
              {(() => {
                const hasHousing = j.housing_provided === 1 || jobData?.housingProvided;
                const hasMeals = j.meals_provided === 1 || jobData?.mealsProvided;
                const hasTransport = j.transport_provided === 1;
                const hasBonus = j.bonus_provided === 1;
                const hasInsurance = j.insurance_provided === 1;
                const anyBenefit = hasHousing || hasMeals || hasTransport || hasBonus || hasInsurance;
                return (
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-2">Παροχές</h4>
                    <div className="flex flex-wrap gap-2">
                      {hasHousing && (
                        <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">🏠 Διαμονή</span>
                      )}
                      {hasMeals && (
                        <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">🍽️ Σίτιση</span>
                      )}
                      {hasTransport && (
                        <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">🚌 Μεταφορά</span>
                      )}
                      {hasBonus && (
                        <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">🎁 Bonus</span>
                      )}
                      {hasInsurance && (
                        <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">🩺 Ασφάλιση</span>
                      )}
                      {!anyBenefit && (
                        <span className="text-sm text-gray-400">Δεν δηλώθηκαν παροχές</span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* ====== BUSINESS INFO SECTION ====== */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">

              {/* LEFT: About company + other jobs */}
              <div className="px-6 py-5">
                {/* Company Description */}
                {companyDescription && (
                  <div className="mb-5">
                    <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-2">
                      <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
                      Σχετικά με εμάς
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{companyDescription}</p>
                  </div>
                )}

                {/* Other open positions */}
                <div>
                  <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-3">
                    <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                    Ανοιχτές θέσεις
                  </h3>
                  {businessJobs.length > 0 ? (
                    <div className="space-y-2">
                      {businessJobs.map((bj: any, i: number) => (
                        <div key={bj.id || i} className={`flex items-center justify-between rounded-xl p-3 ${bj.id === jobId ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${bj.id === jobId ? 'bg-blue-200 text-blue-700' : 'bg-blue-100 text-blue-600'}`}>
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                            </div>
                            <div>
                              <p className={`font-semibold text-sm ${bj.id === jobId ? 'text-blue-900' : 'text-gray-900'}`}>
                                {bj.title}
                                {bj.id === jobId && <span className="ml-1.5 text-[10px] text-blue-600 font-medium">(αυτή η θέση)</span>}
                              </p>
                              <p className="text-xs text-gray-500">{empLabels[bj.employment_type] || bj.employment_type}</p>
                            </div>
                          </div>
                          {(bj.salary_min || bj.salary_max) && (
                            <div className="text-right">
                              <p className="font-bold text-emerald-600 text-sm">{bj.salary_min}-{bj.salary_max}€</p>
                              <p className="text-[10px] text-gray-400">{bj.salary_type === 'hourly' ? 'την ώρα' : 'τον μήνα'}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-400">
                      Δεν υπάρχουν άλλες ανοιχτές θέσεις
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: Benefits + Contact */}
              <div className="px-6 py-5 space-y-5">
                {/* Παροχές Εργοδότη */}
                <div>
                  <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-3">
                    <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" /></svg>
                    Παροχές Εργοδότη
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {b.staff_housing === 1 && (
                      <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">🏠 Διαμονή</span>
                    )}
                    {b.meals_provided === 1 && (
                      <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">🍽️ Γεύματα</span>
                    )}
                    {b.transportation_assistance === 1 && (
                      <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">🚌 Μεταφορά</span>
                    )}
                    <span className="flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700">⏰ Ωράριο εργασίας</span>
                  </div>
                </div>

                {/* Πληροφορίες */}
                <div>
                  <h3 className="text-base font-bold text-gray-900 mb-3">Πληροφορίες</h3>
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
                    {companyPhone && (
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100"><span className="text-sm">📞</span></div>
                        <div><p className="text-sm font-medium text-gray-900">Τηλέφωνο</p><p className="text-xs text-gray-500">{companyPhone}</p></div>
                      </div>
                    )}
                    {companyWebsite && (
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100"><span className="text-sm">🌐</span></div>
                        <div><p className="text-sm font-medium text-gray-900">Website</p><a href={companyWebsite} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">{companyWebsite}</a></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ====== STICKY ACTIONS ====== */}
            <div className="sticky bottom-0 border-t border-gray-200 bg-white px-6 py-4">
              {isMatched ? (
                <a href="/dashboard/messages" className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                  💬 Άνοιξε Chat
                </a>
              ) : (onLike || onSkip) ? (
                <div className="flex gap-3">
                  <button onClick={() => { onSkip?.(); onClose(); }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-red-200 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors">
                    ✕ Πέρασε
                  </button>
                  <button
                    onClick={() => { onLike?.(); onClose(); }}
                    disabled={swipeStatus === 'like'}
                    className={`flex flex-[1.5] items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white transition-colors shadow-lg ${
                      swipeStatus === 'like'
                        ? 'bg-gray-400 cursor-not-allowed shadow-none'
                        : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    }`}
                  >
                    {swipeStatus === 'like' ? '✓ Δηλώθηκε' : '♥ Ενδιαφέρομαι'}
                  </button>
                </div>
              ) : (
                <button onClick={onClose} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors">
                  Κλείσιμο
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
