'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { WorkerProfilePanel } from '@/components/dashboard/worker-profile-panel';
import { EmptyState } from '@/components/ui/empty-state';

export default function MatchesPage() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);

  const isWorker = user?.role === 'worker';

  useEffect(() => {
    async function fetchMatches() {
      try {
        const res = await api.matches.list() as any;
        const items = res?.data || [];
        setMatches(Array.isArray(items) ? items : []);
      } catch {
        setMatches([]);
      } finally {
        setLoading(false);
      }
    }
    fetchMatches();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Τα Matches μου</h1>
          <p className="mt-1 text-gray-600">
            {matches.length > 0 ? `${matches.length} matches` : 'Δεν έχεις matches ακόμα'}
          </p>
        </div>
        <Link href="/dashboard/discover" className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Ανακάλυψη
        </Link>
      </div>

      {matches.length === 0 ? (
        <EmptyState
          title="Δεν έχεις matches ακόμα"
          description={isWorker
            ? 'Κάνε like σε θέσεις εργασίας στην Ανακάλυψη. Αν η επιχείρηση σε κάνει κι αυτή like, θα γίνει match!'
            : 'Κάνε like σε εργαζομένους στην Ανακάλυψη. Αν κι εκείνοι κάνουν like σε αγγελία σου, θα γίνει match!'}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((m: any) => {
            const name = isWorker
              ? (m.business_name || m.company_name || 'Επιχείρηση')
              : (m.worker_name || m.full_name || 'Εργαζόμενος');
            const avatar = isWorker ? m.business_logo : m.worker_avatar;
            const jobTitle = m.job_title;
            const matchDate = m.matched_at || m.created_at;

            return (
              <Card key={m.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    {avatar ? (
                      <img src={avatar} alt="" className="h-12 w-12 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-600">
                        {name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="truncate font-semibold text-gray-900">{name}</h3>
                      {jobTitle && <p className="truncate text-sm text-gray-600">{jobTitle}</p>}
                    </div>
                    <Badge variant={m.status === 'active' ? 'default' : 'secondary'}>
                      {m.status === 'active' ? 'Ενεργό' : 'Αρχείο'}
                    </Badge>
                  </div>

                  {matchDate && (
                    <p className="mt-3 text-xs text-gray-400">
                      Match: {new Date(matchDate).toLocaleDateString('el-GR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}

                  <div className="mt-4 flex gap-2">
                    {/* View Profile */}
                    <button
                      onClick={() => setViewingProfileId(isWorker ? m.business_id : m.worker_id)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      👤 Προφίλ
                    </button>
                    {/* Message */}
                    {m.conversation_id ? (
                      <Link href={`/dashboard/messages?id=${m.conversation_id}`} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                        💬 Μήνυμα
                      </Link>
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

      {/* Worker Profile Panel */}
      {viewingProfileId && (
        <WorkerProfilePanel
          workerId={viewingProfileId}
          onClose={() => setViewingProfileId(null)}
        />
      )}
    </div>
  );
}
