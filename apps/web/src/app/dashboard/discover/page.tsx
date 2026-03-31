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
import { WorkerProfilePanel } from '@/components/dashboard/worker-profile-panel';

interface DiscoverProfile {
  id: string;
  name: string;
  location: string;
  bio?: string;
  tags?: string[];
  salary?: string;
  experience?: string;
  photoUrl?: string;
  verified?: boolean;
  type: 'worker' | 'job';
  createdAt?: string;
  companyName?: string;
  housingProvided?: boolean;
  mealsProvided?: boolean;
  swipeStatus?: string | null; // 'like' | 'skip' | null
  isMatched?: boolean;
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} λεπτά πριν`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ώρ${hours === 1 ? 'α' : 'ες'} πριν`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ημέρ${days === 1 ? 'α' : 'ες'} πριν`;
  return new Date(dateStr).toLocaleDateString('el-GR', { day: 'numeric', month: 'short' });
}

export default function DiscoverPage() {
  const { user, profile } = useAuth();
  const [candidates, setCandidates] = useState<DiscoverProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);

  const isWorker = user?.role === 'worker';

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      if (isWorker) {
        // Workers see jobs
        const res = await api.jobs.list() as any;
        const items = res?.data?.items || res?.data || [];
        const mapped = (Array.isArray(items) ? items : []).map((j: any) => ({
          id: j.id,
          name: j.title || 'Θέση εργασίας',
          companyName: j.display_company_name || j.company_name,
          createdAt: j.created_at,
          housingProvided: j.housing_provided === 1 || j.branch_housing === 1,
          mealsProvided: j.meals_provided === 1 || j.branch_meals === 1,
          swipeStatus: j.swipe_status || null,
          isMatched: j.is_matched > 0,
          location: [j.company_address, j.company_area, j.display_city || j.city, j.display_region || j.region, j.company_postal_code].filter(Boolean).join(', '),
          bio: j.description,
          tags: j.roles || [j.employment_type].filter(Boolean),
          salary: j.salary_min && j.salary_max ? `${j.salary_min}-${j.salary_max}€/μήνα` : undefined,
          verified: false,
          type: 'job' as const,
        }));
        setCandidates(mapped);
      } else {
        // Businesses see workers
        const res = await api.workers.discover() as any;
        const items = res?.data?.items || res?.data || [];
        const mapped = (Array.isArray(items) ? items : []).map((w: any) => ({
          id: w.id || w.user_id,
          name: w.full_name || 'Χωρίς όνομα',
          photoUrl: w.photo_url || undefined,
          swipeStatus: w.swipe_status || null,
          isMatched: w.is_matched > 0,
          location: [w.city, w.region].filter(Boolean).join(', '),
          bio: w.bio,
          tags: w.roles || [],
          salary: w.expected_monthly_salary ? `${w.expected_monthly_salary}€/μήνα` : undefined,
          experience: w.years_of_experience ? `${w.years_of_experience} χρόνια` : undefined,
          verified: w.verified === 1,
          type: 'worker' as const,
        }));
        setCandidates(mapped);
      }
      setCurrentIndex(0);
    } catch (err) {
      console.error('Discover error:', err);
      toast.error('Αποτυχία φόρτωσης. Δοκίμασε ξανά.');
    } finally {
      setLoading(false);
    }
  }, [isWorker]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const currentCandidate = candidates[currentIndex];

  const handleAction = async (action: 'like' | 'skip') => {
    if (!currentCandidate || actionLoading) return;
    setActionLoading(true);
    try {
      // Call like/skip API
      if (action === 'like') {
        if (isWorker) {
          const res = await api.jobs.like(currentCandidate.id) as any;
          if (res?.data?.matched) {
            toast.success('🎉 Match! Μπορείτε τώρα να ξεκινήσετε συνομιλία!');
          } else {
            toast.success('❤️ Ενδιαφέρον καταχωρήθηκε!');
          }
        } else {
          const res = await api.workers.like(currentCandidate.id) as any;
          if (res?.data?.matched) {
            toast.success('🎉 Match! Μπορείτε τώρα να ξεκινήσετε συνομιλία!');
          } else {
            toast.success('❤️ Ενδιαφέρον καταχωρήθηκε!');
          }
        }
      }
      // Move to next card
      if (currentIndex < candidates.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        // All done - show empty state
        setCandidates([]);
      }
    } catch (err: any) {
      console.error('Action error:', err);
      // Move to next regardless
      if (currentIndex < candidates.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        setCandidates([]);
      }
    } finally {
      setActionLoading(false);
    }
  };

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

      <div className="mx-auto max-w-lg">
        <Card className="overflow-hidden shadow-lg">
          {/* Header */}
          <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 px-6 pb-8 pt-10 text-center text-white">
            {currentCandidate.photoUrl ? (
              <img src={currentCandidate.photoUrl} alt="" className="mx-auto h-24 w-24 rounded-full object-cover border-2 border-white/30" />
            ) : (
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white/20 text-3xl font-bold">
                {currentCandidate.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
            <h2 className="mt-4 text-2xl font-bold">{currentCandidate.name}</h2>
            {currentCandidate.companyName && (
              <p className="mt-1 text-sm text-blue-200">🏢 {currentCandidate.companyName}</p>
            )}
            {currentCandidate.verified && (
              <Badge className="mt-2 bg-green-500/20 text-green-100">✓ Verified</Badge>
            )}
            {currentCandidate.location && (
              <p className="mt-2 flex items-center justify-center gap-1 text-sm text-blue-100">
                📍 {currentCandidate.location}
              </p>
            )}
          </div>

          <CardContent className="p-6">
            {/* Time + conditions */}
            <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
              {currentCandidate.createdAt && (
                <span className="text-gray-400">🕐 {timeAgo(currentCandidate.createdAt)}</span>
              )}
              {currentCandidate.housingProvided && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 font-medium">🏠 Διαμονή</span>
              )}
              {currentCandidate.mealsProvided && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 font-medium">🍽️ Σίτιση</span>
              )}
            </div>

            {currentCandidate.bio && (
              <p className="text-gray-600 leading-relaxed line-clamp-4">
                {currentCandidate.bio}
              </p>
            )}

            {currentCandidate.tags && currentCandidate.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {currentCandidate.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-4">
              {currentCandidate.experience && (
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500">Εμπειρία</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{currentCandidate.experience}</p>
                </div>
              )}
              {currentCandidate.salary && (
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500">Μισθός</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{currentCandidate.salary}</p>
                </div>
              )}
            </div>

            {/* View Profile Button */}
            <div className="mt-4 text-center">
              <button
                onClick={() => setViewingProfileId(currentCandidate.id)}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                👤 Δες πλήρες προφίλ
              </button>
            </div>

            {/* Status badge */}
            {(currentCandidate.isMatched || currentCandidate.swipeStatus) && (
              <div className="mt-3 text-center">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  currentCandidate.isMatched
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : currentCandidate.swipeStatus === 'like'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-gray-100 text-gray-500 border border-gray-200'
                }`}>
                  {currentCandidate.isMatched ? '🤝 Match — Μπορείτε να συνομιλήσετε' : currentCandidate.swipeStatus === 'like' ? '❤️ Δήλωσα Ενδιαφέρον' : '👁️ Προβλήθηκε'}
                </span>
              </div>
            )}

            <div className="mt-4 flex gap-4">
              {currentCandidate.isMatched ? (
                <a href="/dashboard/messages" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700">
                  💬 Άνοιξε Chat
                </a>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => handleAction('skip')}
                    disabled={actionLoading}
                  >
                    ✕ Πέρασε
                  </Button>
                  <Button
                    size="lg"
                    className={`flex-1 text-white ${currentCandidate.swipeStatus === 'like' ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                    onClick={() => handleAction('like')}
                    disabled={actionLoading || currentCandidate.swipeStatus === 'like'}
                  >
                    {currentCandidate.swipeStatus === 'like' ? '✓ Δηλώθηκε' : '♥ Ενδιαφέρομαι'}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Worker Profile Slide-over Panel */}
      {viewingProfileId && (
        <WorkerProfilePanel
          workerId={viewingProfileId}
          onClose={() => setViewingProfileId(null)}
          onLike={(id) => handleAction('like')}
          onSkip={(id) => handleAction('skip')}
        />
      )}
    </div>
  );
}
