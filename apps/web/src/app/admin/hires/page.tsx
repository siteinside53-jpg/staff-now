'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DataTable, type Column } from '@/components/admin/ui/data-table';
import { FilterBar } from '@/components/admin/ui/filter-bar';
import { StatusPill } from '@/components/admin/ui/status-pill';
import { MetricCard } from '@/components/admin/ui/metric-card';
import { EmptyState } from '@/components/admin/ui/empty-state';
import { adminApi } from '@/components/admin/lib/admin-api';

interface Hire {
  id: string;
  status: 'pending' | 'confirmed' | 'declined' | 'cancelled';
  declared_at: string;
  confirmed_at?: string | null;
  rating_opens_at?: string | null;
  worker_name?: string | null;
  business_name?: string | null;
  job_title?: string | null;
  declared_side: 'worker' | 'business';
  ratings_count: number;
}

function fmt(d?: string | null): string {
  if (!d) return '—';
  const t = new Date(d.includes('T') ? d : d.replace(' ', 'T') + 'Z');
  if (Number.isNaN(t.getTime())) return '—';
  return t.toLocaleDateString('el-GR', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function AdminHiresPage() {
  const [rows, setRows] = useState<Hire[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { items, pagination } = await adminApi.getHires({
        status: statusFilter || undefined,
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
  }, [search, statusFilter]);

  const columns: Column<Hire>[] = [
    {
      key: 'who',
      header: 'Ποιοι',
      cell: (h) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-gray-900">
            {h.worker_name || 'Εργαζόμενος χωρίς όνομα'}
          </p>
          <p className="truncate text-xs text-gray-500">
            ↔ {h.business_name || 'Επιχείρηση χωρίς όνομα'}
          </p>
        </div>
      ),
    },
    {
      key: 'job',
      header: 'Αγγελία',
      cell: (h) => (
        <span className="text-xs text-gray-600">
          {h.job_title || <span className="text-gray-400">χωρίς αγγελία</span>}
        </span>
      ),
      className: 'hidden md:table-cell',
    },
    {
      key: 'status',
      header: 'Κατάσταση',
      cell: (h) => <StatusPill status={h.status} size="sm" />,
    },
    {
      key: 'declared_by',
      header: 'Δήλωσε',
      cell: (h) => (
        <span className="text-xs text-gray-600">
          {h.declared_side === 'worker' ? '👤 Ο εργαζόμενος' : '🏢 Η επιχείρηση'}
        </span>
      ),
      className: 'hidden lg:table-cell',
    },
    {
      key: 'dates',
      header: 'Δήλωση / Επιβεβαίωση',
      cell: (h) => (
        <span className="text-xs text-gray-500">
          {fmt(h.declared_at)} → {fmt(h.confirmed_at)}
        </span>
      ),
      className: 'hidden lg:table-cell',
    },
    {
      key: 'ratings',
      header: 'Αξιολογήσεις',
      cell: (h) => (
        <span className="text-xs text-gray-600">
          {h.ratings_count > 0 ? `⭐ ${h.ratings_count} / 2` : <span className="text-gray-400">—</span>}
        </span>
      ),
      className: 'hidden md:table-cell',
    },
  ];

  const pending = rows.filter((h) => h.status === 'pending').length;
  const confirmed = rows.filter((h) => h.status === 'confirmed').length;
  const declined = rows.filter((h) => h.status === 'declined' || h.status === 'cancelled').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Σύνολο δηλώσεων" value={total} icon="🤝" tone="info" loading={loading} />
        <MetricCard label="Επιβεβαιωμένες" value={confirmed} icon="✓" tone="success" loading={loading} />
        <MetricCard label="Περιμένουν απάντηση" value={pending} icon="⏳" tone="warning" loading={loading} />
        <MetricCard label="Δεν έγιναν" value={declined} icon="✕" tone="default" loading={loading} />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Αναζήτηση σε όνομα, επιχείρηση ή αγγελία..."
        filters={[
          {
            key: 'status',
            label: 'Κατάσταση',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: 'pending', label: 'Περιμένει επιβεβαίωση' },
              { value: 'confirmed', label: 'Επιβεβαιωμένη' },
              { value: 'declined', label: 'Δεν έγινε' },
              { value: 'cancelled', label: 'Ακυρώθηκε' },
            ],
          },
        ]}
      />

      {!loading && rows.length === 0 ? (
        <EmptyState
          icon="🤝"
          title="Δεν υπάρχουν δηλώσεις πρόσληψης"
          description="Μόλις κάποια επιχείρηση ή εργαζόμενος δηλώσει πρόσληψη, θα εμφανιστεί εδώ."
        />
      ) : (
        <DataTable<Hire> columns={columns} rows={rows} loading={loading} rowKey={(h) => h.id} />
      )}
    </div>
  );
}
