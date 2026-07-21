'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';
import { PremiumTick } from '@/components/ui/premium-tick';
import { WORKER_JOB_ROLE_LABELS_EL } from '@staffnow/config';

interface Props {
  workerId: string | null;
  onClose: () => void;
  onLike?: (id: string) => void;
  onSkip?: (id: string) => void;
  totalCards?: number;
  currentIndex?: number;
  isSelfView?: boolean;
}

const availLabels: Record<string, string> = {
  immediate: 'Άμεσα διαθέσιμος',
  within_7_days: 'Εντός 7 ημερών',
  seasonal: 'Για τη σεζόν',
  part_time: 'Μερική απασχόληση',
  full_time: 'Πλήρης απασχόληση',
};

const empLabels: Record<string, string> = {
  seasonal: 'Σεζόν',
  full_time: 'Πλήρης',
  part_time: 'Μερική',
  freelancer: 'Freelancer',
};

const QUICK_MESSAGES = [
  { icon: '📅', text: 'Μπορείς να έρθεις για συνέντευξη;' },
  { icon: '💰', text: 'Πόσο ζητάς την ώρα;' },
  { icon: '⚡', text: 'Είσαι διαθέσιμος άμεσα;' },
  { icon: '🎯', text: 'Έλα για μία δοκιμή' },
  { icon: '💬', text: 'Πες μου λίγα για την εμπειρία σου' },
];

function formatActiveTime(lastActive?: string): string {
  if (!lastActive) return 'Ενεργός πρόσφατα';
  const diff = Date.now() - new Date(lastActive).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (hours < 1) return 'Ενεργός τώρα';
  if (hours < 24) return `Ενεργός πριν ${hours}${hours === 1 ? ' ώρα' : ' ώρες'}`;
  if (days < 7) return `Ενεργός πριν ${days}${days === 1 ? ' ημέρα' : ' ημέρες'}`;
  return 'Ενεργός τελευταία εβδομάδα';
}

export function WorkerProfilePanel({ workerId, onClose, onLike, onSkip, totalCards, currentIndex, isSelfView }: Props) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showMessageInput, setShowMessageInput] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    if (!workerId) return;
    setLoading(true);
    setShowMessageInput(false);
    setCustomMessage('');
    async function load() {
      try {
        const res = await api.workers.getById(workerId!) as any;
        if (res.success) setProfile(res.data);

        // Try to find existing conversation (if matched)
        try {
          const convRes = await api.conversations.list() as any;
          const convos = convRes?.data || [];
          const existing = Array.isArray(convos)
            ? convos.find((c: any) => c.otherParty?.id === workerId)
            : null;
          if (existing) setConversationId(existing.id);
          else setConversationId(null);
        } catch { setConversationId(null); }
      } catch {} finally { setLoading(false); }
    }
    load();
  }, [workerId]);

  if (!workerId) return null;

  const p = profile?.profile || profile || {};
  const roles = profile?.roles || [];
  const langs = profile?.languages || [];
  const badges: string[] = (() => { try { return JSON.parse(p.badges || '[]'); } catch { return []; } })();
  const isFromDiscover = !!(onLike || onSkip);

  // Parse skills (optional field, fallback to roles top 5)
  const skills: string[] = (() => {
    try { return p.skills ? JSON.parse(p.skills) : []; } catch { return []; }
  })();
  const displayTags = (skills.length > 0 ? skills : roles).slice(0, 5);

  const salary = p.expected_hourly_rate
    ? `${p.expected_hourly_rate}€/ώρα`
    : p.expected_monthly_salary
      ? `${p.expected_monthly_salary}€/μήνα`
      : null;

  // Real profile-view counts from the API (distinct businesses).
  const viewsToday = Number(p.views_today) || 0;
  const viewsTotal = Number(p.views_total) || 0;
  const isOnline = !!p.is_online;

  const sendQuickMessage = async (text: string) => {
    if (!conversationId) {
      toast.error('Πρέπει πρώτα να κάνετε match για να στείλετε μήνυμα');
      return;
    }
    setSendingMessage(true);
    try {
      await api.conversations.sendMessage(conversationId, { content: text });
      toast.success('Το μήνυμα στάλθηκε!');
      setCustomMessage('');
      setShowMessageInput(false);
    } catch (err: any) {
      toast.error(err?.message || 'Αποτυχία αποστολής');
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-0 z-50 mx-auto overflow-y-auto bg-white shadow-2xl sm:inset-4 sm:rounded-2xl sm:max-w-2xl lg:inset-y-6 lg:inset-x-auto lg:max-w-[720px]">
        {loading ? (
          <div className="flex h-full items-center justify-center"><Spinner className="h-8 w-8" /></div>
        ) : (
          <div className="flex flex-col min-h-full">

            {/* ====== HERO HEADER ====== */}
            <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 px-6 pt-12 pb-8 sm:rounded-t-2xl text-white">
              {/* Close */}
              <button onClick={onClose}
                className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              {/* Card counter */}
              {totalCards && currentIndex != null && (
                <span className="absolute top-5 left-6 rounded-full bg-black/30 px-2.5 py-0.5 text-xs font-semibold">
                  {currentIndex + 1} / {totalCards}
                </span>
              )}

              {/* Profile image + identity */}
              <div className="flex flex-col items-center text-center">
                {p.photo_url ? (
                  <img
                    src={p.photo_url}
                    alt={p.full_name || ''}
                    className="h-32 w-32 rounded-full object-cover border-4 border-white/90 shadow-2xl"
                  />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-full bg-white/90 text-5xl font-bold text-blue-600 border-4 border-white/90 shadow-2xl">
                    {p.full_name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <h1 className="text-2xl font-bold text-white">{p.full_name || 'Εργαζόμενος'}</h1>
                  {(p as any).is_premium === 1 && (
                    <PremiumTick size="md" pill className="bg-white/95 ring-white/40" />
                  )}
                </div>

                {/* Primary role */}
                {roles.length > 0 && (
                  <p className="mt-1 text-base text-blue-100">
                    {WORKER_JOB_ROLE_LABELS_EL[roles[0]] || roles[0]}
                  </p>
                )}

                {/* Location + Distance */}
                <div className="mt-2 flex items-center gap-2 text-sm text-blue-100">
                  {(p.city || p.region) && (
                    <span className="flex items-center gap-1">📍 {[p.city, p.region].filter(Boolean).join(', ')}</span>
                  )}
                  {p.distance_km != null && (
                    <>
                      <span className="text-white/40">·</span>
                      <span>{p.distance_km.toFixed(1)} km</span>
                    </>
                  )}
                </div>

                {/* Status badges */}
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {isOnline && (
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow-md">
                      <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                      Online τώρα
                    </span>
                  )}
                  {p.verified === 1 && (
                    <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-emerald-700 shadow-md">
                      ✓ Επαληθευμένος
                    </span>
                  )}
                  {badges.includes('premium') && (
                    <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-amber-900 shadow-md">
                      ⭐ Premium
                    </span>
                  )}
                  {!isSelfView && !isOnline && (
                    <span className="flex items-center gap-1 rounded-full bg-black/20 px-3 py-1 text-xs font-medium text-white/90">
                      ⚡ {formatActiveTime(p.last_active_at)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ====== VIEWS BANNER — real distinct-business counts ====== */}
            {!isSelfView && viewsToday > 0 && (
              <div className="bg-amber-50 border-b border-amber-100 px-6 py-2.5">
                <p className="flex items-center justify-center gap-2 text-xs font-medium text-amber-800">
                  🔥 <span className="font-bold">{viewsToday}</span> {viewsToday === 1 ? 'επιχείρηση είδε' : 'επιχειρήσεις είδαν'} αυτό το προφίλ σήμερα
                </p>
              </div>
            )}
            {isSelfView && viewsTotal > 0 && (
              <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-2.5">
                <p className="flex items-center justify-center gap-2 text-xs font-medium text-emerald-800">
                  👁️ <span className="font-bold">{viewsTotal}</span> {viewsTotal === 1 ? 'επιχείρηση έχει δει' : 'επιχειρήσεις έχουν δει'} το προφίλ σου συνολικά
                </p>
              </div>
            )}

            {/* ====== KEY INFO CARDS ====== */}
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <InfoCard
                  icon="💼"
                  label="Εμπειρία"
                  value={p.years_of_experience ? `${p.years_of_experience} ${p.years_of_experience === 1 ? 'χρόνος' : 'χρόνια'}` : '—'}
                />
                <InfoCard
                  icon="💰"
                  label="Μισθός"
                  value={salary || '—'}
                  valueClass="text-emerald-600"
                />
                <InfoCard
                  icon="📅"
                  label="Τύπος"
                  value={empLabels[p.employment_type] || '—'}
                />
                <InfoCard
                  icon="⚡"
                  label="Διαθέσιμος"
                  value={availLabels[p.availability]?.split(' ')[0] || '—'}
                />
              </div>
            </div>

            {/* ====== SKILLS TAGS ====== */}
            {displayTags.length > 0 && (
              <div className="px-6 py-5 border-b border-gray-100">
                <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Ειδικότητες</h2>
                <div className="flex flex-wrap gap-2">
                  {displayTags.map((t: string, i: number) => (
                    <span
                      key={`${t}-${i}`}
                      className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${
                        i === 0
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {WORKER_JOB_ROLE_LABELS_EL[t] || t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ====== SHORT BIO ====== */}
            {p.bio && (
              <div className="px-6 py-5 border-b border-gray-100">
                <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Σχετικά</h2>
                <p className="text-[15px] leading-relaxed text-gray-700 line-clamp-3">{p.bio}</p>
              </div>
            )}

            {/* ====== RATING CARD ====== */}
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-yellow-400 text-lg">★★★★★</div>
                      <span className="text-2xl font-bold text-gray-900">4.8</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">23 αξιολογήσεις</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                    <span className="text-xl">🏆</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: 'Επαγγ.', score: 4.9 },
                    { label: 'Συνέπεια', score: 4.8 },
                    { label: 'Επικοιν.', score: 4.7 },
                  ].map((r) => (
                    <div key={r.label}>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide">{r.label}</p>
                      <p className="text-base font-bold text-gray-900 mt-0.5">{r.score}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ====== LANGUAGES ====== */}
            {langs.length > 0 && (
              <div className="px-6 py-5 border-b border-gray-100">
                <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Γλώσσες</h2>
                <div className="flex flex-wrap gap-2">
                  {langs.map((l: any) => (
                    <span
                      key={l.language || l}
                      className="flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700"
                    >
                      🌍 {l.language || l}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ====== QUICK ACTIONS (only if matched/has conversation) ====== */}
            {conversationId && !isFromDiscover && (
              <div className="px-6 py-5 border-b border-gray-100">
                <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">
                  ⚡ Γρήγορα μηνύματα
                </h2>
                <div className="flex flex-wrap gap-2">
                  {QUICK_MESSAGES.map((msg) => (
                    <button
                      key={msg.text}
                      onClick={() => sendQuickMessage(msg.text)}
                      disabled={sendingMessage}
                      className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>{msg.icon}</span>
                      <span>{msg.text}</span>
                    </button>
                  ))}
                </div>

                {/* Custom message input */}
                {showMessageInput ? (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="Γράψε δικό σου μήνυμα..."
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && customMessage.trim()) sendQuickMessage(customMessage.trim());
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => customMessage.trim() && sendQuickMessage(customMessage.trim())}
                      disabled={sendingMessage || !customMessage.trim()}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {sendingMessage ? '...' : 'Αποστολή'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowMessageInput(true)}
                    className="mt-3 text-xs text-blue-600 font-medium hover:underline"
                  >
                    + Γράψε δικό σου μήνυμα
                  </button>
                )}
              </div>
            )}

            {/* ====== CV SECTION ====== */}
            {p.cv_url && (
              <div className="px-6 py-5 border-b border-gray-100">
                <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Βιογραφικό</h2>
                <div className="flex items-center gap-4 rounded-xl bg-gray-50 border border-gray-200 p-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-red-50">
                    <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      CV_{(p.full_name || 'worker').replace(/\s/g, '_')}.pdf
                    </p>
                    <p className="text-xs text-gray-500">PDF Document</p>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={p.cv_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-white border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      🔍 Προβολή
                    </a>
                    <a
                      href={p.cv_url}
                      download
                      className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      ⬇ Λήψη
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* ====== EXTRA INFO ====== */}
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Λεπτομέρειες</h2>
              <div className="space-y-2.5">
                <DetailRow icon="🚗" label="Μετακόμιση" value={p.willing_to_relocate === 1 ? 'Διαθέσιμος' : 'Όχι'} />
                {p.availability && (
                  <DetailRow icon="⏰" label="Διαθεσιμότητα" value={availLabels[p.availability] || p.availability} />
                )}
                {p.employment_type && (
                  <DetailRow icon="📅" label="Τύπος εργασίας" value={empLabels[p.employment_type] || p.employment_type} />
                )}
              </div>
            </div>

            {/* Bottom spacer for sticky CTA */}
            <div className="h-24" />

            {/* ====== STICKY ACTIONS ====== */}
            <div className="sticky bottom-0 left-0 right-0 border-t border-gray-200 bg-white/95 backdrop-blur-md px-4 py-3 sm:px-6 sm:py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
              {isFromDiscover ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { onSkip?.(workerId!); onClose(); }}
                    className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-200 bg-white text-xl text-gray-400 hover:border-red-300 hover:text-red-500 transition-colors shadow-sm"
                    aria-label="Πέρασε"
                  >
                    ✕
                  </button>
                  <button
                    onClick={() => { onLike?.(workerId!); onClose(); }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 py-4 text-base font-bold text-white shadow-lg shadow-emerald-500/30 hover:from-emerald-600 hover:to-emerald-700 transition-all active:scale-95"
                  >
                    <span className="text-xl">❤️</span>
                    <span>Ενδιαφέρομαι</span>
                  </button>
                </div>
              ) : conversationId ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className="flex-shrink-0 rounded-full border-2 border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Κλείσιμο
                  </button>
                  <a
                    href={`/dashboard/messages?conv=${conversationId}`}
                    className="flex flex-1 items-center justify-center gap-2 rounded-full bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-colors"
                  >
                    <span className="text-lg">💬</span>
                    <span>Στείλε μήνυμα</span>
                  </a>
                </div>
              ) : (
                <button
                  onClick={onClose}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-gray-100 py-3.5 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                >
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

// ==================== SUBCOMPONENTS ====================

function InfoCard({
  icon,
  label,
  value,
  valueClass,
}: {
  icon: string;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
      <div className="flex items-center gap-1.5">
        <span className="text-base">{icon}</span>
        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
      </div>
      <p className={`mt-1 text-sm font-bold ${valueClass || 'text-gray-900'} truncate`}>{value}</p>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-gray-500">
        <span>{icon}</span>
        <span>{label}</span>
      </span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}
