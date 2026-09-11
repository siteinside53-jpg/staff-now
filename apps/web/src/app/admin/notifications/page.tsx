'use client';

/**
 * Ειδοποιήσεις ομάδας — ΟΛΑ όσα έγιναν (πίνακας admin_events), με φίλτρα,
 * και οι ρυθμίσεις για το τι φτάνει στο κινητό του κάθε διαχειριστή.
 *
 * Πριν: 20 το πολύ γραμμές συνθεμένες από τέσσερα ερωτήματα, οι εγγραφές
 * πάντα «διαβασμένες», και τίποτα δεν έφτανε σε κινητό.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { SeverityBadge, type Severity } from '@/components/admin/ui/severity-badge';
import { FilterBar } from '@/components/admin/ui/filter-bar';
import { EmptyState } from '@/components/admin/ui/empty-state';
import { adminApi } from '@/components/admin/lib/admin-api';
import { subscribeToPush } from '@/components/push-optin';
import { fmtWhen } from '@/components/admin/lib/activity-labels';

interface AdminEvent {
  id: string;
  type: string;
  title: string;
  body: string;
  severity: Severity;
  read: boolean;
  url: string | null;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  signup: 'Εγγραφή',
  account_deleted: 'Διαγραφή λογαριασμού',
  contact: 'Επικοινωνία',
  feedback: 'Αξιολόγηση πλατφόρμας',
  visitor: 'Νέος επισκέπτης',
  visitor_left: 'Επισκέπτης έφυγε',
  payment_failed: 'Αποτυχία πληρωμής',
  report: 'Αναφορά',
  verification: 'Επαλήθευση',
  error: 'Σφάλμα',
};

const TYPE_ICONS: Record<string, string> = {
  signup: '🆕',
  account_deleted: '🗑️',
  contact: '✉️',
  feedback: '⭐',
  visitor: '👋',
  visitor_left: '🚪',
  payment_failed: '💳',
  report: '🚨',
  verification: '✅',
  error: '🐞',
};

/** Οι διακόπτες των ρυθμίσεων, με τη σειρά που έχουν νόημα. */
const SETTINGS: { key: string; label: string; hint: string }[] = [
  { key: 'registrations', label: 'Νέες εγγραφές', hint: 'Κάθε νέος λογαριασμός, με email, ρόλο, πόλη και από πού ήρθε.' },
  { key: 'deletions', label: 'Διαγραφές λογαριασμών', hint: 'Ποιος διέγραψε τον λογαριασμό του και πότε.' },
  { key: 'contact', label: 'Μηνύματα επικοινωνίας', hint: 'Φόρμα επικοινωνίας και εγγραφές newsletter.' },
  { key: 'feedback', label: 'Αξιολογήσεις πλατφόρμας', hint: '«Πείτε μας την εμπειρία σας».' },
  { key: 'reports', label: 'Αναφορές & επαληθεύσεις', hint: 'Αναφορές χρηστών και νέα αιτήματα επαλήθευσης.' },
  { key: 'payments', label: 'Αποτυχίες πληρωμών', hint: 'Όταν το Stripe δεν κατάφερε να χρεώσει.' },
  { key: 'errors', label: 'Σφάλματα server', hint: 'Σφάλματα 5xx, με φρένο 10 λεπτών ανά διαδρομή.' },
  { key: 'visitors', label: 'Κάθε νέος επισκέπτης', hint: 'Π.χ. «Νέος επισκέπτης από Θεσσαλονίκη (Google)». Πολλές ειδοποιήσεις — μόνο αν το θέλεις πραγματικά.' },
  { key: 'visitor_left', label: 'Όταν φεύγει επισκέπτης', hint: 'Π.χ. «έφυγε μετά από 2 λεπτά, 4 σελίδες, χωρίς εγγραφή». Ελέγχεται κάθε 10 λεπτά.' },
];

export default function NotificationsPage() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [showRead, setShowRead] = useState('all');
  const [q, setQ] = useState('');

  const load = useCallback(
    async (p: number, append: boolean) => {
      setLoading(true);
      try {
        const res = await adminApi.getEvents({ page: p, limit: 50, type: typeFilter, unread: showRead === 'unread' ? '1' : '', q });
        setEvents((prev) => (append ? [...prev, ...res.items] : res.items));
        setUnread(res.unread);
        setHasMore(res.hasMore);
        setPage(p);
      } catch (err: any) {
        toast.error(err?.message || 'Δεν φορτώθηκαν οι ειδοποιήσεις');
      } finally {
        setLoading(false);
      }
    },
    [typeFilter, showRead, q],
  );

  useEffect(() => {
    const t = setTimeout(() => load(1, false), q ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const markRead = async (id: string) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, read: true } : e)));
    setUnread((u) => Math.max(0, u - 1));
    try {
      await adminApi.ackEvent(id);
    } catch (err: any) {
      toast.error(err?.message || 'Σφάλμα');
    }
  };

  const markAllRead = async () => {
    try {
      const res = await adminApi.ackAllEvents();
      toast.success(`Σημειώθηκαν ${res.acked} ως αναγνωσμένες`);
      await load(1, false);
    } catch (err: any) {
      toast.error(err?.message || 'Σφάλμα');
    }
  };

  const visible = events.filter((e) => (showRead === 'read' ? e.read : true));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">🔔</div>
          <div>
            <p className="font-bold text-gray-900">{unread} μη αναγνωσμένες</p>
            <p className="text-xs text-gray-500">Εγγραφές, διαγραφές, μηνύματα, επισκέπτες, πληρωμές, αναφορές, σφάλματα</p>
          </div>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
            Σημείωση όλων ως αναγνωσμένες
          </button>
        )}
      </div>

      <PhoneAlertsCard />

      <FilterBar
        search={q}
        onSearchChange={setQ}
        searchPlaceholder="Αναζήτηση σε τίτλο, κείμενο, email…"
        filters={[
          {
            key: 'type',
            label: 'Τύπος',
            value: typeFilter,
            onChange: setTypeFilter,
            options: Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label })),
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

      {loading && events.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-gray-100 bg-white" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState icon="🔔" title="Καμία ειδοποίηση" description="Όλα είναι ήσυχα στην πλατφόρμα" />
      ) : (
        <div className="space-y-2">
          {visible.map((e) => (
            <div
              key={e.id}
              className={`flex items-start gap-3 rounded-xl border p-4 shadow-sm transition-colors ${
                e.read ? 'border-gray-100 bg-white' : 'border-blue-200 bg-blue-50/50'
              }`}
            >
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-gray-100 bg-white text-xl shadow-sm">
                {TYPE_ICONS[e.type] || '🔔'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-gray-900">{e.title}</h3>
                    <SeverityBadge severity={e.severity} size="sm" />
                    {!e.read && <span className="h-2 w-2 rounded-full bg-blue-500" />}
                  </div>
                  <span className="flex-shrink-0 text-[11px] text-gray-400">{fmtWhen(e.createdAt)}</span>
                </div>
                {e.body && <p className="text-sm text-gray-600">{e.body}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">{TYPE_LABELS[e.type] || e.type}</span>
                  {e.url && (
                    <Link href={e.url} onClick={() => !e.read && markRead(e.id)} className="text-[11px] font-semibold text-blue-600 hover:underline">
                      Άνοιγμα →
                    </Link>
                  )}
                  {!e.read && (
                    <button onClick={() => markRead(e.id)} className="text-[11px] font-semibold text-gray-500 hover:underline">
                      Σημείωση ως αναγνωσμένη
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {hasMore && (
            <div className="p-2 text-center">
              <button onClick={() => load(page + 1, true)} disabled={loading} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                {loading ? 'Φόρτωση…' : 'Περισσότερα'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * «Ειδοποιήσεις στο κινητό» — ο διαχειριστής ενεργοποιεί push στη συσκευή που
 * χρησιμοποιεί (π.χ. το κινητό, με το site προσθεμένο στην αρχική οθόνη) και
 * διαλέγει τι θέλει να του έρχεται.
 */
function PhoneAlertsCard() {
  const [settings, setSettings] = useState<Record<string, number> | null>(null);
  const [devices, setDevices] = useState(0);
  const [saving, setSaving] = useState(false);
  const [permission, setPermission] = useState<string>('default');

  const load = useCallback(async () => {
    try {
      const res = await adminApi.getAlertSettings();
      setSettings(res.settings);
      setDevices(res.pushDevices);
    } catch {}
  }, []);
  useEffect(() => {
    load();
    if (typeof window !== 'undefined' && 'Notification' in window) setPermission(Notification.permission);
  }, [load]);

  const enable = async () => {
    try {
      if (!('Notification' in window)) throw new Error('Ο browser δεν υποστηρίζει ειδοποιήσεις.');
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') throw new Error('Δεν δόθηκε άδεια για ειδοποιήσεις.');
      await subscribeToPush();
      toast.success('Η συσκευή γράφτηκε. Στείλε δοκιμή για να βεβαιωθείς.');
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Δεν ενεργοποιήθηκε');
    }
  };

  const test = async () => {
    try {
      await adminApi.testAlert();
      toast.success('Στάλθηκε δοκιμαστική ειδοποίηση.');
    } catch (err: any) {
      toast.error(err?.message || 'Σφάλμα');
    }
  };

  const toggle = async (key: string) => {
    if (!settings) return;
    const next = { ...settings, [key]: settings[key] ? 0 : 1 };
    setSettings(next);
    setSaving(true);
    try {
      await adminApi.saveAlertSettings(next);
    } catch (err: any) {
      toast.error(err?.message || 'Δεν αποθηκεύτηκε');
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-gray-900">📱 Ειδοποιήσεις στο κινητό σου</h3>
          <p className="text-xs text-gray-500">
            Άνοιξε το staffnow.gr/admin από το κινητό, πρόσθεσέ το στην αρχική οθόνη, και πάτησε «Ενεργοποίηση» εκεί.
            {devices > 0 ? ` Γραμμένες συσκευές: ${devices}.` : ' Καμία συσκευή ακόμη.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={enable} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">
            {permission === 'granted' ? 'Ξαναγράψε αυτή τη συσκευή' : 'Ενεργοποίηση σε αυτή τη συσκευή'}
          </button>
          <button onClick={test} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
            Δοκιμή
          </button>
        </div>
      </div>
      {permission === 'denied' && (
        <p className="mt-2 text-xs text-red-600">Ο browser έχει μπλοκάρει τις ειδοποιήσεις για το staffnow.gr. Άλλαξέ το από τις ρυθμίσεις του site.</p>
      )}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {SETTINGS.map((s) => (
          <label key={s.key} className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-100 p-3 hover:bg-gray-50">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={!!settings?.[s.key]}
              onChange={() => toggle(s.key)}
              disabled={!settings || saving}
            />
            <span>
              <span className="block text-sm font-semibold text-gray-900">{s.label}</span>
              <span className="block text-xs text-gray-500">{s.hint}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
