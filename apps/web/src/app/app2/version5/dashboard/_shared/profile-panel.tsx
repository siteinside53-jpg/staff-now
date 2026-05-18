'use client';

import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';
const token = () => typeof window !== 'undefined' ? localStorage.getItem('staffnow_token') : null;

const BIZ_TYPES: Record<string, string> = {
  hotel: 'Ξενοδοχείο', restaurant: 'Εστιατόριο', beach_bar: 'Beach Bar',
  bar: 'Μπαρ', cafe: 'Καφετέρια', villa: 'Βίλα',
  tourism_company: 'Τουριστική', resort: 'Resort', technical: 'Τεχνική', other: 'Επιχείρηση',
};

const DAYS_LABELS: Record<string, string> = {
  mon: 'Δευτέρα', tue: 'Τρίτη', wed: 'Τετάρτη', thu: 'Πέμπτη',
  fri: 'Παρασκευή', sat: 'Σάββατο', sun: 'Κυριακή',
};

const EMP_LABELS: Record<string, string> = {
  seasonal: 'Σεζόν', full_time: 'Πλήρης', part_time: 'Μερική', freelancer: 'Freelancer',
};

const SALARY_TYPE_SUFFIX: Record<string, string> = {
  hourly: '/ώρα', daily: '/ημέρα', monthly: '/μήνα', fixed: '',
};

const ROLE_LABELS: Record<string, string> = {
  waiter: 'Σερβιτόρος/α', chef: 'Σεφ', cook: 'Μάγειρας',
  bartender: 'Bartender', barista: 'Barista',
  receptionist: 'Ρεσεψιονίστ', housekeeper: 'Καμαριέρα',
  cleaner: 'Καθαριστής', driver: 'Οδηγός',
  sales: 'Πωλητής/τρια', warehouse: 'Αποθηκάριος',
};

const AVAIL_LABELS: Record<string, string> = {
  immediate: '⚡ Άμεσα',
  within_7_days: 'Εντός 7 ημερών',
  seasonal: 'Σεζόν',
  full_time: 'Πλήρης απασχόληση',
  part_time: 'Μερική απασχόληση',
};

function formatSchedule(json: string): string[] {
  try {
    const schedule = JSON.parse(json) as Record<string, { open: string; close: string; closed: boolean }>;
    return Object.keys(DAYS_LABELS).map((key) => {
      const s = schedule[key];
      const label = DAYS_LABELS[key];
      if (!s) return `${label}: -`;
      if (s.closed) return `${label}: Κλειστά`;
      return `${label}: ${s.open} - ${s.close}`;
    });
  } catch { return []; }
}

function formatSalary(min: number | null | undefined, max: number | null | undefined, type?: string): string | null {
  const hasMin = min != null && min !== 0;
  const hasMax = max != null && max !== 0;
  if (!hasMin && !hasMax) return null;
  const suffix = SALARY_TYPE_SUFFIX[type || 'monthly'] ?? '';
  if (hasMin && hasMax) return `${min}-${max}€${suffix}`;
  if (hasMin) return `από ${min}€${suffix}`;
  return `έως ${max}€${suffix}`;
}

interface Props {
  id: string;
  type: 'worker' | 'business';
  name?: string;
  avatar?: string;
  isSelfView?: boolean;
  onClose: () => void;
  onLike?: () => void;
  onSkip?: () => void;
}

export function ProfilePanel({ id, type, name, avatar, isSelfView, onClose, onLike, onSkip }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const t = token();
        if (!t || !id) return;
        const endpoint = type === 'worker' ? `/workers/${id}` : `/businesses/${id}`;
        const res = await fetch(`${API_BASE}${endpoint}`, { headers: { 'Authorization': `Bearer ${t}` } });
        const json = await res.json() as any;
        setData(json?.data);
      } catch {} finally { setLoading(false); }
    })();
  }, [id, type]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex" onClick={onClose}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="relative z-10 ml-auto h-full w-full max-w-md bg-white flex items-center justify-center">
          <div className="h-8 w-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (type === 'business') {
    return <BusinessPanel b={data?.profile || data || {}} jobs={data?.activeJobs || data?.recentJobs || data?.jobs || []} name={name} avatar={avatar} isSelfView={isSelfView} onClose={onClose} onLike={onLike} onSkip={onSkip} />;
  }

  return <WorkerPanel p={data?.profile || data || {}} roles={data?.roles || []} languages={data?.languages || []} name={name} avatar={avatar} isSelfView={isSelfView} onClose={onClose} onLike={onLike} onSkip={onSkip} />;
}

/* ─── Business Panel ──────────────────────────── */

function BusinessPanel({ b, jobs, name, avatar, isSelfView, onClose, onLike, onSkip }: {
  b: any; jobs: any[]; name?: string; avatar?: string; isSelfView?: boolean;
  onClose: () => void; onLike?: () => void; onSkip?: () => void;
}) {
  const companyName = b.company_name || name || 'Επιχείρηση';
  const logo = b.logo_url || avatar;

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative z-10 ml-auto h-full w-full max-w-md bg-white overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Cover */}
        <div className="relative">
          <div className="h-48 overflow-hidden">
            {b.cover_photo_url ? (
              <img src={b.cover_photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </div>

          {/* Close */}
          <button onClick={onClose} className="absolute top-3 right-3 h-9 w-9 rounded-full bg-black/30 backdrop-blur flex items-center justify-center text-white">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {isSelfView && (
            <span className="absolute top-3 left-3 rounded-full bg-white/95 backdrop-blur px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-700 shadow">
              👁️ Όπως σε βλέπουν
            </span>
          )}

          {/* Verified badge */}
          {b.verified === 1 && !isSelfView && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur px-3 py-1.5 shadow-sm">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-bold">✓</span>
              <span className="text-xs font-semibold text-emerald-700">Επαληθευμένη</span>
            </div>
          )}

          {/* Logo - overlapping */}
          <div className="absolute -bottom-10 left-5 z-10">
            {logo ? (
              <div className="h-24 w-24 rounded-2xl border-4 border-white bg-white shadow-xl overflow-hidden">
                <img src={logo} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-white text-3xl font-bold text-blue-600 shadow-xl">
                {companyName[0]?.toUpperCase() || '🏢'}
              </div>
            )}
          </div>
        </div>

        {/* Header */}
        <div className="px-5 pt-14 pb-4 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900">{companyName}</h1>

          <div className="mt-2 flex items-center gap-2">
            <div className="flex text-yellow-400 text-sm">★★★★★</div>
            <span className="font-bold text-gray-900 text-sm">4.8</span>
            <span className="text-xs text-gray-400">· 0 αξιολογήσεις</span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
            {(b.address || b.region || b.city) && (
              <span className="flex items-center gap-1">
                📍 {[b.address, b.city, b.region].filter(Boolean).join(', ')}
              </span>
            )}
            <span className="flex items-center gap-1">
              🏢 {BIZ_TYPES[b.business_type] || 'Επιχείρηση'}
            </span>
          </div>
        </div>

        {/* Description */}
        {b.description && (
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{b.description}</p>
          </div>
        )}

        {/* Open positions */}
        <div className="px-5 py-5 border-b border-gray-100">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-3">
            <span className="text-blue-600">💼</span> Ανοιχτές θέσεις
          </h2>
          {jobs.length > 0 ? (
            <div className="space-y-2">
              {jobs.map((job: any) => {
                const salaryStr = formatSalary(job.salary_min, job.salary_max, job.salary_type);
                return (
                  <div key={job.id} className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 p-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 text-lg">💼</div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 text-sm truncate">{job.title}</p>
                        <div className="flex flex-wrap items-center gap-1 mt-0.5 text-[11px] text-gray-500">
                          {job.employment_type && <span>{EMP_LABELS[job.employment_type] || job.employment_type}</span>}
                          {(job.city || job.region) && (
                            <>
                              <span className="text-gray-300">·</span>
                              <span className="truncate">📍 {[job.city, job.region].filter(Boolean).join(', ')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {salaryStr && (
                      <p className="font-bold text-emerald-600 text-sm whitespace-nowrap flex-shrink-0">{salaryStr}</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl bg-gray-50 p-4 text-center text-xs text-gray-400">
              Δεν υπάρχουν ανοιχτές θέσεις αυτή τη στιγμή
            </div>
          )}
        </div>

        {/* Benefits */}
        <div className="px-5 py-5 border-b border-gray-100">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-3">
            <span className="text-emerald-600">✨</span> Παροχές
          </h2>
          <div className="flex flex-wrap gap-2">
            {b.staff_housing === 1 && <Chip>🏠 Διαμονή</Chip>}
            {b.meals_provided === 1 && <Chip>🍽️ Σίτιση</Chip>}
            {b.transportation_assistance === 1 && <Chip>🚌 Μεταφορά</Chip>}
            {b.bonus_provided === 1 && <Chip>💰 Bonus</Chip>}
            {b.insurance_provided === 1 && <Chip>⏰ Ευέλικτο ωράριο</Chip>}
            {b.no_benefits === 1 && <Chip kind="gray">❌ Χωρίς παροχές</Chip>}
            {!b.staff_housing && !b.meals_provided && !b.transportation_assistance && !b.bonus_provided && !b.insurance_provided && !b.no_benefits && (
              <span className="text-xs text-gray-400">Δεν δηλώθηκαν παροχές</span>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="px-5 py-5 pb-24 space-y-3">
          <h2 className="text-base font-bold text-gray-900">Πληροφορίες</h2>

          {b.operating_hours && (() => {
            const lines = formatSchedule(b.operating_hours);
            return lines.length > 0 ? (
              <InfoRow icon="🕐" title="Ωράριο Λειτουργίας">
                <div className="space-y-0.5">
                  {lines.map((line, i) => (
                    <p key={i} className={`text-[11px] ${line.includes('Κλειστά') ? 'text-red-500' : 'text-gray-500'}`}>{line}</p>
                  ))}
                </div>
              </InfoRow>
            ) : null;
          })()}

          {b.phone && (
            <InfoRow icon="📞" title="Τηλέφωνο">
              <p className="text-xs text-gray-500">{b.phone}</p>
            </InfoRow>
          )}

          {b.website && (
            <InfoRow icon="🌐" title="Website">
              <a href={b.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate block">
                {b.website}
              </a>
            </InfoRow>
          )}

          {b.google_business_url && (
            <InfoRow icon="🗺️" title="Google Business">
              <a href={b.google_business_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                Δες στον χάρτη
              </a>
            </InfoRow>
          )}

          {(b.address || b.city) && (
            <InfoRow icon="🏠" title="Τοποθεσία">
              <p className="text-xs text-gray-500">{[b.address, b.area, b.city, b.postal_code, b.region].filter(Boolean).join(', ')}</p>
            </InfoRow>
          )}

          {b.email && (
            <InfoRow icon="✉️" title="Email">
              <p className="text-xs text-gray-500 truncate">{b.email}</p>
            </InfoRow>
          )}
        </div>

        {/* Sticky actions */}
        {!isSelfView && (onLike || onSkip) && (
          <div className="sticky bottom-0 border-t border-gray-200 bg-white px-5 py-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}>
            <div className="flex gap-2">
              {onSkip && (
                <button onClick={() => { onSkip(); onClose(); }}
                  className="flex flex-1 items-center justify-center rounded-xl border-2 border-red-200 py-3 text-sm font-semibold text-red-600 hover:bg-red-50">
                  ✕ Πέρασε
                </button>
              )}
              {onLike && (
                <button onClick={() => { onLike(); onClose(); }}
                  className="flex flex-[1.5] items-center justify-center rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20">
                  ♥ Ενδιαφέρομαι
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Worker Panel ──────────────────────────── */

function WorkerPanel({ p, roles, languages, name, avatar, isSelfView, onClose, onLike, onSkip }: {
  p: any; roles: string[]; languages: any[]; name?: string; avatar?: string; isSelfView?: boolean;
  onClose: () => void; onLike?: () => void; onSkip?: () => void;
}) {
  const displayName = p.full_name || name || 'Εργαζόμενος';
  const photo = p.photo_url || avatar;

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative z-10 ml-auto h-full w-full max-w-md bg-white overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Gradient header */}
        <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white px-5 pt-8 pb-6">
          <button onClick={onClose} className="absolute top-3 right-3 h-9 w-9 rounded-full bg-black/30 flex items-center justify-center">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {isSelfView && (
            <span className="absolute top-3 left-3 rounded-full bg-white/25 backdrop-blur px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
              👁️ Όπως σε βλέπουν
            </span>
          )}
          <div className="text-center">
            <div className="mx-auto h-28 w-28 rounded-full bg-white/95 flex items-center justify-center text-3xl font-extrabold text-purple-700 overflow-hidden border-4 border-white/90 shadow-xl">
              {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : displayName[0]?.toUpperCase()}
            </div>
            <h2 className="mt-4 text-2xl font-extrabold">{displayName}</h2>
            {roles.length > 0 && <p className="text-sm text-white/90 mt-1">{ROLE_LABELS[roles[0]] || roles[0]}</p>}
            {(p.city || p.region) && (
              <p className="text-xs text-white/80 mt-1">📍 {[p.city, p.region].filter(Boolean).join(', ')}</p>
            )}
            <div className="mt-3 flex justify-center gap-2 flex-wrap">
              {p.verified === 1 && <span className="rounded-full bg-white/30 backdrop-blur px-3 py-0.5 text-xs font-bold">✓ Verified</span>}
              {p.availability === 'immediate' && (
                <span className="rounded-full bg-emerald-400 px-3 py-0.5 text-xs font-bold text-white">⚡ Άμεσα</span>
              )}
              {p.willing_to_relocate === 1 && (
                <span className="rounded-full bg-white/30 backdrop-blur px-3 py-0.5 text-xs font-bold">✈️ Μετακόμιση</span>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 pb-24 space-y-5">
          {/* Bio */}
          <div>
            <h3 className="font-bold text-gray-900 mb-2">Σχετικά</h3>
            {p.bio ? (
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{p.bio}</p>
            ) : (
              <p className="text-xs text-gray-400 italic">Δεν έχει προστεθεί bio ακόμα</p>
            )}
          </div>

          {/* Roles */}
          {roles.length > 0 && (
            <div>
              <h3 className="font-bold text-gray-900 mb-2">Ρόλοι</h3>
              <div className="flex flex-wrap gap-2">
                {roles.map((r) => (
                  <span key={r} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {ROLE_LABELS[r] || r}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            {p.years_of_experience != null && (
              <InfoBox label="Εμπειρία" value={`${p.years_of_experience} ${p.years_of_experience === 1 ? 'χρόνος' : 'χρόνια'}`} />
            )}
            {p.expected_monthly_salary && (
              <InfoBox label="Μισθός" value={`${p.expected_monthly_salary}€/μήνα`} />
            )}
            {p.expected_hourly_rate && (
              <InfoBox label="Ωρομίσθιο" value={`${p.expected_hourly_rate}€/ώρα`} />
            )}
            {p.availability && (
              <InfoBox label="Διαθεσιμότητα" value={AVAIL_LABELS[p.availability] || p.availability} />
            )}
          </div>

          {/* Languages */}
          {languages.length > 0 && (
            <div>
              <h3 className="font-bold text-gray-900 mb-2">Γλώσσες</h3>
              <div className="flex flex-wrap gap-2">
                {languages.map((l: any, i: number) => (
                  <span key={i} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {l.language || l}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Contact */}
          {(p.email || p.phone) && (
            <div className="rounded-2xl bg-gray-50 p-4 space-y-2">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Επικοινωνία</h3>
              {p.email && <p className="text-sm text-gray-700 truncate">✉️ {p.email}</p>}
              {p.phone && <p className="text-sm text-gray-700 truncate">📞 {p.phone}</p>}
            </div>
          )}
        </div>

        {/* Sticky actions */}
        {!isSelfView && (onLike || onSkip) && (
          <div className="sticky bottom-0 border-t border-gray-200 bg-white px-5 py-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}>
            <div className="flex gap-2">
              {onSkip && (
                <button onClick={() => { onSkip(); onClose(); }}
                  className="flex flex-1 items-center justify-center rounded-xl border-2 border-red-200 py-3 text-sm font-semibold text-red-600 hover:bg-red-50">
                  ✕ Πέρασε
                </button>
              )}
              {onLike && (
                <button onClick={() => { onLike(); onClose(); }}
                  className="flex flex-[1.5] items-center justify-center rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 shadow-lg">
                  ♥ Ενδιαφέρομαι
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Helpers ──────────────────────────── */

function Chip({ children, kind = 'green' }: { children: React.ReactNode; kind?: 'green' | 'gray' }) {
  const cls = kind === 'gray'
    ? 'bg-gray-50 border-gray-200 text-gray-600'
    : 'bg-emerald-50 border-emerald-200 text-emerald-700';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold ${cls}`}>
      {children}
    </span>
  );
}

function InfoRow({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 flex-shrink-0 mt-0.5">
        <span className="text-sm">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 mb-0.5">{title}</p>
        {children}
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold text-gray-900 mt-0.5 truncate">{value}</p>
    </div>
  );
}
