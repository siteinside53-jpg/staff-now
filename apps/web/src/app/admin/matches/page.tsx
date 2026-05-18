'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DataTable, type Column } from '@/components/admin/ui/data-table';
import { FilterBar } from '@/components/admin/ui/filter-bar';
import { StatusPill } from '@/components/admin/ui/status-pill';
import { MetricCard } from '@/components/admin/ui/metric-card';
import { KpiChartCard } from '@/components/admin/ui/kpi-chart-card';
import { adminApi } from '@/components/admin/lib/admin-api';

interface Match {
  id: string;
  worker_id: string;
  business_id: string;
  job_id?: string;
  status: 'active' | 'archived' | string;
  matched_at: string;
  worker_name?: string;
  worker_avatar?: string;
  company_name?: string;
  business_logo?: string;
  job_title?: string;
  conversation_id?: string;
  message_count?: number;
}

export default function MatchesPage() {
  const [rows, setRows] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | 'all'>('all');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      adminApi.getMatches({ status: statusFilter || undefined, range: timeRange, limit: 100 }).catch(() => ({ items: [] as Match[] })),
      adminApi.getAnalyticsSeries(14).catch(() => null),
    ])
      .then(([matchesRes, seriesRes]) => {
        setRows((matchesRes as any).items || []);
        setSeries(seriesRes?.matches || []);
      })
      .finally(() => setLoading(false));
  }, [statusFilter, timeRange]);

  const total = rows.length;
  const withConv = rows.filter((m) => m.conversation_id != null && (m.message_count || 0) > 0).length;
  const convRate = total > 0 ? Math.round((withConv / total) * 100) : 0;
  const noResponse = total - withConv;

  const columns: Column<Match>[] = [
    {
      key: 'employer',
      header: 'Επιχείρηση',
      cell: (m) => (
        <div className="flex items-center gap-2 min-w-0">
          {m.business_logo ? (
            <img src={m.business_logo} className="h-8 w-8 rounded-lg object-cover flex-shrink-0" alt="" />
          ) : (
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 text-xs font-bold text-purple-700">
              {m.company_name?.[0]?.toUpperCase() || '🏢'}
            </div>
          )}
          <span className="font-semibold text-gray-900 truncate">{m.company_name || '—'}</span>
        </div>
      ),
    },
    {
      key: 'arrow',
      header: '',
      cell: () => <span className="text-gray-300 text-lg">↔</span>,
      className: 'w-8 text-center',
    },
    {
      key: 'worker',
      header: 'Εργαζόμενος',
      cell: (m) => (
        <div className="flex items-center gap-2 min-w-0">
          {m.worker_avatar ? (
            <img src={m.worker_avatar} className="h-8 w-8 rounded-full object-cover flex-shrink-0" alt="" />
          ) : (
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
              {m.worker_name?.[0]?.toUpperCase() || '👤'}
            </div>
          )}
          <span className="font-semibold text-gray-900 truncate">{m.worker_name || '—'}</span>
        </div>
      ),
    },
    {
      key: 'job',
      header: 'Αγγελία',
      cell: (m) => (
        <span className="text-xs text-gray-600 truncate block max-w-[200px]">{m.job_title || '—'}</span>
      ),
      className: 'hidden md:table-cell',
    },
    {
      key: 'conv',
      header: 'Συνομιλία',
      cell: (m) =>
        m.conversation_id && (m.message_count || 0) > 0 ? (
          <span className="flex items-center gap-1 text-xs text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {m.message_count} μηνύματα
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
            Χωρίς μήνυμα
          </span>
        ),
      className: 'hidden md:table-cell',
    },
    {
      key: 'status',
      header: 'Κατάσταση',
      cell: (m) => <StatusPill status={m.status} size="sm" />,
      className: 'hidden lg:table-cell',
    },
    {
      key: 'date',
      header: 'Ημ/νία',
      cell: (m) => (
        <span className="text-xs text-gray-500">
          {new Date(m.matched_at).toLocaleString('el-GR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
      className: 'hidden lg:table-cell',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label={`Matches (${timeRange})`} value={total} icon="🎯" tone="info" loading={loading} />
        <MetricCard
          label="Match → Μήνυμα"
          value={`${convRate}%`}
          icon="💬"
          context="conversion rate"
          tone={convRate > 60 ? 'success' : convRate > 30 ? 'warning' : 'default'}
          loading={loading}
        />
        <MetricCard label="Με συνομιλία" value={withConv} icon="✓" tone="success" loading={loading} />
        <MetricCard
          label="Χωρίς απάντηση"
          value={noResponse}
          icon="⚠"
          context="δεν ξεκίνησαν chat"
          tone={noResponse > 0 ? 'warning' : 'default'}
          loading={loading}
        />
      </div>

      <KpiChartCard
        title="Matches ανά ημέρα (14 ημέρες)"
        value={series.length ? series[series.length - 1] : 0}
        series={series.length ? series : [0, 0, 0, 0, 0, 0, 0]}
        color="purple"
      />

      <FilterBar
        filters={[
          {
            key: 'range',
            label: 'Διάστημα',
            value: timeRange,
            onChange: (v) => setTimeRange(v as any),
            options: [
              { value: 'today', label: 'Σήμερα' },
              { value: '7d', label: '7 ημέρες' },
              { value: '30d', label: '30 ημέρες' },
              { value: 'all', label: 'Όλα' },
            ],
          },
          {
            key: 'status',
            label: 'Κατάσταση',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: 'active', label: 'Ενεργά' },
              { value: 'archived', label: 'Αρχειοθ/να' },
            ],
          },
        ]}
      />

      <DataTable<Match> columns={columns} rows={rows} loading={loading} rowKey={(m) => m.id} />
    </div>
  );
}
