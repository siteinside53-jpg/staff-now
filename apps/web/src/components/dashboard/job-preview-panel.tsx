'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';
import {
  WORKER_JOB_ROLE_LABELS_EL,
  EMPLOYMENT_TYPE_LABELS_EL,
  SALARY_TYPE_LABELS_EL,
  SHIFT_TYPE_LABELS_EL,
  EXPERIENCE_LABELS_EL,
} from '@staffnow/config';

interface Props {
  jobId: string | null;
  onClose: () => void;
  /** When true, show edit button (business owner viewing own job). Default true for backwards compatibility. */
  isOwner?: boolean;
}

export function JobPreviewPanel({ jobId, onClose, isOwner = true }: Props) {
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;
    setLoading(true);
    async function load() {
      try {
        const res = await api.jobs.getById(jobId!) as any;
        if (res.success) {
          const j = res.data?.job || res.data;
          const roles = res.data?.roles || j.roles || [];
          setJob({ ...j, roles });
        }
      } catch {} finally { setLoading(false); }
    }
    load();
  }, [jobId]);

  if (!jobId) return null;
  const j = job || {};

  const statusLabels: Record<string, string> = { draft: 'Πρόχειρη', published: 'Ενεργή', paused: 'Σε παύση', archived: 'Αρχειοθετημένη', filled: 'Πληρώθηκε' };
  const statusColors: Record<string, string> = { draft: 'bg-gray-100 text-gray-700', published: 'bg-emerald-100 text-emerald-700', paused: 'bg-red-100 text-red-700', archived: 'bg-amber-100 text-amber-700', filled: 'bg-blue-100 text-blue-700' };

  // Parse languages
  let langs: string[] = [];
  try { langs = j.languages ? (typeof j.languages === 'string' ? JSON.parse(j.languages) : j.languages) : []; } catch {}

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-0 z-50 mx-auto overflow-y-auto bg-white shadow-2xl sm:inset-4 sm:rounded-2xl sm:max-w-2xl lg:inset-y-6 lg:inset-x-auto lg:max-w-[700px]">
        {loading ? (
          <div className="flex h-full items-center justify-center"><Spinner className="h-8 w-8" /></div>
        ) : (
          <div className="flex flex-col min-h-full">
            {/* Header */}
            <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 px-6 pb-8 pt-12 sm:rounded-t-2xl text-white">
              <button onClick={onClose} className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              <div className="flex items-center gap-2 mb-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[j.status] || 'bg-white/20 text-white'}`}>
                  {statusLabels[j.status] || j.status}
                </span>
              </div>

              <h1 className="text-2xl font-bold">{j.title || 'Χωρίς τίτλο'}</h1>

              {j.company_name && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-blue-200">🏢 {j.company_name}</p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-blue-200">
                {(j.city || j.region) && (
                  <span className="flex items-center gap-1">📍 {[j.address, j.city, j.region, j.postal_code].filter(Boolean).join(', ')}</span>
                )}
                {j.employment_type && (
                  <span>{j.employment_type === 'seasonal' ? '☀️' : j.employment_type === 'full_time' ? '📅' : '⏰'} {EMPLOYMENT_TYPE_LABELS_EL[j.employment_type] || j.employment_type}</span>
                )}
                {j.requires_relocation === 1 && <span>🚗 Μετακίνηση</span>}
              </div>
            </div>

            <div className="px-6 py-6 space-y-6 flex-1">

              {/* Salary */}
              {(j.salary_min || j.salary_max || j.salary_type === 'negotiable') && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-emerald-800">Μισθός</p>
                    <p className="text-xs text-emerald-600">
                      {SALARY_TYPE_LABELS_EL[j.salary_type] || j.salary_type}
                      {j.salary_gross !== undefined && ` · ${j.salary_gross === 1 ? 'Μικτά' : 'Καθαρά'}`}
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-emerald-700">
                    {j.salary_type === 'negotiable' ? 'Συζητήσιμο' : j.salary_min && j.salary_max ? `${j.salary_min}-${j.salary_max}€` : `${j.salary_min || j.salary_max}€`}
                  </p>
                </div>
              )}

              {/* Description */}
              {j.description && (
                <div>
                  <h2 className="text-base font-bold text-gray-900 mb-2">Περιγραφή θέσης</h2>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line">{j.description}</p>
                </div>
              )}

              {/* Roles */}
              {j.roles && j.roles.length > 0 && (
                <div>
                  <h2 className="text-base font-bold text-gray-900 mb-2">Ειδικότητες</h2>
                  <div className="flex flex-wrap gap-2">
                    {j.roles.map((r: string) => (
                      <span key={r} className="rounded-full bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700">
                        {WORKER_JOB_ROLE_LABELS_EL[r] || r}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Benefits */}
              <div>
                <h2 className="text-base font-bold text-gray-900 mb-2">Παροχές</h2>
                <div className="flex flex-wrap gap-2">
                  {j.housing_provided === 1 && <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">🏠 Διαμονή</span>}
                  {j.meals_provided === 1 && <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">🍽️ Σίτιση</span>}
                  {j.transport_provided === 1 && <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">🚌 Μεταφορά</span>}
                  {j.bonus_provided === 1 && <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">💰 Bonus</span>}
                  {j.insurance_provided === 1 && <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">⏰ Ευέλικτο ωράριο</span>}
                  {j.no_benefits === 1 && <span className="flex items-center gap-1.5 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600">❌ Χωρίς παροχές</span>}
                  {!j.housing_provided && !j.meals_provided && !j.transport_provided && !j.bonus_provided && !j.insurance_provided && !j.no_benefits && (
                    <span className="text-sm text-gray-400">Δεν δηλώθηκαν παροχές</span>
                  )}
                </div>
              </div>

              {/* Schedule */}
              {(j.hours_per_day || j.days_per_week || j.shift_type || j.has_day_off) && (
                <div>
                  <h2 className="text-base font-bold text-gray-900 mb-2">Ωράριο Εργασίας</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {j.hours_per_day && (
                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Ώρες/ημέρα</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">{j.hours_per_day} ώρες</p>
                      </div>
                    )}
                    {j.days_per_week && (
                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Ημέρες/εβδομάδα</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">{j.days_per_week} ημέρες</p>
                      </div>
                    )}
                    {j.shift_type && (
                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Βάρδια</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">{SHIFT_TYPE_LABELS_EL[j.shift_type] || j.shift_type}</p>
                      </div>
                    )}
                    {j.has_day_off === 1 && (
                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Ρεπό</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">{j.day_off_description || 'Ναι'}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Duration */}
              {(j.start_date || j.end_date) && (
                <div>
                  <h2 className="text-base font-bold text-gray-900 mb-2">Διάρκεια</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {j.start_date && (
                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Έναρξη</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">{j.start_date}</p>
                      </div>
                    )}
                    {j.end_date && (
                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Λήξη</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">{j.end_date}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Requirements */}
              {(j.experience_required || j.requires_drivers_license || j.requires_physical_fitness || j.requires_communication_skills) && (
                <div>
                  <h2 className="text-base font-bold text-gray-900 mb-2">Απαιτήσεις</h2>
                  <div className="flex flex-wrap gap-2">
                    {j.experience_required && (
                      <span className="rounded-full bg-purple-50 border border-purple-200 px-3 py-1.5 text-xs font-semibold text-purple-700">
                        🎯 {EXPERIENCE_LABELS_EL[j.experience_required] || j.experience_required}
                      </span>
                    )}
                    {j.requires_drivers_license === 1 && (
                      <span className="rounded-full bg-purple-50 border border-purple-200 px-3 py-1.5 text-xs font-semibold text-purple-700">🚗 Δίπλωμα οδήγησης</span>
                    )}
                    {j.requires_physical_fitness === 1 && (
                      <span className="rounded-full bg-purple-50 border border-purple-200 px-3 py-1.5 text-xs font-semibold text-purple-700">💪 Φυσική κατάσταση</span>
                    )}
                    {j.requires_communication_skills === 1 && (
                      <span className="rounded-full bg-purple-50 border border-purple-200 px-3 py-1.5 text-xs font-semibold text-purple-700">🗣️ Επικοινωνία</span>
                    )}
                  </div>
                </div>
              )}

              {/* Languages */}
              {langs.length > 0 && (
                <div>
                  <h2 className="text-base font-bold text-gray-900 mb-2">Γλώσσες</h2>
                  <div className="flex flex-wrap gap-2">
                    {langs.map((lang: string) => (
                      <span key={lang} className="rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                        🌍 {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Meta Details */}
              <div className="grid grid-cols-2 gap-3">
                {j.employment_type && (
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Τύπος εργασίας</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">{EMPLOYMENT_TYPE_LABELS_EL[j.employment_type] || j.employment_type}</p>
                  </div>
                )}
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Ημερομηνία δημοσίευσης</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {j.created_at ? new Date(j.created_at).toLocaleDateString('el-GR', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Κατάσταση</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{statusLabels[j.status] || j.status}</p>
                </div>
              </div>
            </div>

            {/* Bottom */}
            <div className="sticky bottom-0 border-t border-gray-200 bg-white px-6 py-4">
              {isOwner ? (
                <div className="flex gap-3">
                  <a href={`/dashboard/jobs/edit?id=${jobId}`} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    ✏️ Επεξεργασία
                  </a>
                  <button onClick={onClose} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700">
                    Κλείσιμο
                  </button>
                </div>
              ) : (
                <button onClick={onClose} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700">
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
