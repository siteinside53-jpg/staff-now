'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DataTable, type Column } from '@/components/admin/ui/data-table';
import { FilterBar } from '@/components/admin/ui/filter-bar';
import { StatusPill } from '@/components/admin/ui/status-pill';
import { MetricCard } from '@/components/admin/ui/metric-card';
import { EmptyState } from '@/components/admin/ui/empty-state';
import { ConfirmDialog } from '@/components/admin/ui/confirm-dialog';
import { adminApi } from '@/components/admin/lib/admin-api';
import { AdminJobDetailModal } from '@/components/admin/admin-job-detail-modal';

interface Job {
  id: string;
  title: string;
  city?: string;
  region?: string;
  salary_min?: number;
  salary_max?: number;
  salary_type?: string;
  status: 'published' | 'paused' | 'draft' | 'archived';
  employment_type?: string;
  interested_count?: number;
  matches_count?: number;
  reports_count?: number;
  created_at: string;
  company_name?: string;
}

const SALARY_SUFFIX: Record<string, string> = {
  hourly: '/ώρα',
  daily: '/ημέρα',
  monthly: '/μήνα',
};

function formatSalary(j: Job): string {
  const min = j.salary_min;
  const max = j.salary_max;
  const sfx = SALARY_SUFFIX[j.salary_type || 'monthly'] || '';
  if (!min && !max) return '—';
  if (min && max) return `${min}-${max}€${sfx}`;
  return `${min || max}€${sfx}`;
}

export default function JobsPage() {
  const [rows, setRows] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ type: 'pause' | 'unpause' | 'delete'; job: Job } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [detailJobId, setDetailJobId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { items } = await adminApi.getJobs({
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
  };

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  const handleAction = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      if (confirmAction.type === 'pause') {
        await adminApi.pauseJob(confirmAction.job.id);
        toast.success('Η αγγελία τέθηκε σε παύση');
      } else if (confirmAction.type === 'unpause') {
        await adminApi.unpauseJob(confirmAction.job.id);
        toast.success('Η αγγελία επανενεργοποιήθηκε');
      } else if (confirmAction.type === 'delete') {
        await adminApi.deleteJob(confirmAction.job.id);
        toast.success('Η αγγελία αρχειοθετήθηκε');
      }
      setConfirmAction(null);
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Σφάλμα');
    } finally {
      setActionLoading(false);
    }
  };

  const columns: Column<Job>[] = [
    {
      key: 'job',
      header: 'Αγγελία',
      cell: (j) => (
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate flex items-center gap-2">
            {j.title}
            {(j.reports_count || 0) > 0 && (
              <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700">
                ⚠ {j.reports_count}
              </span>
            )}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {j.company_name || '—'} {(j.city || j.region) && `· 📍 ${[j.city, j.region].filter(Boolean).join(', ')}`}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Κατάσταση',
      cell: (j) => <StatusPill status={j.status} size="sm" />,
    },
    {
      key: 'salary',
      header: 'Μισθός',
      cell: (j) => <span className="text-xs font-semibold text-emerald-700">{formatSalary(j)}</span>,
      className: 'hidden md:table-cell',
    },
    {
      key: 'stats',
      header: 'Engagement',
      cell: (j) => (
        <div className="flex items-center gap-3 text-xs text-gray-600">
          <span title="Ενδιαφέρον">❤️ {j.interested_count || 0}</span>
          <span title="Matches">🎯 {j.matches_count || 0}</span>
        </div>
      ),
      className: 'hidden md:table-cell',
    },
    {
      key: 'date',
      header: 'Ημ/νία',
      cell: (j) => (
        <span className="text-xs text-gray-500">
          {new Date(j.created_at).toLocaleDateString('el-GR', { day: '2-digit', month: 'short' })}
        </span>
      ),
      className: 'hidden lg:table-cell',
    },
    {
      key: 'actions',
      header: '',
      cell: (j) => (
        <div className="flex items-center justify-end gap-1">
          {j.status !== 'archived' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmAction({ type: j.status === 'paused' ? 'unpause' : 'pause', job: j });
              }}
              className="rounded-md border border-orange-300 bg-orange-50 px-2 py-1 text-[11px] font-semibold text-orange-700 hover:bg-orange-100"
            >
              {j.status === 'paused' ? 'Ενεργοπ.' : 'Παύση'}
            </button>
          )}
          {j.status !== 'archived' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmAction({ type: 'delete', job: j });
              }}
              className="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100"
            >
              Αρχείο
            </button>
          )}
        </div>
      ),
      className: 'text-right',
    },
  ];

  const totalPublished = rows.filter((j) => j.status === 'published').length;
  const totalPaused = rows.filter((j) => j.status === 'paused').length;
  const totalReported = rows.filter((j) => (j.reports_count || 0) > 0).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Σύνολο αγγελιών" value={rows.length} icon="💼" tone="info" loading={loading} />
        <MetricCard label="Δημοσιευμένες" value={totalPublished} icon="✓" tone="success" loading={loading} />
        <MetricCard label="Σε παύση" value={totalPaused} icon="⏸" tone="warning" loading={loading} />
        <MetricCard label="Με αναφορές" value={totalReported} icon="🚨" tone={totalReported > 0 ? 'danger' : 'default'} loading={loading} />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Αναζήτηση αγγελίας ή επιχείρησης..."
        filters={[
          {
            key: 'status',
            label: 'Κατάσταση',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: 'published', label: 'Δημοσιευμένες' },
              { value: 'paused', label: 'Σε παύση' },
              { value: 'draft', label: 'Πρόχειρες' },
              { value: 'archived', label: 'Αρχειοθετημένες' },
            ],
          },
        ]}
      />

      {!loading && rows.length === 0 ? (
        <EmptyState icon="💼" title="Δεν βρέθηκαν αγγελίες" description="Δοκιμάστε άλλα φίλτρα." />
      ) : (
        <DataTable<Job>
          columns={columns}
          rows={rows}
          loading={loading}
          rowKey={(j) => j.id}
          onRowClick={(j) => setDetailJobId(j.id)}
        />
      )}

      {detailJobId && (
        <AdminJobDetailModal jobId={detailJobId} onClose={() => setDetailJobId(null)} />
      )}

      {confirmAction && (
        <ConfirmDialog
          open
          title={
            confirmAction.type === 'pause'
              ? 'Παύση αγγελίας'
              : confirmAction.type === 'unpause'
                ? 'Επανενεργοποίηση αγγελίας'
                : 'Αρχειοθέτηση αγγελίας'
          }
          description={`"${confirmAction.job.title}" — η ενέργεια θα καταγραφεί στο audit log.`}
          tone={confirmAction.type === 'delete' ? 'danger' : 'primary'}
          loading={actionLoading}
          onConfirm={handleAction}
          onClose={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
