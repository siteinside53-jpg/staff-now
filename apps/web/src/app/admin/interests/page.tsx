'use client';

/**
 * /admin/interests — «Αιτήματα»: ποιος έκανε αίτημα σε ποιον.
 *
 * Ένα αίτημα είναι ένα «μου αρέσει» (like). Υπάρχουν δύο κατευθύνσεις και δεν
 * είναι το ίδιο πράγμα:
 *
 *   🏢 → 👤  Η επιχείρηση ενδιαφέρθηκε για συγκεκριμένο εργαζόμενο.
 *   👤 → 💼  Ο εργαζόμενος έκανε αίτηση σε συγκεκριμένη αγγελία.
 *
 * Όταν και οι δύο πλευρές δείξουν ενδιαφέρον, γίνεται match — γι' αυτό η στήλη
 * «Κατέληξε» δείχνει αν το αίτημα βρήκε ανταπόκριση ή έμεινε αναπάντητο.
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DataTable, type Column } from '@/components/admin/ui/data-table';
import { FilterBar } from '@/components/admin/ui/filter-bar';
import { MetricCard } from '@/components/admin/ui/metric-card';
import { EmptyState } from '@/components/admin/ui/empty-state';
import { adminApi } from '@/components/admin/lib/admin-api';

interface Interest {
  id: string;
  created_at: string;
  direction: 'like' | 'skip' | string;
  target_type: 'worker' | 'job' | string;
  swiper_id: string;
  target_id: string;
  swiper_role: 'worker' | 'business' | 'admin' | string;
  swiper_name?: string | null;
  swiper_avatar?: string | null;
  target_worker_name?: string | null;
  target_worker_avatar?: string | null;
  job_title?: string | null;
  job_company_name?: string | null;
  job_company_logo?: string | null;
  job_business_user_id?: string | null;
  is_matched: number;
}

function fmt(d?: string | null): string {
  if (!d) return '—';
  const t = new Date(d.includes('T') ? d : d.replace(' ', 'T') + 'Z');
  if (Number.isNaN(t.getTime())) return '—';
  return t.toLocaleString('el-GR', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Μικρό στρογγυλό εικονίδιο: φωτογραφία αν υπάρχει, αλλιώς το αρχικό γράμμα. */
function Avatar({
  src,
  name,
  square,
}: {
  src?: string | null;
  name?: string | null;
  square?: boolean;
}) {
  const shape = square ? 'rounded-lg' : 'rounded-full';
  if (src) {
    return <img src={src} alt="" className={`h-7 w-7 flex-shrink-0 object-cover ${shape}`} />;
  }
  return (
    <div
      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center text-[11px] font-bold ${shape} ${
        square ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
      }`}
    >
      {name?.[0]?.toUpperCase() || (square ? '🏢' : '👤')}
    </div>
  );
}

export default function AdminInterestsPage() {
  const [rows, setRows] = useState<Interest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('');
  const [matched, setMatched] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { items, pagination } = await adminApi.getInterests({
        kind: kind || undefined,
        matched: matched || undefined,
        search: search || undefined,
        limit: 200,
      });
      setRows(items as Interest[]);
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
  }, [search, kind, matched]);

  const columns: Column<Interest>[] = [
    {
      key: 'from',
      header: 'Ποιος έκανε το αίτημα',
      cell: (r) => (
        <div className="flex min-w-0 items-center gap-2">
          <Avatar
            src={r.swiper_avatar}
            name={r.swiper_name}
            square={r.swiper_role === 'business'}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">
              {r.swiper_name || '—'}
            </p>
            <p className="truncate text-[11px] text-gray-500">
              {r.swiper_role === 'business' ? '🏢 Επιχείρηση' : '👤 Εργαζόμενος'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'arrow',
      header: '',
      cell: () => <span className="text-gray-300">→</span>,
      className: 'hidden md:table-cell w-6',
    },
    {
      key: 'to',
      header: 'Σε ποιον',
      cell: (r) =>
        r.target_type === 'worker' ? (
          <div className="flex min-w-0 items-center gap-2">
            <Avatar src={r.target_worker_avatar} name={r.target_worker_name} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">
                {r.target_worker_name || '—'}
              </p>
              <p className="truncate text-[11px] text-gray-500">👤 Εργαζόμενος</p>
            </div>
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            <Avatar src={r.job_company_logo} name={r.job_company_name} square />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">
                {r.job_title || 'Αγγελία που διαγράφηκε'}
              </p>
              <p className="truncate text-[11px] text-gray-500">
                💼 {r.job_company_name || 'Επιχείρηση χωρίς όνομα'}
              </p>
            </div>
          </div>
        ),
    },
    {
      key: 'result',
      header: 'Κατέληξε',
      cell: (r) =>
        r.is_matched > 0 ? (
          <span className="whitespace-nowrap rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
            ✅ Έγινε match
          </span>
        ) : (
          <span className="whitespace-nowrap rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">
            Αναπάντητο
          </span>
        ),
    },
    {
      key: 'when',
      header: 'Πότε',
      cell: (r) => <span className="whitespace-nowrap text-xs text-gray-500">{fmt(r.created_at)}</span>,
      className: 'hidden lg:table-cell',
    },
  ];

  const fromBusiness = rows.filter((r) => r.target_type === 'worker').length;
  const fromWorker = rows.filter((r) => r.target_type === 'job').length;
  const becameMatch = rows.filter((r) => r.is_matched > 0).length;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100">
            🙋
          </div>
          <div>
            <h3 className="text-sm font-bold text-blue-900">Ποιος ενδιαφέρθηκε για ποιον</h3>
            <p className="mt-1 text-xs text-blue-800">
              Κάθε γραμμή είναι ένα «μου αρέσει». Η επιχείρηση ενδιαφέρεται για{' '}
              <strong>εργαζόμενο</strong>· ο εργαζόμενος κάνει αίτηση σε <strong>αγγελία</strong>.
              Όταν ανταποκριθεί και η άλλη πλευρά, γίνεται match και ανοίγει συνομιλία.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Σύνολο αιτημάτων" value={total} icon="🙋" tone="info" loading={loading} />
        <MetricCard
          label="Από επιχειρήσεις"
          value={fromBusiness}
          icon="🏢"
          tone="default"
          loading={loading}
        />
        <MetricCard
          label="Από εργαζόμενους"
          value={fromWorker}
          icon="👤"
          tone="default"
          loading={loading}
        />
        <MetricCard
          label="Έγιναν match"
          value={becameMatch}
          icon="✅"
          tone="success"
          loading={loading}
        />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Αναζήτηση σε όνομα, επιχείρηση ή αγγελία..."
        filters={[
          {
            key: 'kind',
            label: 'Κατεύθυνση',
            value: kind,
            onChange: setKind,
            options: [
              { value: 'business_to_worker', label: '🏢 → 👤 Επιχείρηση σε εργαζόμενο' },
              { value: 'worker_to_job', label: '👤 → 💼 Εργαζόμενος σε αγγελία' },
            ],
          },
          {
            key: 'matched',
            label: 'Κατέληξε',
            value: matched,
            onChange: setMatched,
            options: [
              { value: 'yes', label: 'Έγινε match' },
              { value: 'no', label: 'Αναπάντητο' },
            ],
          },
        ]}
      />

      {!loading && rows.length === 0 ? (
        <EmptyState
          icon="🙋"
          title="Δεν βρέθηκαν αιτήματα"
          description="Δοκιμάστε άλλα φίλτρα ή διαφορετική αναζήτηση."
        />
      ) : (
        <DataTable<Interest>
          columns={columns}
          rows={rows}
          loading={loading}
          rowKey={(r) => r.id}
        />
      )}
    </div>
  );
}
