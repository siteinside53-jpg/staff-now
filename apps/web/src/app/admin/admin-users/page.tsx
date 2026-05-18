'use client';

/**
 * /admin/admin-users — fully-functional Admin team management.
 *
 * Promote any user to admin (by email), change role, remove. All operations
 * hit /admin/admins endpoints (D1 + audit_logs).
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { adminApi } from '@/components/admin/lib/admin-api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';

const authHeaders = (): HeadersInit => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('staffnow_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const ADMIN_ROLES: { id: string; label: string; description: string; color: string }[] = [
  { id: 'super',      label: 'Super Admin',  description: 'Πλήρη δικαιώματα σε όλη την πλατφόρμα',     color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'operations', label: 'Operations',   description: 'Διαχείριση users, jobs, matches',          color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'moderation', label: 'Moderation',   description: 'Reports, messages, trust & safety',        color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'support',    label: 'Υποστήριξη',   description: 'Read-only για υποστήριξη',                 color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'finance',    label: 'Οικονομικά',   description: 'Συνδρομές και πληρωμές',                   color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'analytics',  label: 'Analytics',    description: 'Μόνο analytics και KPIs',                  color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
];

const roleMeta = (id: string) => ADMIN_ROLES.find((r) => r.id === id);

interface AdminRow {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  admin_role: string | null;
  status: string;
  created_at: string;
  last_login_at: string | null;
}

export default function AdminUsersPage() {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRoles, setShowRoles] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('operations');
  const [inviteInfo, setInviteInfo] = useState<{ email: string; url: string } | null>(null);

  const reload = async () => {
    setLoading(true);
    try {
      const res: any = await fetch(`${API_BASE}/admin/admins`, { headers: authHeaders() }).then((r) => r.json());
      if (res?.success) setRows(res.data?.items || []);
    } catch (err: any) {
      toast.error(err?.message || 'Αποτυχία φόρτωσης');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const addAdmin = async () => {
    if (!newEmail.trim()) { toast.error('Δώσε email'); return; }
    setAdding(true);
    try {
      const res = await fetch(`${API_BASE}/admin/admins`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail.trim(), admin_role: newRole }),
      });
      const data = (await res.json()) as any;
      if (data.success) {
        if (data.data?.mode === 'created' && data.data?.invite_url) {
          // New account auto-created — show the invite URL the caller shares.
          setInviteInfo({ email: data.data.email || newEmail.trim(), url: data.data.invite_url });
          toast.success('Δημιουργήθηκε νέος admin — αντιγράψε το invite link');
        } else {
          toast.success('Προστέθηκε στην ομάδα admin');
        }
        setNewEmail('');
        await reload();
      } else {
        toast.error(data?.error?.message || 'Σφάλμα');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Σφάλμα δικτύου');
    } finally { setAdding(false); }
  };

  const changeRole = async (id: string, admin_role: string) => {
    try {
      const res = await fetch(`${API_BASE}/admin/admins/${id}`, {
        method: 'PATCH',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_role }),
      });
      const data = (await res.json()) as any;
      if (data.success) { toast.success('Ο ρόλος ενημερώθηκε'); reload(); }
      else toast.error(data?.error?.message || 'Σφάλμα');
    } catch (err: any) { toast.error(err?.message || 'Σφάλμα'); }
  };

  const removeAdmin = async (id: string, email: string) => {
    if (!confirm(`Αφαίρεση του ${email} από την ομάδα admin;`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin/admins/${id}`, { method: 'DELETE', headers: authHeaders() });
      const data = (await res.json()) as any;
      if (data.success) { toast.success('Αφαιρέθηκε'); reload(); }
      else toast.error(data?.error?.message || 'Σφάλμα');
    } catch (err: any) { toast.error(err?.message || 'Σφάλμα'); }
  };

  const displayName = (a: AdminRow) => a.display_name || a.email.split('@')[0];
  const initials = (a: AdminRow) =>
    displayName(a).split(' ').slice(0, 2).map((p) => p[0] || '').join('').toUpperCase();

  return (
    <div className="space-y-4">
      {/* Top hero */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-lg">🛡</div>
          <div>
            <h2 className="font-bold text-blue-900">Role-based Access Control</h2>
            <p className="mt-1 text-xs text-blue-800">
              Κάθε admin έχει έναν ρόλο που περιγράφει το scope πρόσβασής του. Όλες οι αλλαγές καταγράφονται
              στο <code className="bg-blue-100 px-1 rounded">audit_logs</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Add admin form */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-2">Προσθήκη admin</h3>
        <p className="text-[11px] text-gray-500 mb-3">
          Ο χρήστης πρέπει να έχει ήδη λογαριασμό. Με την προσθήκη, αναβαθμίζεται σε admin με τον επιλεγμένο ρόλο.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            placeholder="email@staffnow.gr"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {ADMIN_ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          <button
            onClick={addAdmin}
            disabled={adding || !newEmail.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {adding ? 'Προσθήκη…' : '+ Προσθήκη'}
          </button>
        </div>
      </div>

      {/* Existing admins table */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">Ομάδα Admin ({rows.length})</h2>
          <p className="text-xs text-gray-500">
            {rows.filter((a) => a.status === 'active').length} ενεργοί
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-4 text-xs text-gray-500">Φόρτωση…</p>
        ) : rows.length === 0 ? (
          <p className="p-4 text-xs text-gray-500">Κανένα admin ακόμα.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {rows.map((a) => {
              const meta = roleMeta(a.admin_role || 'super');
              return (
                <div key={a.id} className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-sm">
                    {initials(a)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">{displayName(a)}</p>
                    <p className="text-xs text-gray-500 truncate">{a.email}</p>
                    {a.last_login_at && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Τελευταία σύνδεση: {new Date(a.last_login_at).toLocaleString('el-GR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                  <span className={`hidden sm:inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${meta?.color || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                    {meta?.label || a.admin_role}
                  </span>
                  <select
                    value={a.admin_role || 'super'}
                    onChange={(e) => changeRole(a.id, e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs"
                    title="Αλλαγή ρόλου"
                  >
                    {ADMIN_ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                  <button
                    onClick={() => removeAdmin(a.id, a.email)}
                    className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100"
                  >
                    Αφαίρεση
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Collapsible role explanation */}
      <button
        onClick={() => setShowRoles((s) => !s)}
        className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm hover:bg-gray-50"
      >
        <span className="text-sm font-bold text-gray-900">📖 Επεξήγηση ρόλων (RBAC schema)</span>
        <span className={`text-gray-400 transition-transform ${showRoles ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {showRoles && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="divide-y divide-gray-100">
            {ADMIN_ROLES.map((r) => (
              <div key={r.id} className="flex items-start gap-3 p-3">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold flex-shrink-0 ${r.color}`}>
                  {r.label}
                </span>
                <p className="text-xs text-gray-600">{r.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {inviteInfo && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setInviteInfo(null)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900">📨 Νέος admin δημιουργήθηκε</h3>
            <p className="mt-1 text-sm text-gray-600">
              Στείλε το παρακάτω invite link στον <span className="font-semibold">{inviteInfo.email}</span> για να ορίσει password.
              Ισχύει για 7 ημέρες.
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-gray-50 p-3">
              <input
                readOnly
                value={inviteInfo.url}
                className="flex-1 bg-transparent text-xs font-mono text-gray-700 outline-none"
                onFocus={(e) => e.currentTarget.select()}
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(inviteInfo.url);
                  toast.success('Αντιγράφηκε στο clipboard');
                }}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Αντιγραφή
              </button>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setInviteInfo(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Έγινε
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
