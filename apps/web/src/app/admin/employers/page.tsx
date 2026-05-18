'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { DataTable, type Column } from '@/components/admin/ui/data-table';
import { FilterBar } from '@/components/admin/ui/filter-bar';
import { StatusPill } from '@/components/admin/ui/status-pill';
import { MetricCard } from '@/components/admin/ui/metric-card';
import { adminApi } from '@/components/admin/lib/admin-api';

interface Employer {
  id: string;
  email: string;
  status: string;
  created_at: string;
  company_name?: string;
  business_logo?: string;
  business_completeness?: number;
  business_verified?: number;
  plan_id?: string;
}

export default function EmployersPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Employer[]>([]);
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
          role: 'business',
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
      .getCohortStats('business')
      .then(setStats)
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  const columns: Column<Employer>[] = [
    {
      key: 'company',
      header: 'Επιχείρηση',
      cell: (r) => (
        <div className="flex items-center gap-3">
          {r.business_logo ? (
            <img src={r.business_logo} className="h-10 w-10 rounded-lg object-cover" alt="" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 text-sm font-bold text-purple-700">
              {r.company_name?.[0]?.toUpperCase() || '🏢'}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{r.company_name || 'Χωρίς όνομα'}</p>
            <p className="text-xs text-gray-500 truncate">{r.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Κατάσταση',
      cell: (r) => (
        <div className="flex items-center gap-2">
          <StatusPill status={r.status} size="sm" />
          {r.business_verified === 1 && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
              ✓ Verified
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      cell: (r) => (
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
            r.plan_id === 'enterprise'
              ? 'bg-purple-100 text-purple-700'
              : r.plan_id === 'professional'
                ? 'bg-blue-100 text-blue-700'
                : r.plan_id === 'starter'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 text-gray-500'
          }`}
        >
          {r.plan_id || 'Free'}
        </span>
      ),
      className: 'hidden sm:table-cell',
    },
    {
      key: 'completeness',
      header: 'Προφίλ',
      cell: (r) => {
        const pct = r.business_completeness || 0;
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
      {/* Stats row — real platform-wide numbers */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Σύνολο" value={stats?.total ?? 0} icon="🏢" tone="info" loading={statsLoading} />
        <MetricCard label="Επαληθευμένες" value={stats?.verified ?? 0} icon="✓" tone="success" loading={statsLoading} />
        <MetricCard label="Paid plans" value={stats?.paid ?? 0} icon="💎" tone="info" loading={statsLoading} />
        <MetricCard
          label="Με αγγελίες"
          value={stats?.withJobs ?? 0}
          icon="💼"
          tone="default"
          loading={statsLoading}
        />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Αναζήτηση επιχείρησης..."
        filters={[
          {
            key: 'status',
            label: 'Κατάσταση',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: 'active', label: 'Ενεργές' },
              { value: 'suspended', label: 'Σε αναστολή' },
              { value: 'pending', label: 'Σε αναμονή' },
            ],
          },
        ]}
      />

      <DataTable<Employer>
        columns={columns}
        rows={rows}
        loading={loading}
        rowKey={(r) => r.id}
        onRowClick={(r) => router.push(`/admin/users/timeline?id=${r.id}`)}
      />
    </div>
  );
}
