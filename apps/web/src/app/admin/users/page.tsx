'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DataTable, type Column } from '@/components/admin/ui/data-table';
import { FilterBar } from '@/components/admin/ui/filter-bar';
import { StatusPill } from '@/components/admin/ui/status-pill';
import { ConfirmDialog } from '@/components/admin/ui/confirm-dialog';
import { EmptyState } from '@/components/admin/ui/empty-state';
import { adminApi } from '@/components/admin/lib/admin-api';

interface User {
  id: string;
  email: string;
  role: 'worker' | 'business' | 'admin';
  status: string;
  created_at: string;
  last_login?: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  plan_id?: string;
  worker_completeness?: number;
  business_completeness?: number;
  worker_verified?: number;
  business_verified?: number;
}

export default function UsersPage() {
  const [rows, setRows] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [confirm, setConfirm] = useState<{ type: 'suspend' | 'unsuspend'; user: User } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [messageModal, setMessageModal] = useState<User | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { items } = await adminApi.getUsers({
        role: roleFilter || undefined,
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
    const t = setTimeout(load, search ? 300 : 0); // debounce search
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleFilter, statusFilter]);

  const handleSuspend = async (reason?: string) => {
    if (!confirm) return;
    setActionLoading(true);
    try {
      if (confirm.type === 'suspend') {
        await adminApi.suspendUser(confirm.user.id, reason);
        toast.success('Ο χρήστης ανεστάλη');
      } else {
        await adminApi.unsuspendUser(confirm.user.id);
        toast.success('Ο χρήστης επαναφέρθηκε');
      }
      setConfirm(null);
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Σφάλμα');
    } finally {
      setActionLoading(false);
    }
  };

  const displayName = (u: User) =>
    u.company_name || [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email.split('@')[0];

  const roleLabel = (r: string) => (r === 'worker' ? 'Εργαζόμενος' : r === 'business' ? 'Επιχείρηση' : 'Admin');

  const columns: Column<User>[] = [
    {
      key: 'user',
      header: 'Χρήστης',
      cell: (u) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-xs font-bold text-blue-700">
            {displayName(u)[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{displayName(u)}</p>
            <p className="text-xs text-gray-500 truncate">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Τύπος',
      cell: (u) => (
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
            u.role === 'worker'
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : u.role === 'business'
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-gray-100 text-gray-700 border-gray-200'
          }`}
        >
          {roleLabel(u.role)}
        </span>
      ),
      className: 'hidden sm:table-cell',
    },
    {
      key: 'status',
      header: 'Κατάσταση',
      cell: (u) => <StatusPill status={u.status} size="sm" />,
    },
    {
      key: 'plan',
      header: 'Plan',
      cell: (u) => (
        <span className="text-xs text-gray-600">
          {u.plan_id ? u.plan_id.charAt(0).toUpperCase() + u.plan_id.slice(1) : '—'}
        </span>
      ),
      className: 'hidden md:table-cell',
    },
    {
      key: 'completeness',
      header: 'Προφίλ',
      cell: (u) => {
        const pct = u.worker_completeness ?? u.business_completeness ?? 0;
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
      className: 'hidden lg:table-cell',
    },
    {
      key: 'created',
      header: 'Εγγραφή',
      cell: (u) => (
        <span className="text-xs text-gray-500">
          {new Date(u.created_at).toLocaleDateString('el-GR', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      ),
      className: 'hidden lg:table-cell',
    },
    {
      key: 'actions',
      header: '',
      cell: (u) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedUser(u);
            }}
            className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
          >
            Προβολή
          </button>
          {u.role !== 'admin' && (
            u.status === 'suspended' ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirm({ type: 'unsuspend', user: u });
                }}
                className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                Επαναφορά
              </button>
            ) : (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMessageModal(u);
                    setMessageText('');
                  }}
                  className="rounded-md border border-blue-300 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
                >
                  💬 Μήνυμα
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirm({ type: 'suspend', user: u });
                  }}
                  className="rounded-md border border-red-300 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100"
                >
                  Αναστολή
                </button>
              </>
            )
          )}
        </div>
      ),
      className: 'text-right',
    },
  ];

  const sendAdminMessage = async () => {
    if (!messageModal || !messageText.trim()) return;
    setSendingMessage(true);
    try {
      const token = localStorage.getItem('staffnow_token');
      const API = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';
      const res = await fetch(`${API}/admin/users/${messageModal.id}/message`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: messageText.trim() }),
      });
      const data = await res.json() as any;
      if (data.success) {
        toast.success('Το μήνυμα στάλθηκε');
        setMessageModal(null);
        setMessageText('');
      } else {
        toast.error(data?.error?.message || 'Σφάλμα αποστολής');
      }
    } catch {
      toast.error('Σφάλμα σύνδεσης');
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="space-y-4">
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Αναζήτηση με email, όνομα ή επιχείρηση..."
        filters={[
          {
            key: 'role',
            label: 'Τύπος',
            value: roleFilter,
            onChange: setRoleFilter,
            options: [
              { value: 'worker', label: 'Εργαζόμενοι' },
              { value: 'business', label: 'Επιχειρήσεις' },
              { value: 'admin', label: 'Admins' },
            ],
          },
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
        actions={
          <>
            <button className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
              📤 Export CSV
            </button>
          </>
        }
      />

      {!loading && rows.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="Δεν βρέθηκαν χρήστες"
          description="Δοκίμασε διαφορετικά φίλτρα ή καθάρισε την αναζήτηση"
        />
      ) : (
        <DataTable<User>
          columns={columns}
          rows={rows}
          loading={loading}
          rowKey={(u) => u.id}
          onRowClick={(u) => setSelectedUser(u)}
        />
      )}

      {/* ========== USER DRAWER ========== */}
      {selectedUser && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSelectedUser(null)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto bg-white shadow-2xl">
            <div className="border-b border-gray-100 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xl font-bold text-white shadow-md">
                    {displayName(selectedUser)[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-gray-900 truncate">{displayName(selectedUser)}</h2>
                    <p className="text-sm text-gray-500 truncate">{selectedUser.email}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <StatusPill status={selectedUser.status} size="sm" />
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        {roleLabel(selectedUser.role)}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <InfoBlock label="User ID" value={selectedUser.id} mono />
              <InfoBlock
                label="Εγγραφή"
                value={new Date(selectedUser.created_at).toLocaleString('el-GR')}
              />
              <InfoBlock
                label="Τελευταία σύνδεση"
                value={selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleString('el-GR') : '—'}
              />
              <InfoBlock
                label="Συνδρομή"
                value={selectedUser.plan_id || 'Δωρεάν plan'}
              />
              <InfoBlock
                label="Επαλήθευση"
                value={
                  (selectedUser.worker_verified === 1 || selectedUser.business_verified === 1)
                    ? '✓ Επαληθευμένος'
                    : 'Μη επαληθευμένος'
                }
              />
            </div>

            <div className="sticky bottom-0 border-t border-gray-100 bg-gray-50 p-4 flex flex-wrap gap-2">
              <a
                href={`/admin/users/timeline?id=${selectedUser.id}`}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-blue-700"
              >
                📋 Πλήρες ιστορικό & δραστηριότητα
              </a>
              {selectedUser.role !== 'admin' && (
                selectedUser.status === 'suspended' ? (
                  <button
                    onClick={() => {
                      setConfirm({ type: 'unsuspend', user: selectedUser });
                      setSelectedUser(null);
                    }}
                    className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Επαναφορά χρήστη
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setConfirm({ type: 'suspend', user: selectedUser });
                      setSelectedUser(null);
                    }}
                    className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    Αναστολή χρήστη
                  </button>
                )
              )}
              <button
                onClick={() => setSelectedUser(null)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Κλείσιμο
              </button>
            </div>
          </div>
        </>
      )}

      {confirm && (
        <ConfirmDialog
          open
          title={confirm.type === 'suspend' ? 'Αναστολή χρήστη' : 'Επαναφορά χρήστη'}
          description={
            confirm.type === 'suspend'
              ? `Ο χρήστης ${displayName(confirm.user)} δεν θα μπορεί να συνδεθεί. Η ενέργεια καταγράφεται στο audit log.`
              : `Ο χρήστης ${displayName(confirm.user)} θα επανενεργοποιηθεί.`
          }
          confirmLabel={confirm.type === 'suspend' ? 'Αναστολή' : 'Επαναφορά'}
          tone={confirm.type === 'suspend' ? 'danger' : 'primary'}
          reasonRequired={confirm.type === 'suspend'}
          loading={actionLoading}
          onConfirm={handleSuspend}
          onClose={() => setConfirm(null)}
        />
      )}

      {messageModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => !sendingMessage && setMessageModal(null)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900">💬 Μήνυμα προς χρήστη</h3>
            <p className="mt-1 text-sm text-gray-500">Προς: <span className="font-medium text-gray-700">{displayName(messageModal)}</span> ({messageModal.email})</p>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Γράψε το μήνυμα..."
              className="mt-4 w-full min-h-[120px] rounded-lg border border-gray-300 p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
              maxLength={5000}
              disabled={sendingMessage}
            />
            <p className="mt-1 text-[11px] text-gray-400">{messageText.length}/5000</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setMessageModal(null)}
                disabled={sendingMessage}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Άκυρο
              </button>
              <button
                onClick={sendAdminMessage}
                disabled={sendingMessage || !messageText.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {sendingMessage ? 'Αποστολή...' : 'Αποστολή'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function InfoBlock({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`mt-1 text-sm text-gray-900 ${mono ? 'font-mono' : 'font-medium'}`}>{value}</p>
    </div>
  );
}
