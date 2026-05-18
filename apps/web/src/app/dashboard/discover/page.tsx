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
import { PremiumTick } from '@/components/ui/premium-tick';
import { WorkerProfilePanel } from '@/components/dashboard/worker-profile-panel';
import { BusinessProfilePanel } from '@/components/dashboard/business-profile-panel';
import { JobDetailPanel } from '@/components/dashboard/job-detail-panel';

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
  companyLogo?: string;
  coverPhoto?: string;
  housingProvided?: boolean;
  mealsProvided?: boolean;
  swipeStatus?: string | null;
  isMatched?: boolean;
  businessUserId?: string;
  isPremium?: boolean;
  isBoosted?: boolean;
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
  const [discoverTab, setDiscoverTab] = useState<'discover' | 'saved' | 'interest' | 'matched'>('discover');
  const [savedJobs, setSavedJobs] = useState<any[]>([]);
  const [interests, setInterests] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [viewingBusinessId, setViewingBusinessId] = useState<string | null>(null);
  const [viewingJobDetail, setViewingJobDetail] = useState<DiscoverProfile | null>(null);
  const [aiMatchScores, setAiMatchScores] = useState<Record<string, number>>({});

  const isWorker = user?.role === 'worker';

  // Fetch AI match scores in parallel (non-blocking)
  const fetchAiMatches = useCallback(async () => {
    try {
      const token = localStorage.getItem('staffnow_token');
      const base = 'https://staffnow-api-production.siteinside53.workers.dev';
      const endpoint = isWorker ? '/ai/match/jobs' : '/ai/match/workers';

      const res = await fetch(`${base}${endpoint}?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()) as any;

      if (res.success && res.data?.matches) {
        const scores: Record<string, number> = {};
        for (const m of res.data.matches) {
          scores[m.id] = m.matchPercent;
        }
        setAiMatchScores(scores);
      }
    } catch {
      // AI matching is a progressive enhancement — fail silently
    }
  }, [isWorker]);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      if (isWorker) {
        // Workers see jobs
        const res = await api.jobs.list() as any;
        const items = res?.data?.items || res?.data || [];
        const mapped = (Array.isArray(items) ? items : [])
        .filter((j: any) => !j.swipe_status && !j.is_matched)
        .map((j: any) => ({
          id: j.id,
          name: j.title || 'Θέση εργασίας',
          companyName: j.display_company_name || j.company_name,
          companyLogo: j.company_logo || undefined,
          coverPhoto: j.company_cover_photo || undefined,
          createdAt: j.created_at,
          housingProvided: j.housing_provided === 1 || j.branch_housing === 1,
          mealsProvided: j.meals_provided === 1 || j.branch_meals === 1,
          swipeStatus: j.swipe_status || null,
          isMatched: j.is_matched > 0,
          location: [j.company_address, j.company_area, j.display_city || j.city, j.display_region || j.region, j.company_postal_code].filter(Boolean).join(', '),
          bio: j.description,
          businessUserId: j.business_user_id || undefined,
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
        const mapped = (Array.isArray(items) ? items : [])
        .filter((w: any) => !w.swipe_status && !w.is_matched)
        .map((w: any) => ({
          id: w.user_id || w.id,
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
          isPremium: w.is_premium === 1,
          isBoosted: w.is_boosted === 1,
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
    fetchAiMatches(); // parallel, non-blocking
  }, [fetchCandidates, fetchAiMatches]);

  // Load tab data
  useEffect(() => {
    async function loadTabData() {
      try {
        if (discoverTab === 'saved') {
          if (isWorker) {
            const res = await api.jobs.favorites() as any;
            setSavedJobs(res?.data || []);
          } else {
            // Business: fetch saved workers
            const token = localStorage.getItem('staffnow_token');
            const res = await fetch('https://staffnow-api-production.siteinside53.workers.dev/workers/favorites/list', {
              headers: { 'Authorization': `Bearer ${token}` },
            }).then(r => r.json()) as any;
            setSavedJobs(res?.data || []);
          }
        } else if (discoverTab === 'interest') {
          // Sent likes that haven't matched yet (API already filters)
          const res = await (api as any).interests.sent() as any;
          setInterests(res?.data || []);
        } else if (discoverTab === 'matched') {
          const res = await api.matches.list() as any;
          setMatches((res?.data || []).filter((m: any) => m.status === 'active'));
        }
      } catch {}
    }
    if (discoverTab !== 'discover') loadTabData();
  }, [discoverTab, isWorker]);

  const saveItem = async (id: string, type: 'job' | 'worker') => {
    try {
      if (type === 'job') await api.jobs.favorite(id);
      else await api.workers.favorite(id);
      toast.success('Αποθηκεύτηκε!');
    } catch { toast.error('Σφάλμα αποθήκευσης'); }
  };

  const cancelInterest = async (swipeId: string) => {
    try {
      const token = localStorage.getItem('staffnow_token');
      const res = await fetch(`https://staffnow-api-production.siteinside53.workers.dev/interests/cancel/${swipeId}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json() as any;
      if (data.success) {
        setInterests((prev) => prev.filter((i: any) => i.id !== swipeId));
        toast.success('Τo αίτημα ακυρώθηκε');
      } else toast.error('Σφάλμα');
    } catch { toast.error('Σφάλμα'); }
  };

  const shareItem = (name: string, url?: string) => {
    const shareUrl = url || window.location.href;
    if (navigator.share) {
      navigator.share({ title: name, url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Τo link αντιγράφηκε!');
    }
  };

  const currentCandidate = candidates[currentIndex];

  const handleAction = async (action: 'like' | 'skip') => {
    if (!currentCandidate || actionLoading) return;
    setActionLoading(true);
    const moveNext = () => {
      if (currentIndex < candidates.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        setCandidates([]);
      }
    };
    try {
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
      moveNext();
    } catch (err: any) {
      console.error('Action error:', err);
      if (err?.status === 409 || err?.code === 'CONFLICT') {
        toast.info('Έχεις ήδη δείξει ενδιαφέρον. Πάμε στο επόμενο!');
      } else {
        toast.error(err?.message || 'Κάτι πήγε στραβά. Δοκίμασε ξανά.');
      }
      moveNext();
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

  const noCandidates = candidates.length === 0 || !currentCandidate;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Εύρεση</h1>
        {discoverTab === 'discover' && !noCandidates && <span className="text-sm text-gray-500">{currentIndex + 1} / {candidates.length}</span>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 mb-6">
        {[
          { key: 'discover' as const, label: 'Εύρεση' },
          { key: 'saved' as const, label: 'Αποθηκευμένα' },
          { key: 'interest' as const, label: 'Αιτήματα' },
          { key: 'matched' as const, label: 'Matched' },
        ].map((t) => (
          <button key={t.key} onClick={() => setDiscoverTab(t.key)}
            className={`flex-1 rounded-md py-2 text-xs font-medium transition-all ${discoverTab === t.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Saved Tab */}
      {discoverTab === 'saved' && (
        <div className="space-y-3">
          {savedJobs.length === 0 ? (
            <EmptyState title="Δεν έχεις αποθηκευμένα" description="Πάτα 🔖 σε μια αγγελία ή προφίλ για αποθήκευση" />
          ) : savedJobs.map((j: any) => {
            const isJob = !!j.title;
            const name = j.title || j.full_name || 'Αποθηκευμένο';
            const sub = j.display_company_name || j.company_name || j.city || '';
            const itemId = j.id || j.user_id;
            const logo = j.company_logo || j.photo_url;
            return (
            <Card key={j.fav_id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {/* Avatar/Logo - clickable */}
                  <button onClick={() => {
                    if (isJob && j.business_user_id) setViewingJobDetail({ id: itemId, name, companyName: sub, businessUserId: j.business_user_id, type: 'job' } as any);
                    else if (!isJob) setViewingProfileId(j.user_id);
                  }} className="flex-shrink-0">
                    {logo ? (
                      <img src={logo} alt="" className="h-12 w-12 rounded-xl object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-lg font-bold text-blue-600">
                        {name[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                  </button>
                  {/* Info - clickable */}
                  <button onClick={() => {
                    if (isJob && j.business_user_id) setViewingJobDetail({ id: itemId, name, companyName: sub, businessUserId: j.business_user_id, type: 'job' } as any);
                    else if (!isJob) setViewingProfileId(j.user_id);
                  }} className="flex-1 text-left min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{name}</h3>
                    {sub && <p className="text-sm text-gray-500 truncate">{sub}</p>}
                    <div className="mt-1 flex gap-2 text-xs text-gray-400">
                      {j.city && <span>📍 {j.city}{j.region ? `, ${j.region}` : ''}</span>}
                      {j.salary_min && <span>💰 {j.salary_min}€</span>}
                      {j.expected_monthly_salary && <span>💰 {j.expected_monthly_salary}€/μήνα</span>}
                    </div>
                  </button>
                  {/* Action buttons */}
                  <div className="flex gap-1.5 flex-shrink-0">
                    {/* Like / Interest */}
                    <button onClick={async () => {
                      try {
                        if (isJob) await api.jobs.like(itemId);
                        else await api.workers.like(j.user_id);
                        toast.success('❤️ Ενδιαφέρον!');
                      } catch { toast.error('Ήδη δηλώθηκε ή σφάλμα'); }
                    }} title="Ενδιαφέρον" className="rounded-lg border border-gray-200 p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                    </button>
                    {/* Remove from saved */}
                    <button onClick={async () => {
                      try {
                        if (isJob) await api.jobs.unfavorite(itemId);
                        else await api.workers.unfavorite(j.user_id);
                        setSavedJobs((prev) => prev.filter((x: any) => x.fav_id !== j.fav_id));
                        toast.success('Αφαιρέθηκε');
                      } catch { toast.error('Σφάλμα'); }
                    }} title="Αφαίρεση" className="rounded-lg border border-gray-200 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );})}
        </div>
      )}

      {/* Interest/Requests Tab - sent likes without match */}
      {discoverTab === 'interest' && (
        <div className="space-y-3">
          {interests.length === 0 ? (
            <EmptyState title="Δεν υπάρχουν αιτήματα" description="Τα αιτήματα ενδιαφέροντος που στέλνεις χωρίς απάντηση εμφανίζονται εδώ" />
          ) : interests.map((item: any) => {
            const name = item.job_title || item.company_name || item.worker_name || 'Χωρίς όνομα';
            const sub = item.company_name && item.job_title ? item.company_name : item.city || '';
            const avatar = item.logo_url || item.photo_url;
            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {avatar ? (
                      <img src={avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-600">
                        {name[0]?.toUpperCase() || '❤️'}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{name}</p>
                      {sub && <p className="text-xs text-gray-500">{sub}</p>}
                      <p className="text-xs text-gray-400">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString('el-GR', { day: 'numeric', month: 'short' }) : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-700">Αναμονή</span>
                      <button onClick={() => cancelInterest(item.id)}
                        className="rounded-full bg-red-50 border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100">
                        Ακύρωση
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Matched Tab */}
      {discoverTab === 'matched' && (
        <div className="space-y-3">
          {matches.length === 0 ? (
            <EmptyState title="Δεν έχεις matches" description="Κάνε like για νέα matches!" />
          ) : matches.map((m: any) => {
            const name = isWorker ? (m.business_name || 'Επιχείρηση') : (m.worker_name || 'Εργαζόμενος');
            const avatar = isWorker ? m.business_logo : m.worker_avatar;
            return (
              <Card key={m.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {avatar ? (
                      <img src={avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">{name[0]?.toUpperCase()}</div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-sm">{name}</h3>
                      {m.job_title && <p className="text-xs text-gray-500">{m.job_title}</p>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => shareItem(name)} className="rounded-lg border border-gray-200 p-2 text-gray-400 hover:text-blue-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>
                      </button>
                      {m.conversation_id && (
                        <a href={`/dashboard/messages?id=${m.conversation_id}`} className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Discover Tab - existing swipe cards */}
      {discoverTab === 'discover' && noCandidates && (
        <div>
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
      )}

      {discoverTab === 'discover' && !noCandidates && currentCandidate && (

      <div className="mx-auto max-w-lg">
        <Card className="overflow-hidden shadow-lg">
          {/* Header */}
          <div
            className={`relative px-6 pb-8 pt-10 text-center text-white ${
              currentCandidate.coverPhoto ? '' : 'bg-gradient-to-br from-blue-500 to-indigo-600'
            }`}
            style={
              currentCandidate.coverPhoto
                ? {
                    backgroundImage: `url(${currentCandidate.coverPhoto})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : undefined
            }
          >
            {currentCandidate.coverPhoto && (
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/45 to-black/60" />
            )}
            <div className="relative">
            {currentCandidate.photoUrl || currentCandidate.companyLogo ? (
              <img
                src={currentCandidate.photoUrl || currentCandidate.companyLogo}
                alt=""
                className="mx-auto h-24 w-24 rounded-full object-cover border-2 border-white/40 shadow-lg bg-white"
              />
            ) : currentCandidate.coverPhoto ? null : (
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white/20 text-3xl font-bold shadow-lg backdrop-blur-sm">
                {currentCandidate.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
            <h2 className="mt-4 inline-flex items-center justify-center gap-2 text-2xl font-bold drop-shadow">
              {currentCandidate.name}
              {currentCandidate.isPremium && <PremiumTick size="lg" />}
            </h2>
            {currentCandidate.companyName && (
              <p className="mt-1 text-sm text-white/90 drop-shadow">🏢 {currentCandidate.companyName}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
              {currentCandidate.isBoosted && (
                <Badge className="bg-amber-500/30 text-amber-100">🚀 Boosted</Badge>
              )}
              {currentCandidate.verified && (
                <Badge className="bg-green-500/20 text-green-100">✓ Verified</Badge>
              )}
            </div>
            {currentCandidate.location && (
              <p className="mt-2 flex items-center justify-center gap-1 text-sm text-white/90 drop-shadow">
                📍 {currentCandidate.location}
              </p>
            )}
            {/* AI Match Score Badge */}
            {aiMatchScores[currentCandidate.id] > 0 && (
              <div className="mt-3 flex justify-center">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold shadow-lg backdrop-blur-sm ${
                  aiMatchScores[currentCandidate.id] >= 80
                    ? 'bg-emerald-500/90 text-white'
                    : aiMatchScores[currentCandidate.id] >= 60
                      ? 'bg-blue-500/90 text-white'
                      : 'bg-white/20 text-white'
                }`}>
                  🧠 AI Match: {aiMatchScores[currentCandidate.id]}%
                </span>
              </div>
            )}
            </div>
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

            {/* Save + Share + View */}
            <div className="mt-4 flex items-center justify-center gap-3">
              <button onClick={() => { saveItem(currentCandidate.id, currentCandidate.type === 'job' ? 'job' : 'worker'); }} title="Αποθήκευση"
                className="rounded-lg border border-gray-200 p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-colors">
                🔖
              </button>
              <button
                onClick={() => {
                  if (isWorker && currentCandidate.type === 'job') {
                    setViewingJobDetail(currentCandidate);
                  } else if (isWorker && currentCandidate.businessUserId) {
                    setViewingBusinessId(currentCandidate.businessUserId);
                  } else {
                    setViewingProfileId(currentCandidate.id);
                  }
                }}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                {isWorker ? '📋 Δες πλήρη αγγελία & προφίλ' : '👤 Δες πλήρες προφίλ'}
              </button>
              <button onClick={() => shareItem(currentCandidate.name)} title="Κοινοποίηση"
                className="rounded-lg border border-gray-200 p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors">
                📤
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
      )}

      {/* Worker Profile Slide-over Panel */}
      {viewingProfileId && (
        <WorkerProfilePanel
          workerId={viewingProfileId}
          onClose={() => setViewingProfileId(null)}
          onLike={(id) => handleAction('like')}
          onSkip={(id) => handleAction('skip')}
        />
      )}

      {viewingBusinessId && (
        <BusinessProfilePanel
          businessUserId={viewingBusinessId}
          onClose={() => setViewingBusinessId(null)}
          onLike={() => handleAction('like')}
          onSkip={() => handleAction('skip')}
        />
      )}

      {viewingJobDetail && (
        <JobDetailPanel
          jobId={viewingJobDetail.id}
          jobData={viewingJobDetail}
          onClose={() => setViewingJobDetail(null)}
          onLike={() => handleAction('like')}
          onSkip={() => handleAction('skip')}
          isMatched={viewingJobDetail.isMatched}
          swipeStatus={viewingJobDetail.swipeStatus}
        />
      )}
    </div>
  );
}
