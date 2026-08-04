'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { WorkerProfilePanel } from '@/components/dashboard/worker-profile-panel';
import { BusinessProfilePanel } from '@/components/dashboard/business-profile-panel';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';

export default function MatchesPage() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [viewingBusinessId, setViewingBusinessId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [tab, setTab] = useState<'active' | 'archived' | 'blocked'>('active');

  const isWorker = user?.role === 'worker';

  useEffect(() => {
    async function fetchMatches() {
      try {
        const res = await api.matches.list() as any;
        const items = res?.data || [];
        setMatches(Array.isArray(items) ? items : []);
      } catch { setMatches([]); }
      finally { setLoading(false); }
    }
    fetchMatches();
  }, []);

  const matchAction = async (matchId: string, action: 'archive' | 'restore' | 'delete') => {
    const token = localStorage.getItem('staffnow_token');
    const base = 'https://staffnow-api-production.siteinside53.workers.dev';
    const headers: any = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    try {
      if (action === 'archive') {
        await fetch(`${base}/matches/${matchId}/archive`, { method: 'POST', headers });
        setMatches((prev) => prev.map((m) => m.id === matchId ? { ...m, status: 'archived' } : m));
        toast.success('Αρχειοθετήθηκε');
      } else if (action === 'restore') {
        const res = await fetch(`${base}/matches/${matchId}/restore`, { method: 'POST', headers });
        const data = await res.json() as any;
        if (data.success) {
          setMatches((prev) => prev.map((x) => x.id === matchId ? { ...x, status: 'active', isBlocked: false, blockedByMe: false } : x));
          toast.success('Επαναφέρθηκε');
        } else { toast.error(data.error?.message || 'Σφάλμα'); }
      } else if (action === 'delete') {
        if (!confirm('Σίγουρα; Θα αφαιρεθεί και από το ενδιαφέρον.')) return;
        const m = matches.find((x) => x.id === matchId);
        // 1) Permanently remove the match (server-side).
        const res = await fetch(`${base}/matches/${matchId}`, { method: 'DELETE', headers });
        const data = (await res.json()) as any;
        if (!data.success) {
          toast.error(data.error?.message || 'Αποτυχία διαγραφής');
          return;
        }
        // 2) Best-effort: hide the linked conversation too.
        if (m?.conversation_id) {
          await fetch(`${base}/conversations/${m.conversation_id}`, { method: 'DELETE', headers }).catch(() => {});
        }
        setMatches((prev) => prev.filter((x) => x.id !== matchId));
        toast.success('Διαγράφηκε');
      }
    } catch { toast.error('Σφάλμα'); }
    setMenuId(null);
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  const activeCount = matches.filter((m) => m.status === 'active' && !m.isBlocked).length;

  // Filter matches by tab
  const filtered = matches.filter((m) => {
    if (tab === 'blocked') return m.isBlocked;
    if (tab === 'archived') return m.status === 'archived' && !m.isBlocked;
    return m.status === 'active' && !m.isBlocked;
  });

  return (
    <div>
      {/*
        Header σε στυλ app2 (version5) αλλά στα χρώματα του StaffNow: μπλε→indigo
        αντί για ροζ, και ✨ αντί για καρδιά.
      */}
      <div className="mb-4 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-6 text-white shadow-sm">
        {/*
          Στο κινητό ο τίτλος δεν χωράει δίπλα στο κουμπί, γι' αυτό στοιβάζονται
          κάθετα και το κουμπί πιάνει όλο το πλάτος. Από sm και πάνω μπαίνουν
          δίπλα-δίπλα.
        */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold sm:text-3xl">✨ Τα Matches μου</h1>
            <p className="mt-1 text-sm text-blue-100">
              {matches.length > 0
                ? `${activeCount} ενεργά · ${matches.length} συνολικά`
                : 'Δεν έχεις matches ακόμα'}
            </p>
          </div>
          <Link
            href="/dashboard/discover"
            className="inline-flex flex-shrink-0 items-center justify-center rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/30 backdrop-blur transition-colors hover:bg-white/25"
          >
            Ανακάλυψη
          </Link>
        </div>
      </div>

      {/* Tabs — pill style όπως στο app2 */}
      <div className="mb-6 flex rounded-full bg-gray-100 p-1">
        {[
          { key: 'active' as const, label: 'Ενεργά', count: activeCount },
          { key: 'archived' as const, label: 'Αρχείο', count: matches.filter((m) => m.status === 'archived' && !m.isBlocked).length },
          { key: 'blocked' as const, label: 'Blocked', count: matches.filter((m) => m.isBlocked).length },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`min-w-0 flex-1 rounded-full py-2 text-xs font-bold transition-all sm:text-sm ${tab === t.key ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}{t.count > 0 && <span className="ml-1 font-semibold opacity-70">({t.count})</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={tab === 'active' ? 'Δεν έχεις ενεργά matches' : tab === 'archived' ? 'Δεν υπάρχουν αρχειοθετημένα' : 'Δεν υπάρχουν blocked'}
          description={tab === 'active' ? 'Κάνε like στην Ανακάλυψη για νέα matches!' : ''}
        />
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/*
            grid-cols-[minmax(0,1fr)]: στο κινητό η μία στήλη είναι «auto», δηλαδή
            δεν στενεύει κάτω από το περιεχόμενό της κι η κάρτα ξεπερνούσε την οθόνη.
            Τα sm:/lg: της Tailwind χρησιμοποιούν ήδη minmax(0,1fr) και ήταν εντάξει.
          */}
          {filtered.map((m: any) => {
            const name = isWorker
              ? (m.business_name || m.company_name || 'Επιχείρηση')
              : (m.worker_name || m.full_name || 'Εργαζόμενος');
            const avatar = isWorker ? m.business_logo : m.worker_avatar;
            const jobTitle = m.job_title;
            const matchDate = m.matched_at || m.created_at;

            return (
              <Card key={m.id} className={`transition-shadow hover:shadow-md ${m.isBlocked ? 'opacity-60' : ''}`}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    {avatar ? (
                      <img src={avatar} alt="" className="h-12 w-12 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 text-lg font-bold text-blue-600">
                        {name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="truncate font-semibold text-gray-900">{name}</h3>
                      {jobTitle && <p className="truncate text-sm text-gray-600">{jobTitle}</p>}
                      {isWorker && (
                        <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                          {m.business_region && <span className="text-gray-400">📍 {m.business_region}</span>}
                          {m.staff_housing === 1 && <span className="text-emerald-600">🏠</span>}
                          {m.meals_provided === 1 && <span className="text-emerald-600">🍽️</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {m.isBlocked ? (
                        <Badge className="bg-red-100 text-red-700 border-red-200">🚫 Blocked</Badge>
                      ) : (
                        <Badge variant={m.status === 'active' ? 'default' : 'secondary'}>
                          {m.status === 'active' ? 'Ενεργό' : 'Αρχείο'}
                        </Badge>
                      )}
                      {/* 3-dot menu */}
                      <div className="relative">
                        <button onClick={() => setMenuId(menuId === m.id ? null : m.id)}
                          className="rounded-lg p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" /></svg>
                        </button>
                        {menuId === m.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuId(null)} />
                            <div className="absolute right-0 top-8 z-20 w-40 rounded-xl bg-white border border-gray-200 shadow-xl overflow-hidden">
                              {m.status === 'active' && !m.isBlocked && (
                                <button onClick={() => matchAction(m.id, 'archive')}
                                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                                  📦 Αρχειοθέτηση
                                </button>
                              )}
                              {(m.status === 'archived' || m.isBlocked) && (
                                <button onClick={() => matchAction(m.id, 'restore')}
                                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50">
                                  ↩️ Επαναφορά
                                </button>
                              )}
                              <button onClick={() => matchAction(m.id, 'delete')}
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100">
                                🗑️ Διαγραφή
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {matchDate && (
                    <p className="mt-3 text-xs text-gray-400">
                      Match: {new Date(matchDate).toLocaleDateString('el-GR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => {
                        if (isWorker) {
                          setViewingBusinessId(m.business_id);
                        } else {
                          setViewingProfileId(m.worker_id);
                        }
                      }}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      👤 Προφίλ
                    </button>
                    {m.conversation_id && !m.isBlocked ? (
                      <Link href={`/dashboard/messages?id=${m.conversation_id}`} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                        💬 Μήνυμα
                      </Link>
                    ) : m.isBlocked ? (
                      <span className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-400">
                        🚫 Blocked
                      </span>
                    ) : (
                      <Link href="/dashboard/messages" className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                        💬 Chat
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {viewingProfileId && (
        <WorkerProfilePanel
          workerId={viewingProfileId}
          onClose={() => setViewingProfileId(null)}
        />
      )}

      {viewingBusinessId && (
        <BusinessProfilePanel
          businessUserId={viewingBusinessId}
          onClose={() => setViewingBusinessId(null)}
        />
      )}
    </div>
  );
}
