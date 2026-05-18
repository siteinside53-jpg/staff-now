'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MetricCard } from '@/components/admin/ui/metric-card';
import { KpiChartCard } from '@/components/admin/ui/kpi-chart-card';
import { adminApi } from '@/components/admin/lib/admin-api';

interface ActivityRow {
  id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  user_role?: string;
  user_photo?: string;
  activity_type: string;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata?: string | null;
  ip_address?: string | null;
  created_at: string;
}

interface OnlineUser {
  id: string;
  name?: string;
  email: string;
  role: string;
  photo?: string;
  last_seen_at: string;
}

interface RecentSignup {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  name?: string;
  photo?: string;
  region?: string;
  last_login_at?: string | null;
  last_seen_at?: string | null;
}

const REFRESH_MS = 10_000;
const LIVE_REFRESH_MS = 5_000;

export default function OverviewPage() {
  const [stats, setStats] = useState<any>(null);
  const [series, setSeries] = useState<any>(null);
  const [presence, setPresence] = useState<{
    onlineNow: number;
    activeToday: number;
    activeThisWeek: number;
    onlineWindowMinutes: number;
    users: OnlineUser[];
  } | null>(null);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [signups, setSignups] = useState<RecentSignup[]>([]);
  const [live, setLive] = useState<{
    serverTime: string;
    windowSec: number;
    totals: { loggedIn: number; anonymous: number; total: number };
    visitors: Array<{
      kind: 'user' | 'anon';
      id: string;
      name: string | null;
      email: string | null;
      role: string | null;
      photo: string | null;
      country: string | null;
      city: string | null;
      currentPath: string | null;
      lastSeenAt: string;
      sessionStartedAt: string | null;
      pageViews: number;
      trail: Array<{ path: string; ts: string }>;
    }>;
  } | null>(null);
  const [geo, setGeo] = useState<{
    days: number;
    totals: { totalActions: number; uniqueCountries: number; uniqueCities: number; uniqueUsers: number };
    countries: Array<{ country: string; users: number; actions: number }>;
    cities: Array<{ country: string; city: string; users: number; actions: number }>;
    today: Array<{ country: string; users: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  async function loadAll() {
    const [s, sr, pres, act, sg, g] = await Promise.all([
      adminApi.getStats().catch(() => null),
      adminApi.getAnalyticsSeries(14).catch(() => null),
      adminApi.getPresence().catch(() => null),
      adminApi.getLiveActivity({ limit: 30 }).catch(() => []),
      adminApi.getRecentSignups(8).catch(() => []),
      adminApi.getGeoStats(30).catch(() => null),
    ]);
    setStats(s);
    setSeries(sr);
    setPresence(pres);
    setActivity(act || []);
    setSignups(sg || []);
    setGeo(g);
    setUpdatedAt(new Date());
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    const id = setInterval(loadAll, REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  // Faster, lighter loop just for the live visitors panel
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const data = await adminApi.getLiveVisitors(60);
        if (!cancelled) setLive(data);
      } catch {}
    };
    tick();
    const id = setInterval(tick, LIVE_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const lastVal = (arr?: number[]) => (arr && arr.length ? arr[arr.length - 1] : 0);
  const dauSeries = series?.dau || [];
  const signupsSeries = series?.signups || [];
  const matchesSeries = series?.matches || [];
  const messagesSeries = series?.messages || [];

  return (
    <div className="space-y-6">
      {/* ==================== HERO: PRESENCE ==================== */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Επισκόπηση</h2>
            <p className="text-xs text-gray-400">
              Ανανέωση κάθε {REFRESH_MS / 1000}s
              {updatedAt && ` · Τελευταία: ${updatedAt.toLocaleTimeString('el-GR')}`}
            </p>
          </div>
          <button
            onClick={loadAll}
            className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-50"
            disabled={loading}
          >
            Ανανέωση τώρα
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MetricCard
            label={`Online τώρα (${presence?.onlineWindowMinutes || 5}'`}
            value={presence?.onlineNow ?? 0}
            icon="🟢"
            context="ενεργοί χρήστες"
            tone="success"
            loading={loading && !presence}
          />
          <MetricCard
            label="Ενεργοί σήμερα"
            value={presence?.activeToday ?? 0}
            icon="📈"
            context="distinct users"
            tone="info"
            loading={loading && !presence}
          />
          <MetricCard
            label="Ενεργοί 7 ημερών"
            value={presence?.activeThisWeek ?? 0}
            icon="📊"
            context="WAU"
            tone="info"
            loading={loading && !presence}
          />
          <MetricCard
            label="Νέες εγγραφές σήμερα"
            value={stats?.users?.newToday ?? 0}
            icon="🆕"
            context={`${stats?.users?.suspended ?? 0} σε αναστολή`}
            tone="success"
            loading={loading}
          />
        </div>
      </section>

      {/* ==================== ONLINE USERS LIST ==================== */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">
            🟢 Online τώρα{' '}
            <span className="text-sm font-normal text-gray-400">
              ({presence?.users.length || 0})
            </span>
          </h3>
        </div>
        {!presence || presence.users.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">Κανένας δεν είναι online αυτή τη στιγμή.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {presence.users.map((u) => (
              <Link
                key={u.id}
                href={`/admin/users?focus=${u.id}`}
                className="group flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 transition-colors hover:bg-emerald-100"
                title={`${u.email} · last seen ${new Date(u.last_seen_at).toLocaleTimeString('el-GR')}`}
              >
                <Avatar name={u.name || u.email} photo={u.photo} small />
                <span className="text-xs font-semibold text-emerald-900 max-w-[140px] truncate">
                  {u.name || u.email.split('@')[0]}
                </span>
                <RoleTag role={u.role} />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ==================== ACCOUNT STATS ==================== */}
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">Λογαριασμοί</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MetricCard
            label="Συνολικοί χρήστες"
            value={stats?.users?.total ?? 0}
            icon="👥"
            context={`${stats?.users?.workers ?? 0} εργαζ. · ${stats?.users?.businesses ?? 0} επιχ.`}
            tone="info"
            loading={loading}
          />
          <MetricCard
            label="Νέα matches σήμερα"
            value={stats?.matches?.newToday ?? 0}
            icon="🎯"
            context={`${stats?.matches?.total ?? 0} συνολικά`}
            tone="success"
            loading={loading}
          />
          <MetricCard
            label="Ενεργές αγγελίες"
            value={stats?.jobs?.published ?? 0}
            icon="💼"
            context={`+${stats?.jobs?.newToday ?? 0} σήμερα`}
            tone="default"
            loading={loading}
          />
          <MetricCard
            label="Pending tasks"
            value={(stats?.reports?.pending || 0) + (stats?.verifications?.pending || 0)}
            icon="⚠️"
            context={`${stats?.reports?.pending ?? 0} αναφορές · ${stats?.verifications?.pending ?? 0} επαληθ.`}
            tone={(stats?.reports?.pending || 0) > 0 ? 'warning' : 'default'}
            loading={loading}
          />
        </div>
      </section>

      {/* ==================== LIVE VISITORS ==================== */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <h3 className="text-base font-bold text-gray-900">
              Live τώρα
            </h3>
            {live && (
              <span className="text-xs text-gray-500">
                <span className="font-bold text-gray-900">{live.totals.total}</span> ενεργοί ·{' '}
                <span className="text-blue-600">{live.totals.loggedIn} συνδεδεμένοι</span> ·{' '}
                <span className="text-gray-500">{live.totals.anonymous} ανώνυμοι</span>
              </span>
            )}
          </div>
          <span className="text-[10px] text-gray-400">
            ανανέωση κάθε {LIVE_REFRESH_MS / 1000}s · παράθυρο {live?.windowSec || 60}s
          </span>
        </div>
        {!live || live.visitors.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">
            Κανείς ενεργός αυτή τη στιγμή.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 max-h-[440px] overflow-y-auto">
            {live.visitors.map((v) => (
              <LiveVisitorRow key={`${v.kind}-${v.id}`} v={v} />
            ))}
          </ul>
        )}
      </section>

      {/* ==================== GEO (countries / cities) ==================== */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900">🌍 Χώρες (30 ημέρες)</h3>
            <span className="text-xs text-gray-400">
              {geo ? `${geo.totals.uniqueCountries} χώρες · ${geo.totals.uniqueUsers} χρήστες` : '—'}
            </span>
          </div>
          {!geo || geo.countries.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">
              Δεν έχει καταγραφεί ακόμα χώρα. Θα συμπληρωθεί καθώς οι χρήστες κάνουν login/page view.
            </p>
          ) : (
            <ul className="space-y-2 max-h-[260px] overflow-y-auto">
              {geo.countries.slice(0, 12).map((row) => {
                const pct = geo.countries[0] ? Math.round((row.actions / geo.countries[0].actions) * 100) : 0;
                return (
                  <li key={row.country}>
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="font-semibold text-gray-700">
                        {flagEmoji(row.country)} {countryName(row.country)}
                        <span className="ml-1 text-gray-400 font-mono">({row.country})</span>
                      </span>
                      <span className="text-gray-500">
                        <span className="font-bold text-gray-900">{row.users}</span> χρήστες ·{' '}
                        <span className="text-gray-400">{row.actions}</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900">📍 Πόλεις</h3>
            <span className="text-xs text-gray-400">
              {geo ? `${geo.totals.uniqueCities} πόλεις` : '—'}
            </span>
          </div>
          {!geo || geo.cities.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">Καμία πόλη ακόμα.</p>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-[260px] overflow-y-auto">
              {geo.cities.slice(0, 15).map((row, i) => (
                <li key={`${row.country}-${row.city}-${i}`} className="flex items-center justify-between py-1.5 text-xs">
                  <span className="font-semibold text-gray-800 truncate">
                    {flagEmoji(row.country)} {row.city}
                    <span className="ml-1 text-gray-400">{countryName(row.country)}</span>
                  </span>
                  <span className="text-gray-500 flex-shrink-0">
                    <span className="font-bold text-gray-900">{row.users}</span> χρ. ·{' '}
                    <span className="text-gray-400">{row.actions}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ==================== TRENDS ==================== */}
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">Tάσεις (14 ημέρες)</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiChartCard title="DAU (proxy)" value={lastVal(dauSeries)} series={dauSeries.length ? dauSeries : [0,0,0,0,0,0,0]} color="blue" />
          <KpiChartCard title="Εγγραφές" value={lastVal(signupsSeries)} series={signupsSeries.length ? signupsSeries : [0,0,0,0,0,0,0]} color="emerald" />
          <KpiChartCard title="Matches" value={lastVal(matchesSeries)} series={matchesSeries.length ? matchesSeries : [0,0,0,0,0,0,0]} color="purple" />
          <KpiChartCard title="Μηνύματα" value={lastVal(messagesSeries)} series={messagesSeries.length ? messagesSeries : [0,0,0,0,0,0,0]} color="amber" />
        </div>
      </section>

      {/* ==================== ACTIVITY + RECENT SIGNUPS ==================== */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Live activity feed */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900">⚡ Ζωντανή δραστηριότητα</h3>
            <Link href="/admin/audit-log" className="text-xs font-semibold text-blue-600 hover:underline">
              Δες όλα →
            </Link>
          </div>
          {activity.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Καμία δραστηριότητα ακόμα</p>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-[460px] overflow-y-auto">
              {activity.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/admin/users/timeline?id=${row.user_id}`}
                    className="flex items-start gap-3 py-2.5 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      <ActivityIcon type={row.activity_type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {row.user_name || row.user_email || 'Άγνωστος χρήστης'}
                        </p>
                        {row.user_role && <RoleTag role={row.user_role} />}
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {describeActivity(row)}
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-xs text-gray-400">{relativeTime(row.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent signups */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900">🆕 Πρόσφατες εγγραφές</h3>
            <Link href="/admin/users?sort=newest" className="text-xs font-semibold text-blue-600 hover:underline">
              Όλοι →
            </Link>
          </div>
          {signups.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Κανένας ακόμα.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {signups.map((u) => (
                <li key={u.id}>
                  <Link
                    href={`/admin/users/timeline?id=${u.id}`}
                    className="flex items-center gap-3 py-2.5 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <Avatar name={u.name || u.email} photo={u.photo} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {u.name || u.email.split('@')[0]}
                        </p>
                        <RoleTag role={u.role} />
                      </div>
                      <p className="text-[11px] text-gray-500 truncate">
                        {u.region ? `${u.region} · ` : ''}
                        {u.email}
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-[11px] text-gray-400">{relativeTime(u.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Avatar({ name, photo, small }: { name?: string; photo?: string; small?: boolean }) {
  const cls = small ? 'h-6 w-6 text-[10px]' : 'h-9 w-9 text-xs';
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt="" className={`${cls} rounded-full object-cover bg-gray-200`} />;
  }
  const initial = (name || '?').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || '?';
  return (
    <div className={`${cls} flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 font-bold text-white`}>
      {initial}
    </div>
  );
}

function RoleTag({ role }: { role: string }) {
  if (role === 'admin')
    return <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">ADMIN</span>;
  if (role === 'business')
    return <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">B</span>;
  return <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">W</span>;
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

function ActivityIcon({ type }: { type: string }) {
  const emoji = ICON_MAP[type] || '⚡';
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-sm">
      {emoji}
    </span>
  );
}

function describeActivity(row: ActivityRow): string {
  switch (row.activity_type) {
    case 'login':
      return 'Συνδέθηκε';
    case 'logout':
      return 'Αποσυνδέθηκε';
    case 'register': {
      const meta = parseMeta(row.metadata);
      return `Εγγράφηκε ως ${meta?.role || row.user_role || 'χρήστης'}`;
    }
    case 'page_view':
      return `Άνοιξε σελίδα ${row.entity_id || ''}`;
    case 'swipe_like':
      return 'Έκανε like';
    case 'swipe_skip':
      return 'Πέρασε χωρίς like';
    case 'match':
      return 'Νέο match';
    case 'message_send':
      return 'Έστειλε μήνυμα';
    case 'profile_update':
      return 'Ενημέρωσε το προφίλ';
    case 'job_post':
      return 'Δημοσίευσε αγγελία';
    case 'job_pause':
      return 'Σταμάτησε αγγελία';
    default:
      return row.activity_type;
  }
}

function parseMeta(json?: string | null): Record<string, any> | null {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function relativeTime(input: string): string {
  const ms = Date.now() - new Date(input).getTime();
  if (ms < 0) return 'τώρα';
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}'`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  return `${day}d`;
}

function flagEmoji(countryCode?: string | null): string {
  if (!countryCode || countryCode.length !== 2) return '🏳️';
  // ISO 3166-1 alpha-2 → regional indicator symbols
  const cc = countryCode.toUpperCase();
  const A = 0x1f1e6;
  return String.fromCodePoint(A + cc.charCodeAt(0) - 65, A + cc.charCodeAt(1) - 65);
}

const COUNTRY_NAMES: Record<string, string> = {
  GR: 'Ελλάδα', CY: 'Κύπρος', US: 'Η.Π.Α.', GB: 'Ηνωμ. Βασίλειο', DE: 'Γερμανία',
  FR: 'Γαλλία', IT: 'Ιταλία', ES: 'Ισπανία', NL: 'Ολλανδία', BE: 'Βέλγιο',
  AT: 'Αυστρία', CH: 'Ελβετία', SE: 'Σουηδία', DK: 'Δανία', NO: 'Νορβηγία',
  FI: 'Φινλανδία', PL: 'Πολωνία', CZ: 'Τσεχία', PT: 'Πορτογαλία', IE: 'Ιρλανδία',
  TR: 'Τουρκία', BG: 'Βουλγαρία', RO: 'Ρουμανία', RS: 'Σερβία', HR: 'Κροατία',
  AL: 'Αλβανία', MK: 'Β. Μακεδονία', RU: 'Ρωσία', UA: 'Ουκρανία', CA: 'Καναδάς',
  AU: 'Αυστραλία', JP: 'Ιαπωνία', CN: 'Κίνα', IN: 'Ινδία', BR: 'Βραζιλία',
  AE: 'Η.Α.Ε.', SA: 'Σ. Αραβία', IL: 'Ισραήλ', EG: 'Αίγυπτος', ZA: 'Ν. Αφρική',
};

function countryName(code?: string | null): string {
  if (!code) return '—';
  return COUNTRY_NAMES[code.toUpperCase()] || code;
}

function LiveVisitorRow({
  v,
}: {
  v: {
    kind: 'user' | 'anon';
    id: string;
    name: string | null;
    email: string | null;
    role: string | null;
    photo: string | null;
    country: string | null;
    city: string | null;
    currentPath: string | null;
    lastSeenAt: string;
    sessionStartedAt: string | null;
    pageViews: number;
    trail: Array<{ path: string; ts: string }>;
  };
}) {
  const lastSeenSec = Math.max(0, Math.floor((Date.now() - new Date(v.lastSeenAt).getTime()) / 1000));
  const onlineNow = lastSeenSec < 30;
  const sessionSec = v.sessionStartedAt
    ? Math.max(0, Math.floor((Date.now() - new Date(v.sessionStartedAt).getTime()) / 1000))
    : null;

  const Wrapper: any = v.kind === 'user'
    ? ({ children }: { children: React.ReactNode }) => (
        <Link href={`/admin/users/timeline?id=${v.id}`} className="block py-2.5 -mx-2 px-2 rounded-lg hover:bg-gray-50">
          {children}
        </Link>
      )
    : ({ children }: { children: React.ReactNode }) => (
        <div className="block py-2.5 -mx-2 px-2 rounded-lg">{children}</div>
      );

  return (
    <li>
      <Wrapper>
        <div className="flex items-start gap-3">
          {/* status dot + avatar */}
          <div className="relative flex-shrink-0">
            {v.kind === 'user' ? (
              <Avatar name={v.name || v.email || ''} photo={v.photo || undefined} />
            ) : (
              <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-base text-gray-500">
                👤
              </div>
            )}
            <span
              className={`absolute -bottom-0 -right-0 h-3 w-3 rounded-full ring-2 ring-white ${
                onlineNow ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
              }`}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-gray-900 truncate">
                {v.kind === 'user' ? v.name || v.email : `Επισκέπτης ${v.id.slice(2, 8)}`}
              </p>
              {v.role && <RoleTag role={v.role} />}
              {v.kind === 'anon' && (
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">
                  ανώνυμος
                </span>
              )}
              <span className="text-[10px] text-gray-400">
                {v.country && (
                  <>
                    {flagEmoji(v.country)} {v.city || countryName(v.country)}
                  </>
                )}
              </span>
            </div>

            {/* Current page */}
            {v.currentPath && (
              <div className="mt-0.5 flex items-center gap-1.5 text-xs">
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${onlineNow ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                <span className="text-gray-500">τώρα στο</span>
                <code className="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[11px] truncate">
                  {v.currentPath}
                </code>
              </div>
            )}

            {/* Trail */}
            {v.trail && v.trail.length > 1 && (
              <div className="mt-1 flex items-center gap-1 text-[10px] text-gray-400 overflow-hidden">
                <span>είδε:</span>
                {v.trail.slice(0, 5).map((t, i) => (
                  <span key={`${t.path}-${i}`} className="inline-flex items-center gap-1 truncate">
                    <code className="font-mono text-gray-500 truncate max-w-[100px]">{t.path}</code>
                    {i < v.trail.length - 1 && i < 4 && <span className="text-gray-300">·</span>}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right: timing */}
          <div className="text-right flex-shrink-0 text-[10px] text-gray-400 leading-tight">
            <div className={onlineNow ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
              {onlineNow ? '● τώρα' : `πριν ${lastSeenSec}s`}
            </div>
            {sessionSec !== null && (
              <div>μέσα: {formatDuration(sessionSec)}</div>
            )}
            {v.pageViews > 0 && <div>{v.pageViews} σελίδες</div>}
          </div>
        </div>
      </Wrapper>
    </li>
  );
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ${sec % 60}s`;
  const hr = Math.floor(min / 60);
  return `${hr}h ${min % 60}m`;
}
