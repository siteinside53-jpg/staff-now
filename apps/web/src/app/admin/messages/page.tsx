'use client';

/**
 * /admin/messages — admin monitoring of conversations.
 *
 * The list view shows metadata. Clicking a row opens a drill-down modal with
 * the full message thread. Every drill-down access is logged by the backend
 * in audit_logs (action='conversation_view').
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DataTable, type Column } from '@/components/admin/ui/data-table';
import { FilterBar } from '@/components/admin/ui/filter-bar';
import { StatusPill } from '@/components/admin/ui/status-pill';
import { MetricCard } from '@/components/admin/ui/metric-card';
import { EmptyState } from '@/components/admin/ui/empty-state';
import { adminApi } from '@/components/admin/lib/admin-api';

/**
 * Parse a chat message body and render attachments inline.
 * Messages encode photos/files/calls as markdown-ish strings inside `content`:
 *   📷 [Φωτογραφία](https://...r2.dev/chat/.../foo.jpg)
 *   📎 [όνομα.pdf](https://...r2.dev/chat/.../bar.pdf)
 *   📹 Ξεκίνησε video κλήση: https://meet.jit.si/...
 * We detect these patterns and render them as actual UI instead of raw text.
 */
function MessageContent({ content, fromBusiness }: { content: string; fromBusiness: boolean }) {
  const trimmed = content.trim();
  const imgMatch = trimmed.match(/^📷\s*\[([^\]]+)\]\((https?:\/\/[^)]+)\)\s*$/);
  if (imgMatch) {
    const url = imgMatch[2];
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block">
        <img src={url} alt={imgMatch[1]} className="max-h-72 rounded-lg" loading="lazy" />
      </a>
    );
  }
  const fileMatch = trimmed.match(/^(📎|📄|🗂️)\s*\[([^\]]+)\]\((https?:\/\/[^)]+)\)\s*$/);
  if (fileMatch) {
    return (
      <a href={fileMatch[3]} target="_blank" rel="noreferrer"
         className={`inline-flex items-center gap-2 underline ${fromBusiness ? 'text-blue-700' : 'text-white'}`}>
        {fileMatch[1]} {fileMatch[2]}
      </a>
    );
  }
  const callMatch = trimmed.match(/^(📹|📞)\s*([^:]*):\s*(https?:\/\/\S+)\s*$/);
  if (callMatch) {
    return (
      <a href={callMatch[3]} target="_blank" rel="noreferrer"
         className={`inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-semibold ${
           fromBusiness ? 'bg-purple-50 text-purple-700' : 'bg-white/15 text-white'
         }`}>
        {callMatch[1]} {callMatch[2].trim() || 'Video κλήση'} →
      </a>
    );
  }
  return <p className="whitespace-pre-wrap break-words">{content}</p>;
}

interface Conversation {
  id: string;
  match_id: string;
  worker_id: string;
  business_id: string;
  status: 'active' | 'archived' | string;
  created_at: string;
  worker_name?: string;
  worker_avatar?: string;
  company_name?: string;
  business_logo?: string;
  message_count?: number;
  last_message_at?: string | null;
  reports_count?: number;
}

export default function MessagesPage() {
  const [rows, setRows] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | 'all'>('all');
  const [search, setSearch] = useState('');
  const [openConv, setOpenConv] = useState<Conversation | null>(null);
  const [convData, setConvData] = useState<{ conversation: any; messages: any[] } | null>(null);
  const [loadingConv, setLoadingConv] = useState(false);

  const openConversation = async (c: Conversation) => {
    setOpenConv(c);
    setConvData(null);
    setLoadingConv(true);
    try {
      const data = await adminApi.getConversationMessages(c.id);
      setConvData(data);
    } catch (err: any) {
      toast.error(err?.message || 'Αποτυχία φόρτωσης μηνυμάτων');
    } finally {
      setLoadingConv(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const { items } = await adminApi.getConversations({
          status: statusFilter || undefined,
          range: timeRange,
          search: search || undefined,
          limit: 100,
        });
        if (!cancelled) setRows(items as Conversation[]);
      } catch (err: any) {
        if (!cancelled) toast.error(err?.message || 'Αποτυχία φόρτωσης');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, search ? 300 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, timeRange, search]);

  const total = rows.length;
  const withMessages = rows.filter((c) => (c.message_count || 0) > 0).length;
  const withoutMessages = total - withMessages;
  const reported = rows.filter((c) => (c.reports_count || 0) > 0).length;

  const columns: Column<Conversation>[] = [
    {
      key: 'parties',
      header: 'Συμμετέχοντες',
      cell: (c) => (
        <div className="flex items-center gap-2 min-w-0">
          {c.business_logo ? (
            <img src={c.business_logo} alt="" className="h-7 w-7 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 text-[11px] font-bold text-purple-700">
              {c.company_name?.[0]?.toUpperCase() || '🏢'}
            </div>
          )}
          <span className="font-semibold text-gray-900 truncate text-sm">{c.company_name || '—'}</span>
          <span className="text-gray-300 text-base">↔</span>
          {c.worker_avatar ? (
            <img src={c.worker_avatar} alt="" className="h-7 w-7 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">
              {c.worker_name?.[0]?.toUpperCase() || '👤'}
            </div>
          )}
          <span className="font-semibold text-gray-900 truncate text-sm">{c.worker_name || '—'}</span>
        </div>
      ),
    },
    {
      key: 'activity',
      header: 'Δραστηριότητα',
      cell: (c) =>
        (c.message_count || 0) > 0 ? (
          <span className="flex items-center gap-1.5 text-xs text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {c.message_count} μηνύματα
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
            Χωρίς μήνυμα
          </span>
        ),
      className: 'hidden md:table-cell',
    },
    {
      key: 'reports',
      header: 'Αναφορές',
      cell: (c) =>
        (c.reports_count || 0) > 0 ? (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
            ⚠ {c.reports_count}
          </span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
      className: 'hidden md:table-cell',
    },
    {
      key: 'status',
      header: 'Κατάσταση',
      cell: (c) => <StatusPill status={c.status} size="sm" />,
      className: 'hidden lg:table-cell',
    },
    {
      key: 'last',
      header: 'Τελευταία δραστ.',
      cell: (c) => (
        <span className="text-xs text-gray-500">
          {c.last_message_at
            ? new Date(c.last_message_at).toLocaleString('el-GR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })
            : new Date(c.created_at).toLocaleDateString('el-GR', { day: '2-digit', month: 'short' })}
        </span>
      ),
      className: 'hidden lg:table-cell',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Privacy notice */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100">🔒</div>
          <div>
            <h3 className="text-sm font-bold text-blue-900">Trust &amp; Safety access</h3>
            <p className="mt-1 text-xs text-blue-800">
              Κλικ σε μια συνομιλία για να δείτε το πλήρες ιστορικό μηνυμάτων. Κάθε άνοιγμα καταγράφεται
              αυτόματα στο audit log (action <code>conversation_view</code>) — να χρησιμοποιείται μόνο για
              διερεύνηση αναφορών ή επιβολή Όρων Χρήσης.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Σύνολο συνομιλιών" value={total} icon="💬" tone="info" loading={loading} />
        <MetricCard label="Με μηνύματα" value={withMessages} icon="✓" tone="success" loading={loading} />
        <MetricCard label="Χωρίς μήνυμα" value={withoutMessages} icon="—" tone={withoutMessages > 0 ? 'warning' : 'default'} loading={loading} />
        <MetricCard label="Με αναφορές" value={reported} icon="🚨" tone={reported > 0 ? 'danger' : 'default'} loading={loading} />
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Αναζήτηση επιχείρησης ή εργαζόμενου..."
        filters={[
          {
            key: 'range',
            label: 'Διάστημα',
            value: timeRange,
            onChange: (v) => setTimeRange(v as any),
            options: [
              { value: 'today', label: 'Σήμερα' },
              { value: '7d', label: '7 ημέρες' },
              { value: '30d', label: '30 ημέρες' },
              { value: 'all', label: 'Όλα' },
            ],
          },
          {
            key: 'status',
            label: 'Κατάσταση',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: 'active', label: 'Ενεργές' },
              { value: 'archived', label: 'Αρχειοθ/νες' },
            ],
          },
        ]}
      />

      {!loading && rows.length === 0 ? (
        <EmptyState icon="💬" title="Δεν βρέθηκαν συνομιλίες" description="Δοκιμάστε άλλα φίλτρα ή διαφορετικό διάστημα." />
      ) : (
        <DataTable<Conversation>
          columns={columns}
          rows={rows}
          loading={loading}
          rowKey={(c) => c.id}
          onRowClick={openConversation}
        />
      )}

      {openConv && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setOpenConv(null)} />
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-2xl">
            <div className="border-b border-gray-100 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {openConv.business_logo ? (
                    <img src={openConv.business_logo} alt="" className="h-9 w-9 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-sm font-bold text-purple-700">
                      {openConv.company_name?.[0]?.toUpperCase() || '🏢'}
                    </div>
                  )}
                  <span className="text-sm font-bold text-gray-900 truncate">{openConv.company_name || '—'}</span>
                  <span className="text-gray-300">↔</span>
                  {openConv.worker_avatar ? (
                    <img src={openConv.worker_avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                      {openConv.worker_name?.[0]?.toUpperCase() || '👤'}
                    </div>
                  )}
                  <span className="text-sm font-bold text-gray-900 truncate">{openConv.worker_name || '—'}</span>
                </div>
                <button
                  onClick={() => setOpenConv(null)}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
                >
                  ✕
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-500">
                <StatusPill status={openConv.status} size="sm" />
                <span>·</span>
                <span>{openConv.message_count || 0} μηνύματα</span>
                <span>·</span>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  Η πρόσβαση καταγράφεται στο audit log
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-2">
              {loadingConv ? (
                <div className="text-center py-12 text-sm text-gray-500">Φόρτωση μηνυμάτων…</div>
              ) : !convData || convData.messages.length === 0 ? (
                <EmptyState icon="💬" title="Δεν υπάρχουν μηνύματα" description="Η συνομιλία είναι κενή." />
              ) : (
                convData.messages.map((m: any) => {
                  const fromBusiness = m.sender_id === openConv.business_id;
                  // Image-only messages render bare (no bubble background) so the
                  // photo doesn't get a coloured frame. Text/file/call messages
                  // keep the standard chat bubble.
                  const trimmed = (m.content || '').trim();
                  const isImageOnly = /^📷\s*\[([^\]]+)\]\((https?:\/\/[^)]+)\)\s*$/.test(trimmed);
                  return (
                    <div key={m.id} className={`flex ${fromBusiness ? 'justify-start' : 'justify-end'}`}>
                      {isImageOnly ? (
                        <div className="max-w-[80%]">
                          <MessageContent content={m.content || ''} fromBusiness={fromBusiness} />
                          <p className={`mt-1 text-[10px] text-gray-400 ${fromBusiness ? 'text-left' : 'text-right'}`}>
                            {new Date(m.created_at).toLocaleString('el-GR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            {m.read_at && !fromBusiness && ' · Διαβάστηκε'}
                          </p>
                        </div>
                      ) : (
                        <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                          fromBusiness ? 'bg-white border border-gray-200 text-gray-900' : 'bg-blue-600 text-white'
                        }`}>
                          <MessageContent content={m.content || ''} fromBusiness={fromBusiness} />
                          <p className={`mt-0.5 text-[10px] ${fromBusiness ? 'text-gray-400' : 'text-blue-100'}`}>
                            {new Date(m.created_at).toLocaleString('el-GR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            {m.read_at && !fromBusiness && ' · Διαβάστηκε'}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
