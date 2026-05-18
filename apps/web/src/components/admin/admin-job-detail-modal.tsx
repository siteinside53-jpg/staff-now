'use client';

/**
 * Admin job detail modal — shows the full job, business, applicants & matches.
 * Read-only; actions (pause/archive) live on the parent admin/jobs page.
 */

import { useEffect, useState } from 'react';
import { adminApi } from './lib/admin-api';

interface Props {
  jobId: string;
  onClose: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Πρόχειρη',
  published: 'Δημοσιευμένη',
  paused: 'Σε παύση',
  archived: 'Αρχειοθετημένη',
  filled: 'Πληρώθηκε',
};

const EMP_LABELS: Record<string, string> = {
  full_time: 'Πλήρης απασχόληση',
  part_time: 'Μερική απασχόληση',
  seasonal: 'Εποχιακή',
};

export function AdminJobDetailModal({ jobId, onClose }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminApi
      .getJobDetails(jobId)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e: any) => {
        if (!cancelled) setErr(e?.message || 'Αποτυχία φόρτωσης');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl bg-white shadow-xl mt-8 mb-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-6 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Λεπτομέρειες αγγελίας
            </p>
            <h2 className="mt-1 text-lg font-bold text-gray-900 truncate">
              {data?.job?.title || (loading ? '...' : '—')}
            </h2>
            {data?.job?.company_name && (
              <p className="text-xs text-gray-500 truncate">🏢 {data.job.company_name}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
            aria-label="Κλείσιμο"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          {loading ? (
            <div className="flex justify-center py-12 text-gray-400">Φόρτωση...</div>
          ) : err ? (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{err}</div>
          ) : data ? (
            <div className="space-y-5">
              {/* Status & meta row */}
              <div className="flex flex-wrap gap-2 text-xs">
                {data.job?.status && (
                  <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-1 font-semibold text-blue-700">
                    {STATUS_LABELS[data.job.status] || data.job.status}
                  </span>
                )}
                {data.job?.employment_type && (
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-700">
                    {EMP_LABELS[data.job.employment_type] || data.job.employment_type}
                  </span>
                )}
                {(data.job?.city || data.job?.region) && (
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-700">
                    📍 {[data.job.city, data.job.region].filter(Boolean).join(', ')}
                  </span>
                )}
                {data.job?.created_at && (
                  <span className="text-gray-500 self-center">
                    {new Date(data.job.created_at).toLocaleDateString('el-GR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                )}
              </div>

              {/* Salary */}
              {(data.job?.salary_min || data.job?.salary_max) && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Μισθός</p>
                  <p className="mt-1 text-lg font-extrabold text-emerald-700">
                    {data.job.salary_min && data.job.salary_max
                      ? `${data.job.salary_min}-${data.job.salary_max}€`
                      : `${data.job.salary_min || data.job.salary_max}€`}
                    <span className="ml-1 text-xs font-medium text-emerald-600">
                      / {data.job.salary_type === 'hourly' ? 'ώρα' : data.job.salary_type === 'daily' ? 'ημέρα' : 'μήνα'}
                    </span>
                  </p>
                </div>
              )}

              {/* Description */}
              {data.job?.description && (
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Περιγραφή</h3>
                  <p className="mt-1 whitespace-pre-line text-sm text-gray-700">{data.job.description}</p>
                </div>
              )}

              {/* Roles */}
              {data.roles && data.roles.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Ειδικότητες</h3>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {data.roles.map((r: string) => (
                      <span
                        key={r}
                        className="rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs font-semibold text-blue-700"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Benefits */}
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Παροχές</h3>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {data.job?.housing_provided ? (
                    <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-semibold text-emerald-700">🏠 Διαμονή</span>
                  ) : null}
                  {data.job?.meals_provided ? (
                    <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-semibold text-emerald-700">🍽️ Σίτιση</span>
                  ) : null}
                  {data.job?.transport_provided ? (
                    <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-semibold text-emerald-700">🚌 Μεταφορά</span>
                  ) : null}
                  {data.job?.bonus_provided ? (
                    <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-semibold text-emerald-700">🎁 Bonus</span>
                  ) : null}
                  {data.job?.insurance_provided ? (
                    <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-semibold text-emerald-700">🩺 Ασφάλιση</span>
                  ) : null}
                  {!data.job?.housing_provided &&
                    !data.job?.meals_provided &&
                    !data.job?.transport_provided &&
                    !data.job?.bonus_provided &&
                    !data.job?.insurance_provided && (
                      <span className="text-xs text-gray-400">Καμία</span>
                    )}
                </div>
              </div>

              {/* Schedule & requirements */}
              {(data.job?.hours_per_day ||
                data.job?.days_per_week ||
                data.job?.shift_type ||
                data.job?.experience_required ||
                data.job?.languages) && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-xs">
                  {data.job?.hours_per_day && (
                    <div className="rounded-lg bg-gray-50 p-2">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">Ώρες/ημέρα</p>
                      <p className="mt-0.5 font-semibold text-gray-900">{data.job.hours_per_day}h</p>
                    </div>
                  )}
                  {data.job?.days_per_week && (
                    <div className="rounded-lg bg-gray-50 p-2">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">Ημέρες/εβδομάδα</p>
                      <p className="mt-0.5 font-semibold text-gray-900">{data.job.days_per_week}</p>
                    </div>
                  )}
                  {data.job?.shift_type && (
                    <div className="rounded-lg bg-gray-50 p-2">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">Βάρδια</p>
                      <p className="mt-0.5 font-semibold text-gray-900">
                        {data.job.shift_type === 'morning' && 'Πρωί'}
                        {data.job.shift_type === 'evening' && 'Απόγευμα'}
                        {data.job.shift_type === 'split' && 'Διπλή'}
                        {data.job.shift_type === 'flexible' && 'Ευέλικτη'}
                      </p>
                    </div>
                  )}
                  {data.job?.experience_required && (
                    <div className="rounded-lg bg-gray-50 p-2">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">Εμπειρία</p>
                      <p className="mt-0.5 font-semibold text-gray-900">
                        {data.job.experience_required === 'none' && 'Καμία'}
                        {data.job.experience_required === '1_2_years' && '1-2 χρόνια'}
                        {data.job.experience_required === '3_plus_years' && '3+ χρόνια'}
                      </p>
                    </div>
                  )}
                  {data.job?.languages && (
                    <div className="rounded-lg bg-gray-50 p-2 col-span-2">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">Γλώσσες</p>
                      <p className="mt-0.5 font-semibold text-gray-900">
                        {(() => {
                          try {
                            const arr = JSON.parse(data.job.languages);
                            return Array.isArray(arr) ? arr.join(', ') : data.job.languages;
                          } catch {
                            return data.job.languages;
                          }
                        })()}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Branch */}
              {(data.job?.branch_name || data.job?.branch_address) && (
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Υποκατάστημα</h3>
                  <p className="mt-1 text-sm text-gray-700">
                    {data.job.branch_name || '—'}
                    {data.job.branch_address && (
                      <span className="text-gray-500"> · {data.job.branch_address}</span>
                    )}
                  </p>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">Ενδιαφέρθηκαν</p>
                  <p className="mt-0.5 text-lg font-extrabold text-gray-900">
                    {data.counts?.likes ?? data.applicants?.length ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">Πέρασαν</p>
                  <p className="mt-0.5 text-lg font-extrabold text-gray-900">
                    {data.counts?.skips ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">Matches</p>
                  <p className="mt-0.5 text-lg font-extrabold text-emerald-700">
                    {data.counts?.matches ?? 0}
                  </p>
                </div>
              </div>

              {/* Applicants */}
              {data.applicants && data.applicants.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    Πρόσφατοι ενδιαφερόμενοι ({data.applicants.length})
                  </h3>
                  <div className="mt-2 space-y-1.5">
                    {data.applicants.slice(0, 12).map((a: any) => (
                      <div
                        key={a.id}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2"
                      >
                        {a.swiper_photo ? (
                          <img src={a.swiper_photo} alt="" className="h-7 w-7 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                            {a.swiper_name?.[0]?.toUpperCase() || '👤'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {a.swiper_name || '—'}
                          </p>
                          <p className="text-[11px] text-gray-500 truncate">
                            {a.swiper_region || ''} · {new Date(a.created_at).toLocaleDateString('el-GR', { day: '2-digit', month: 'short' })}
                          </p>
                        </div>
                        {a.matched ? (
                          <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            ✓ Match
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
