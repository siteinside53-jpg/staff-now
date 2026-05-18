'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { adminApi } from '@/components/admin/lib/admin-api';
import { useSecurityStream, type LiveEvent } from '@/components/admin/lib/use-security-stream';
import { EmptyState } from '@/components/admin/ui/empty-state';
import { SeverityBadge, type Severity } from '@/components/admin/ui/severity-badge';

type Tab = 'overview' | 'errors' | 'suspicious' | 'live';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview',   label: 'Επισκόπηση',     icon: '🛡️' },
  { id: 'errors',     label: 'Σφάλματα',       icon: '🐞' },
  { id: 'suspicious', label: 'Ύποπτη δράση',   icon: '⚠️' },
  { id: 'live',       label: 'Live',           icon: '📡' },
];

export default function SecurityPage() {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">🛡️ Ασφάλεια &amp; Παρακολούθηση</h1>
        <p className="mt-0.5 text-xs text-gray-500">
          Ζωντανή εικόνα errors, αλλαγών και ύποπτης δραστηριότητας. Όλα τα events
          συσχετίζονται με χρήστη, IP και χώρα ώστε να εντοπίζονται άμεσα τυχόν
          παραβιάσεις.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-white border border-gray-200 p-1 text-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg px-3 py-2 font-semibold transition-colors ${
              tab === t.id
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="mr-1">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview'   && <OverviewTab />}
      {tab === 'errors'     && <ErrorsTab />}
      {tab === 'suspicious' && <SuspiciousTab />}
      {tab === 'live'       && <LiveTab />}
    </div>
  );
}

// =====================================================================
// OVERVIEW
// =====================================================================
function OverviewTab() {
  const [data, setData] = useState<Awaited<ReturnType<typeof adminApi.getSecurityOverview>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let timer: any;
    const load = async () => {
      try {
        setData(await adminApi.getSecurityOverview());
      } catch (e: any) {
        toast.error(e?.message || 'Σφάλμα φόρτωσης');
      } finally {
        setLoading(false);
      }
    };
    load();
    timer = setInterval(load, 15_000); // gentle polling for the metric tiles
    return () => clearInterval(timer);
  }, []);

  const e = data?.errors;

  return (
    <div className="space-y-4">
      {/* Metric tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Tile label="Σφάλματα · 5min"   value={e?.last5m}        loading={loading} accent={e && e.last5m > 0 ? 'rose' : 'gray'} />
        <Tile label="Σφάλματα · 1h"     value={e?.last1h}        loading={loading} accent={e && e.last1h > 5 ? 'amber' : 'gray'} />
        <Tile label="Σφάλματα · 24h"    value={e?.last24h}       loading={loading} accent="blue" />
        <Tile label="Ανοιχτά"           value={e?.open}          loading={loading} accent={e && e.open > 0 ? 'amber' : 'emerald'} sub="(δεν έχουν επιλυθεί)" />
        <Tile label="Fatal · 24h"       value={e?.fatal24h}      loading={loading} accent={e && e.fatal24h > 0 ? 'rose' : 'gray'} />
        <Tile label="Διαφορ. IPs · 24h" value={e?.distinctIps24h} loading={loading} accent="indigo" />
      </div>

      {/* Sparkline + top breakdowns */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card title="Σφάλματα ανά ώρα (24h)" subtitle="Bucket ανά ώρα">
          <Sparkline data={e?.sparkline24h || []} />
        </Card>
        <Card title="Top error codes (24h)">
          <BarList items={(e?.byCode || []).map((r) => ({ label: r.code || 'unknown', value: r.c }))} />
        </Card>
        <Card title="Top paths (24h)">
          <BarList items={(e?.byPath || []).map((r) => ({ label: r.path || '—', value: r.c }))} mono />
        </Card>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">📚</div>
          <div className="text-xs text-gray-600 leading-relaxed">
            <p className="font-bold text-gray-900">Πώς δουλεύει</p>
            <p className="mt-1">
              Κάθε error στο API πέφτει στον <code className="bg-gray-100 px-1 rounded">errorHandler</code> middleware
              και αποθηκεύεται στον πίνακα <code className="bg-gray-100 px-1 rounded">error_logs</code> με stack,
              user, IP και geolocation από τη Cloudflare. Η ίδια οντότητα συνδέεται και με{' '}
              <Link href="/admin/data-changes" className="underline">data-changes</Link> (αλλαγές δεδομένων) και{' '}
              <Link href="/admin/audit-log" className="underline">audit log</Link> (ενέργειες admin) ώστε να βλέπεις
              ολόκληρη την εικόνα στην καρτέλα του χρήστη.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// ERRORS
// =====================================================================
const ERROR_CODE_EXPLAIN: Record<string, string> = {
  INTERNAL_ERROR:    'Απρόβλεπτο server-side bug. Συνήθως σημαίνει uncaught exception στον κώδικα.',
  VALIDATION_ERROR:  'Δεδομένα από τον client δεν περνούν Zod validation.',
  UNAUTHORIZED:      'Λείπει ή είναι λήξει το JWT.',
  FORBIDDEN:         'Ο χρήστης δεν έχει δικαίωμα στη συγκεκριμένη ενέργεια.',
  NOT_FOUND:         'Η οντότητα που ζητήθηκε δεν υπάρχει.',
  RATE_LIMITED:      'Ο χρήστης έκανε πάρα πολλά requests σε σύντομο χρόνο.',
};

function ErrorsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<{ page: number; total: number; perPage: number; totalPages?: number } | null>(null);
  const [page, setPage] = useState(1);
  const [level, setLevel] = useState<string>('');
  const [resolved, setResolved] = useState<string>('0'); // default: only open
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getErrors({
        page,
        limit: 50,
        level: level || undefined,
        resolved: resolved === '' ? undefined : (resolved as any),
        search: search || undefined,
      });
      setItems(res.items as any);
      setPagination(res.pagination as any);
    } catch (e: any) {
      toast.error(e?.message || 'Σφάλμα');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, level, resolved, search]);

  useEffect(() => {
    if (!openId) {
      setDetail(null);
      return;
    }
    setDetail(null);
    adminApi.getErrorDetails(openId).then(setDetail).catch(() => {});
  }, [openId]);

  const onResolve = async (id: string) => {
    try {
      await adminApi.resolveError(id);
      toast.success('Σημειώθηκε ως επιλυμένο');
      setItems((prev) => prev.map((r) => (r.id === id ? { ...r, resolved: 1 } : r)));
    } catch (e: any) {
      toast.error(e?.message || 'Αποτυχία');
    }
  };

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-3">
        <select
          value={level}
          onChange={(e) => {
            setLevel(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs"
        >
          <option value="">Όλα τα επίπεδα</option>
          <option value="error">error</option>
          <option value="warn">warn</option>
          <option value="fatal">fatal</option>
        </select>

        <select
          value={resolved}
          onChange={(e) => {
            setResolved(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs"
        >
          <option value="0">Μόνο ανοιχτά</option>
          <option value="1">Επιλυμένα</option>
          <option value="">Όλα</option>
        </select>

        <input
          type="text"
          placeholder="Αναζήτηση message / path / email / IP..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="flex-1 min-w-[200px] rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs"
        />

        {pagination && (
          <span className="text-[11px] text-gray-500">
            <span className="font-bold">{pagination.total}</span> errors
          </span>
        )}
      </div>

      {!loading && items.length === 0 ? (
        <EmptyState icon="✅" title="Καθαρό!" description="Δεν υπάρχουν σφάλματα με αυτά τα φίλτρα." />
      ) : (
        <ul className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
          {items.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => setOpenId(openId === row.id ? null : row.id)}
                className="w-full px-4 py-3 text-left transition-colors hover:bg-gray-50"
              >
                <div className="flex items-start gap-3">
                  <ErrorIcon level={row.level} resolved={row.resolved} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-bold text-gray-700">
                        {row.code || row.level}
                      </code>
                      {row.status_code && (
                        <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                          {row.status_code}
                        </span>
                      )}
                      <span className="truncate text-sm font-bold text-gray-900">{row.message}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-gray-600">
                      <code className="font-mono">{row.method}</code>{' '}
                      <code className="font-mono">{row.path}</code>
                      {row.user_email && (
                        <>
                          {' · '}
                          <span className="font-semibold">{row.user_email}</span>
                        </>
                      )}
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-400">
                      {row.country && (
                        <>
                          {flagEmoji(row.country)} {row.city || row.country} ·{' '}
                        </>
                      )}
                      {row.ip_address && <code className="font-mono">{row.ip_address}</code>}
                      {' · '}
                      {formatDate(row.created_at)}
                      {row.resolved === 1 && (
                        <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                          ✓ resolved
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-sm text-gray-300">{openId === row.id ? '▾' : '▸'}</span>
                </div>

                {openId === row.id && (
                  <div className="mt-3 ml-12 space-y-3 rounded-lg bg-gray-50 p-3 text-xs">
                    {/* Plain language explanation */}
                    {row.code && ERROR_CODE_EXPLAIN[row.code] && (
                      <div className="rounded-lg border-l-2 border-blue-300 bg-blue-50 px-3 py-2 text-blue-800">
                        <p className="font-bold">Τι σημαίνει</p>
                        <p>{ERROR_CODE_EXPLAIN[row.code]}</p>
                      </div>
                    )}
                    {!detail ? (
                      <p className="text-gray-400">Φόρτωση λεπτομερειών...</p>
                    ) : (
                      <>
                        {detail.stack && (
                          <details className="rounded-lg bg-white p-2 ring-1 ring-gray-200" open>
                            <summary className="cursor-pointer text-[11px] font-bold text-gray-700">Stack trace</summary>
                            <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-all text-[10px] text-gray-700">
                              {detail.stack}
                            </pre>
                          </details>
                        )}
                        {detail.body_snippet && (
                          <details className="rounded-lg bg-white p-2 ring-1 ring-gray-200">
                            <summary className="cursor-pointer text-[11px] font-bold text-gray-700">Request body (μασκαρισμένο)</summary>
                            <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all text-[10px] text-gray-700">
                              {detail.body_snippet}
                            </pre>
                          </details>
                        )}
                        {detail.user_agent && (
                          <KV label="User-Agent" value={detail.user_agent} />
                        )}
                        {detail.notes && <KV label="Σημειώσεις" value={detail.notes} />}
                      </>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      {row.user_id && (
                        <Link
                          href={`/admin/users/timeline?id=${row.user_id}`}
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-blue-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          👁 Δες όλα τα events του χρήστη
                        </Link>
                      )}
                      {!row.resolved && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onResolve(row.id);
                          }}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700"
                        >
                          ✓ Επιλύθηκε
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      {pagination && pagination.total > pagination.perPage && (
        <div className="flex items-center justify-between text-xs">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 disabled:opacity-50"
          >
            ← Προηγ.
          </button>
          <span className="text-gray-500">
            Σελίδα {page} {pagination.totalPages ? `από ${pagination.totalPages}` : ''}
          </span>
          <button
            disabled={pagination.totalPages ? page >= pagination.totalPages : items.length < pagination.perPage}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 disabled:opacity-50"
          >
            Επόμ. →
          </button>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// SUSPICIOUS
// =====================================================================
function SuspiciousTab() {
  const [data, setData] = useState<Awaited<ReturnType<typeof adminApi.getSecuritySuspicious>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getSecuritySuspicious(50)
      .then(setData)
      .catch((e: any) => toast.error(e?.message || 'Σφάλμα'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="rounded-xl bg-white p-10 text-center text-sm text-gray-500">Φόρτωση...</div>;

  return (
    <div className="space-y-3">
      <SuspiciousSection
        icon="🌍"
        severity="high"
        title="Login από νέα χώρα"
        description="Χρήστες που συνδέθηκαν τις τελευταίες 7 μέρες από χώρα που δεν είχαν χρησιμοποιήσει ξανά."
        count={data?.newCountryLogins.length || 0}
      >
        {(data?.newCountryLogins || []).map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-gray-900">
                {flagEmoji(r.country)} {r.city || r.country} · {r.email}
              </p>
              <p className="text-[11px] text-gray-500">
                {r.role} · <code className="font-mono">{r.ip_address}</code> · {formatDate(r.started_at)}
              </p>
            </div>
            <Link href={`/admin/users/timeline?id=${r.user_id}`} className="rounded-lg bg-gray-900 px-2.5 py-1 text-[10px] font-bold text-white">
              Δες
            </Link>
          </li>
        ))}
      </SuspiciousSection>

      <SuspiciousSection
        icon="🚨"
        severity="critical"
        title="IPs με πολλαπλά σφάλματα (1h)"
        description="Πιθανή απόπειρα επίθεσης ή buggy client. ≥ 5 σφάλματα στην τελευταία ώρα από το ίδιο IP."
        count={data?.repeatedFailures.length || 0}
      >
        {(data?.repeatedFailures || []).map((r, i) => (
          <li key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
            <div>
              <p className="font-bold text-gray-900">
                <code className="font-mono">{r.ip_address}</code> · {flagEmoji(r.country)} {r.country || '—'}
              </p>
              <p className="text-[11px] text-gray-500">
                {r.c} σφάλματα · τελευταίο: {formatDate(r.last_at)}
              </p>
            </div>
          </li>
        ))}
      </SuspiciousSection>

      <SuspiciousSection
        icon="📈"
        severity="high"
        title="Έκρηξη σφαλμάτων ανά path (15min)"
        description="Πιθανό production bug που χτυπάει σε συγκεκριμένο endpoint."
        count={data?.errorBursts.length || 0}
      >
        {(data?.errorBursts || []).map((r, i) => (
          <li key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
            <div>
              <code className="font-mono text-[11px] text-gray-900">{r.path}</code>
              <p className="text-[11px] text-gray-500">
                {r.c} σφάλματα · τελευταίο: {formatDate(r.last_at)}
              </p>
            </div>
          </li>
        ))}
      </SuspiciousSection>

      <SuspiciousSection
        icon="⚡"
        severity="medium"
        title="Rapid edits (10min)"
        description="Χρήστες που έκαναν > 5 ενημερώσεις προφίλ σε 10 λεπτά. Πιθανό bot ή compromised account."
        count={data?.rapidEdits.length || 0}
      >
        {(data?.rapidEdits || []).map((r, i) => (
          <li key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
            <div>
              <p className="font-bold text-gray-900">{r.actor_email || r.actor_user_id}</p>
              <p className="text-[11px] text-gray-500">
                {r.c} updates · τελευταίο: {formatDate(r.last_at)}
              </p>
            </div>
            <Link href={`/admin/users/timeline?id=${r.actor_user_id}`} className="rounded-lg bg-gray-900 px-2.5 py-1 text-[10px] font-bold text-white">
              Δες
            </Link>
          </li>
        ))}
      </SuspiciousSection>

      <SuspiciousSection
        icon="🔑"
        severity="critical"
        title="Αλλαγές δικαιωμάτων (30 ημέρες)"
        description="Αναστολές, διαγραφές, αλλαγές ρόλου. Πάντα να ελέγχονται."
        count={data?.privilegeChanges.length || 0}
      >
        {(data?.privilegeChanges || []).map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
            <div>
              <p className="font-bold text-gray-900">{r.action}</p>
              <p className="text-[11px] text-gray-500">{formatDate(r.created_at)}</p>
            </div>
          </li>
        ))}
      </SuspiciousSection>
    </div>
  );
}

// =====================================================================
// LIVE FEED (SSE)
// =====================================================================
function LiveTab() {
  const { events, status, lastHeartbeat } = useSecurityStream();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-xs">
        <span
          className={`flex h-2.5 w-2.5 rounded-full ${
            status === 'open'
              ? 'bg-emerald-500 animate-pulse'
              : status === 'connecting'
                ? 'bg-amber-400'
                : 'bg-rose-500'
          }`}
        />
        <span className="font-semibold text-gray-700">
          {status === 'open' ? 'Συνδεδεμένο' : status === 'connecting' ? 'Σύνδεση...' : 'Αποσυνδεδεμένο'}
        </span>
        <span className="text-gray-400">
          {lastHeartbeat ? `Τελευταίο heartbeat: ${formatDate(lastHeartbeat)}` : 'Αναμονή για heartbeat...'}
        </span>
        <span className="ml-auto text-gray-500">
          {events.length} events στο buffer
        </span>
      </div>

      {events.length === 0 ? (
        <EmptyState icon="🌙" title="Ησυχία" description="Δεν συμβαίνει τίποτα ασυνήθιστο αυτή τη στιγμή." />
      ) : (
        <ul className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
          {events.map((evt, i) => (
            <li key={i} className="px-4 py-2.5 text-xs">
              <LiveEventRow evt={evt} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LiveEventRow({ evt }: { evt: LiveEvent }) {
  const p = evt.payload;
  const time = formatDate(p.created_at || evt.receivedAt);

  if (evt.kind === 'error') {
    return (
      <div className="flex items-start gap-2">
        <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">ERROR</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-gray-900">
            <code className="font-mono text-[11px]">{p.method}</code>{' '}
            <code className="font-mono text-[11px]">{p.path}</code> — {p.message}
          </p>
          <p className="text-[10px] text-gray-500">
            {p.user_email || 'anon'} · {flagEmoji(p.country)} {p.city || p.country || '—'} · {time}
          </p>
        </div>
      </div>
    );
  }

  if (evt.kind === 'change') {
    return (
      <div className="flex items-start gap-2">
        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">CHANGE</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-gray-900">
            <span className="font-bold">{p.action}</span> {p.entity_type}/
            <code className="font-mono text-[10px]">{(p.entity_id || '').slice(0, 12)}</code>
          </p>
          <p className="text-[10px] text-gray-500">
            {p.actor_email || 'system'} · {flagEmoji(p.country)} {p.city || p.country || '—'} · {time}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">AUDIT</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-gray-900">{p.action}</p>
        <p className="text-[10px] text-gray-500">{time}</p>
      </div>
    </div>
  );
}

// =====================================================================
// Building blocks
// =====================================================================
function Tile({
  label,
  value,
  loading,
  accent = 'gray',
  sub,
}: {
  label: string;
  value?: number;
  loading?: boolean;
  accent?: 'gray' | 'rose' | 'amber' | 'emerald' | 'blue' | 'indigo';
  sub?: string;
}) {
  const accents: Record<string, string> = {
    gray: 'bg-white border-gray-200',
    rose: 'bg-rose-50 border-rose-200',
    amber: 'bg-amber-50 border-amber-200',
    emerald: 'bg-emerald-50 border-emerald-200',
    blue: 'bg-blue-50 border-blue-200',
    indigo: 'bg-indigo-50 border-indigo-200',
  };
  return (
    <div className={`rounded-xl border p-3 shadow-sm ${accents[accent]}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-gray-900">
        {loading ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-gray-200" /> : value ?? 0}
      </p>
      {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{title}</p>
      {subtitle && <p className="text-[10px] text-gray-400">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Sparkline({ data }: { data: Array<{ bucket: string; c: number }> }) {
  const max = useMemo(() => Math.max(1, ...data.map((d) => d.c)), [data]);
  if (data.length === 0) {
    return <p className="text-xs text-gray-400">Καμία τιμή</p>;
  }
  return (
    <div className="flex h-24 items-end gap-1">
      {data.map((d) => (
        <div
          key={d.bucket}
          title={`${d.bucket} → ${d.c}`}
          style={{ height: `${(d.c / max) * 100}%` }}
          className={`min-h-[2px] flex-1 rounded-t ${d.c === 0 ? 'bg-gray-100' : d.c > max * 0.7 ? 'bg-rose-400' : 'bg-blue-400'}`}
        />
      ))}
    </div>
  );
}

function BarList({ items, mono = false }: { items: Array<{ label: string; value: number }>; mono?: boolean }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0) return <p className="text-xs text-gray-400">—</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((it) => (
        <li key={it.label} className="text-[11px]">
          <div className="mb-0.5 flex items-center justify-between gap-2">
            <span className={`truncate ${mono ? 'font-mono' : ''}`}>{it.label}</span>
            <span className="font-bold text-gray-700">{it.value}</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-blue-400" style={{ width: `${(it.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function ErrorIcon({ level, resolved }: { level: string; resolved: number }) {
  if (resolved === 1) {
    return (
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        ✓
      </span>
    );
  }
  if (level === 'fatal') {
    return (
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
        💥
      </span>
    );
  }
  if (level === 'warn') {
    return (
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        ⚠
      </span>
    );
  }
  return (
    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
      🐞
    </span>
  );
}

function SuspiciousSection({
  icon,
  severity,
  title,
  description,
  count,
  children,
}: {
  icon: string;
  severity: Severity;
  title: string;
  description: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-start gap-3 border-b border-gray-100 p-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-base">
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-gray-900">{title}</h3>
            <SeverityBadge severity={severity} size="sm" />
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-700">
              {count}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-gray-500">{description}</p>
        </div>
      </div>
      {count === 0 ? (
        <p className="px-3 py-4 text-xs text-gray-400">Όλα ήρεμα εδώ.</p>
      ) : (
        <ul className="divide-y divide-gray-100">{children}</ul>
      )}
    </div>
  );
}

function KV({ label, value }: { label: string; value: any }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2">
      <span className="text-gray-500">{label}</span>
      <span className="break-all text-gray-700">{value}</span>
    </div>
  );
}

function flagEmoji(countryCode?: string | null): string {
  if (!countryCode || countryCode.length !== 2) return '🏳️';
  const cc = countryCode.toUpperCase();
  const A = 0x1f1e6;
  return String.fromCodePoint(A + cc.charCodeAt(0) - 65, A + cc.charCodeAt(1) - 65);
}

function formatDate(s: string): string {
  if (!s) return '';
  return new Date(s).toLocaleString('el-GR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
