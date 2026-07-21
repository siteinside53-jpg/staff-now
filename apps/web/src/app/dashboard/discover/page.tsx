'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { FilteredListLayout, type FilterGroup } from '@/components/marketing/filtered-list-layout';
import { GREEK_CITIES } from '@/lib/greek-cities';
import { WORKER_JOB_ROLE_LABELS_EL } from '@staffnow/config';

// Ελληνικό label ειδικότητας (fallback στο raw id αν λείπει)
function roleLabel(r: string): string {
  return WORKER_JOB_ROLE_LABELS_EL[r] || r;
}

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
  employmentType?: string;
  region?: string;
  salaryMin?: number;
  swipeStatus?: string | null;
  isMatched?: boolean;
  businessUserId?: string;
  isPremium?: boolean;
  isBoosted?: boolean;
  matchPercent?: number | null;
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

// Κανονικοποίηση κειμένου για αναζήτηση/φίλτρα (πεζά + χωρίς τόνους)
function normText(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

const EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  seasonal: 'Σεζόν',
  freelance: 'Freelance',
};
function employmentLabel(t?: string): string {
  return t ? EMPLOYMENT_LABELS[t] ?? t : '';
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

  // v5-style swipe drag state
  const dragRef = useRef({ startX: 0, startY: 0, moved: false });
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exitDir, setExitDir] = useState<'left' | 'right' | null>(null);
  const [savedBounce, setSavedBounce] = useState(false);
  const [discoverView, setDiscoverView] = useState<'swipe' | 'list'>('swipe');

  // List-view filters (ίδια λογική με τις δημόσιες λίστες)
  const [listQuery, setListQuery] = useState('');
  const [listSel, setListSel] = useState<Record<string, string[]>>({ location: [], region: [], role: [], type: [], salary: [], perks: [] });

  const isWorker = user?.role === 'worker';

  // ── Filter options & φιλτραρισμένη λίστα για το list view ──
  const listCityOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const c of GREEK_CITIES) {
      const n = normText(c);
      if (!seen.has(n)) seen.set(n, c);
    }
    for (const c of candidates) {
      const n = normText(c.location || '');
      if (n && !seen.has(n)) seen.set(n, c.location || '');
    }
    return Array.from(seen.entries())
      .map(([n, label]) => ({
        value: label,
        label,
        count: candidates.filter((c) => {
          const cl = normText(c.location || '');
          return cl && (cl.includes(n) || n.includes(cl));
        }).length,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'el'));
  }, [candidates]);

  const listRoleOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of candidates) for (const t of c.tags ?? []) counts.set(t, (counts.get(t) || 0) + 1);
    return Array.from(counts.entries())
      .map(([v, n]) => ({ value: v, label: v, count: n }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'el'));
  }, [candidates]);

  // Τύπος απασχόλησης (μόνο για θέσεις — δηλ. στην όψη εργαζομένου)
  const listTypeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of candidates) if (c.employmentType) counts.set(c.employmentType, (counts.get(c.employmentType) || 0) + 1);
    return Array.from(counts.entries())
      .map(([v, n]) => ({ value: v, label: employmentLabel(v), count: n }))
      .sort((a, b) => b.count - a.count);
  }, [candidates]);

  // Περιοχές / γειτονιές (όπως τα «Areas» του jobfind)
  const listRegionOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const c of candidates) {
      const r = (c.region || '').trim();
      if (!r) continue;
      const n = normText(r);
      if (!seen.has(n)) seen.set(n, r);
    }
    return Array.from(seen.entries())
      .map(([n, label]) => ({
        value: label,
        label,
        count: candidates.filter((c) => normText(c.region || '') === n).length,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'el'));
  }, [candidates]);

  // Μισθός — κλιμάκια ελάχιστου μηνιαίου (€+)
  const listSalaryOptions = useMemo(() => {
    const brackets = [800, 1000, 1200, 1500, 2000];
    return brackets
      .map((min) => ({
        value: String(min),
        label: `${min.toLocaleString('el-GR')}€+`,
        count: candidates.filter((c) => (c.salaryMin ?? 0) >= min).length,
      }))
      .filter((o) => o.count > 0);
  }, [candidates]);

  // Παροχές (στέγη / φαγητό)
  const listPerksOptions = useMemo(() => {
    const housing = candidates.filter((c) => c.housingProvided).length;
    const meals = candidates.filter((c) => c.mealsProvided).length;
    return [
      ...(housing > 0 ? [{ value: 'housing', label: '🏠 Στέγη', count: housing }] : []),
      ...(meals > 0 ? [{ value: 'meals', label: '🍽️ Φαγητό', count: meals }] : []),
    ];
  }, [candidates]);

  const listGroups: FilterGroup[] = useMemo(
    () =>
      [
        { key: 'location', title: 'Πόλεις', options: listCityOptions, searchable: true },
        { key: 'region', title: 'Περιοχές', options: listRegionOptions, searchable: true },
        { key: 'type', title: 'Τύπος απασχόλησης', options: listTypeOptions },
        { key: 'role', title: 'Ειδικότητες', options: listRoleOptions },
        { key: 'salary', title: 'Μισθός', options: listSalaryOptions },
        { key: 'perks', title: 'Παροχές', options: listPerksOptions },
      ].filter((g) => g.options.length > 0),
    [listCityOptions, listRegionOptions, listTypeOptions, listRoleOptions, listSalaryOptions, listPerksOptions],
  );

  const filteredCandidates = useMemo(() => {
    const q = normText(listQuery);
    const cityNorms = (listSel.location ?? []).map(normText);
    return candidates.filter((c) => {
      if (q) {
        const hay = `${c.name} ${c.companyName ?? ''} ${c.location ?? ''} ${(c.tags ?? []).join(' ')}`;
        if (!normText(hay).includes(q)) return false;
      }
      if (cityNorms.length) {
        const cl = normText(c.location || '');
        if (!cityNorms.some((cn) => cl.includes(cn) || cn.includes(cl))) return false;
      }
      if ((listSel.region ?? []).length) {
        const rn = normText(c.region || '');
        if (!(listSel.region ?? []).some((r) => normText(r) === rn)) return false;
      }
      if ((listSel.role ?? []).length && !(c.tags ?? []).some((t) => listSel.role!.includes(t))) return false;
      if ((listSel.type ?? []).length && !(c.employmentType && listSel.type!.includes(c.employmentType))) return false;
      if ((listSel.salary ?? []).length) {
        const minSel = Math.min(...listSel.salary!.map(Number));
        if (!(c.salaryMin && c.salaryMin >= minSel)) return false;
      }
      if ((listSel.perks ?? []).includes('housing') && !c.housingProvided) return false;
      if ((listSel.perks ?? []).includes('meals') && !c.mealsProvided) return false;
      return true;
    });
  }, [candidates, listQuery, listSel]);

  function toggleListFilter(group: string, value: string) {
    setListSel((prev) => {
      const cur = prev[group] ?? [];
      return { ...prev, [group]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] };
    });
  }

  function clearListFilters() {
    setListQuery('');
    setListSel({ location: [], region: [], role: [], type: [], salary: [], perks: [] });
  }

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
          employmentType: j.employment_type || undefined,
          region: j.display_region || j.region || undefined,
          salaryMin: j.salary_min || undefined,
          tags: j.roles || [j.employment_type].filter(Boolean),
          salary: j.salary_min && j.salary_max ? `${j.salary_min}-${j.salary_max}€/μήνα` : undefined,
          verified: false,
          type: 'job' as const,
        }));
        setCandidates(mapped);
      } else {
        // Businesses see workers — φέρνουμε ΟΛΕΣ τις σελίδες (ο server επιστρέφει
        // έως 50/σελίδα), αλλιώς έδειχνε μόνο τους πρώτους 20.
        const perPage = 50;
        const rawWorkers: any[] = [];
        let pageNum = 1;
        // Πρώτη σελίδα — παίρνουμε και το total για να ξέρουμε πόσες ακολουθούν.
        const first = await api.workers.discover({ page: pageNum, limit: perPage }) as any;
        rawWorkers.push(...(first?.data?.items || first?.data || []));
        const totalPages = first?.meta?.totalPages || 1;
        while (pageNum < totalPages) {
          pageNum += 1;
          const next = await api.workers.discover({ page: pageNum, limit: perPage }) as any;
          rawWorkers.push(...(next?.data?.items || next?.data || []));
        }
        const mapped = rawWorkers
        .filter((w: any) => !w.swipe_status && !w.is_matched)
        .map((w: any) => ({
          id: w.user_id || w.id,
          name: w.full_name || 'Χωρίς όνομα',
          photoUrl: w.photo_url || undefined,
          swipeStatus: w.swipe_status || null,
          isMatched: w.is_matched > 0,
          location: [w.city, w.region].filter(Boolean).join(', '),
          region: w.region || undefined,
          salaryMin: w.expected_monthly_salary || undefined,
          bio: w.bio,
          tags: w.roles || [],
          salary: w.expected_monthly_salary ? `${w.expected_monthly_salary}€/μήνα` : undefined,
          experience: w.years_of_experience ? `${w.years_of_experience} χρόνια` : undefined,
          verified: w.verified === 1,
          isPremium: w.is_premium === 1,
          isBoosted: w.is_boosted === 1,
          matchPercent: typeof w.match_score === 'number' ? w.match_score : null,
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

  const TABS = [
    { key: 'discover' as const, label: 'Εύρεση' },
    { key: 'saved' as const, label: 'Αποθηκευμένα' },
    { key: 'interest' as const, label: 'Αιτήματα' },
    { key: 'matched' as const, label: 'Matched' },
  ];
  const renderTabs = (vertical: boolean) => (
    <div className={vertical ? 'flex flex-col gap-1' : 'flex gap-1 rounded-lg bg-gray-100 p-1'}>
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => setDiscoverTab(t.key)}
          className={
            vertical
              ? `text-left rounded-lg px-3 py-2 text-sm font-medium transition-all ${discoverTab === t.key ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`
              : `flex-1 rounded-md py-2 text-xs font-medium transition-all ${discoverTab === t.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`
          }
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Εύρεση</h1>
        {discoverTab === 'discover' && !noCandidates && <span className="text-sm text-gray-500">{currentIndex + 1} / {candidates.length}</span>}
      </div>

      {/* Tabs — σε desktop πάνε αριστερά (sidebar). Εδώ μένουν μόνο για mobile. */}
      <div className="mb-6 lg:hidden">
        {renderTabs(false)}
      </div>

      {/* Desktop: αριστερό sidebar με tabs — εκτός από το discover-list (εκεί μπαίνουν στο filter sidebar) */}
      <div className="lg:flex lg:gap-6">
        {!(discoverTab === 'discover' && !noCandidates) && (
          <aside className="hidden lg:block lg:w-56 flex-shrink-0">
            <div className="sticky top-6 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
              {renderTabs(true)}
            </div>
          </aside>
        )}
        <div className="flex-1 min-w-0">

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

      {/* Swipe/Λίστα toggle — ΜΟΝΟ σε mobile (σε desktop δείχνουμε πάντα λίστα) */}
      {discoverTab === 'discover' && !noCandidates && (
        <div className="mx-auto max-w-lg mb-4 flex items-center justify-center lg:hidden">
          <div className="inline-flex rounded-full bg-gray-100 p-1 text-xs font-bold shadow-inner">
            <button
              onClick={() => setDiscoverView('swipe')}
              className={`px-5 py-1.5 rounded-full transition-all ${discoverView === 'swipe' ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700'}`}
            >
              🎴 Swipe
            </button>
            <button
              onClick={() => setDiscoverView('list')}
              className={`px-5 py-1.5 rounded-full transition-all ${discoverView === 'list' ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700'}`}
            >
              📋 Λίστα
            </button>
          </div>
        </div>
      )}

      {/* LIST VIEW — πάντα ορατή σε desktop· σε mobile όταν επιλεγεί «Λίστα» */}
      {discoverTab === 'discover' && !noCandidates && (
        <div className={`mx-auto max-w-5xl ${discoverView === 'list' ? '' : 'hidden lg:block'}`}>
          <FilteredListLayout
            accent="blue"
            sidebarHeader={<div className="hidden lg:block">{renderTabs(true)}</div>}
            search={listQuery}
            onSearch={setListQuery}
            searchPlaceholder={isWorker ? 'Αναζήτηση θέσης ή εταιρείας…' : 'Αναζήτηση εργαζομένου ή ρόλου…'}
            groups={listGroups}
            selected={listSel}
            onToggle={toggleListFilter}
            onClear={clearListFilters}
            resultCount={filteredCandidates.length}
            resultNoun={isWorker ? ['θέση', 'θέσεις'] : ['εργαζόμενος', 'εργαζόμενοι']}
          >
          {filteredCandidates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
              <p className="text-gray-600 font-medium">Κανένα αποτέλεσμα με αυτά τα φίλτρα.</p>
              <button
                type="button"
                onClick={clearListFilters}
                className="mt-3 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Καθαρισμός φίλτρων
              </button>
            </div>
          ) : (
          <ul className="space-y-3">
            {filteredCandidates.map((c) => {
              const photo = c.photoUrl || c.companyLogo || c.coverPhoto;
              // Προτεραιότητα στο ντετερμινιστικό match του server· fallback στο AI score.
              const score = typeof c.matchPercent === 'number' ? c.matchPercent : aiMatchScores[c.id];
              const specialties = (c.tags || []).filter(Boolean).map(roleLabel);
              return (
                <li key={c.id}>
                  <button
                    onClick={() => {
                      // Άνοιξε απευθείας την καρτέλα (δουλεύει και σε desktop όπου δεν υπάρχει swipe)
                      if (isWorker && c.type === 'job') {
                        setViewingJobDetail(c);
                      } else if (isWorker && c.businessUserId) {
                        setViewingBusinessId(c.businessUserId);
                      } else {
                        setViewingProfileId(c.id);
                      }
                    }}
                    className="group w-full flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 hover:shadow-md hover:ring-blue-200 transition-all active:scale-[0.99] text-left"
                  >
                    {/* Avatar / Logo */}
                    <div className="relative h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-purple-200 via-pink-200 to-rose-200 flex items-center justify-center">
                      {photo ? (
                        <img src={photo} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-2xl sm:text-3xl font-black text-purple-700">
                          {c.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      )}
                      {c.isBoosted && (
                        <span className="absolute -top-0 -left-0 rounded-br-md bg-purple-500/90 px-1 py-0.5 text-[9px] font-bold text-white">
                          BOOST
                        </span>
                      )}
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm sm:text-base font-bold text-gray-900 truncate">
                          {c.name}
                        </p>
                        {c.verified && (
                          <span
                            className="inline-flex items-center rounded-full bg-blue-500/10 px-1.5 text-[10px] font-bold text-blue-600"
                            title="Επαληθευμένος"
                          >
                            ✓
                          </span>
                        )}
                        {c.isPremium && (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-700">
                            ⭐ Premium
                          </span>
                        )}
                      </div>
                      {specialties.length > 0 && (
                        <p className="text-xs sm:text-sm font-semibold text-blue-700 truncate" title={specialties.join(' · ')}>
                          {specialties.slice(0, 2).join(' · ')}
                          {specialties.length > 2 ? ` +${specialties.length - 2}` : ''}
                        </p>
                      )}
                      {c.companyName && (
                        <p className="text-xs sm:text-sm text-gray-600 truncate">
                          🏢 {c.companyName}
                        </p>
                      )}
                      {c.location && (
                        <p className="mt-0.5 text-xs text-gray-500 truncate">
                          📍 {c.location}
                        </p>
                      )}
                      {(c.salary || c.experience) && (
                        <p className="mt-0.5 text-xs font-semibold text-emerald-600 truncate">
                          {c.salary || c.experience}
                        </p>
                      )}
                    </div>

                    {/* Right column: AI score + chevron */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      {typeof score === 'number' && score > 0 && (
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm ${
                            score >= 80
                              ? 'bg-emerald-500'
                              : score >= 60
                                ? 'bg-blue-500'
                                : 'bg-gray-500'
                          }`}
                          title="Ταίριασμα βάσει ειδικότητας, περιοχής & χαρακτηριστικών"
                        >
                          🎯 {score}%
                        </span>
                      )}
                      <span
                        aria-hidden="true"
                        className="text-gray-300 text-2xl leading-none group-hover:text-blue-400 transition-colors"
                      >
                        ›
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          )}
          </FilteredListLayout>
        </div>
      )}

      {/* SWIPE VIEW — single card (ΜΟΝΟ σε mobile) */}
      {discoverTab === 'discover' && !noCandidates && currentCandidate && discoverView === 'swipe' && (

      <div className="mx-auto max-w-lg select-none lg:hidden">
        <Card
          className="overflow-hidden shadow-2xl touch-none"
          onPointerDown={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('button, a, [data-no-drag]')) return;
            dragRef.current = { startX: e.clientX, startY: e.clientY, moved: false };
            setDragging(true);
          }}
          onPointerMove={(e) => {
            if (!dragging) return;
            const dx = e.clientX - dragRef.current.startX;
            const dy = e.clientY - dragRef.current.startY;
            if (Math.abs(dx) > 6 || Math.abs(dy) > 6) dragRef.current.moved = true;
            setOffsetX(dx);
            setOffsetY(dy);
          }}
          onPointerUp={() => {
            if (!dragging) return;
            setDragging(false);
            const { moved } = dragRef.current;
            if (Math.abs(offsetX) > 100) {
              const dir = offsetX > 0 ? 'right' : 'left';
              setExitDir(dir);
              setTimeout(() => {
                handleAction(dir === 'right' ? 'like' : 'skip');
                setOffsetX(0);
                setOffsetY(0);
                setExitDir(null);
              }, 220);
            } else if (!moved) {
              // Tap → open profile
              if (isWorker && currentCandidate.type === 'job') {
                setViewingJobDetail(currentCandidate);
              } else if (isWorker && currentCandidate.businessUserId) {
                setViewingBusinessId(currentCandidate.businessUserId);
              } else {
                setViewingProfileId(currentCandidate.id);
              }
              setOffsetX(0);
              setOffsetY(0);
            } else {
              setOffsetX(0);
              setOffsetY(0);
            }
          }}
          onPointerCancel={() => {
            setDragging(false);
            setOffsetX(0);
            setOffsetY(0);
          }}
          style={{
            transform:
              exitDir === 'right'
                ? 'translate(130vw, 0) rotate(40deg)'
                : exitDir === 'left'
                  ? 'translate(-130vw, 0) rotate(-40deg)'
                  : `translate(${offsetX}px, ${offsetY * 0.5}px) rotate(${offsetX / 22}deg)`,
            transition: dragging ? 'none' : 'transform 220ms ease-out',
            cursor: dragging ? 'grabbing' : 'grab',
          }}
        >
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
            {/* Swipe overlays */}
            <div
              className="pointer-events-none absolute top-6 left-6 z-20 rounded-2xl border-4 border-emerald-400 px-4 py-1.5 text-xl font-black text-emerald-400 -rotate-12"
              style={{ opacity: Math.max(0, Math.min(1, offsetX / 100)) }}
            >
              LIKE
            </div>
            <div
              className="pointer-events-none absolute top-6 right-6 z-20 rounded-2xl border-4 border-rose-400 px-4 py-1.5 text-xl font-black text-rose-400 rotate-12"
              style={{ opacity: Math.max(0, Math.min(1, -offsetX / 100)) }}
            >
              NOPE
            </div>
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
                  <Badge key={tag} variant="secondary">{roleLabel(tag)}</Badge>
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

            {/* Matched → chat link */}
            {currentCandidate.isMatched && (
              <div className="mt-4">
                <a data-no-drag onClick={(e) => e.stopPropagation()} href="/dashboard/messages" className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700">
                  💬 Άνοιξε Chat
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottom action bar — ❌ Πέρασε | 📁 Αποθήκευση | ❤️ Like */}
        {!currentCandidate.isMatched && (
          <div className="mt-5 flex items-center justify-center gap-5" data-no-drag>
            {/* Skip */}
            <button
              data-no-drag
              onClick={(e) => { e.stopPropagation(); handleAction('skip'); }}
              disabled={actionLoading}
              aria-label="Πέρασε"
              title="Πέρασε"
              className="group h-16 w-16 inline-flex items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-gray-200 text-rose-500 hover:text-white hover:bg-rose-500 hover:ring-rose-500 active:scale-90 transition-all disabled:opacity-50"
            >
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Save (folder, filled blue with bounce animation) */}
            <button
              data-no-drag
              onClick={(e) => {
                e.stopPropagation();
                saveItem(currentCandidate.id, currentCandidate.type === 'job' ? 'job' : 'worker');
                setSavedBounce(true);
                setTimeout(() => setSavedBounce(false), 600);
              }}
              aria-label="Αποθήκευση"
              title="Αποθήκευση"
              className={`h-14 w-14 inline-flex items-center justify-center rounded-full bg-blue-600 text-white shadow-lg ring-1 ring-blue-700 hover:bg-blue-700 active:scale-90 transition-all ${savedBounce ? 'animate-savedBounce' : ''}`}
            >
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.5 21a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3h-5.379a.75.75 0 0 1-.53-.22L11.47 3.66A2.25 2.25 0 0 0 9.879 3H4.5a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h15Z" />
              </svg>
            </button>

            {/* Like */}
            <button
              data-no-drag
              onClick={(e) => { e.stopPropagation(); handleAction('like'); }}
              disabled={actionLoading || currentCandidate.swipeStatus === 'like'}
              aria-label="Ενδιαφέρομαι"
              title="Ενδιαφέρομαι"
              className={`h-16 w-16 inline-flex items-center justify-center rounded-full shadow-lg ring-1 active:scale-90 transition-all ${
                currentCandidate.swipeStatus === 'like'
                  ? 'bg-gray-300 ring-gray-300 text-white cursor-not-allowed'
                  : 'bg-white text-emerald-600 ring-gray-200 hover:bg-emerald-500 hover:text-white hover:ring-emerald-500'
              }`}
            >
              <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
              </svg>
            </button>
          </div>
        )}

        {/* Hint */}
        <p className="mt-3 text-center text-[11px] text-gray-400">
          👆 Πάτα για προφίλ · 👈 Σύρε αριστερά (skip) · Σύρε δεξιά 👉 (like)
        </p>
      </div>
      )}
        </div>{/* /flex-1 */}
      </div>{/* /lg:flex */}

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
