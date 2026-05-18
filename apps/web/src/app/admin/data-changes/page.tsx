'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '@/components/admin/lib/admin-api';

interface ChangeRow {
  id: string;
  actor_user_id: string | null;
  actor_role: string | null;
  actor_email: string | null;
  actor_name: string | null;
  actor_email_join: string | null;
  actor_name_join: string | null;
  actor_photo: string | null;
  actor_role_join: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_owner_id: string | null;
  owner_email: string | null;
  owner_name: string | null;
  field_changes: string | null;
  metadata: string | null;
  ip_address: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  user_agent: string | null;
  created_at: string;
}

const ACTION_OPTIONS = [
  { value: '', label: 'Όλες οι αλλαγές' },
  { value: 'file_upload', label: '📁 File uploads' },
  { value: 'profile_update', label: '✏️ Profile updates' },
  { value: 'job_create', label: '💼 Job created' },
  { value: 'job_update', label: '💼 Job updated' },
  { value: 'job_delete', label: '🗑️ Job deleted' },
  { value: 'branch_create', label: '🏢 Branch created' },
  { value: 'branch_update', label: '🏢 Branch updated' },
  { value: 'branch_delete', label: '🏢 Branch deleted' },
];

export default function DataChangesPage() {
  const [items, setItems] = useState<ChangeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{ page: number; total: number; perPage: number; totalPages?: number } | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getDataChanges({
        page,
        limit: 50,
        action: filterAction || undefined,
        entityType: filterEntity || undefined,
        search: search || undefined,
      });
      setItems(res.items as any);
      setPagination(res.pagination as any);
    } catch (e: any) {
      setError(e?.message || 'Σφάλμα');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterAction, filterEntity, search]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">📜 Αλλαγές αρχείων / δεδομένων</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Trust &amp; Safety log: κάθε upload, profile/αγγελία/υποκατάστημα update με
          before/after diff, χρήστη, IP &amp; χώρα.
        </p>
        <p className="text-[11px] text-gray-400 mt-1">
          Δες επίσης{' '}
          <Link href="/admin/audit-log" className="underline">audit log</Link>
          {' '}για admin actions.
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-3 flex flex-wrap items-center gap-2">
        <select
          value={filterAction}
          onChange={(e) => {
            setFilterAction(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs"
        >
          {ACTION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={filterEntity}
          onChange={(e) => {
            setFilterEntity(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs"
        >
          <option value="">Όλες οι οντότητες</option>
          <option value="file">Αρχεία</option>
          <option value="worker_profile">Profile εργαζόμενου</option>
          <option value="business_profile">Profile επιχείρησης</option>
          <option value="business_branch">Υποκατάστημα</option>
          <option value="job_listing">Αγγελία</option>
        </select>

        <input
          type="text"
          placeholder="Αναζήτηση με email ή όνομα..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="flex-1 min-w-[180px] rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs"
        />

        {pagination && (
          <span className="text-[11px] text-gray-500">
            <span className="font-bold">{pagination.total}</span> αλλαγές
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* List */}
      {!loading && items.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-3xl">🔍</p>
          <p className="mt-2 text-sm text-gray-600">Καμία αλλαγή με αυτά τα φίλτρα.</p>
        </div>
      ) : (
        <ul className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
          {items.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => setOpenId(openId === row.id ? null : row.id)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <ActionIcon action={row.action} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {actionLabel(row.action)}
                      </p>
                      <EntityBadge type={row.entity_type} />
                      {row.actor_role_join && <RoleTag role={row.actor_role_join} />}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-600 truncate">
                      <span className="font-semibold">
                        {row.actor_name_join || row.actor_name || row.actor_email_join || row.actor_email || 'Άγνωστος'}
                      </span>
                      {row.entity_owner_id && row.entity_owner_id !== row.actor_user_id && (
                        <>
                          {' '}→{' '}
                          <span>{row.owner_name || row.owner_email}</span>
                        </>
                      )}
                      {row.entity_id && (
                        <>
                          {' · '}
                          <code className="font-mono text-[10px] text-gray-400">{row.entity_id.slice(0, 14)}…</code>
                        </>
                      )}
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-400">
                      {row.country && (
                        <>
                          {flagEmoji(row.country)} {row.city || row.country}
                          {' · '}
                        </>
                      )}
                      {row.ip_address && <code className="font-mono">{row.ip_address}</code>}
                      {' · '}
                      {formatDate(row.created_at)}
                    </p>
                  </div>
                  <span className="text-gray-300 text-sm flex-shrink-0">
                    {openId === row.id ? '▾' : '▸'}
                  </span>
                </div>

                {openId === row.id && (
                  <div className="mt-3 ml-9 rounded-lg bg-gray-50 p-3 text-xs">
                    <DiffOrMeta row={row} />
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      {pagination && pagination.total > pagination.perPage && (
        <div className="flex items-center justify-between text-xs">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg bg-white border border-gray-200 px-3 py-1.5 disabled:opacity-50"
          >
            ← Προηγ.
          </button>
          <span className="text-gray-500">
            Σελίδα {page} {pagination.totalPages ? `από ${pagination.totalPages}` : ''}
          </span>
          <button
            disabled={pagination.totalPages ? page >= pagination.totalPages : items.length < pagination.perPage}
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

function DiffOrMeta({ row }: { row: ChangeRow }) {
  const meta = parseJson(row.metadata);
  const changes = parseJson(row.field_changes);

  if (row.action === 'file_upload') {
    return (
      <div className="space-y-1">
        <KV label="Αρχείο" value={meta?.fileName} />
        <KV label="Κατηγορία" value={meta?.category} />
        <KV label="Μέγεθος" value={meta?.fileSize ? formatBytes(meta.fileSize) : null} />
        <KV label="Τύπος" value={meta?.mimeType} />
        {meta?.url && (
          <KV
            label="URL"
            value={
              <a href={meta.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">
                {meta.url}
              </a>
            }
          />
        )}
        <KV label="User-Agent" value={row.user_agent ? truncate(row.user_agent, 80) : null} />
      </div>
    );
  }

  if (row.action.endsWith('_create') || row.action.endsWith('_delete')) {
    const snapshot = meta?.snapshot;
    if (!snapshot) {
      return <p className="text-gray-400">Δεν υπάρχει snapshot.</p>;
    }
    return (
      <div className="space-y-0.5">
        {Object.entries(snapshot)
          .filter(([_, v]) => v !== null && v !== '' && v !== undefined)
          .map(([k, v]) => (
            <div key={k} className="grid grid-cols-[140px_1fr] gap-2">
              <span className="text-gray-500">{k}</span>
              <span className="text-gray-700 break-all">
                {typeof v === 'object' ? JSON.stringify(v) : String(v)}
              </span>
            </div>
          ))}
      </div>
    );
  }

  // Diff display
  if (changes && Object.keys(changes).length > 0) {
    return (
      <div className="space-y-1.5">
        {Object.entries(changes).map(([field, val]: [string, any]) => (
          <div key={field} className="grid grid-cols-[140px_1fr] gap-2">
            <span className="text-gray-500 font-bold">{field}</span>
            <div className="space-y-0.5">
              <div className="rounded bg-rose-50 ring-1 ring-rose-200 px-2 py-1 text-[11px]">
                <span className="text-rose-600 font-bold">−</span>{' '}
                <code className="break-all">
                  {val.before === null || val.before === '' ? <span className="text-gray-400">(κενό)</span> : truncate(JSON.stringify(val.before), 200)}
                </code>
              </div>
              <div className="rounded bg-emerald-50 ring-1 ring-emerald-200 px-2 py-1 text-[11px]">
                <span className="text-emerald-700 font-bold">+</span>{' '}
                <code className="break-all">
                  {val.after === null || val.after === '' ? <span className="text-gray-400">(κενό)</span> : truncate(JSON.stringify(val.after), 200)}
                </code>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <p className="text-gray-400">—</p>;
}

function KV({ label, value }: { label: string; value: any }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="grid grid-cols-[100px_1fr] gap-2">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-700 break-all">{value}</span>
    </div>
  );
}

function ActionIcon({ action }: { action: string }) {
  const map: Record<string, string> = {
    file_upload: '📁',
    profile_update: '✏️',
    job_create: '💼',
    job_update: '💼',
    job_delete: '🗑️',
    branch_create: '🏢',
    branch_update: '🏢',
    branch_delete: '🗑️',
  };
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-base">
      {map[action] || '⚡'}
    </span>
  );
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    file_upload: 'Ανέβασε αρχείο',
    profile_update: 'Ενημέρωσε προφίλ',
    job_create: 'Δημοσίευσε αγγελία',
    job_update: 'Επεξεργάστηκε αγγελία',
    job_delete: 'Διέγραψε αγγελία',
    branch_create: 'Δημιούργησε υποκατάστημα',
    branch_update: 'Ενημέρωσε υποκατάστημα',
    branch_delete: 'Διέγραψε υποκατάστημα',
  };
  return map[action] || action;
}

function EntityBadge({ type }: { type: string | null }) {
  if (!type) return null;
  const map: Record<string, { label: string; className: string }> = {
    file: { label: 'αρχείο', className: 'bg-purple-50 text-purple-700 ring-purple-200' },
    worker_profile: { label: 'εργαζόμενος', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    business_profile: { label: 'επιχείρηση', className: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
    business_branch: { label: 'υποκ/μα', className: 'bg-blue-50 text-blue-700 ring-blue-200' },
    job_listing: { label: 'αγγελία', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  };
  const m = map[type];
  if (!m) return null;
  return (
    <span className={`rounded-full ring-1 px-2 py-0.5 text-[10px] font-bold ${m.className}`}>
      {m.label}
    </span>
  );
}

function RoleTag({ role }: { role: string }) {
  if (role === 'admin')
    return <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">ADMIN</span>;
  if (role === 'business')
    return <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">B</span>;
  return <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">W</span>;
}

function flagEmoji(countryCode?: string | null): string {
  if (!countryCode || countryCode.length !== 2) return '🏳️';
  const cc = countryCode.toUpperCase();
  const A = 0x1f1e6;
  return String.fromCodePoint(A + cc.charCodeAt(0) - 65, A + cc.charCodeAt(1) - 65);
}

function formatDate(s: string): string {
  return new Date(s).toLocaleString('el-GR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function truncate(s: string, max = 100): string {
  if (!s) return s;
  if (s.length <= max) return s;
  return s.slice(0, max) + '…';
}

function parseJson(s: string | null | undefined): any | null {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
