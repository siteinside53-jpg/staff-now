'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { WORKER_JOB_ROLE_LABELS_EL } from '@staffnow/config';
import { toast } from 'sonner';

interface WorkerProfilePanelProps {
  workerId: string | null;
  onClose: () => void;
  onLike?: (id: string) => void;
  onSkip?: (id: string) => void;
}

export function WorkerProfilePanel({ workerId, onClose, onLike, onSkip }: WorkerProfilePanelProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workerId) return;
    setLoading(true);
    async function load() {
      try {
        const res = await api.workers.getById(workerId!) as any;
        if (res.success) setProfile(res.data);
      } catch {} finally { setLoading(false); }
    }
    load();
  }, [workerId]);

  if (!workerId) return null;

  const p = profile?.profile || profile || {};
  const roles = profile?.roles || [];
  const langs = profile?.languages || [];

  const availLabels: Record<string, string> = {
    immediate: 'Άμεση', within_7_days: 'Εντός 7 ημερών', seasonal: 'Εποχιακή',
    part_time: 'Μερικής', full_time: 'Πλήρης',
  };
  const empLabels: Record<string, string> = {
    seasonal: 'Σεζόν', full_time: 'Πλήρης', part_time: 'Μερική', freelancer: 'Freelancer',
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto bg-white shadow-2xl animate-in slide-in-from-right duration-300">

        {/* Close button */}
        <button onClick={onClose} className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {loading ? (
          <div className="flex h-full items-center justify-center"><Spinner className="h-8 w-8" /></div>
        ) : !p.full_name && !p.id ? (
          <div className="flex h-full items-center justify-center text-gray-400"><p>Το προφίλ δεν βρέθηκε.</p></div>
        ) : (
          <>
            {/* ====== HEADER ====== */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-8 pb-8 pt-12 text-white">
              <div className="flex items-start gap-5">
                {p.photo_url ? (
                  <img src={p.photo_url} alt="" className="h-24 w-24 rounded-2xl object-cover border-4 border-white/20 shadow-lg flex-shrink-0" />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white/15 text-4xl font-bold shadow-lg flex-shrink-0">
                    {p.full_name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold">{p.full_name || 'Εργαζόμενος'}</h1>
                    {p.verified === 1 && <Badge className="bg-emerald-400/20 text-emerald-100 border border-emerald-400/30">✓ Verified</Badge>}
                  </div>
                  {p.city && <p className="mt-1 text-sm text-blue-200">📍 {p.city}{p.region ? `, ${p.region}` : ''}</p>}
                  <div className="mt-2 flex items-center gap-4 text-sm text-blue-200">
                    {p.years_of_experience != null && <span>⭐ {p.years_of_experience} χρόνια εμπειρίας</span>}
                    {p.profile_completeness && <span>📊 {p.profile_completeness}% προφίλ</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-8 py-6 space-y-6">
              {/* ====== BIO ====== */}
              {p.bio && (
                <section>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Σχετικά</h2>
                  <p className="text-gray-700 leading-relaxed">{p.bio}</p>
                </section>
              )}

              {/* ====== QUICK INFO ====== */}
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Πληροφορίες</h2>
                <div className="grid grid-cols-2 gap-3">
                  {roles.length > 0 && (
                    <div className="col-span-2 rounded-xl bg-gray-50 p-4">
                      <p className="text-xs font-medium text-gray-500 mb-2">Ρόλοι</p>
                      <div className="flex flex-wrap gap-2">
                        {roles.map((r: string) => <Badge key={r} variant="secondary" className="text-xs">{WORKER_JOB_ROLE_LABELS_EL[r] || r}</Badge>)}
                      </div>
                    </div>
                  )}
                  {p.availability && (
                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs font-medium text-gray-500">Διαθεσιμότητα</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">{availLabels[p.availability] || p.availability}</p>
                    </div>
                  )}
                  {p.employment_type && (
                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs font-medium text-gray-500">Τύπος</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">{empLabels[p.employment_type] || p.employment_type}</p>
                    </div>
                  )}
                  {p.expected_monthly_salary && (
                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs font-medium text-gray-500">Μηνιαίος Μισθός</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">{p.expected_monthly_salary}€</p>
                    </div>
                  )}
                  {p.expected_hourly_rate && (
                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs font-medium text-gray-500">Ωρομίσθιο</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">{p.expected_hourly_rate}€/ώρα</p>
                    </div>
                  )}
                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-xs font-medium text-gray-500">Μετακόμιση</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">{p.willing_to_relocate === 1 ? '✅ Ναι' : '❌ Όχι'}</p>
                  </div>
                  {p.years_of_experience != null && (
                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs font-medium text-gray-500">Εμπειρία</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">{p.years_of_experience} χρόνια</p>
                    </div>
                  )}
                </div>
              </section>

              {/* ====== LANGUAGES ====== */}
              {langs.length > 0 && (
                <section>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Γλώσσες</h2>
                  <div className="flex flex-wrap gap-2">
                    {langs.map((l: any) => (
                      <div key={l.language || l} className="rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700">
                        🌍 {l.language || l}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ====== CV / DOCUMENTS ====== */}
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Βιογραφικό & Έγγραφα</h2>
                {p.cv_url ? (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Βιογραφικό (CV)</p>
                        <p className="text-xs text-gray-500">PDF αρχείο</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a href={p.cv_url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                        👁️ Προβολή
                      </a>
                      <a href={p.cv_url} download className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors">
                        ⬇️ Λήψη
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-gray-200 p-6 text-center">
                    <svg className="mx-auto h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                    <p className="mt-2 text-sm text-gray-400">Δεν έχει ανεβάσει βιογραφικό</p>
                  </div>
                )}
              </section>

              {/* ====== BADGES ====== */}
              {p.badges && (() => { try { const b = JSON.parse(p.badges); return b.length > 0 ? (
                <section>
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Διακρίσεις</h2>
                  <div className="flex flex-wrap gap-2">
                    {b.map((badge: string) => (
                      <div key={badge} className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 border border-amber-200">
                        🏆 {badge}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null; } catch { return null; } })()}
            </div>

            {/* ====== STICKY ACTIONS ====== */}
            <div className="sticky bottom-0 border-t border-gray-200 bg-white/95 backdrop-blur px-8 py-4">
              <div className="flex gap-3">
                <button
                  onClick={() => { onSkip?.(workerId!); onClose(); }}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-red-200 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                >
                  ✕ Πέρασε
                </button>
                <button
                  onClick={() => { onLike?.(workerId!); onClose(); }}
                  className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/25"
                >
                  ♥ Ενδιαφέρομαι
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
