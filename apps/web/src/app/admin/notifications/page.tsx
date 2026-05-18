'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { SeverityBadge, type Severity } from '@/components/admin/ui/severity-badge';
import { FilterBar } from '@/components/admin/ui/filter-bar';
import { EmptyState } from '@/components/admin/ui/empty-state';
import { adminApi } from '@/components/admin/lib/admin-api';

interface SysEvent {
  id: string;
  type: string;
  title: string;
  body: string;
  severity: Severity;
  read: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<string, string> = {
  report: '🚨',
  payment_failed: '💳',
  suspicious: '🔒',
  signup: '🆕',
  churn: '📉',
  spike: '📈',
};

const TYPE_LABELS: Record<string, string> = {
  report: 'Αναφορά',
  payment_failed: 'Αποτυχία πληρωμής',
  suspicious: 'Διαχειριστική',
  signup: 'Εγγραφή',
  churn: 'Churn',
  spike: 'Spike',
};

export default function NotificationsPage() {
  const [events, setEvents] = useState<SysEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [showRead, setShowRead] = useState('all');

  useEffect(() => {
    setLoading(true);
    adminApi
      .getEvents(50)
      .then((items) => setEvents(items as SysEvent[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = events.filter((e) => {
    if (typeFilter && e.type !== typeFilter) return false;
    if (severityFilter && e.severity !== severityFilter) return false;
    if (showRead === 'unread' && e.read) return false;
    if (showRead === 'read' && !e.read) return false;
    return true;
  });

  const unreadCount = events.filter((e) => !e.read).length;

  const markRead = async (id: string) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, read: true } : e)));
    try { await adminApi.ackEvent(id); }
    catch (err: any) {
      toast.error(err?.message || 'Σφάλμα');
      // revert on failure
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, read: false } : e)));
    }
  };

  const markAllRead = async () => {
    const unreadIds = events.filter((e) => !e.read).map((e) => e.id);
    if (unreadIds.length === 0) return;
    setEvents((prev) => prev.map((e) => ({ ...e, read: true })));
    try {
      const res = await adminApi.ackAllEvents(unreadIds);
      toast.success(`Σημειώθηκαν ${res.acked} ως αναγνωσμένες`);
    } catch (err: any) {
      toast.error(err?.message || 'Σφάλμα');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">🔔</div>
          <div>
            <p className="font-bold text-gray-900">{unreadCount} μη αναγνωσμένες ειδοποιήσεις</p>
            <p className="text-xs text-gray-500">System events από real-time activity</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
            Σημείωση όλων ως αναγνωσμένες
          </button>
        )}
      </div>

      <FilterBar
        filters={[
          {
            key: 'type',
            label: 'Τύπος',
            value: typeFilter,
            onChange: setTypeFilter,
            options: Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label })),
          },
          {
            key: 'severity',
            label: 'Σοβαρότητα',
            value: severityFilter,
            onChange: setSeverityFilter,
            options: [
              { value: 'critical', label: 'Κρίσιμη' },
              { value: 'high', label: 'Υψηλή' },
              { value: 'medium', label: 'Μέση' },
              { value: 'low', label: 'Χαμηλή' },
            ],
          },
          {
            key: 'read',
            label: 'Ανάγνωση',
            value: showRead,
            onChange: setShowRead,
            options: [
              { value: 'unread', label: 'Μη αναγνωσμένες' },
              { value: 'read', label: 'Αναγνωσμένες' },
            ],
          },
        ]}
      />

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl border border-gray-100 bg-white animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="🔔" title="Καμία ειδοποίηση" description="Όλα είναι ήσυχα στην πλατφόρμα" />
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => (
            <div
              key={e.id}
              className={`flex items-start gap-3 rounded-xl border p-4 shadow-sm transition-colors ${
                e.read ? 'border-gray-100 bg-white' : 'border-blue-200 bg-blue-50/50'
              }`}
            >
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-white text-xl border border-gray-100 shadow-sm">
                {TYPE_ICONS[e.type] || '🔔'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-900">{e.title}</h3>
                    <SeverityBadge severity={e.severity} size="sm" />
                    {!e.read && <span className="h-2 w-2 rounded-full bg-blue-500" />}
                  </div>
                  <span className="flex-shrink-0 text-[11px] text-gray-400">
                    {new Date(e.createdAt).toLocaleString('el-GR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{e.body}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                    {TYPE_LABELS[e.type] || e.type}
                  </span>
                  {!e.read && (
                    <button onClick={() => markRead(e.id)} className="text-[11px] font-semibold text-blue-600 hover:underline">
                      Σημείωση ως αναγνωσμένη
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
