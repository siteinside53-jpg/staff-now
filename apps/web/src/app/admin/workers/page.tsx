'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { DataTable, type Column } from '@/components/admin/ui/data-table';
import { FilterBar } from '@/components/admin/ui/filter-bar';
import { StatusPill } from '@/components/admin/ui/status-pill';
import { MetricCard } from '@/components/admin/ui/metric-card';
import { adminApi } from '@/components/admin/lib/admin-api';

interface Worker {
  id: string;
  email: string;
  status: string;
  created_at: string;
  first_name?: string;
  last_name?: string;
  worker_avatar?: string;
  worker_completeness?: number;
  worker_verified?: number;
}

export default function WorkersPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stats, setStats] = useState<Awaited<ReturnType<typeof adminApi.getCohortStats>> | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { items } = await adminApi.getUsers({
          role: 'worker',
          status: statusFilter || undefined,
          search: search || undefined,
          limit: 50,
        });
        setRows(items);
      } catch (err: any) {
        toast.error(err?.message || 'Αποτυχία φόρτωσης');
      } finally {
        setLoading(false);
      }
    })();
  }, [search, statusFilter]);

  // Real platform-wide aggregates (independent of pagination)
  useEffect(() => {
    setStatsLoading(true);
    adminApi
      .getCohortStats('worker')
      .then(setStats)
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  const name = (r: Worker) => [r.first_name, r.last_name].filter(Boolean).join(' ') || r.email.split('@')[0];

  const columns: Column<Worker>[] = [
    {
      key: 'worker',
      header: 'Εργαζόμενος',
      cell: (r) => (
        <div className="flex items-center gap-3">
          {r.worker_avatar ? (
            <img src={r.worker_avatar} className="h-10 w-10 rounded-full object-cover" alt="" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 text-sm font-bold text-blue-700">
              {name(r)[0]?.toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{name(r)}</p>
            <p className="text-xs text-gray-500 truncate">{r.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Κατάσταση',
      cell: (r) => (
        <div className="flex items-center gap-1.5">
          <StatusPill status={r.status} size="sm" />
          {r.worker_verified === 1 && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
              ✓
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'rating',
      header: 'Rating',
      cell: () => (
        <span className="flex items-center gap-1 text-xs">
          <span className="text-yellow-400">★</span>
          <span className="font-bold text-gray-900">4.8</span>
          <span className="text-gray-400">(23)</span>
        </span>
      ),
      className: 'hidden md:table-cell',
    },
    {
      key: 'completeness',
      header: 'Προφίλ',
      cell: (r) => {
        const pct = r.worker_completeness || 0;
        const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400';
        return (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
              <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] font-semibold text-gray-600 tabular-nums">{pct}%</span>
          </div>
        );
      },
      className: 'hidden md:table-cell',
    },
    {
      key: 'created',
      header: 'Εγγραφή',
      cell: (r) => (
        <span className="text-xs text-gray-500">
          {new Date(r.created_at).toLocaleDateString('el-GR', { day: '2-digit', month: 'short' })}
        </span>
      ),
      className: 'hidden lg:table-cell',
    },
    {
      key: 'actions',
      header: '',
      cell: (r) => (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/admin/users/timeline?id=${r.id}`);
            }}
            className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
          >
            Άνοιγμα
          </button>
        </div>
      ),
      className: 'text-right',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Σύνολο εργαζομένων" value={stats?.total ?? 0} icon="👤" tone="info" loading={statsLoading} />
        <MetricCard label="Επαληθευμένοι" value={stats?.verified ?? 0} icon="✓" tone="success" loading={statsLoading} />
        <MetricCard
          label="Πλήρες προφίλ (≥80%)"
          value={stats?.complete80plus ?? 0}
          icon="⭐"
          tone="success"
          loading={statsLoading}
        />
        <MetricCard
          label="Μέσος όρος προφίλ"
          value={stats ? `${stats.avgCompleteness ?? 0}%` : '—'}
          icon="📊"
          tone="default"
          loading={statsLoading}
        />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Αναζήτηση εργαζομένου..."
        filters={[
          {
            key: 'status',
            label: 'Κατάσταση',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: 'active', label: 'Ενεργοί' },
              { value: 'suspended', label: 'Σε αναστολή' },
              { value: 'pending', label: 'Σε αναμονή' },
            ],
          },
        ]}
      />

      <DataTable<Worker>
        columns={columns}
        rows={rows}
        loading={loading}
        rowKey={(r) => r.id}
        onRowClick={(r) => router.push(`/admin/users/timeline?id=${r.id}`)}
      />
    </div>
  );
}
