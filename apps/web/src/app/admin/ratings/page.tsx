'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DataTable, type Column } from '@/components/admin/ui/data-table';
import { FilterBar } from '@/components/admin/ui/filter-bar';
import { MetricCard } from '@/components/admin/ui/metric-card';
import { EmptyState } from '@/components/admin/ui/empty-state';
import { adminApi } from '@/components/admin/lib/admin-api';

interface Rating {
  id: string;
  hire_id: string;
  rater_role: 'worker' | 'business';
  overall: number;
  score_a?: number | null;
  score_b?: number | null;
  score_c?: number | null;
  comment?: string | null;
  created_at: string;
  rater_name?: string | null;
  ratee_name?: string | null;
  job_title?: string | null;
  hire_status?: string | null;
  other_rated: number;
}

// Οι τρεις υποβαθμολογίες σημαίνουν άλλα πράγματα ανάλογα με το ποιος γράφει.
// Το ίδιο ζευγάρι ετικετών χρησιμοποιεί και η σελίδα του χρήστη.
const SUB_LABELS: Record<'worker' | 'business', [string, string, string]> = {
  business: ['Επαγγελματισμός', 'Συνέπεια', 'Επικοινωνία'],
  worker: ['Οργάνωση', 'Πληρωμή στην ώρα', 'Επικοινωνία'],
};

function Stars({ n }: { n: number }) {
  return (
    <span className="whitespace-nowrap text-amber-500" title={`${n} στα 5`}>
      {'★'.repeat(n)}
      <span className="text-gray-300">{'★'.repeat(5 - n)}</span>
    </span>
  );
}

function fmt(d?: string | null): string {
  if (!d) return '—';
  const t = new Date(d.includes('T') ? d : d.replace(' ', 'T') + 'Z');
  if (Number.isNaN(t.getTime())) return '—';
  return t.toLocaleDateString('el-GR', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function AdminRatingsPage() {
  const [rows, setRows] = useState<Rating[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { items, pagination } = await adminApi.getRatings({
        role: roleFilter || undefined,
        rating: ratingFilter || undefined,
        search: search || undefined,
        limit: 100,
      });
      setRows(items);
      setTotal(pagination?.total ?? items.length);
    } catch (err: any) {
      toast.error(err?.message || 'Αποτυχία φόρτωσης');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleFilter, ratingFilter]);

  const columns: Column<Rating>[] = [
    {
      key: 'who',
      header: 'Ποιος αξιολόγησε ποιον',
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-gray-900">
            {r.rater_role === 'worker' ? '👤' : '🏢'} {r.rater_name || 'Χωρίς όνομα'}
          </p>
          <p className="truncate text-xs text-gray-500">→ {r.ratee_name || 'Χωρίς όνομα'}</p>
        </div>
      ),
    },
    {
      key: 'overall',
      header: 'Βαθμός',
      cell: (r) => (
        <div>
          <Stars n={r.overall} />
          <p className="text-[11px] text-gray-500">{r.overall}/5</p>
        </div>
      ),
    },
    {
      key: 'sub',
      header: 'Αναλυτικά',
      cell: (r) => {
        const labels = SUB_LABELS[r.rater_role];
        const scores = [r.score_a, r.score_b, r.score_c];
        if (scores.every((s) => s == null)) return <span className="text-xs text-gray-400">—</span>;
        return (
          <div className="space-y-0.5 text-[11px] text-gray-600">
            {labels.map((l, i) =>
              scores[i] == null ? null : (
                <p key={l}>
                  {l}: <b>{scores[i]}</b>
                </p>
              ),
            )}
          </div>
        );
      },
      className: 'hidden lg:table-cell',
    },
    {
      key: 'comment',
      header: 'Σχόλιο',
      cell: (r) =>
        r.comment ? (
          <p className="max-w-xs whitespace-pre-wrap break-words text-xs text-gray-700">
            {r.comment}
          </p>
        ) : (
          <span className="text-xs text-gray-400">χωρίς σχόλιο</span>
        ),
      className: 'hidden md:table-cell',
    },
    {
      key: 'job',
      header: 'Αγγελία',
      cell: (r) => (
        <span className="text-xs text-gray-600">
          {r.job_title || <span className="text-gray-400">χωρίς αγγελία</span>}
        </span>
      ),
      className: 'hidden xl:table-cell',
    },
    {
      key: 'date',
      header: 'Ημ/νία',
      cell: (r) => (
        <div className="text-xs text-gray-500">
          <p>{fmt(r.created_at)}</p>
          {/* Στους χρήστες η αξιολόγηση κρύβεται μέχρι να γράψουν και οι δύο.
              Εδώ φαίνεται πάντα, γι' αυτό λέμε καθαρά αν την έχει δει ο άλλος. */}
          <p className={r.other_rated > 0 ? 'text-emerald-600' : 'text-amber-600'}>
            {r.other_rated > 0 ? 'αμοιβαία' : 'μονόπλευρη'}
          </p>
        </div>
      ),
      className: 'hidden lg:table-cell',
    },
  ];

  const avg = rows.length
    ? (rows.reduce((s, r) => s + r.overall, 0) / rows.length).toFixed(2)
    : '—';
  const low = rows.filter((r) => r.overall <= 2).length;
  const withComment = rows.filter((r) => !!r.comment).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Σύνολο αξιολογήσεων" value={total} icon="⭐" tone="info" loading={loading} />
        <MetricCard label="Μέσος όρος" value={avg} icon="📊" tone="success" loading={loading} />
        <MetricCard
          label="Χαμηλές (1–2 αστέρια)"
          value={low}
          icon="⚠️"
          tone={low > 0 ? 'danger' : 'default'}
          loading={loading}
        />
        <MetricCard label="Με σχόλιο" value={withComment} icon="💬" tone="default" loading={loading} />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Αναζήτηση σε όνομα εργαζομένου ή επιχείρησης..."
        filters={[
          {
            key: 'role',
            label: 'Ποιος έγραψε',
            value: roleFilter,
            onChange: setRoleFilter,
            options: [
              { value: 'business', label: 'Η επιχείρηση' },
              { value: 'worker', label: 'Ο εργαζόμενος' },
            ],
          },
          {
            key: 'rating',
            label: 'Βαθμός',
            value: ratingFilter,
            onChange: setRatingFilter,
            options: [
              { value: '5', label: '5 αστέρια' },
              { value: '4', label: '4 αστέρια' },
              { value: '3', label: '3 αστέρια' },
              { value: '2', label: '2 αστέρια' },
              { value: '1', label: '1 αστέρι' },
            ],
          },
        ]}
      />

      {!loading && rows.length === 0 ? (
        <EmptyState
          icon="⭐"
          title="Δεν υπάρχουν αξιολογήσεις"
          description="Η αξιολόγηση ανοίγει 15 μέρες μετά από επιβεβαιωμένη πρόσληψη."
        />
      ) : (
        <DataTable<Rating> columns={columns} rows={rows} loading={loading} rowKey={(r) => r.id} />
      )}
    </div>
  );
}
