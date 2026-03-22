'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';

interface Match {
  id: string;
  matchedAt: string;
  otherUser: {
    id: string;
    name: string;
    avatar?: string;
    role: string;
    jobTitle?: string;
    businessName?: string;
    location?: string;
  };
  conversationId?: string;
  status: 'active' | 'archived';
}

export default function MatchesPage() {
  const { profile } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMatches() {
      try {
        const res = await api.matches.list({ limit: 50 });
        setMatches(res.matches || []);
      } catch {
        setMatches([]);
      } finally {
        setLoading(false);
      }
    }

    fetchMatches();
  }, []);

  const isWorker = profile?.role === 'worker';

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Τα Matches μου</h1>
          <p className="mt-1 text-gray-600">
            {matches.length > 0
              ? `${matches.length} ${matches.length === 1 ? 'match' : 'matches'}`
              : 'Δεν έχεις matches ακόμα'}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/discover">Ανακάλυψη</Link>
        </Button>
      </div>

      {matches.length === 0 ? (
        <EmptyState
          title="Δεν έχεις matches ακόμα"
          description={
            isWorker
              ? 'Ξεκίνα να κάνεις swipe σε θέσεις εργασίας για να βρεις matches!'
              : 'Ξεκίνα να κάνεις swipe σε υποψηφίους για να βρεις matches!'
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((match) => (
            <Card
              key={match.id}
              className="transition-shadow hover:shadow-md"
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-600">
                    {match.otherUser.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="truncate font-semibold text-gray-900">
                      {isWorker
                        ? match.otherUser.businessName || match.otherUser.name
                        : match.otherUser.name}
                    </h3>
                    {match.otherUser.jobTitle && (
                      <p className="truncate text-sm text-gray-600">
                        {match.otherUser.jobTitle}
                      </p>
                    )}
                    {match.otherUser.location && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                        </svg>
                        {match.otherUser.location}
                      </p>
                    )}
                  </div>
                  <Badge variant={match.status === 'active' ? 'default' : 'secondary'}>
                    {match.status === 'active' ? 'Ενεργό' : 'Αρχείο'}
                  </Badge>
                </div>

                <p className="mt-3 text-xs text-gray-400">
                  Match:{' '}
                  {new Date(match.matchedAt).toLocaleDateString('el-GR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>

                <div className="mt-4 flex gap-2">
                  {match.conversationId ? (
                    <Button asChild size="sm" className="flex-1">
                      <Link href={`/dashboard/messages?id=${match.conversationId}`}>
                        Μήνυμα
                      </Link>
                    </Button>
                  ) : (
                    <Button size="sm" className="flex-1" onClick={async () => {
                      try {
                        const res = await api.conversations.create(match.otherUser.id);
                        window.location.href = `/dashboard/messages?id=${res.conversationId}`;
                      } catch {
                        // handle silently
                      }
                    }}>
                      Ξεκίνα Συνομιλία
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
