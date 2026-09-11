'use client';

/**
 * «Όλες οι κινήσεις» — χρήστες ΚΑΙ ανώνυμοι επισκέπτες, σε μία λίστα με
 * αναζήτηση και φίλτρα.
 *
 * Πριν, το «Δες όλα» της επισκόπησης πήγαινε στο Audit Log, που δείχνει μόνο
 * ενέργειες διαχειριστών. Δεν υπήρχε πουθενά «τι έκανε ο κόσμος».
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { FilterBar } from '@/components/admin/ui/filter-bar';
import { EmptyState } from '@/components/admin/ui/empty-state';
import { adminApi } from '@/components/admin/lib/admin-api';
import { activityIcon, activityLabel, fmtWhen, COUNTRY_FLAG } from '@/components/admin/lib/activity-labels';

interface Row {
  kind: 'user' | 'anonymous';
  id: string;
  actor_id: string;
  actor_email: string | null;
  actor_name: string | null;
  actor_role: string | null;
  activity_type: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: unknown;
  ip_address: string | null;
  user_agent: string | null;
  country: string | null;
  city: string | null;
  referrer: string | null;
  created_at: string;
}

function describe(r: Row): string {
  const m = (r.metadata && typeof r.metadata === 'object' ? (r.metadata as Record<string, unknown>) : null) || null;
  if (r.activity_type.startsWith('error')) return String(m?.message || r.entity_id || '');
  if (r.activity_type === 'page_view') return r.entity_id || '';
  const parts: string[] = [];
  if (r.entity_id) parts.push(r.entity_id);
  if (m?.label) parts.push(String(m.label));
  if (m?.target) parts.push(String(m.target));
  return parts.join(' · ');
}

export default function ActivityPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('');
  const [type, setType] = useState('');
  const [days, setDays] = useState('7');
  const [types, setTypes] = useState<{ type: string; count: number }[]>([]);

  const load = useCallback(
    async (p: number, append: boolean) => {
      setLoading(true);
      try {
        const res = await adminApi.getActivity({ q, kind, type, days: Number(days), page: p, limit: 50 });
        setRows((prev) => (append ? [...prev, ...res.items] : res.items));
        setHasMore(res.hasMore);
        setPage(p);
      } catch (err: any) {
        toast.error(err?.message || 'Δεν φορτώθηκαν οι κινήσεις');
      } finally {
        setLoading(false);
      }
    },
    [q, kind, type, days],
  );

  useEffect(() => {
    const t = setTimeout(() => load(1, false), q ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  useEffect(() => {
    adminApi.getActivityTypes().then((r) => setTypes(r.types)).catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      <FilterBar
        search={q}
        onSearchChange={setQ}
        searchPlaceholder="Email, όνομα, επισκέπτης, σελίδα, πόλη…"
        filters={[
          {
            key: 'kind',
            label: 'Ποιοι',
            value: kind,
            onChange: setKind,
            options: [
              { value: 'users', label: 'Συνδεδεμένοι χρήστες' },
              { value: 'anonymous', label: 'Ανώνυμοι επισκέπτες' },
            ],
          },
          {
            key: 'type',
            label: 'Είδος',
            value: type,
            onChange: setType,
            options: types.map((t) => ({ value: t.type, label: activityLabel(t.type), count: t.count })),
          },
          {
            key: 'days',
            label: 'Διάστημα',
            value: days,
            onChange: setDays,
            options: [
              { value: '1', label: 'Σήμερα' },
              { value: '7', label: '7 μέρες' },
              { value: '30', label: '30 μέρες' },
              { value: '90', label: '90 μέρες' },
            ],
          },
        ]}
      />

      {loading && rows.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl border border-gray-100 bg-white" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon="🧭" title="Καμία κίνηση" description="Δεν βρέθηκε τίποτα με αυτά τα φίλτρα. Οι ανώνυμοι μετριούνται μόνο αν συμφώνησαν στα cookies." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <ul className="divide-y divide-gray-100">
            {rows.map((r) => {
              const who =
                r.kind === 'user'
                  ? r.actor_name || r.actor_email || r.actor_id
                  : `Επισκέπτης ${r.actor_id.slice(2, 8)}`;
              const href =
                r.kind === 'user'
                  ? `/admin/users/timeline?id=${encodeURIComponent(r.actor_id)}`
                  : `/admin/traffic?visitor=${encodeURIComponent(r.actor_id)}`;
              const isError = r.activity_type.startsWith('error');
              return (
                <li key={`${r.kind}-${r.id}`} className={`flex items-start gap-3 px-4 py-3 ${isError ? 'bg-red-50/40' : ''}`}>
                  <span className="mt-0.5 w-6 flex-shrink-0 text-center text-base">{activityIcon(r.activity_type)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <Link href={href} className="truncate text-sm font-semibold text-gray-900 hover:underline">
                        {who}
                      </Link>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          r.kind === 'user' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {r.kind === 'user' ? (r.actor_role === 'business' ? 'Επιχείρηση' : r.actor_role === 'admin' ? 'Admin' : 'Εργαζόμενος') : 'ανώνυμος'}
                      </span>
                      <span className={`text-xs font-semibold ${isError ? 'text-red-700' : 'text-gray-700'}`}>{activityLabel(r.activity_type)}</span>
                    </div>
                    <p className="truncate text-xs text-gray-500">
                      {describe(r)}
                      {r.referrer ? <span className="text-gray-400"> · από {r.referrer}</span> : null}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right text-[11px] text-gray-400">
                    <div>{fmtWhen(r.created_at)}</div>
                    <div>
                      {COUNTRY_FLAG(r.country)} {r.city || r.country || ''}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {hasMore && (
            <div className="border-t border-gray-100 p-3 text-center">
              <button
                onClick={() => load(page + 1, true)}
                disabled={loading}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {loading ? 'Φόρτωση…' : 'Περισσότερα'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
