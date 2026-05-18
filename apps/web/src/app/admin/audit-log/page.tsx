'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FilterBar } from '@/components/admin/ui/filter-bar';
import { SeverityBadge, type Severity } from '@/components/admin/ui/severity-badge';
import { EmptyState } from '@/components/admin/ui/empty-state';
import { adminApi } from '@/components/admin/lib/admin-api';

interface AuditEntry {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata?: string;
  ip_address?: string | null;
  created_at: string;
  admin_email?: string;
  admin_name?: string;
}

const ACTION_LABELS: Record<string, { icon: string; label: string; severity: Severity }> = {
  user_suspended:           { icon: '🚫', label: 'Αναστολή χρήστη',         severity: 'critical' },
  user_unsuspended:         { icon: '✓',  label: 'Επαναφορά χρήστη',         severity: 'low' },
  user_verified:            { icon: '✅', label: 'Επαλήθευση χρήστη',         severity: 'low' },
  report_resolved:          { icon: '🔧', label: 'Επίλυση αναφοράς',          severity: 'low' },
  report_dismissed:         { icon: '✕',  label: 'Απόρριψη αναφοράς',         severity: 'low' },
  report_action_taken:      { icon: '⚡', label: 'Λήψη μέτρων',                severity: 'medium' },
  job_deleted:              { icon: '🗑',  label: 'Διαγραφή αγγελίας',         severity: 'medium' },
  job_paused:               { icon: '⏸',  label: 'Παύση αγγελίας',            severity: 'low' },
  job_unpaused:             { icon: '▶',  label: 'Επανενεργ. αγγελίας',        severity: 'low' },
  verification_approved:    { icon: '✓',  label: 'Έγκριση επαλήθευσης',       severity: 'low' },
  verification_rejected:    { icon: '✕',  label: 'Απόρριψη επαλήθευσης',     severity: 'medium' },
  platform_setting_changed: { icon: '⚙️', label: 'Αλλαγή ρύθμισης',            severity: 'medium' },
  admin_message_sent:       { icon: '💬', label: 'Μήνυμα admin',                severity: 'low' },
  settings_flags_updated:   { icon: '🚩', label: 'Ενημέρωση feature flags',     severity: 'medium' },
  user_deleted:             { icon: '🗑',  label: 'Διαγραφή χρήστη',             severity: 'critical' },
  user_role_changed:        { icon: '🔄', label: 'Αλλαγή ρόλου',                severity: 'critical' },
};

export default function AuditLogPage() {
  const [rows, setRows] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{ total: number; perPage: number; totalPages?: number } | null>(null);

  useEffect(() => {
    setLoading(true);
    adminApi
      .getAuditLog({ action: actionFilter || undefined, limit: 50, page })
      .then((res) => {
        setRows(res.items);
        setPagination(res.pagination as any);
      })
      .catch((err: any) => toast.error(err?.message || 'Αποτυχία φόρτωσης'))
      .finally(() => setLoading(false));
  }, [actionFilter, page]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [actionFilter, search]);

  const filtered = rows.filter((a) => {
    if (search && !`${a.action} ${a.entity_id} ${a.admin_email || ''}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">📜</div>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold text-gray-900">Πλήρες ιστορικό ενεργειών admin</h2>
              {pagination && (
                <span className="text-xs text-gray-500">
                  <span className="font-bold text-gray-900">{pagination.total}</span> εγγραφές
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-600">
              Κάθε ενέργεια moderation, αλλαγή ρυθμίσεων και suspension καταγράφεται αυτόματα στον πίνακα{' '}
              <code className="text-[11px] bg-gray-100 px-1 rounded">audit_logs</code>. Read-only &amp; αμετάβλητο.
            </p>
          </div>
        </div>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Αναζήτηση action, target, admin..."
        filters={[
          {
            key: 'action',
            label: 'Ενέργεια',
            value: actionFilter,
            onChange: setActionFilter,
            options: Object.entries(ACTION_LABELS).map(([value, { label }]) => ({ value, label })),
          },
        ]}
      />

      {loading ? (
        <div className="rounded-xl border border-gray-100 bg-white p-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start gap-4 py-4 border-b border-gray-100 last:border-0">
              <div className="h-10 w-10 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="📜" title="Καμία ενέργεια" description="Δεν υπάρχουν εγγραφές στο audit log ακόμα." />
      ) : (
        <div className="relative rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="absolute left-[35px] top-5 bottom-5 w-px bg-gray-200" />
          <div className="space-y-4">
            {filtered.map((entry) => {
              const info = ACTION_LABELS[entry.action] || { icon: '📝', label: entry.action, severity: 'low' as Severity };
              let metadata: any = null;
              try {
                metadata = entry.metadata ? JSON.parse(entry.metadata) : null;
              } catch {}
              return (
                <div key={entry.id} className="relative flex items-start gap-4 pl-0">
                  <div
                    className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-4 border-white text-base shadow-sm ${
                      info.severity === 'critical'
                        ? 'bg-red-100'
                        : info.severity === 'medium'
                          ? 'bg-amber-100'
                          : 'bg-blue-100'
                    }`}
                  >
                    {info.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-900">{info.label}</h3>
                      <SeverityBadge severity={info.severity} size="sm" />
                      {entry.entity_type && entry.entity_id && (
                        <code className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                          {entry.entity_type}/{entry.entity_id.substring(0, 14)}
                        </code>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      από{' '}
                      <a
                        href={`/admin/users/timeline?id=${entry.user_id}`}
                        className="font-semibold text-gray-700 hover:text-blue-600 hover:underline"
                      >
                        {entry.admin_name || entry.admin_email || 'unknown admin'}
                      </a>
                      {metadata?.target_email && (
                        <>
                          {' → '}
                          <span className="font-semibold text-gray-600">{metadata.target_email}</span>
                        </>
                      )}
                    </p>
                    {metadata?.reason && (
                      <p className="mt-1.5 rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs italic text-gray-600 border-l-2 border-gray-200">
                        &ldquo;{metadata.reason}&rdquo;
                      </p>
                    )}
                    {metadata?.message_preview && (
                      <p className="mt-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs text-blue-800 border-l-2 border-blue-200">
                        💬 {metadata.message_preview}
                      </p>
                    )}
                    {metadata?.action && metadata.action !== entry.action && (
                      <p className="mt-1 text-[11px] text-gray-500">
                        Επιλογή: <span className="font-semibold">{metadata.action}</span>
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-gray-400">
                      {new Date(entry.created_at).toLocaleString('el-GR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                      {entry.ip_address ? <> · IP <code className="font-mono">{entry.ip_address}</code></> : null}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.total > pagination.perPage && (
        <div className="flex items-center justify-between text-xs">
          <button
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg bg-white border border-gray-200 px-3 py-1.5 disabled:opacity-50"
          >
            ← Προηγ.
          </button>
          <span className="text-gray-500">
            Σελίδα {page}
            {pagination.totalPages ? ` από ${pagination.totalPages}` : ''}
          </span>
          <button
            disabled={
              loading ||
              (pagination.totalPages ? page >= pagination.totalPages : rows.length < pagination.perPage)
            }
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg bg-white border border-gray-200 px-3 py-1.5 disabled:opacity-50"
          >
            Επόμ. →
          </button>
        </div>
      )}
    </div>
  );
}
