'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { adminApi } from '@/components/admin/lib/admin-api';

export const dynamic = 'force-static';

interface ActivityRow {
  id: string;
  activity_type: string;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

interface SessionRow {
  id: string;
  started_at: string;
  last_activity_at: string;
  ended_at?: string | null;
  is_active: number;
  ip_address?: string | null;
  user_agent?: string | null;
}

interface TimelineData {
  user: {
    id: string;
    email: string;
    role: string;
    status: string;
    email_verified?: number;
    name?: string;
    photo?: string;
    region?: string;
    city?: string;
    phone?: string;
    created_at: string;
    last_login_at?: string | null;
    last_seen_at?: string | null;
  };
  profile: any | null;
  counts: {
    matches: number;
    swipesGiven: number;
    likesReceived: number;
    conversations: number;
    messagesSent: number;
    jobsTotal: number;
    jobsPublished: number;
    reportsAgainst: number;
    reportsBy: number;
  };
  subscription: { plan_id: string; status: string; current_period_end?: string } | null;
  branches?: BusinessBranch[];
  activity: ActivityRow[];
  sessions: SessionRow[];
  topPages: Array<{ path: string; count: number }>;
}

interface BusinessBranch {
  id: string;
  name: string;
  business_type?: string | null;
  description?: string | null;
  region?: string | null;
  city?: string | null;
  address?: string | null;
  postal_code?: string | null;
  area?: string | null;
  phone?: string | null;
  website?: string | null;
  google_business_url?: string | null;
  logo_url?: string | null;
  cover_photo_url?: string | null;
  staff_housing?: number;
  meals_provided?: number;
  transportation_assistance?: number;
  bonus_provided?: number;
  insurance_provided?: number;
  operating_hours?: string | null;
  legal_form?: string | null;
  tax_id?: string | null;
  is_visible?: number;
  created_at?: string;
  jobs?: BranchJob[];
  jobsCounts?: { total: number; published: number; paused: number; archived: number; draft: number };
  __orphan?: boolean;
}

interface BranchJob {
  id: string;
  title: string;
  status: string;
  employment_type?: string | null;
  salary_type?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  city?: string | null;
  region?: string | null;
  housing_provided?: number;
  meals_provided?: number;
  bonus_provided?: number;
  created_at?: string;
  updated_at?: string;
}

export default function UserTimelinePage() {
  return (
    <Suspense fallback={<div className="text-sm text-gray-400">Φόρτωση…</div>}>
      <UserTimeline />
    </Suspense>
  );
}

function UserTimeline() {
  const router = useRouter();
  const search = useSearchParams();
  const id = search.get('id');
  const [data, setData] = useState<TimelineData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    adminApi
      .getUserTimeline(id, 200)
      .then((d) => setData(d as any))
      .catch((e) => setError(e.message || 'Σφάλμα φόρτωσης'))
      .finally(() => setLoading(false));
  }, [id]);

  if (!id) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Λείπει το user id. Επίστρεψε στη <Link href="/admin/users" className="underline">λίστα χρηστών</Link>.
      </div>
    );
  }

  if (loading) return <p className="text-sm text-gray-400">Φόρτωση…</p>;
  if (error) return <p className="text-sm text-rose-600">Σφάλμα: {error}</p>;
  if (!data) return null;

  const u = data.user;
  const p = data.profile || {};
  const c = data.counts;
  const isWorker = u.role === 'worker';

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/users" className="text-xs text-blue-600 hover:underline">← Όλοι οι χρήστες</Link>
      </div>

      {/* Header */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <Avatar name={u.name || u.email} photo={u.photo} large />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900 truncate">{u.name || u.email}</h1>
              <RoleTag role={u.role} />
              <StatusTag status={u.status} />
              {u.email_verified ? (
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">✓ verified email</span>
              ) : null}
              {p?.verified === 1 && (
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">✓ verified profile</span>
              )}
            </div>
            <p className="text-sm text-gray-500 truncate">{u.email}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {[u.city, u.region].filter(Boolean).join(', ') || '—'}
              {u.phone ? ` · ${u.phone}` : ''}
            </p>
            {data.subscription && (
              <div className="mt-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-200 px-2 py-0.5 text-[11px] font-bold text-purple-700">
                  💎 {data.subscription.plan_id} · {data.subscription.status}
                </span>
              </div>
            )}
          </div>
          <div className="text-right text-xs space-y-2 flex-shrink-0">
            <DateRow label="Εγγραφή" value={u.created_at} />
            <DateRow label="Τελευταία σύνδεση" value={u.last_login_at} />
            <DateRow label="Τελευταία δραστηριότητα" value={u.last_seen_at} />
          </div>
        </div>
      </section>

      {/* ============== STATS GRID ============== */}
      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-500">Στατιστικά</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBox icon="🎯" label="Ταιριάσματα" value={c.matches} />
          <StatBox icon="❤️" label="Likes received" value={c.likesReceived} />
          <StatBox icon="💬" label="Συνομιλίες" value={c.conversations} />
          <StatBox icon="📨" label="Μηνύματα" value={c.messagesSent} />
          {isWorker ? (
            <>
              <StatBox icon="➡️" label="Swipes" value={c.swipesGiven} />
              <StatBox icon="🚨" label="Αναφορές κατά" value={c.reportsAgainst} tone={c.reportsAgainst > 0 ? 'warn' : undefined} />
              <StatBox icon="📋" label="Αναφορές που έκανε" value={c.reportsBy} />
              <StatBox icon="📊" label="Πληρότητα προφίλ" value={p?.profile_completeness ? `${p.profile_completeness}%` : '—'} />
            </>
          ) : (
            <>
              <StatBox icon="💼" label="Αγγελίες" value={`${c.jobsPublished}/${c.jobsTotal}`} />
              <StatBox icon="➡️" label="Swipes" value={c.swipesGiven} />
              <StatBox icon="🚨" label="Αναφορές κατά" value={c.reportsAgainst} tone={c.reportsAgainst > 0 ? 'warn' : undefined} />
              <StatBox icon="📋" label="Αναφορές που έκανε" value={c.reportsBy} />
            </>
          )}
        </div>
      </section>

      {/* ============== PROFILE DETAILS (worker only) ============== */}
      {isWorker && p && Object.keys(p).length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-bold text-gray-900">👤 Στοιχεία εργαζόμενου</h2>
          <WorkerProfile p={p} />
        </section>
      )}

      {/* ============== BUSINESSES/BRANCHES (with jobs) ============== */}
      {!isWorker && (
        <BusinessesSection branches={data.branches || []} fallbackProfile={p} />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Activity Timeline */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Χρονολόγιο δραστηριότητας</h2>
            <span className="text-xs text-gray-400">{data.activity.length} ενέργειες</span>
          </div>
          {data.activity.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Καμία καταγραμμένη δραστηριότητα.</p>
          ) : (
            <ol className="relative border-l-2 border-gray-100 ml-3 space-y-3 max-h-[640px] overflow-y-auto">
              {data.activity.map((row) => (
                <li key={row.id} className="ml-5">
                  <span className="absolute -left-[10px] mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-white ring-2 ring-gray-100 text-[10px]">
                    {ICON_MAP[row.activity_type] || '⚡'}
                  </span>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{describe(row)}</p>
                      {row.entity_id && (
                        <p className="text-[11px] text-gray-500 truncate">{row.entity_id}</p>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-400 flex-shrink-0">{formatDate(row.created_at)}</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Side: pages + sessions */}
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-bold text-gray-900">📍 Πιο επισκεπτόμενες σελίδες (30 ημέρες)</h2>
            {data.topPages.length === 0 ? (
              <p className="text-sm text-gray-400">—</p>
            ) : (
              <ul className="space-y-1.5">
                {data.topPages.map((p) => (
                  <li key={p.path} className="flex items-center justify-between text-xs">
                    <span className="font-mono text-gray-700 truncate max-w-[70%]">{p.path}</span>
                    <span className="font-semibold text-gray-500">{p.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-bold text-gray-900">🔐 Sessions</h2>
            {data.sessions.length === 0 ? (
              <p className="text-sm text-gray-400">—</p>
            ) : (
              <ul className="space-y-2">
                {data.sessions.map((s) => (
                  <li key={s.id} className="rounded-lg border border-gray-100 px-3 py-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className={`font-bold ${s.is_active ? 'text-emerald-600' : 'text-gray-500'}`}>
                        {s.is_active ? '● Ενεργή' : 'Έληξε'}
                      </span>
                      <span className="text-gray-400">{formatDate(s.started_at)}</span>
                    </div>
                    {s.ip_address && (
                      <p className="mt-0.5 text-[10px] text-gray-500 font-mono truncate">IP: {s.ip_address}</p>
                    )}
                    {s.user_agent && (
                      <p className="text-[10px] text-gray-400 truncate">{s.user_agent}</p>
                    )}
                    {!s.is_active && s.ended_at && (
                      <p className="text-[10px] text-gray-400">Λήξη: {formatDate(s.ended_at)}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const ICON_MAP: Record<string, string> = {
  login: '🔓',
  logout: '🔒',
  register: '🆕',
  page_view: '👁️',
  swipe_like: '❤️',
  swipe_skip: '➡️',
  match: '🎯',
  message_send: '💬',
  profile_update: '📝',
  job_post: '📢',
  job_pause: '⏸️',
};

function describe(row: ActivityRow): string {
  const meta = (() => {
    if (!row.metadata) return null;
    try { return JSON.parse(row.metadata); } catch { return null; }
  })();
  switch (row.activity_type) {
    case 'login': return 'Συνδέθηκε';
    case 'logout': return 'Αποσυνδέθηκε';
    case 'register': return `Εγγράφηκε${meta?.role ? ` ως ${meta.role}` : ''}`;
    case 'page_view': return 'Άνοιξε σελίδα';
    case 'swipe_like': return 'Έκανε like';
    case 'swipe_skip': return 'Πέρασε χωρίς like';
    case 'match': return 'Νέο match';
    case 'message_send': return 'Έστειλε μήνυμα';
    case 'profile_update': return 'Ενημέρωσε προφίλ';
    case 'job_post': return 'Δημοσίευσε αγγελία';
    case 'job_pause': return 'Σταμάτησε αγγελία';
    default: return row.activity_type;
  }
}

function formatDate(s: string): string {
  return new Date(s).toLocaleString('el-GR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function Avatar({ name, photo, large }: { name?: string; photo?: string; large?: boolean }) {
  const cls = large ? 'h-16 w-16 text-xl' : 'h-9 w-9 text-xs';
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt="" className={`${cls} rounded-full object-cover bg-gray-200 flex-shrink-0`} />;
  }
  const initial = (name || '?').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || '?';
  return (
    <div className={`${cls} flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 font-bold text-white flex-shrink-0`}>
      {initial}
    </div>
  );
}

function RoleTag({ role }: { role: string }) {
  if (role === 'admin') return <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">ADMIN</span>;
  if (role === 'business') return <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">B</span>;
  return <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">W</span>;
}

function StatusTag({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    suspended: 'bg-rose-100 text-rose-700',
    pending_verification: 'bg-amber-100 text-amber-700',
    deleted: 'bg-gray-200 text-gray-600',
  };
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${map[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
}

function DateRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-gray-400">{label}</p>
      <p className="font-semibold text-gray-700">{value ? formatDate(value) : '—'}</p>
    </div>
  );
}

function StatBox({ icon, label, value, tone }: { icon: string; label: string; value: number | string; tone?: 'warn' }) {
  const toneClass =
    tone === 'warn' ? 'border-rose-200 bg-rose-50' : 'border-gray-200 bg-white';
  return (
    <div className={`rounded-xl border ${toneClass} p-3 shadow-sm`}>
      <div className="flex items-center justify-between">
        <span className="text-lg">{icon}</span>
      </div>
      <p className="mt-1 text-2xl font-extrabold text-gray-900 tabular-nums">{value}</p>
      <p className="text-[11px] text-gray-500 leading-tight">{label}</p>
    </div>
  );
}

function WorkerProfile({ p }: { p: any }) {
  const roles: string[] = (() => {
    if (Array.isArray(p.roles)) return p.roles;
    if (typeof p.roles === 'string') {
      try { return JSON.parse(p.roles) || []; } catch { return p.roles.split(',').filter(Boolean); }
    }
    return [];
  })();
  const langs: string[] = (() => {
    if (Array.isArray(p.languages)) return p.languages;
    if (typeof p.languages === 'string') {
      try { return JSON.parse(p.languages) || []; } catch { return p.languages.split(',').filter(Boolean); }
    }
    return [];
  })();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
      <Field label="Πλήρες όνομα" value={p.full_name} />
      <Field label="Τηλέφωνο" value={p.phone} />
      <Field label="Πόλη / Περιοχή" value={[p.city, p.region].filter(Boolean).join(', ')} />
      <Field label="Έτη εμπειρίας" value={p.years_of_experience ? `${p.years_of_experience} έτη` : null} />
      <Field
        label="Αναμενόμενος μισθός"
        value={p.expected_monthly_salary ? `${Number(p.expected_monthly_salary).toLocaleString('el-GR')}€/μήνα` : null}
      />
      <Field label="Διαθεσιμότητα" value={p.availability} />
      <Field label="Μετακίνηση" value={p.willing_to_relocate ? 'Ναι' : 'Όχι'} />
      <Field label="CV" value={p.cv_url ? <a href={p.cv_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">📄 Άνοιγμα</a> : null} />
      {p.bio && (
        <div className="sm:col-span-2">
          <p className="text-xs text-gray-400">Βιογραφικό</p>
          <p className="mt-0.5 text-sm text-gray-700 whitespace-pre-line">{p.bio}</p>
        </div>
      )}
      {roles.length > 0 && (
        <div className="sm:col-span-2">
          <p className="text-xs text-gray-400">Ρόλοι</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {roles.map((r: string) => (
              <span key={r} className="rounded-full bg-emerald-50 ring-1 ring-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                {r}
              </span>
            ))}
          </div>
        </div>
      )}
      {langs.length > 0 && (
        <div className="sm:col-span-2">
          <p className="text-xs text-gray-400">Γλώσσες</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {langs.map((l: string) => (
              <span key={l} className="rounded-full bg-blue-50 ring-1 ring-blue-200 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                {l}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BusinessesSection({
  branches,
  fallbackProfile,
}: {
  branches: BusinessBranch[];
  fallbackProfile: any;
}) {
  // If no branches at all but we have a legacy business_profile, render it as a single card.
  if (branches.length === 0 && fallbackProfile && Object.keys(fallbackProfile).length > 0) {
    const synthetic: BusinessBranch = {
      id: 'legacy',
      name: fallbackProfile.company_name || 'Επιχείρηση',
      business_type: fallbackProfile.business_type,
      city: fallbackProfile.city,
      region: fallbackProfile.region,
      phone: fallbackProfile.phone,
      website: fallbackProfile.website,
      address: fallbackProfile.address,
      description: fallbackProfile.description,
      logo_url: fallbackProfile.logo_url,
      jobs: [],
      jobsCounts: { total: 0, published: 0, paused: 0, archived: 0, draft: 0 },
    };
    return (
      <section>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-500">
          <span>🏢 Επιχείρηση (1)</span>
        </h2>
        <BranchCard branch={synthetic} />
      </section>
    );
  }
  if (branches.length === 0) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-400">Δεν έχει καταχωρήσει ακόμα επιχείρηση.</p>
      </section>
    );
  }
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-500">
        <span>🏢 Επιχειρήσεις ({branches.filter((b) => !b.__orphan).length})</span>
        <span className="ml-2 text-xs font-normal normal-case text-gray-400">
          {branches.reduce((sum, b) => sum + (b.jobsCounts?.total || 0), 0)} αγγελίες συνολικά
        </span>
      </h2>
      <div className="space-y-3">
        {branches.map((b) => (
          <BranchCard key={b.id} branch={b} />
        ))}
      </div>
    </section>
  );
}

function BranchCard({ branch: b }: { branch: BusinessBranch }) {
  const [open, setOpen] = useState(false);
  const [openJobId, setOpenJobId] = useState<string | null>(null);
  const totalJobs = b.jobsCounts?.total || 0;
  const published = b.jobsCounts?.published || 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Cover */}
      {b.cover_photo_url && !b.__orphan && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={b.cover_photo_url} alt="" className="h-24 w-full object-cover" />
      )}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Logo */}
          {b.logo_url && !b.__orphan ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.logo_url} alt="" className="h-12 w-12 rounded-lg object-cover bg-gray-100 flex-shrink-0" />
          ) : (
            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-lg flex-shrink-0">
              {b.__orphan ? '📦' : '🏢'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-gray-900 truncate">{b.name || '—'}</h3>
              {b.business_type && (
                <span className="rounded bg-blue-50 ring-1 ring-blue-200 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                  {businessTypeLabel(b.business_type)}
                </span>
              )}
              {b.is_visible === 0 && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                  κρυφή
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-gray-500 truncate">
              {[b.city, b.area, b.region].filter(Boolean).join(', ') || (b.__orphan ? 'Παλαιές αγγελίες χωρίς υποκατάστημα' : '—')}
            </p>
            {b.address && <p className="text-[11px] text-gray-400 truncate">{b.address}{b.postal_code ? `, ${b.postal_code}` : ''}</p>}
          </div>
          <div className="text-right text-xs flex-shrink-0">
            <div className="font-bold text-gray-900">
              {published}/{totalJobs}
            </div>
            <div className="text-[10px] text-gray-400">δημοσιευμένες</div>
          </div>
        </div>

        {/* Contact + perks */}
        {!b.__orphan && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {b.phone && <SmallInfo icon="📞" value={b.phone} />}
            {b.website && (
              <SmallInfo
                icon="🌐"
                value={
                  <a href={b.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline truncate inline-block max-w-full">
                    {b.website}
                  </a>
                }
              />
            )}
            {b.google_business_url && (
              <SmallInfo
                icon="📍"
                value={
                  <a href={b.google_business_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                    Google
                  </a>
                }
              />
            )}
            {b.tax_id && <SmallInfo icon="🧾" value={`ΑΦΜ ${b.tax_id}`} />}
            {b.operating_hours && (
              <div className="sm:col-span-2 flex items-start gap-1.5 text-gray-700">
                <span className="text-gray-400 mt-0.5">🕐</span>
                <span className="text-[11px] leading-relaxed">
                  {formatOperatingHours(b.operating_hours)}
                </span>
              </div>
            )}
            {b.legal_form && <SmallInfo icon="🏛️" value={b.legal_form} />}
          </div>
        )}

        {/* Perks badges */}
        {!b.__orphan && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {b.staff_housing === 1 && <Badge>🏠 Διαμονή</Badge>}
            {b.meals_provided === 1 && <Badge>🍽️ Σίτιση</Badge>}
            {b.transportation_assistance === 1 && <Badge>🚗 Μεταφορά</Badge>}
            {b.bonus_provided === 1 && <Badge>💎 Bonus</Badge>}
            {b.insurance_provided === 1 && <Badge>🩺 Ασφάλιση</Badge>}
          </div>
        )}

        {b.description && !b.__orphan && (
          <p className="mt-3 text-xs text-gray-600 leading-relaxed whitespace-pre-line line-clamp-3">
            {b.description}
          </p>
        )}

        {/* Jobs */}
        {totalJobs > 0 && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <button
              onClick={() => setOpen((s) => !s)}
              className="flex items-center justify-between w-full text-xs font-bold text-gray-700 hover:text-blue-600"
            >
              <span>
                💼 Αγγελίες ({totalJobs})
                {b.jobsCounts && (
                  <span className="ml-2 text-[11px] font-normal text-gray-500">
                    {b.jobsCounts.published > 0 && <span className="text-emerald-600">{b.jobsCounts.published} ενεργές</span>}
                    {b.jobsCounts.paused > 0 && <span className="ml-1 text-amber-600">· {b.jobsCounts.paused} pause</span>}
                    {b.jobsCounts.archived > 0 && <span className="ml-1 text-gray-400">· {b.jobsCounts.archived} αρχ.</span>}
                  </span>
                )}
              </span>
              <span className="text-gray-400">{open ? '▾' : '▸'}</span>
            </button>
            {open && (
              <ul className="mt-2 space-y-1">
                {(b.jobs || []).map((j) => (
                  <li key={j.id}>
                    <button
                      type="button"
                      onClick={() => setOpenJobId(j.id)}
                      className="w-full flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2 text-left hover:bg-blue-50 ring-1 ring-transparent hover:ring-blue-200 transition-colors"
                    >
                      <JobStatusBadge status={j.status} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-gray-900 truncate">{j.title}</p>
                        </div>
                        <p className="text-[11px] text-gray-500 truncate">
                          {[j.city, j.region].filter(Boolean).join(', ') || '—'}
                          {j.salary_min || j.salary_max ? (
                            <>
                              {' · '}
                              <span className="font-semibold text-gray-700">
                                {formatSalaryShort(j.salary_min, j.salary_max, j.salary_type)}
                              </span>
                            </>
                          ) : null}
                          {j.employment_type && <span className="ml-1 text-gray-400">· {j.employment_type}</span>}
                        </p>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-gray-400">
                          {j.housing_provided === 1 && <span>🏠</span>}
                          {j.meals_provided === 1 && <span>🍽️</span>}
                          {j.bonus_provided === 1 && <span>💎</span>}
                          <span>· δημ. {formatShortDate(j.created_at)}</span>
                        </div>
                      </div>
                      <span className="text-gray-300 text-sm flex-shrink-0 self-center">›</span>
                    </button>
                  </li>
                ))}
                {b.jobs && b.jobs.length === 0 && (
                  <li className="text-[11px] text-gray-400 px-3 py-2">Καμία αγγελία σε αυτό το υποκατάστημα.</li>
                )}
              </ul>
            )}
          </div>
        )}
      </div>
      {openJobId && <JobDetailModal jobId={openJobId} onClose={() => setOpenJobId(null)} />}
    </div>
  );
}

// ============== JOB DETAIL MODAL ==============
function JobDetailModal({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
    adminApi
      .getJobDetails(jobId)
      .then((d) => setData(d))
      .catch((e) => setError(e?.message || 'Σφάλμα φόρτωσης'));
  }, [jobId]);

  // ESC closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        {!data && !error && (
          <div className="p-10 text-center text-sm text-gray-400">Φόρτωση αγγελίας…</div>
        )}
        {error && (
          <div className="p-10 text-center">
            <p className="text-sm text-rose-600">{error}</p>
            <button
              onClick={onClose}
              className="mt-4 rounded-full bg-gray-900 px-4 py-2 text-xs font-bold text-white"
            >
              Κλείσιμο
            </button>
          </div>
        )}
        {data && <JobDetailContent data={data} onClose={onClose} />}
      </div>
    </div>
  );
}

function JobDetailContent({ data, onClose }: { data: any; onClose: () => void }) {
  const j = data.job || {};
  const roles: string[] = data.roles || [];
  const positions: any[] = data.positions || [];
  const applicants: any[] = data.applicants || [];
  const counts = data.counts || { likes: 0, skips: 0, matches: 0 };
  const langs = parseList(j.languages);

  return (
    <>
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3 flex items-start justify-between gap-3 rounded-t-2xl">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <JobStatusBadge status={j.status} />
            <h2 className="text-base font-bold text-gray-900 truncate">{j.title || '—'}</h2>
            {j.employment_type && (
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-700">
                {j.employment_type}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-gray-500 truncate">
            {j.company_name || '—'}
            {j.branch_name ? ` · ${j.branch_name}` : ''}
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
          aria-label="Κλείσιμο"
        >
          ✕
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <Mini icon="❤️" label="Likes" value={counts.likes} />
          <Mini icon="🎯" label="Matches" value={counts.matches} />
          <Mini icon="➡️" label="Skips" value={counts.skips} />
        </div>

        {/* Salary block */}
        <Section title="💰 Αμοιβή">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Field label="Μισθός" value={formatSalaryShort(j.salary_min, j.salary_max, j.salary_type)} />
            <Field label="Τύπος" value={j.salary_type} />
            <Field label="Ακαθάριστο" value={j.salary_gross === 1 ? 'Ναι' : 'Όχι'} />
            <Field label="Ώρες/μέρα" value={j.hours_per_day} />
            <Field label="Μέρες/εβδομάδα" value={j.days_per_week} />
            <Field label="Βάρδια" value={j.shift_type} />
          </div>
        </Section>

        {/* Description */}
        {j.description && (
          <Section title="📝 Περιγραφή">
            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{j.description}</p>
          </Section>
        )}

        {/* Location */}
        <Section title="📍 Τοποθεσία">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Field label="Πόλη" value={j.city || j.branch_city} />
            <Field label="Περιοχή" value={j.region || j.branch_region} />
            <Field label="Διεύθυνση" value={j.address || j.branch_address} />
            <Field label="ΤΚ" value={j.postal_code} />
            <Field label="Μετακίνηση εργαζομένου" value={j.requires_relocation === 1 ? 'Ναι' : 'Όχι'} />
          </div>
        </Section>

        {/* Roles */}
        {(roles.length > 0 || positions.length > 0) && (
          <Section title="👤 Ρόλοι">
            <div className="flex flex-wrap gap-1.5">
              {roles.map((r) => (
                <span key={r} className="rounded-full bg-emerald-50 ring-1 ring-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  {r}
                </span>
              ))}
            </div>
            {positions.length > 0 && (
              <ul className="mt-3 space-y-1.5 text-xs">
                {positions.map((p) => (
                  <li key={p.id} className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="font-bold text-gray-900">
                      {p.role}
                      {p.positions_count ? <span className="ml-1 text-gray-400 font-normal">×{p.positions_count}</span> : null}
                    </p>
                    {p.description && <p className="text-gray-600 mt-0.5">{p.description}</p>}
                    {(p.salary_min || p.salary_max) && (
                      <p className="text-gray-500 mt-0.5">
                        {formatSalaryShort(p.salary_min, p.salary_max, p.salary_type)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}

        {/* Requirements */}
        <Section title="🎓 Απαιτήσεις">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Field label="Εμπειρία" value={j.experience_required} />
            <Field label="Δίπλωμα οδήγησης" value={j.requires_drivers_license === 1 ? 'Ναι' : 'Όχι'} />
            <Field label="Φυσική κατάσταση" value={j.requires_physical_fitness === 1 ? 'Ναι' : 'Όχι'} />
            <Field label="Επικοινωνιακές" value={j.requires_communication_skills === 1 ? 'Ναι' : 'Όχι'} />
          </div>
          {langs.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-400">Γλώσσες</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {langs.map((l) => (
                  <span key={l} className="rounded-full bg-blue-50 ring-1 ring-blue-200 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                    {l}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* Perks */}
        <Section title="🎁 Παροχές">
          <div className="flex flex-wrap gap-1.5">
            {j.housing_provided === 1 && <Badge>🏠 Διαμονή</Badge>}
            {j.meals_provided === 1 && <Badge>🍽️ Σίτιση</Badge>}
            {j.transport_provided === 1 && <Badge>🚗 Μεταφορά</Badge>}
            {j.bonus_provided === 1 && <Badge>💎 Bonus</Badge>}
            {j.insurance_provided === 1 && <Badge>🩺 Ασφάλιση</Badge>}
            {j.no_benefits === 1 && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                Χωρίς παροχές
              </span>
            )}
            {j.has_day_off === 1 && (
              <Badge>📅 Ρεπό{j.day_off_description ? `: ${j.day_off_description}` : ''}</Badge>
            )}
          </div>
        </Section>

        {/* Dates */}
        <Section title="📆 Ημερομηνίες">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Field label="Έναρξη" value={j.start_date ? formatShortDate(j.start_date) : null} />
            <Field label="Λήξη" value={j.end_date ? formatShortDate(j.end_date) : null} />
            <Field label="Δημιουργήθηκε" value={j.created_at ? formatDate(j.created_at) : null} />
            <Field label="Τελευταία ενημέρωση" value={j.updated_at ? formatDate(j.updated_at) : null} />
          </div>
        </Section>

        {/* Applicants */}
        <Section title={`👥 Υποψήφιοι (${applicants.length}${counts.likes > applicants.length ? `/${counts.likes}` : ''})`}>
          {applicants.length === 0 ? (
            <p className="text-xs text-gray-400">Κανένας υποψήφιος ακόμα.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {applicants.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/admin/users/timeline?id=${a.swiper_id}`}
                    onClick={onClose}
                    className="flex items-center gap-3 py-2 hover:bg-gray-50 -mx-2 px-2 rounded-lg"
                  >
                    <Avatar name={a.swiper_name} photo={a.swiper_photo} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{a.swiper_name}</p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {a.swiper_region || '—'} · {formatShortDate(a.created_at)}
                      </p>
                    </div>
                    {a.matched === 1 && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                        ✓ Match
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">{title}</h3>
      {children}
    </section>
  );
}

function Mini({ icon, label, value }: { icon: string; label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-2.5 text-center">
      <div className="text-base">{icon}</div>
      <p className="mt-0.5 text-lg font-extrabold text-gray-900 tabular-nums">{value}</p>
      <p className="text-[10px] text-gray-500 leading-none">{label}</p>
    </div>
  );
}

function parseList(input: any): string[] {
  if (Array.isArray(input)) return input.filter(Boolean);
  if (!input) return [];
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return input.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

function SmallInfo({ icon, value }: { icon: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-gray-700">
      <span className="text-gray-400">{icon}</span>
      <span className="truncate">{value}</span>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-emerald-50 ring-1 ring-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
      {children}
    </span>
  );
}

function JobStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    published: { label: '●', className: 'text-emerald-500' },
    paused: { label: '⏸', className: 'text-amber-500' },
    archived: { label: '▢', className: 'text-gray-400' },
    draft: { label: '✎', className: 'text-blue-400' },
    filled: { label: '✓', className: 'text-purple-500' },
  };
  const m = map[status] || { label: '•', className: 'text-gray-400' };
  return (
    <span
      className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white ring-1 ring-gray-200 text-xs ${m.className}`}
      title={status}
    >
      {m.label}
    </span>
  );
}

function formatSalaryShort(min?: number | null, max?: number | null, type?: string | null): string {
  const suffix = type === 'hourly' ? '€/ώρα' : type === 'daily' ? '€/μέρα' : '€/μήνα';
  if (min && max && min !== max) return `${min}–${max} ${suffix}`;
  if (min) return `${min} ${suffix}`;
  if (max) return `${max} ${suffix}`;
  return 'συμφωνία';
}

function formatShortDate(s?: string | null): string {
  if (!s) return '';
  const d = new Date(s);
  return d.toLocaleDateString('el-GR', { day: '2-digit', month: 'short' });
}

const DAY_LABELS: Record<string, string> = {
  mon: 'Δε',
  tue: 'Τρ',
  wed: 'Τε',
  thu: 'Πε',
  fri: 'Πα',
  sat: 'Σα',
  sun: 'Κυ',
};
const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/**
 * Convert the JSON schedule the app stores into a compact, human-friendly line.
 * Example input:
 *   {"mon":{"open":"09:00","close":"23:00","closed":false}, ...}
 * Output:
 *   "Δε–Πα 09:00–23:00 · Σα 10:00–22:00 · Κυ Κλειστά"
 */
function formatOperatingHours(input?: string | null): string | null {
  if (!input) return null;
  let parsed: any;
  try {
    parsed = JSON.parse(input);
  } catch {
    return input; // already a plain string
  }
  if (!parsed || typeof parsed !== 'object') return input;

  // Normalise each day → label
  const daysInfo: Array<{ key: string; label: string }> = DAY_ORDER.map((d) => {
    const data = parsed[d];
    let label: string;
    if (!data) label = '—';
    else if (data.closed) label = 'Κλειστά';
    else if (data.open && data.close) label = `${data.open}–${data.close}`;
    else label = '—';
    return { key: d, label };
  });

  // Group consecutive days that share the same label
  type Group = { startIdx: number; endIdx: number; label: string };
  const groups: Group[] = [];
  for (const [i, info] of daysInfo.entries()) {
    const last = groups[groups.length - 1];
    if (last && last.label === info.label) {
      last.endIdx = i;
    } else {
      groups.push({ startIdx: i, endIdx: i, label: info.label });
    }
  }

  return groups
    .map((g) => {
      const startKey = DAY_ORDER[g.startIdx];
      const endKey = DAY_ORDER[g.endIdx];
      const range =
        g.startIdx === g.endIdx
          ? DAY_LABELS[startKey]
          : `${DAY_LABELS[startKey]}–${DAY_LABELS[endKey]}`;
      return `${range} ${g.label}`;
    })
    .join(' · ');
}

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  hotel: 'Ξενοδοχείο',
  restaurant: 'Εστιατόριο',
  beach_bar: 'Beach Bar',
  cafe: 'Καφέ',
  villa: 'Βίλα',
  tourism_company: 'Τουριστική',
  bar: 'Bar',
  resort: 'Resort',
  cruise: 'Cruise',
  other: 'Άλλο',
};

function businessTypeLabel(t?: string | null): string {
  if (!t) return '';
  return BUSINESS_TYPE_LABELS[t] || t;
}

function BusinessProfile({ p }: { p: any }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
      <Field label="Επωνυμία" value={p.company_name} />
      <Field label="Τύπος" value={p.business_type} />
      <Field label="Πόλη / Περιοχή" value={[p.city, p.region].filter(Boolean).join(', ')} />
      <Field label="Τηλέφωνο" value={p.phone} />
      <Field label="Website" value={p.website ? <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline truncate inline-block max-w-[200px]">{p.website}</a> : null} />
      <Field label="ΑΦΜ" value={p.tax_id} />
      <Field label="Διεύθυνση" value={p.address} />
      <Field label="Ωράριο" value={p.opening_hours} />
      {p.description && (
        <div className="sm:col-span-2">
          <p className="text-xs text-gray-400">Περιγραφή</p>
          <p className="mt-0.5 text-sm text-gray-700 whitespace-pre-line">{p.description}</p>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm text-gray-700 break-words">{value || <span className="text-gray-400">—</span>}</p>
    </div>
  );
}
