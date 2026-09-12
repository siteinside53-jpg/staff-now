'use client';

/**
 * Επισκεψιμότητα — για τον υπεύθυνο social και για όποιον θέλει να ξέρει:
 * πόσοι μπήκαν, από πού (Google, Facebook, Instagram, TikTok…), τι είδαν,
 * πόσο έμειναν, από τι συσκευή, από ποια πόλη — και τι ανέβηκε στα social.
 *
 * Μετράει ΜΟΝΟ ανώνυμους επισκέπτες που συμφώνησαν στα cookies. Οι
 * συνδεδεμένοι χρήστες φαίνονται στις «Όλες οι κινήσεις».
 */

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { MetricCard } from '@/components/admin/ui/metric-card';
import { EmptyState } from '@/components/admin/ui/empty-state';
import { adminApi } from '@/components/admin/lib/admin-api';
import { activityIcon, activityLabel, fmtDuration, fmtWhen, COUNTRY_FLAG } from '@/components/admin/lib/activity-labels';

type Tab = 'overview' | 'visitors' | 'social';

const SOURCE_ICON: Record<string, string> = {
  google: '🔍',
  bing: '🔍',
  facebook: '📘',
  instagram: '📸',
  tiktok: '🎵',
  linkedin: '💼',
  youtube: '▶️',
  x: '✖️',
  direct: '🔗',
  email: '✉️',
  whatsapp: '💬',
  viber: '💬',
  telegram: '✈️',
};

export default function TrafficPage() {
  const params = useSearchParams();
  const focusVisitor = params?.get('visitor') || null;
  const [tab, setTab] = useState<Tab>(focusVisitor ? 'visitors' : 'overview');
  const [days, setDays] = useState(30);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 text-xs font-semibold shadow-sm">
          {(
            [
              ['overview', '📊 Επισκόπηση'],
              ['visitors', '🧑‍💻 Επισκέπτες'],
              ['social', '📣 Social'],
            ] as [Tab, string][]
          ).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-md px-3 py-1.5 ${tab === k ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}>
              {l}
            </button>
          ))}
        </div>
        {tab !== 'social' && (
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 text-xs font-semibold shadow-sm">
            {[7, 30, 90].map((d) => (
              <button key={d} onClick={() => setDays(d)} className={`rounded-md px-3 py-1.5 ${days === d ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                {d} μέρες
              </button>
            ))}
          </div>
        )}
      </div>
      {tab === 'overview' && <Overview days={days} />}
      {tab === 'visitors' && <Visitors days={days} focusVisitor={focusVisitor} />}
      {tab === 'social' && <Social />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function Overview({ days }: { days: number }) {
  const [s, setS] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    adminApi
      .getTrafficStats(days)
      .then(setS)
      .catch((err: any) => toast.error(err?.message || 'Σφάλμα'))
      .finally(() => setLoading(false));
  }, [days]);

  const trend = s && s.previousSessions > 0 ? Math.round(((s.sessions - s.previousSessions) / s.previousSessions) * 100) : null;
  const maxDaily = s ? Math.max(1, ...s.daily.map((d: any) => d.sessions)) : 1;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Επισκέψεις" value={s?.sessions ?? '—'} icon="🧑‍💻" loading={loading} context={trend != null ? `${trend >= 0 ? '+' : ''}${trend}% από την προηγούμενη περίοδο` : undefined} tone={trend != null && trend < 0 ? 'warning' : 'info'} />
        <MetricCard label="Προβολές σελίδων" value={s?.pageViews ?? '—'} icon="📄" loading={loading} />
        <MetricCard label="Μέση διάρκεια" value={s ? fmtDuration(s.avgSeconds) : '—'} icon="⏱️" loading={loading} context={s ? `${s.bounceRate}% έφυγαν από την πρώτη σελίδα` : undefined} />
        <MetricCard label="Εγγραφές" value={s?.signups ?? '—'} icon="🆕" loading={loading} context={s ? `${s.conversions} από καταγεγραμμένη επίσκεψη` : undefined} tone="success" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Από πού ήρθαν" hint="Google, Facebook, Instagram, TikTok… (referrer ή utm_source)">
          <Bars rows={(s?.bySource || []).map((r: any) => ({ label: `${SOURCE_ICON[r.source] || '🌐'} ${r.label}`, value: r.sessions }))} empty="Χωρίς δεδομένα ακόμη" />
        </Panel>
        <Panel title="Σελίδες που είδαν" hint="Προβολές · μοναδικοί επισκέπτες">
          <Bars rows={(s?.topPages || []).map((r: any) => ({ label: r.path, value: r.views, extra: `${r.visitors} επισκ.` }))} empty="Χωρίς δεδομένα ακόμη" />
        </Panel>
        <Panel title="Πρώτη σελίδα (είσοδος)">
          <Bars rows={(s?.topLanding || []).map((r: any) => ({ label: r.path, value: r.sessions }))} empty="Χωρίς δεδομένα ακόμη" />
        </Panel>
        <Panel title="Πόλεις & χώρες">
          <Bars rows={(s?.byCity || []).map((r: any) => ({ label: `${COUNTRY_FLAG(r.country)} ${r.city}`, value: r.sessions }))} empty="Χωρίς δεδομένα ακόμη" />
        </Panel>
        <Panel title="Συσκευή">
          <Bars rows={(s?.byDevice || []).map((r: any) => ({ label: r.device === 'mobile' ? '📱 Κινητό' : r.device === 'tablet' ? '📟 Tablet' : r.device === 'desktop' ? '🖥️ Υπολογιστής' : '❔ Άγνωστο', value: r.sessions }))} empty="Χωρίς δεδομένα ακόμη" />
        </Panel>
        <Panel title="Ανά ημέρα" hint="Επισκέψεις">
          {s?.daily?.length ? (
            <div className="flex h-32 items-end gap-1">
              {s.daily.map((d: any) => (
                <div key={d.day} className="group relative flex-1">
                  <div className="w-full rounded-t bg-blue-500/80 transition group-hover:bg-blue-600" style={{ height: `${Math.max(4, (d.sessions / maxDaily) * 120)}px` }} />
                  <div className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[10px] text-white group-hover:block">
                    {d.day.slice(5)}: {d.sessions} επισκ. · {d.pageViews} προβ.
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Χωρίς δεδομένα ακόμη</p>
          )}
        </Panel>
      </div>
      <p className="text-xs text-gray-400">
        Μετριούνται μόνο οι επισκέπτες που πάτησαν «Συμφωνώ» στα cookies. Για πλήρη αριθμούς χωρίς cookies, το Cloudflare Web Analytics της σελίδας δίνει τη συνολική εικόνα.
      </p>
    </div>
  );
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      {hint && <p className="mb-3 text-xs text-gray-400">{hint}</p>}
      {!hint && <div className="mb-3" />}
      {children}
    </div>
  );
}

function Bars({ rows, empty }: { rows: { label: string; value: number; extra?: string }[]; empty: string }) {
  if (!rows.length) return <p className="text-sm text-gray-400">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate font-medium text-gray-700">{r.label}</span>
            <span className="flex-shrink-0 tabular-nums text-gray-500">
              {r.value}
              {r.extra ? <span className="text-gray-400"> · {r.extra}</span> : null}
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-gray-100">
            <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function Visitors({ days, focusVisitor }: { days: number; focusVisitor: string | null }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<string | null>(focusVisitor);

  const load = useCallback(
    async (p: number, append: boolean) => {
      setLoading(true);
      try {
        const res = await adminApi.getVisitors({ days, q, page: p, limit: 50 });
        setItems((prev) => (append ? [...prev, ...res.items] : res.items));
        setHasMore(res.hasMore);
        setPage(p);
      } catch (err: any) {
        toast.error(err?.message || 'Σφάλμα');
      } finally {
        setLoading(false);
      }
    },
    [days, q],
  );
  useEffect(() => {
    const t = setTimeout(() => load(1, false), q ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  return (
    <div className="space-y-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Πόλη, σελίδα, αναγνωριστικό…"
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none"
      />
      {loading && items.length === 0 ? (
        <div className="h-32 animate-pulse rounded-xl border border-gray-100 bg-white" />
      ) : items.length === 0 ? (
        <EmptyState icon="🧑‍💻" title="Κανένας επισκέπτης" description="Δεν καταγράφηκε επίσκεψη σε αυτό το διάστημα (μετριούνται όσοι συμφώνησαν στα cookies)." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-3 py-2">Πότε</th>
                <th className="px-3 py-2">Από πού</th>
                <th className="px-3 py-2">Πηγή</th>
                <th className="px-3 py-2">Πρώτη σελίδα</th>
                <th className="px-3 py-2">Σελίδες</th>
                <th className="px-3 py-2">Διάρκεια</th>
                <th className="px-3 py-2">Συσκευή</th>
                <th className="px-3 py-2">Εγγραφή</th>
              </tr>
            </thead>
            <tbody>
              {items.map((v) => (
                <tr key={v.visitor_id} onClick={() => setSelected(v.visitor_id)} className="cursor-pointer border-b border-gray-50 hover:bg-blue-50/40">
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-500">{fmtWhen(v.first_seen_at)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{COUNTRY_FLAG(v.country)} {v.city || v.country || '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2">{SOURCE_ICON[v.source] || '🌐'} {v.sourceLabel}</td>
                  <td className="max-w-[220px] truncate px-3 py-2 text-xs text-gray-600">{v.landing_path || v.current_path || '—'}</td>
                  <td className="px-3 py-2 tabular-nums">{v.page_views}</td>
                  <td className="whitespace-nowrap px-3 py-2">{fmtDuration(Number(v.seconds))}</td>
                  <td className="px-3 py-2 text-xs">{v.device === 'mobile' ? '📱' : v.device === 'tablet' ? '📟' : v.device === 'desktop' ? '🖥️' : '❔'}</td>
                  <td className="px-3 py-2 text-xs">{v.registered_user_id ? <span className="font-semibold text-emerald-700">✓ {v.registered_email || ''}</span> : <span className="text-gray-400">όχι</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasMore && (
            <div className="border-t border-gray-100 p-3 text-center">
              <button onClick={() => load(page + 1, true)} disabled={loading} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                {loading ? 'Φόρτωση…' : 'Περισσότερα'}
              </button>
            </div>
          )}
        </div>
      )}
      {selected && <VisitorDrawer visitorId={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function VisitorDrawer({ visitorId, onClose }: { visitorId: string; onClose: () => void }) {
  const [data, setData] = useState<{ session: any; events: any[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setData(null);
    setError(null);
    adminApi.getVisitor(visitorId).then(setData).catch((err: any) => setError(err?.message || 'Δεν βρέθηκε'));
  }, [visitorId]);
  const s = data?.session;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="h-full w-full max-w-lg overflow-y-auto bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h3 className="font-bold text-gray-900">Επισκέπτης {visitorId.slice(2, 8)}</h3>
            {s && (
              <p className="text-xs text-gray-500">
                {COUNTRY_FLAG(s.country)} {[s.city, s.region, s.country].filter(Boolean).join(', ') || 'άγνωστη τοποθεσία'} · {SOURCE_ICON[s.source] || '🌐'} {s.sourceLabel}
                {s.utm_campaign ? ` · καμπάνια ${s.utm_campaign}` : ''} · {s.device || '—'}
              </p>
            )}
          </div>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-100" aria-label="Κλείσιμο">✕</button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!data && !error && <div className="h-24 animate-pulse rounded-xl bg-gray-100" />}
        {s && (
          <>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-gray-50 p-2"><div className="text-lg font-bold text-gray-900">{s.page_views}</div>σελίδες</div>
              <div className="rounded-lg bg-gray-50 p-2"><div className="text-lg font-bold text-gray-900">{fmtDuration(Number(s.seconds ?? 0))}</div>διάρκεια{Number(s.visits) > 1 ? ` · ${s.visits} επισκέψεις` : ''}</div>
              <div className="rounded-lg bg-gray-50 p-2"><div className="text-lg font-bold text-gray-900">{s.registered_user_id ? '✓' : '—'}</div>{s.registered_user_id ? s.registered_email : 'χωρίς εγγραφή'}</div>
            </div>
            {s.referrer && <p className="mt-3 truncate text-xs text-gray-500">Ήρθε από: {s.referrer}</p>}
            <h4 className="mt-4 text-xs font-bold uppercase tracking-wide text-gray-400">Τι έκανε, με τη σειρά</h4>
            <ol className="mt-2 space-y-1.5">
              {data!.events.map((e) => (
                <li key={e.id} className={`flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm ${String(e.activity_type).startsWith('error') ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <span className="w-5 text-center">{activityIcon(e.activity_type)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium text-gray-800">
                        {e.activity_type === 'page_view' ? e.path : `${activityLabel(e.activity_type)}${e.path ? ` · ${e.path}` : ''}`}
                      </span>
                      <span className="flex-shrink-0 text-[11px] text-gray-400">{new Date(e.created_at).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>
                    {e.activity_type === 'page_view' && e.seconds_on_page != null && <div className="text-[11px] text-gray-400">έμεινε {fmtDuration(e.seconds_on_page)}</div>}
                    {e.metadata && typeof e.metadata === 'object' && (e.metadata as any).message && <div className="text-[11px] text-red-700">{String((e.metadata as any).message)}</div>}
                    {e.metadata && typeof e.metadata === 'object' && (e.metadata as any).label && <div className="text-[11px] text-gray-500">{String((e.metadata as any).label)}</div>}
                  </div>
                </li>
              ))}
              {data!.events.length === 0 && <li className="text-sm text-gray-400">Μόνο σημάδια ζωής — καμία σελίδα καταγεγραμμένη.</li>}
            </ol>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const PLATFORMS = ['facebook', 'instagram', 'tiktok', 'linkedin', 'youtube', 'x', 'other'];
const KINDS = ['post', 'reel', 'video', 'story', 'image', 'ad'];

function Social() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ platform: 'instagram', kind: 'post', title: '', url: '', notes: '', postedAt: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getSocialPosts();
      setItems(res.items);
    } catch (err: any) {
      toast.error(err?.message || 'Σφάλμα');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!form.title.trim()) {
      toast.error('Γράψε τίτλο.');
      return;
    }
    setSaving(true);
    try {
      await adminApi.addSocialPost({ ...form, postedAt: new Date(form.postedAt).toISOString() });
      setForm((f) => ({ ...f, title: '', url: '', notes: '' }));
      toast.success('Καταχωρήθηκε');
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Σφάλμα');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Να σβηστεί η καταχώρηση;')) return;
    try {
      await adminApi.deleteSocialPost(id);
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Σφάλμα');
    }
  };

  const byPlatform = items.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.platform]: (acc[p.platform] || 0) + 1 }), {});

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900">Τι ανέβηκε στα social</h3>
        <p className="mb-3 text-xs text-gray-400">Κράτα ιστορικό: πλατφόρμα, είδος, τίτλος, σύνδεσμος, ημερομηνία. Έτσι φαίνεται ποια ανάρτηση έφερε κόσμο (βλ. πηγή στην Επισκόπηση).</p>
        <div className="grid gap-2 sm:grid-cols-6">
          <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} className="rounded-lg border border-gray-200 px-2 py-2 text-sm">
            {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="rounded-lg border border-gray-200 px-2 py-2 text-sm">
            {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Τίτλος / θέμα" className="rounded-lg border border-gray-200 px-2 py-2 text-sm sm:col-span-2" />
          <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="Σύνδεσμος (προαιρετικό)" className="rounded-lg border border-gray-200 px-2 py-2 text-sm" />
          <input type="date" value={form.postedAt} onChange={(e) => setForm({ ...form, postedAt: e.target.value })} className="rounded-lg border border-gray-200 px-2 py-2 text-sm" />
          <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Σημειώσεις (π.χ. utm_campaign που χρησιμοποιήθηκε)" className="rounded-lg border border-gray-200 px-2 py-2 text-sm sm:col-span-5" />
          <button onClick={add} disabled={saving} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? '…' : 'Καταχώρηση'}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-gray-400">
          Συμβουλή: στους συνδέσμους που βάζεις στα social πρόσθεσε <code>?utm_source=instagram&amp;utm_campaign=onoma</code> — έτσι η Επισκόπηση δείχνει ακριβώς τι έφερε η κάθε ανάρτηση.
        </p>
      </div>

      {Object.keys(byPlatform).length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(byPlatform).map(([p, n]) => (
            <span key={p} className="rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-700">{SOURCE_ICON[p] || '📣'} {p}: {n}</span>
          ))}
        </div>
      )}

      {loading ? (
        <div className="h-24 animate-pulse rounded-xl border border-gray-100 bg-white" />
      ) : items.length === 0 ? (
        <EmptyState icon="📣" title="Καμία καταχώρηση" description="Κάθε φορά που ανεβάζεις κάτι στα social, γράψ' το εδώ." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-3 py-2">Ημερομηνία</th>
                <th className="px-3 py-2">Πλατφόρμα</th>
                <th className="px-3 py-2">Είδος</th>
                <th className="px-3 py-2">Τίτλος</th>
                <th className="px-3 py-2">Σημειώσεις</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b border-gray-50">
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-500">{String(p.posted_at).slice(0, 10)}</td>
                  <td className="px-3 py-2">{SOURCE_ICON[p.platform] || '📣'} {p.platform}</td>
                  <td className="px-3 py-2 text-xs">{p.kind}</td>
                  <td className="px-3 py-2">{p.url ? <a href={p.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{p.title}</a> : p.title}</td>
                  <td className="max-w-[260px] truncate px-3 py-2 text-xs text-gray-500">{p.notes || ''}</td>
                  <td className="px-3 py-2 text-right"><button onClick={() => remove(p.id)} className="text-xs text-red-600 hover:underline">Σβήσε</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
