'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { MetricCard } from '@/components/admin/ui/metric-card';
import { SeverityBadge, type Severity } from '@/components/admin/ui/severity-badge';
import { StatusPill } from '@/components/admin/ui/status-pill';
import { EmptyState } from '@/components/admin/ui/empty-state';
import { ConfirmDialog } from '@/components/admin/ui/confirm-dialog';
import { adminApi } from '@/components/admin/lib/admin-api';
import { REPORT_TYPES_EL, REPORT_SEVERITY } from '@/components/admin/lib/mock-data';

interface Report {
  id: string;
  type: string;
  reason: string;
  status: string;
  created_at: string;
  reporter_id: string;
  reported_id: string;
  reporter_email?: string;
  reported_email?: string;
  reporter_first_name?: string;
  reporter_last_name?: string;
  reporter_company?: string;
  reported_first_name?: string;
  reported_last_name?: string;
  reported_company?: string;
}

type Tab = 'pending' | 'resolved' | 'dismissed' | 'action_taken';

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('pending');
  const [rows, setRows] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Report | null>(null);
  const [confirm, setConfirm] = useState<{ decision: 'resolved' | 'dismissed' | 'action_taken'; action?: 'warn' | 'suspend' } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [counts, setCounts] = useState({ pending: 0, resolved: 0, dismissed: 0, action_taken: 0 });
  const [stats7d, setStats7d] = useState<{ resolved: number; dismissed: number; actionTaken: number; avgHours: number | null }>({
    resolved: 0,
    dismissed: 0,
    actionTaken: 0,
    avgHours: null,
  });

  const loadStats = async () => {
    try {
      const stats: any = await adminApi.getStats();
      const r = stats?.reports || {};
      setCounts({
        pending: r.pending || 0,
        resolved: r.resolved || 0,
        dismissed: r.dismissed || 0,
        action_taken: r.action_taken || 0,
      });
      setStats7d({
        resolved: r.resolved7d || 0,
        dismissed: r.dismissed7d || 0,
        actionTaken: r.actionTaken7d || 0,
        avgHours: typeof r.avgResponseHours === 'number' ? r.avgResponseHours : null,
      });
    } catch { /* keep zeros */ }
  };

  const load = async (status: Tab = tab) => {
    setLoading(true);
    try {
      const { items } = await adminApi.getReports(status);
      setRows(items);
    } catch (err: any) {
      toast.error(err?.message || 'Αποτυχία φόρτωσης');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(tab);
  }, [tab]);

  useEffect(() => {
    loadStats();
  }, []);

  // Format average response time as Xω/Xλ — null when nothing's been reviewed yet.
  const fmtAvg = (h: number | null) => {
    if (h == null) return '—';
    if (h < 1) return `${Math.round(h * 60)} λεπτά`;
    if (h < 24) return `${h.toFixed(1)} ώρες`;
    return `${(h / 24).toFixed(1)} ημέρες`;
  };

  const displayName = (type: 'reporter' | 'reported', r: Report) => {
    if (type === 'reporter') return r.reporter_company || [r.reporter_first_name, r.reporter_last_name].filter(Boolean).join(' ') || r.reporter_email || '—';
    return r.reported_company || [r.reported_first_name, r.reported_last_name].filter(Boolean).join(' ') || r.reported_email || '—';
  };

  const getSeverity = (type: string): Severity => REPORT_SEVERITY[type] || 'low';

  const handleDecision = async (reason?: string) => {
    if (!selected || !confirm) return;
    setActionLoading(true);
    try {
      await adminApi.reviewReport(selected.id, confirm.decision, confirm.action, reason);
      const msg =
        confirm.action === 'suspend'
          ? 'Ο χρήστης ανεστάλη και η αναφορά επιλύθηκε'
          : confirm.action === 'warn'
            ? 'Στάλθηκε προειδοποίηση στον χρήστη'
            : confirm.decision === 'dismissed'
              ? 'Η αναφορά απορρίφθηκε'
              : 'Η αναφορά επιλύθηκε';
      toast.success(msg);
      setConfirm(null);
      setSelected(null);
      await Promise.all([load(), loadStats()]);
    } catch (err: any) {
      toast.error(err?.message || 'Σφάλμα κατά την αξιολόγηση');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Εκκρεμείς" value={counts.pending} icon="⏳" tone={counts.pending > 0 ? 'warning' : 'default'} />
        <MetricCard label="Επιλύθηκαν (7d)" value={stats7d.resolved + stats7d.actionTaken} icon="✓" tone="success" />
        <MetricCard label="Απορρίφθηκαν (7d)" value={stats7d.dismissed} icon="✕" tone="default" />
        <MetricCard label="Μέσος χρόνος" value={fmtAvg(stats7d.avgHours)} icon="⏱" context="απόκριση moderation" tone="info" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
        {([
          { id: 'pending', label: 'Εκκρεμείς', icon: '⏳' },
          { id: 'action_taken', label: 'Λήφθηκαν μέτρα', icon: '⚡' },
          { id: 'resolved', label: 'Επιλύθηκαν', icon: '✓' },
          { id: 'dismissed', label: 'Απορρίφθηκαν', icon: '✕' },
        ] as { id: Tab; label: string; icon: string }[]).map((t) => {
          const n = counts[t.id];
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="mr-1">{t.icon}</span>
              {t.label}
              {n > 0 && (
                <span className={`ml-1.5 inline-flex items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                  isActive ? 'bg-white/20 text-white' : t.id === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Reports grid */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl border border-gray-100 bg-white animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon="🚨" title="Καμία αναφορά" description={tab === 'pending' ? 'Όλα καθαρά! Καμία εκκρεμής αναφορά.' : 'Δεν υπάρχουν αναφορές σε αυτή την κατηγορία'} />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {rows.map((r) => (
            <div
              key={r.id}
              onClick={() => setSelected(r)}
              className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={getSeverity(r.type)} size="sm" />
                  <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                    {REPORT_TYPES_EL[r.type] || r.type}
                  </span>
                </div>
                <StatusPill status={r.status} size="sm" />
              </div>

              <div className="mb-3">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <span>Αναφέρθηκε:</span>
                  <span className="font-semibold text-gray-900">{displayName('reported', r)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>Από:</span>
                  <span className="text-gray-700">{displayName('reporter', r)}</span>
                </div>
              </div>

              {r.reason && (
                <p className="mb-3 line-clamp-2 rounded-lg bg-gray-50 p-2.5 text-xs text-gray-600 italic">
                  "{r.reason}"
                </p>
              )}

              <div className="flex items-center justify-between text-[10px] text-gray-400">
                <span className="font-mono">#{r.id.substring(0, 10)}</span>
                <span>{new Date(r.created_at).toLocaleString('el-GR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Report detail drawer */}
      {selected && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSelected(null)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto bg-white shadow-2xl">
            <div className="border-b border-gray-100 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <SeverityBadge severity={getSeverity(selected.type)} />
                    <StatusPill status={selected.status} size="sm" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">{REPORT_TYPES_EL[selected.type] || selected.type}</h2>
                  <p className="text-xs font-mono text-gray-400 mt-1">#{selected.id}</p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-5 p-6">
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Αναφερθέντας χρήστης</p>
                <div className="rounded-lg border border-red-100 bg-red-50 p-3">
                  <p className="font-semibold text-red-900">{displayName('reported', selected)}</p>
                  <p className="text-xs text-red-700">{selected.reported_email}</p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Χρήστης που ανέφερε</p>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <p className="font-semibold text-gray-900">{displayName('reporter', selected)}</p>
                  <p className="text-xs text-gray-600">{selected.reporter_email}</p>
                </div>
              </div>

              {selected.reason && (
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Λόγος</p>
                  <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                    {selected.reason}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Ημερομηνία</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {new Date(selected.created_at).toLocaleDateString('el-GR')}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Ώρα</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {new Date(selected.created_at).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>

            {selected.status === 'pending' && (
              <div className="sticky bottom-0 border-t border-gray-100 bg-gray-50 p-4 space-y-2">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Λήψη απόφασης</p>
                <button
                  onClick={() => setConfirm({ decision: 'action_taken', action: 'suspend' })}
                  className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
                >
                  🚫 Αναστολή χρήστη + Επίλυση
                </button>
                <button
                  onClick={() => setConfirm({ decision: 'action_taken', action: 'warn' })}
                  className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
                >
                  ⚠ Προειδοποίηση
                </button>
                <button
                  onClick={() => setConfirm({ decision: 'resolved' })}
                  className="w-full rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  ✓ Επίλυση (χωρίς ενέργεια)
                </button>
                <button
                  onClick={() => setConfirm({ decision: 'dismissed' })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  ✕ Απόρριψη αναφοράς
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {confirm && selected && (
        <ConfirmDialog
          open
          title={
            confirm.decision === 'action_taken' && confirm.action === 'suspend'
              ? 'Αναστολή χρήστη'
              : confirm.decision === 'action_taken' && confirm.action === 'warn'
                ? 'Αποστολή προειδοποίησης'
                : confirm.decision === 'resolved'
                  ? 'Επίλυση αναφοράς'
                  : 'Απόρριψη αναφοράς'
          }
          description="Η ενέργεια θα καταγραφεί στο audit log. Ο χρήστης που ανέφερε θα ειδοποιηθεί."
          tone={confirm.action === 'suspend' || confirm.decision === 'dismissed' ? 'danger' : 'primary'}
          reasonRequired={confirm.action === 'suspend' || confirm.action === 'warn'}
          loading={actionLoading}
          onConfirm={handleDecision}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
