'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';

interface DiscoverProfile {
  id: string;
  name: string;
  role: string;
  location: string;
  avatar?: string;
  bio?: string;
  skills?: string[];
  jobTitle?: string;
  businessName?: string;
  salary?: string;
  experience?: string;
}

export default function DiscoverPage() {
  const { profile } = useAuth();
  const [candidates, setCandidates] = useState<DiscoverProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.matches.discover({ limit: 20 });
      setCandidates(res.profiles || []);
      setCurrentIndex(0);
    } catch {
      toast.error('Αποτυχία φόρτωσης. Δοκίμασε ξανά.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const currentCandidate = candidates[currentIndex];

  const handleAction = async (action: 'like' | 'skip') => {
    if (!currentCandidate || actionLoading) return;
    setActionLoading(true);
    try {
      if (action === 'like') {
        const res = await api.matches.like(currentCandidate.id);
        if (res.matched) {
          toast.success('Match! Μπορείτε τώρα να ξεκινήσετε συνομιλία.');
        }
      } else {
        await api.matches.skip(currentCandidate.id);
      }

      if (currentIndex < candidates.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        await fetchCandidates();
      }
    } catch {
      toast.error('Κάτι πήγε στραβά. Δοκίμασε ξανά.');
    } finally {
      setActionLoading(false);
    }
  };

  const isWorker = profile?.role === 'worker';

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (candidates.length === 0 || !currentCandidate) {
    return (
      <div>
        <h1 className="mb-8 text-2xl font-bold text-gray-900">Ανακάλυψη</h1>
        <EmptyState
          title="Δεν υπάρχουν άλλα προφίλ"
          description={
            isWorker
              ? 'Δεν βρέθηκαν νέες θέσεις εργασίας αυτή τη στιγμή. Δοκίμασε ξανά αργότερα!'
              : 'Δεν βρέθηκαν νέοι υποψήφιοι αυτή τη στιγμή. Δοκίμασε ξανά αργότερα!'
          }
        />
        <div className="mt-6 text-center">
          <Button onClick={fetchCandidates}>Ανανέωση</Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Ανακάλυψη</h1>
        <span className="text-sm text-gray-500">
          {currentIndex + 1} / {candidates.length}
        </span>
      </div>

      {/* Card */}
      <div className="mx-auto max-w-lg">
        <Card className="overflow-hidden shadow-lg">
          {/* Avatar / Image area */}
          <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 px-6 pb-8 pt-10 text-center text-white">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white/20 text-3xl font-bold">
              {currentCandidate.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <h2 className="mt-4 text-2xl font-bold">
              {isWorker
                ? currentCandidate.businessName || currentCandidate.name
                : currentCandidate.name}
            </h2>
            {currentCandidate.jobTitle && (
              <p className="mt-1 text-blue-100">{currentCandidate.jobTitle}</p>
            )}
            {currentCandidate.location && (
              <p className="mt-2 flex items-center justify-center gap-1 text-sm text-blue-100">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                {currentCandidate.location}
              </p>
            )}
          </div>

          <CardContent className="p-6">
            {/* Bio */}
            {currentCandidate.bio && (
              <p className="text-gray-600 leading-relaxed">
                {currentCandidate.bio}
              </p>
            )}

            {/* Skills */}
            {currentCandidate.skills && currentCandidate.skills.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700">
                  {isWorker ? 'Απαιτούμενες Δεξιότητες' : 'Δεξιότητες'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {currentCandidate.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Experience / Salary */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              {currentCandidate.experience && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Εμπειρία</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {currentCandidate.experience}
                  </p>
                </div>
              )}
              {currentCandidate.salary && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Μισθός</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {currentCandidate.salary}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex gap-4">
              <Button
                variant="outline"
                size="lg"
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => handleAction('skip')}
                disabled={actionLoading}
              >
                <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
                Πέρασε
              </Button>
              <Button
                size="lg"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => handleAction('like')}
                disabled={actionLoading}
              >
                <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                </svg>
                Like
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
