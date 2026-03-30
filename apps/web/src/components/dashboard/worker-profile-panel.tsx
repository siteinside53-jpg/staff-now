'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';
import { WORKER_JOB_ROLE_LABELS_EL } from '@staffnow/config';

interface Props {
  workerId: string | null;
  onClose: () => void;
  onLike?: (id: string) => void;
  onSkip?: (id: string) => void;
  totalCards?: number;
  currentIndex?: number;
}

const availLabels: Record<string, string> = { immediate: 'Άμεση', within_7_days: 'Εντός 7 ημερών', seasonal: 'Εποχιακή', part_time: 'Μερικής', full_time: 'Πλήρης' };
const empLabels: Record<string, string> = { seasonal: 'Σεζόν', full_time: 'Πλήρης', part_time: 'Μερική', freelancer: 'Freelancer' };

export function WorkerProfilePanel({ workerId, onClose, onLike, onSkip, totalCards, currentIndex }: Props) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (!workerId) return;
    setLoading(true);
    setActiveTab('profile');
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
  const badges: string[] = (() => { try { return JSON.parse(p.badges || '[]'); } catch { return []; } })();

  const tabs = [
    { id: 'profile', label: 'Προφίλ' },
    { id: 'experience', label: 'Εμπειρία' },
    { id: 'reviews', label: 'Αξιολογήσεις' },
    { id: 'documents', label: 'Έγγραφα' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 mx-auto overflow-hidden bg-white shadow-2xl sm:inset-4 sm:rounded-2xl sm:max-w-5xl lg:inset-y-8 lg:inset-x-auto lg:max-w-[1000px]">
        <div className="flex h-full">

          {/* ====== LEFT SIDEBAR ====== */}
          <div className="hidden w-[240px] flex-shrink-0 flex-col border-r border-gray-100 bg-gray-50 lg:flex">
            {/* Avatar */}
            <div className="flex flex-col items-center px-6 pt-8 pb-6">
              {p.photo_url ? (
                <img src={p.photo_url} alt="" className="h-28 w-28 rounded-full object-cover border-4 border-white shadow-lg" />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-blue-100 text-4xl font-bold text-blue-600 shadow-lg">
                  {p.full_name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <h2 className="mt-4 text-center text-lg font-bold text-gray-900">{p.full_name || 'Εργαζόμενος'}</h2>

              {/* Badges */}
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                {p.verified === 1 && <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold text-white">✓ Verified</span>}
                {badges.includes('premium') && <span className="rounded-full bg-blue-500 px-2.5 py-0.5 text-[10px] font-bold text-white">★ Premium</span>}
                {badges.includes('experienced') && <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold text-white">⭐ Experienced</span>}
              </div>

              {/* Location */}
              {p.city && <p className="mt-3 text-sm text-gray-500">📍 {p.city}{p.region ? `, ${p.region}` : ''}</p>}

              {/* Rating */}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-yellow-500">★</span>
                <span className="font-bold text-gray-900">4.8</span>
                <span className="text-xs text-gray-400">(23)</span>
                <span className="text-gray-300">|</span>
                <span className="text-xs text-gray-400">2★</span>
                <span className="text-xs text-gray-400">👍</span>
              </div>
            </div>

            {/* Sidebar Nav */}
            <nav className="flex-1 px-4 space-y-1">
              {[
                { icon: '📋', label: 'Προφίλ', id: 'profile' },
                { icon: '💼', label: 'Εμπειρία', id: 'experience' },
                { icon: '⭐', label: 'Αξιολογήσεις', id: 'reviews' },
                { icon: '📎', label: 'Έγγραφα', id: 'documents' },
              ].map((item) => (
                <button key={item.id} onClick={() => setActiveTab(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${activeTab === item.id ? 'bg-white text-blue-600 font-semibold shadow-sm' : 'text-gray-600 hover:bg-white/60'}`}>
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* ====== MAIN CONTENT ====== */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-3 lg:hidden">
                {p.photo_url ? (
                  <img src={p.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-600">{p.full_name?.[0]?.toUpperCase() || '?'}</div>
                )}
                <div>
                  <h2 className="font-bold text-gray-900">{p.full_name || 'Εργαζόμενος'}</h2>
                  <div className="flex gap-1.5">
                    {p.verified === 1 && <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-bold text-white">✓ Verified</span>}
                    {badges.includes('premium') && <span className="rounded-full bg-blue-500 px-2 py-0.5 text-[9px] font-bold text-white">★ Premium</span>}
                  </div>
                </div>
              </div>
              <div className="hidden lg:flex items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900">{p.full_name || 'Εργαζόμενος'}</h1>
                {p.verified === 1 && <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white">✓ Verified</span>}
                {badges.includes('premium') && <span className="rounded-full bg-blue-500 px-2.5 py-1 text-xs font-bold text-white">★ Premium</span>}
              </div>
              <div className="flex items-center gap-3">
                {totalCards && currentIndex != null && (
                  <span className="text-sm text-gray-400">{currentIndex + 1} / {totalCards}</span>
                )}
                <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-1 items-center justify-center"><Spinner className="h-8 w-8" /></div>
            ) : (
              <>
                {/* Location bar */}
                <div className="hidden lg:flex items-center gap-4 border-b border-gray-100 px-6 py-2 text-sm text-gray-500">
                  {p.city && <span>📍 {p.city}{p.region ? `, ${p.region}` : ''}</span>}
                  <span>ενεργός πριν 2 ώρες</span>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-100 px-6">
                  <div className="flex gap-6">
                    {tabs.map((tab) => (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`border-b-2 py-3 text-sm font-medium transition-colors ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-1 overflow-y-auto">
                  {/* Main column */}
                  <div className="flex-1 p-6 space-y-6">
                    {activeTab === 'profile' && (
                      <>
                        {/* Bio */}
                        {p.bio && (
                          <div>
                            <p className="text-gray-700 leading-relaxed">{p.bio}</p>
                          </div>
                        )}

                        {/* Roles */}
                        {roles.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {roles.map((r: string, i: number) => (
                              <span key={r} className={`rounded-full px-3 py-1.5 text-sm font-medium ${i === 0 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                                {WORKER_JOB_ROLE_LABELS_EL[r] || r}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Quick stats */}
                        <div className="grid grid-cols-3 divide-x divide-gray-200 rounded-xl border border-gray-200">
                          <div className="p-4 text-center">
                            <p className="text-xs text-gray-500">Εμπειρία</p>
                            <p className="mt-1 text-lg font-bold text-gray-900">{p.years_of_experience || 0} χρόνια</p>
                          </div>
                          <div className="p-4 text-center">
                            <p className="text-xs text-gray-500">Γλώσσες</p>
                            <p className="mt-1 text-sm font-semibold text-gray-900">{langs.map((l: any) => l.language || l).join(', ') || '-'}</p>
                          </div>
                          <div className="p-4 text-center">
                            <p className="text-xs text-gray-500">Τύπος απασχόλησης</p>
                            <p className="mt-1 text-sm font-semibold text-gray-900">
                              {empLabels[p.employment_type] || availLabels[p.availability] || '-'}
                              {p.availability && p.employment_type ? ` · ${availLabels[p.availability]}` : ''}
                            </p>
                          </div>
                        </div>

                        {/* Details grid */}
                        <div className="grid grid-cols-2 gap-3">
                          {p.expected_monthly_salary && (
                            <div className="rounded-xl bg-gray-50 p-4">
                              <p className="text-xs text-gray-500">Μηνιαίος Μισθός</p>
                              <p className="mt-1 font-bold text-gray-900">{p.expected_monthly_salary}€</p>
                            </div>
                          )}
                          {p.expected_hourly_rate && (
                            <div className="rounded-xl bg-gray-50 p-4">
                              <p className="text-xs text-gray-500">Ωρομίσθιο</p>
                              <p className="mt-1 font-bold text-gray-900">{p.expected_hourly_rate}€/ώρα</p>
                            </div>
                          )}
                          <div className="rounded-xl bg-gray-50 p-4">
                            <p className="text-xs text-gray-500">Μετακόμιση</p>
                            <p className="mt-1 font-bold text-gray-900">{p.willing_to_relocate === 1 ? '✅ Διαθέσιμος/η' : '❌ Όχι'}</p>
                          </div>
                          <div className="rounded-xl bg-gray-50 p-4">
                            <p className="text-xs text-gray-500">Πληρότητα Προφίλ</p>
                            <div className="mt-1 flex items-center gap-2">
                              <div className="h-2 flex-1 rounded-full bg-gray-200"><div className="h-2 rounded-full bg-blue-500" style={{ width: `${p.profile_completeness || 0}%` }} /></div>
                              <span className="text-xs font-bold text-gray-700">{p.profile_completeness || 0}%</span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {activeTab === 'experience' && (
                      <div className="text-center py-12 text-gray-400">
                        <p className="text-4xl mb-3">💼</p>
                        <p className="text-sm">Η εμπειρία θα εμφανίζεται εδώ σύντομα.</p>
                        {p.years_of_experience > 0 && <p className="mt-2 text-xs">{p.years_of_experience} χρόνια εμπειρίας στον τουρισμό</p>}
                      </div>
                    )}

                    {activeTab === 'reviews' && (
                      <div className="text-center py-12 text-gray-400">
                        <p className="text-4xl mb-3">⭐</p>
                        <p className="text-sm">Οι αξιολογήσεις θα εμφανίζονται εδώ σύντομα.</p>
                      </div>
                    )}

                    {activeTab === 'documents' && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-4">Έγγραφα</h3>
                        {p.cv_url ? (
                          <div className="rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-50">
                              <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">CV_{(p.full_name || 'worker').replace(/\s/g, '_')}.pdf</p>
                              <p className="text-xs text-gray-500">Ανεβήκε πρόσφατα</p>
                            </div>
                            <div className="flex gap-2">
                              <a href={p.cv_url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition-colors flex items-center gap-1">
                                🔍 Προβολή CV
                              </a>
                              <a href={p.cv_url} download className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors flex items-center gap-1">
                                ⬇ Λήψη CV
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
                            <svg className="mx-auto h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                            <p className="mt-3 text-sm text-gray-400">Δεν έχει ανεβάσει βιογραφικό</p>
                          </div>
                        )}

                        {/* Certificates placeholder */}
                        <h3 className="font-semibold text-gray-900 mt-6 mb-3">Πιστοποιητικά (0)</h3>
                        <div className="rounded-xl border-2 border-dashed border-gray-200 p-6 text-center">
                          <p className="text-sm text-gray-400">Δεν υπάρχουν πιστοποιητικά</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ====== RIGHT SIDEBAR (desktop) ====== */}
                  <div className="hidden w-[260px] flex-shrink-0 border-l border-gray-100 bg-gray-50/50 p-5 space-y-5 overflow-y-auto lg:block">
                    {/* Rating Card */}
                    <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Αξιολόγηση προφίλ</h3>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex text-yellow-400 text-lg">{'★★★★★'}</div>
                        <span className="text-2xl font-bold text-gray-900">4.8</span>
                      </div>
                      <div className="space-y-2">
                        {[
                          { label: 'Επαγγελματισμός', score: 4.9 },
                          { label: 'Συνέπεια', score: 4.8 },
                          { label: 'Επικοινωνία', score: 4.7 },
                          { label: 'Αξιοπιστία', score: 4.9 },
                        ].map((r) => (
                          <div key={r.label} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{r.label}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-gray-900">{r.score}</span>
                              <span className="text-emerald-500">●</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CV Card */}
                    {p.cv_url && (
                      <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
                            <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-900">CV_{(p.full_name || '').replace(/\s/g, '_')}.pdf</p>
                            <p className="text-[10px] text-gray-400">Ανεβήκε πρόσφατα · 420 KB</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <a href={p.cv_url} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-lg bg-blue-50 py-1.5 text-center text-xs font-semibold text-blue-600 hover:bg-blue-100">
                            🔍 Προβολή CV
                          </a>
                          <a href={p.cv_url} download className="flex-1 rounded-lg bg-blue-600 py-1.5 text-center text-xs font-semibold text-white hover:bg-blue-700">
                            ⬇ Λήψη CV
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Certificates placeholder */}
                    <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">Πιστοποιητικά (0)</h3>
                      <p className="text-xs text-gray-400">Δεν υπάρχουν πιστοποιητικά</p>
                    </div>
                  </div>
                </div>

                {/* ====== STICKY ACTIONS ====== */}
                <div className="border-t border-gray-200 bg-white px-6 py-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { onLike?.(workerId!); onClose(); }}
                      className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-colors"
                    >
                      ♥ Ενδιαφέρομαι
                    </button>
                    <button
                      onClick={() => { onSkip?.(workerId!); onClose(); }}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      ✕ Πέρασε
                    </button>
                    <button className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                      🔖 Αποθήκευση
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
