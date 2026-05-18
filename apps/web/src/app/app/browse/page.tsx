'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { WORKER_JOB_ROLE_LABELS_EL } from '@staffnow/config';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';

// ==================== Business type labels ====================
const BUSINESS_TYPE_LABELS: Record<string, string> = {
  hotel: 'Ξενοδοχείο',
  restaurant: 'Εστιατόριο',
  beach_bar: 'Beach Bar',
  bar: 'Μπαρ',
  cafe: 'Καφετέρια',
  villa: 'Βίλα',
  tourism_company: 'Τουριστική',
  resort: 'Resort',
  technical: 'Τεχνική',
  other: 'Επιχείρηση',
};

// ==================== FAKE NOTIFICATIONS ====================
const WORKER_NOTIFICATIONS = [
  { icon: '🆕', text: '3 νέοι εργαζόμενοι έκαναν εγγραφή', time: 'πριν 2 λεπτά', type: 'signup' },
  { icon: '🎉', text: 'Ο Γιώργος Π. προσελήφθη από το Sunset Beach Bar', time: 'πριν 15 λεπτά', type: 'hire' },
  { icon: '✨', text: 'Η Μαρία Κ. ενημέρωσε το προφίλ της', time: 'πριν 28 λεπτά', type: 'update' },
  { icon: '🆕', text: '5 νέοι σερβιτόροι εγγράφηκαν από Μύκονο', time: 'πριν 45 λεπτά', type: 'signup' },
  { icon: '🎉', text: 'Ο Νίκος Δ. ξεκίνησε δουλειά στο Athens Rooftop', time: 'πριν 1 ώρα', type: 'hire' },
  { icon: '⭐', text: 'Η Ελένη Μ. πήρε 5 αστέρια αξιολόγηση', time: 'πριν 1.5 ώρα', type: 'rating' },
  { icon: '🆕', text: '2 νέοι bartenders εγγράφηκαν από Σαντορίνη', time: 'πριν 2 ώρες', type: 'signup' },
  { icon: '🎉', text: 'Η Σοφία Τ. προσελήφθη από το Crete Beach Resort', time: 'πριν 3 ώρες', type: 'hire' },
];

const BUSINESS_NOTIFICATIONS = [
  { icon: '🏢', text: '3 νέες επιχειρήσεις δημιουργήθηκαν', time: 'πριν 2 λεπτά', type: 'new' },
  { icon: '📢', text: 'Η εταιρεία Sunset Beach Bar δημοσίευσε νέα αγγελία', time: 'πριν 10 λεπτά', type: 'job' },
  { icon: '🌟', text: 'Το Mykonos Grand Hotel έλαβε νέα κριτική 5 αστέρων', time: 'πριν 25 λεπτά', type: 'review' },
  { icon: '🏢', text: '2 νέα ξενοδοχεία στη Σαντορίνη εγγράφηκαν', time: 'πριν 40 λεπτά', type: 'new' },
  { icon: '📢', text: 'Το Athens Rooftop Bar αναζητά 5 σερβιτόρους', time: 'πριν 1 ώρα', type: 'job' },
  { icon: '🌟', text: 'Κριτική: "Εξαιρετικό περιβάλλον εργασίας" - Crete Resort', time: 'πριν 1.5 ώρα', type: 'review' },
  { icon: '🏢', text: 'Νέο Beach Bar εγγράφηκε στην Πάρο', time: 'πριν 2 ώρες', type: 'new' },
  { icon: '📢', text: 'Η εταιρεία Blue Horizon δημοσίευσε 3 αγγελίες', time: 'πριν 3 ώρες', type: 'job' },
];

// ==================== Category filter mapping ====================
const BUSINESS_CATEGORIES = [
  { key: 'all', label: 'Όλες' },
  { key: 'restaurant', label: 'Εστίαση', types: ['restaurant', 'cafe'] },
  { key: 'tourism', label: 'Τουρισμός', types: ['tourism_company', 'resort', 'villa'] },
  { key: 'bars', label: 'Bars', types: ['bar', 'beach_bar'] },
  { key: 'hotels', label: 'Ξενοδοχεία', types: ['hotel'] },
];

// ==================== Mock reviews data ====================
const MOCK_REVIEWS = [
  { name: 'Μαρία Κ.', role: 'Σερβιτόρα', rating: 5, text: 'Εξαιρετικό περιβάλλον εργασίας! Πολύ φιλική ατμόσφαιρα και σωστή διαχείριση.', time: 'πριν 2 εβδομάδες' },
  { name: 'Γιώργος Π.', role: 'Bartender', rating: 5, text: 'Πολύ καλή ομάδα, σωστά ωράρια και πάντα στην ώρα τους οι πληρωμές.', time: 'πριν 1 μήνα' },
  { name: 'Ελένη Δ.', role: 'Καμαριέρα', rating: 4, text: 'Καλές συνθήκες εργασίας. Η διαμονή που παρέχεται είναι πολύ καθαρή.', time: 'πριν 1.5 μήνα' },
  { name: 'Νίκος Α.', role: 'Σεφ', rating: 5, text: 'Από τις καλύτερες δουλειές που είχα. Σύγχρονος εξοπλισμός και σεβασμός.', time: 'πριν 2 μήνες' },
  { name: 'Κατερίνα Μ.', role: 'Ρεσεψιονίστ', rating: 4, text: 'Πολύ καλή εμπειρία συνολικά. Θα ήθελα λίγο πιο ευέλικτο ωράριο.', time: 'πριν 3 μήνες' },
];

function BrowseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const role = searchParams.get('role') || localStorage.getItem('staffnow_guest_role') || 'business';
  const isBusiness = role === 'business';

  // Shared state
  const [workers, setWorkers] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalJobs: 0, totalMatches: 0 });
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Business role (browsing workers) state
  const [selectedWorker, setSelectedWorker] = useState<any | null>(null);
  const [filter, setFilter] = useState<'all' | 'online' | 'new'>('all');

  // Worker role (browsing businesses) state
  const [businessCategory, setBusinessCategory] = useState('all');
  const [selectedBusiness, setSelectedBusiness] = useState<any | null>(null);
  const [businessProfileTab, setBusinessProfileTab] = useState<'about' | 'jobs' | 'reviews'>('jobs');
  const [businessJobs, setBusinessJobs] = useState<any[]>([]);
  const [businessJobsLoading, setBusinessJobsLoading] = useState(false);

  // Filter drawer state
  const [showFilters, setShowFilters] = useState(false);
  const [filterLocation, setFilterLocation] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('');

  // Notification rotation
  const [visibleNotifIndex, setVisibleNotifIndex] = useState(0);
  const notifications = isBusiness ? WORKER_NOTIFICATIONS : BUSINESS_NOTIFICATIONS;
  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleNotifIndex((prev) => (prev + 1) % Math.max(1, notifications.length - 2));
    }, 6000);
    return () => clearInterval(interval);
  }, [notifications.length]);

  // Online count (fake but realistic)
  const [onlineCount, setOnlineCount] = useState(672);
  useEffect(() => {
    const i = setInterval(() => {
      setOnlineCount((c) => Math.max(600, c + Math.floor(Math.random() * 7) - 3));
    }, 5000);
    return () => clearInterval(i);
  }, []);

  // If logged in, redirect
  useEffect(() => {
    if (user) router.replace('/dashboard');
  }, [user, router]);

  // Fetch data
  useEffect(() => {
    (async () => {
      try {
        if (isBusiness) {
          const [workersRes, activityRes] = await Promise.all([
            fetch(`${API_BASE}/public/workers?limit=30`).then((r) => r.json()),
            fetch(`${API_BASE}/public/activity`).then((r) => r.json()),
          ]);
          if (workersRes.success) setWorkers(workersRes.data || []);
          if (activityRes.success) setStats(activityRes.data.stats);
        } else {
          const [businessesRes, activityRes] = await Promise.all([
            fetch(`${API_BASE}/public/businesses?limit=30`).then((r) => r.json()),
            fetch(`${API_BASE}/public/activity`).then((r) => r.json()),
          ]);
          if (businessesRes.success) setBusinesses(businessesRes.data || []);
          if (activityRes.success) setStats(activityRes.data.stats);
        }
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, [isBusiness]);

  // Load business jobs when a business is selected and the jobs tab is active
  const loadBusinessJobs = useCallback(async (userId: string) => {
    setBusinessJobsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/public/businesses/${userId}/jobs`);
      const data = await res.json();
      if (data.success) setBusinessJobs(data.data || []);
      else setBusinessJobs([]);
    } catch {
      setBusinessJobs([]);
    } finally {
      setBusinessJobsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedBusiness && businessProfileTab === 'jobs') {
      loadBusinessJobs(selectedBusiness.userId);
    }
  }, [selectedBusiness, businessProfileTab, loadBusinessJobs]);

  // Filter workers (business view)
  const filteredWorkers = workers.filter((w) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = (w.full_name || '').toLowerCase().includes(q) ||
        (w.roles || []).some((r: string) => (WORKER_JOB_ROLE_LABELS_EL[r] || r).toLowerCase().includes(q)) ||
        (w.city || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    if (filter === 'online') return w.availability === 'immediate';
    if (filter === 'new') {
      const dayAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return new Date(w.created_at).getTime() > dayAgo;
    }
    return true;
  });

  // Filter businesses (worker view) — uses REAL hiring roles from API
  const filteredBusinesses = businesses.filter((b) => {
    // Text search (name + category + city + actual hiring roles from jobs)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const nameMatch = (b.companyName || '').toLowerCase().includes(q);
      const typeMatch = (BUSINESS_TYPE_LABELS[b.businessType] || '').toLowerCase().includes(q);
      const cityMatch = (b.city || '').toLowerCase().includes(q);
      // Search in ACTUAL hiring roles from business's open job listings
      const hiringRoleMatch = (b.hiringRoles || []).some((r: string) =>
        (WORKER_JOB_ROLE_LABELS_EL[r] || r).toLowerCase().includes(q)
      );
      const jobCityMatch = (b.jobCities || []).some((c: string) =>
        c.toLowerCase().includes(q)
      );
      if (!nameMatch && !typeMatch && !cityMatch && !hiringRoleMatch && !jobCityMatch) return false;
    }
    // Category filter
    if (businessCategory !== 'all') {
      const cat = BUSINESS_CATEGORIES.find((c) => c.key === businessCategory);
      if (cat && cat.types && !cat.types.includes(b.businessType)) return false;
    }
    // Location filter — checks business city AND job cities
    if (filterLocation) {
      const loc = filterLocation.toLowerCase();
      const bizCityMatch = (b.city || '').toLowerCase().includes(loc) || (b.region || '').toLowerCase().includes(loc);
      const jobCityMatch = (b.jobCities || []).some((c: string) => c.toLowerCase().includes(loc));
      if (!bizCityMatch && !jobCityMatch) return false;
    }
    // Specialty filter — checks ACTUAL hiring roles from open jobs
    // Compares against both the raw key AND the Greek label (partial match)
    if (filterSpecialty) {
      const spec = filterSpecialty.toLowerCase();
      const hasRole = (b.hiringRoles || []).some((r: string) => {
        const label = (WORKER_JOB_ROLE_LABELS_EL[r] || '').toLowerCase();
        const key = r.toLowerCase();
        // Partial match: "σερβιτόρος" matches "σερβιτόρος/α"
        return label.includes(spec) || spec.includes(label.replace('/α', '').replace('/ια', '')) || key.includes(spec) || spec.includes(key);
      });
      if (!hasRole) return false;
    }
    return true;
  });

  const totalCount = isBusiness ? (stats.totalUsers || 12458) : 5842;
  const totalLabel = isBusiness ? 'Εργαζόμενοι στην πλατφόρμα' : 'Επιχειρήσεις στην πλατφόρμα';
  const onlineLabel = isBusiness ? 'Online τώρα' : 'Online τώρα';
  const displayOnlineCount = isBusiness ? 1247 + Math.floor(onlineCount / 2) : onlineCount;

  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <p className="mt-4 text-sm text-gray-500">
          {isBusiness ? 'Φόρτωση εργαζομένων...' : 'Φόρτωση επιχειρήσεων...'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* ====== TOP BAR ====== */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/staffnow-logo.png" alt="StaffNow" className="h-9 w-9 rounded-full" />
            <span className="text-lg font-extrabold">
              Staff<span className="text-blue-500">Now</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Bell icon removed for non-logged users — only show Σύνδεση */}
            <button
              onClick={() => setShowAuthModal(true)}
              className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-bold text-white"
            >
              Σύνδεση
            </button>
          </div>
        </div>
      </div>

      {/* ====== STATS BOXES ====== */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-blue-50 border border-blue-100 p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              {isBusiness ? <span className="text-lg">👥</span> : <span className="text-lg">🏢</span>}
            </div>
            <p className="text-2xl font-extrabold text-blue-700 tabular-nums">{totalCount.toLocaleString('el-GR')}</p>
            <p className="text-[10px] font-semibold text-blue-500 mt-0.5">{totalLabel}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
              </span>
            </div>
            <p className="text-2xl font-extrabold text-emerald-700 tabular-nums">{displayOnlineCount.toLocaleString('el-GR')}</p>
            <p className="text-[10px] font-semibold text-emerald-500 mt-0.5">Online τώρα</p>
          </div>
        </div>
      </div>

      {/* ====== NOTIFICATIONS (fake for marketing) — last 10, auto-refresh ====== */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
            <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            Ενημερώσεις
          </p>
          <button className="text-[10px] font-semibold text-blue-600 hover:underline">
            Προβολή όλων
          </button>
        </div>
        <div className="space-y-2">
          {notifications.slice(visibleNotifIndex, visibleNotifIndex + 3).map((n, i) => (
            <div
              key={`${visibleNotifIndex}-${i}`}
              className={`flex items-start gap-2.5 rounded-xl p-2.5 transition-all animate-in fade-in duration-500 ${
                i === 0 ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'
              }`}
            >
              <span className="text-base mt-0.5">{n.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-900 leading-snug">{n.text}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{n.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ====== SEARCH BAR + FILTER BUTTON ====== */}
      <div className="sticky top-[53px] z-20 bg-white border-b border-gray-100 px-4 py-2.5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isBusiness ? 'Αναζήτηση εργαζομένων, ειδικότητα...' : 'Επιχείρηση, κατηγορία, ειδικότητα...'}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
            />
          </div>
          {/* Filter button */}
          <button
            onClick={() => setShowFilters(true)}
            className={`flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-xl border transition-colors ${
              filterLocation || filterSpecialty
                ? 'border-blue-500 bg-blue-50 text-blue-600'
                : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>
        </div>
        {/* Active filter chips */}
        {(filterLocation || filterSpecialty) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {filterLocation && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                📍 {filterLocation}
                <button onClick={() => setFilterLocation('')} className="text-blue-400 hover:text-red-500 ml-0.5">✕</button>
              </span>
            )}
            {filterSpecialty && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 border border-purple-200 px-2.5 py-0.5 text-[11px] font-semibold text-purple-700">
                🎯 {filterSpecialty}
                <button onClick={() => setFilterSpecialty('')} className="text-purple-400 hover:text-red-500 ml-0.5">✕</button>
              </span>
            )}
          </div>
        )}
        {/* Filter tabs */}
        <div className="mt-2 flex gap-2 overflow-x-auto scrollbar-hide">
          {isBusiness ? (
            <>
              {[
                { key: 'all' as const, label: 'Όλοι οι εργαζόμενοι' },
                { key: 'online' as const, label: 'Online τώρα' },
                { key: 'new' as const, label: 'Νέοι' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                    filter === f.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </>
          ) : (
            <>
              {BUSINESS_CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setBusinessCategory(cat.key)}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                    businessCategory === cat.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ====== SECTION TITLE ====== */}
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-base font-bold text-gray-900">
          {isBusiness ? 'Προτεινόμενοι εργαζόμενοι' : 'Επιχειρήσεις'}
        </h2>
      </div>

      {/* ====== WORKERS LIST (business view) ====== */}
      {isBusiness && (
        <div className="px-4 space-y-2.5">
          {filteredWorkers.length === 0 ? (
            <div className="rounded-2xl bg-white border border-gray-100 p-8 text-center">
              <p className="text-3xl mb-2">🔍</p>
              <p className="text-sm font-semibold text-gray-900">Δεν βρέθηκαν εργαζόμενοι</p>
              <p className="mt-1 text-xs text-gray-500">Δοκίμασε διαφορετική αναζήτηση</p>
            </div>
          ) : (
            filteredWorkers.map((w) => {
              const matchPercent = 70 + Math.floor(Math.random() * 25);
              const isOnline = w.availability === 'immediate' || Math.random() > 0.4;
              return (
                <button
                  key={w.user_id}
                  onClick={() => setSelectedWorker(w)}
                  className="w-full flex items-center gap-3 rounded-2xl bg-white border border-gray-100 p-3.5 shadow-sm hover:shadow-md active:scale-[0.98] transition-all text-left"
                >
                  {/* Avatar + online indicator */}
                  <div className="relative flex-shrink-0">
                    {w.photo_url ? (
                      <img src={w.photo_url} alt="" className="h-14 w-14 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
                        {(w.full_name || '?')[0]?.toUpperCase()}
                      </div>
                    )}
                    {isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white bg-emerald-500">
                        <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900 truncate">{w.full_name || 'Εργαζόμενος'}</p>
                      {w.verified === 1 && <span className="text-emerald-500 text-[10px]">✓</span>}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {(w.roles || []).map((r: string) => WORKER_JOB_ROLE_LABELS_EL[r] || r).join(', ') || '—'}
                      {w.years_of_experience ? ` · ${w.years_of_experience} χρ.` : ''}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      📍 {[w.city, w.region].filter(Boolean).join(', ') || 'Ελλάδα'}
                    </p>
                  </div>

                  {/* Match % + online label */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      matchPercent >= 85
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      {matchPercent}% Match
                    </span>
                    {isOnline && (
                      <span className="text-[9px] font-semibold text-emerald-600">Online</span>
                    )}
                  </div>

                  {/* Arrow */}
                  <svg className="h-4 w-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* ====== BUSINESSES LIST (worker view) ====== */}
      {!isBusiness && (
        <div className="px-4 space-y-2.5">
          {filteredBusinesses.length === 0 ? (
            <div className="rounded-2xl bg-white border border-gray-100 p-8 text-center">
              <p className="text-3xl mb-2">🏢</p>
              <p className="text-sm font-semibold text-gray-900">Δεν βρέθηκαν επιχειρήσεις</p>
              <p className="mt-1 text-xs text-gray-500">Δοκίμασε διαφορετική αναζήτηση</p>
            </div>
          ) : (
            filteredBusinesses.map((b) => {
              const isOnline = Math.random() > 0.35;
              return (
                <button
                  key={b.userId}
                  onClick={() => {
                    setSelectedBusiness(b);
                    setBusinessProfileTab('jobs');
                    setBusinessJobs([]);
                  }}
                  className="w-full flex items-center gap-3 rounded-2xl bg-white border border-gray-100 p-3.5 shadow-sm hover:shadow-md active:scale-[0.98] transition-all text-left"
                >
                  {/* Logo */}
                  <div className="relative flex-shrink-0">
                    {b.logoUrl ? (
                      <img src={b.logoUrl} alt="" className="h-14 w-14 rounded-2xl object-cover border border-gray-100" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-lg font-bold text-blue-700 border border-blue-200">
                        {(b.companyName || '?')[0]?.toUpperCase()}
                      </div>
                    )}
                    {isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white bg-emerald-500">
                        <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900 truncate">{b.companyName}</p>
                      {b.verified && <span className="text-blue-500 text-[10px]">✓</span>}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {BUSINESS_TYPE_LABELS[b.businessType] || 'Επιχείρηση'}
                      {b.city ? ` · ${b.city}` : ''}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {b.openJobs > 0 && (
                        <span className="text-[10px] font-semibold text-blue-600">
                          💼 {b.openJobs} {b.openJobs === 1 ? 'θέση' : 'θέσεις'}
                        </span>
                      )}
                      {isOnline && (
                        <span className="text-[9px] font-semibold text-emerald-600 flex items-center gap-0.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Online
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Προβολή button */}
                  <div className="flex-shrink-0">
                    <span className="rounded-full bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white">
                      Προβολή
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* ====== WORKER PROFILE BOTTOM SHEET (business view) ====== */}
      {selectedWorker && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSelectedWorker(null)} />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
            {/* Drag handle */}
            <div className="sticky top-0 flex justify-center pt-3 pb-1 bg-white rounded-t-3xl z-10">
              <div className="h-1 w-10 rounded-full bg-gray-300" />
            </div>

            <div className="px-5 pb-8">
              {/* Header */}
              <div className="flex flex-col items-center text-center mt-2">
                <div className="relative">
                  {selectedWorker.photo_url ? (
                    <img src={selectedWorker.photo_url} alt="" className="h-24 w-24 rounded-full object-cover border-4 border-white shadow-xl" />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 text-3xl font-bold text-blue-700 shadow-xl">
                      {(selectedWorker.full_name || '?')[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 border-2 border-white">
                    <span className="h-2 w-2 rounded-full bg-white" />
                  </span>
                </div>

                <h2 className="mt-3 text-xl font-extrabold text-gray-900">{selectedWorker.full_name || 'Εργαζόμενος'}</h2>
                <p className="text-sm text-gray-500">
                  {(selectedWorker.roles || []).map((r: string) => WORKER_JOB_ROLE_LABELS_EL[r] || r).join(', ')}
                </p>
                {selectedWorker.city && (
                  <p className="mt-1 text-xs text-gray-400">📍 {[selectedWorker.city, selectedWorker.region].filter(Boolean).join(', ')}</p>
                )}
                <div className="mt-2 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-bold text-blue-700">
                  🧠 {70 + Math.floor(Math.random() * 25)}% Match
                </div>
              </div>

              {/* Εμπειρία */}
              <div className="mt-6">
                <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                  💼 Εμπειρία
                </h3>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedWorker.years_of_experience ? `${selectedWorker.years_of_experience} χρόνια εμπειρίας` : 'Χωρίς δηλωμένη εμπειρία'}
                  </p>
                  {selectedWorker.roles?.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Ειδικότητες: {selectedWorker.roles.map((r: string) => WORKER_JOB_ROLE_LABELS_EL[r] || r).join(', ')}
                    </p>
                  )}
                </div>
              </div>

              {/* Δεξιότητες */}
              {selectedWorker.roles?.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                    ⭐ Δεξιότητες
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedWorker.roles.map((r: string) => (
                      <span key={r} className="flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700">
                        ✓ {WORKER_JOB_ROLE_LABELS_EL[r] || r}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Τύπος εργασίας */}
              <div className="mt-4">
                <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                  📋 Τύπος εργασίας
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedWorker.employment_type && (
                    <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700">
                      {selectedWorker.employment_type === 'seasonal' ? '☀️ Σεζόν' : selectedWorker.employment_type === 'full_time' ? '📅 Πλήρης' : selectedWorker.employment_type === 'part_time' ? '⏰ Μερική' : selectedWorker.employment_type}
                    </span>
                  )}
                  {selectedWorker.availability && (
                    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700">
                      ⚡ {selectedWorker.availability === 'immediate' ? 'Διαθέσιμος άμεσα' : selectedWorker.availability}
                    </span>
                  )}
                </div>
              </div>

              {/* Bio */}
              {selectedWorker.bio && (
                <div className="mt-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                    📝 Σχετικά
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{selectedWorker.bio}</p>
                </div>
              )}

              {/* Locked contact info */}
              <div className="mt-5 rounded-xl bg-amber-50 border border-amber-200 p-4 text-center">
                <p className="text-sm font-bold text-amber-800">🔒 Στοιχεία επικοινωνίας</p>
                <p className="mt-1 text-xs text-amber-700">
                  Τηλέφωνο, email και CV διαθέσιμα μετά το match
                </p>
              </div>

              {/* Action buttons */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setSelectedWorker(null)}
                  className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-200 bg-white text-xl text-gray-400 active:scale-90"
                >
                  ✕
                </button>
                <button
                  onClick={() => {
                    setSelectedWorker(null);
                  }}
                  className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border-2 border-amber-200 bg-amber-50 text-xl active:scale-90"
                >
                  🔖
                </button>
                <button
                  onClick={() => {
                    setSelectedWorker(null);
                    setShowAuthModal(true);
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 active:scale-[0.96]"
                >
                  ❤️ Ενδιαφέρομαι
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ====== BUSINESS PROFILE BOTTOM SHEET (worker view) ====== */}
      {selectedBusiness && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setSelectedBusiness(null)} />
          <div className="fixed inset-x-0 bottom-0 z-50 h-[90vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
            {/* Drag handle */}
            <div className="sticky top-0 z-10 bg-white rounded-t-3xl">
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-gray-300" />
              </div>
            </div>

            {/* Cover photo */}
            {selectedBusiness.coverPhotoUrl ? (
              <div className="relative h-40 w-full">
                <img src={selectedBusiness.coverPhotoUrl} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </div>
            ) : (
              <div className="relative h-40 w-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600">
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center opacity-10">
                  <svg className="h-24 w-24 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
                  </svg>
                </div>
              </div>
            )}

            {/* Logo + Follow button row */}
            <div className="px-5 -mt-8 relative z-10">
              <div className="flex items-end justify-between">
                <div className="flex-shrink-0">
                  {selectedBusiness.logoUrl ? (
                    <img src={selectedBusiness.logoUrl} alt="" className="h-16 w-16 rounded-2xl border-4 border-white object-cover shadow-lg" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white bg-blue-100 text-2xl font-bold text-blue-700 shadow-lg">
                      {(selectedBusiness.companyName || '?')[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm active:scale-95"
                >
                  + Ακολουθήστε
                </button>
              </div>
            </div>

            {/* Business name + heart + type + location */}
            <div className="px-5 mt-3">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-gray-900">{selectedBusiness.companyName}</h2>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-400 active:scale-90"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                  {BUSINESS_TYPE_LABELS[selectedBusiness.businessType] || 'Επιχείρηση'}
                </span>
                {selectedBusiness.city && (
                  <span className="text-xs text-gray-500">📍 {[selectedBusiness.city, selectedBusiness.region].filter(Boolean).join(', ')}</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-gray-500">👥 {5 + Math.floor(Math.random() * 30)} εργαζόμενοι</span>
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  Online
                </span>
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-4 border-b border-gray-200 px-5">
              <div className="flex gap-0">
                {[
                  { key: 'jobs' as const, label: `Θέσεις εργασίας (${selectedBusiness.openJobs || 0})` },
                  { key: 'about' as const, label: 'Σχετικά' },
                  { key: 'reviews' as const, label: 'Κριτικές' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setBusinessProfileTab(tab.key)}
                    className={`px-3 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
                      businessProfileTab === tab.key
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div className="px-5 pb-28">
              {/* ---- Σχετικά tab ---- */}
              {businessProfileTab === 'about' && (
                <div className="mt-4">
                  {/* Description */}
                  {selectedBusiness.description ? (
                    <div className="mb-4">
                      <h3 className="text-sm font-bold text-gray-900 mb-2">Περιγραφή</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{selectedBusiness.description}</p>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <h3 className="text-sm font-bold text-gray-900 mb-2">Περιγραφή</h3>
                      <p className="text-sm text-gray-400 italic">Δεν έχει προστεθεί περιγραφή ακόμα.</p>
                    </div>
                  )}

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Τοποθεσία</p>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">
                        {[selectedBusiness.city, selectedBusiness.region].filter(Boolean).join(', ') || 'Ελλάδα'}
                      </p>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Ιστοσελίδα</p>
                      {selectedBusiness.website ? (
                        <p className="text-sm font-semibold text-blue-600 mt-0.5 truncate">{selectedBusiness.website.replace(/^https?:\/\//, '')}</p>
                      ) : (
                        <p className="text-sm text-gray-400 mt-0.5">—</p>
                      )}
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Κλάδος</p>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">
                        {BUSINESS_TYPE_LABELS[selectedBusiness.businessType] || 'Επιχείρηση'}
                      </p>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Ίδρυση</p>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">
                        {selectedBusiness.createdAt ? new Date(selectedBusiness.createdAt).getFullYear() : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Παροχές */}
                  <div className="mt-5">
                    <h3 className="text-sm font-bold text-gray-900 mb-2">Παροχές</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedBusiness.staffHousing === 1 && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                          🏠 Διαμονή
                        </span>
                      )}
                      {selectedBusiness.mealsProvided === 1 && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                          🍽️ Σίτιση
                        </span>
                      )}
                      {selectedBusiness.transportAssistance === 1 && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                          🚌 Μεταφορά
                        </span>
                      )}
                      {selectedBusiness.bonusProvided === 1 && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                          💰 Bonus
                        </span>
                      )}
                      {selectedBusiness.insuranceProvided === 1 && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                          ⏰ Ευέλικτο ωράριο
                        </span>
                      )}
                      {!selectedBusiness.staffHousing && !selectedBusiness.mealsProvided && !selectedBusiness.transportAssistance && !selectedBusiness.bonusProvided && !selectedBusiness.insuranceProvided && (
                        <p className="text-xs text-gray-400 italic">Δεν έχουν δηλωθεί παροχές</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ---- Θέσεις εργασίας tab ---- */}
              {businessProfileTab === 'jobs' && (
                <div className="mt-4">
                  {businessJobsLoading ? (
                    <div className="flex flex-col items-center justify-center py-10">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                      <p className="mt-3 text-xs text-gray-500">Φόρτωση θέσεων...</p>
                    </div>
                  ) : businessJobs.length === 0 ? (
                    <div className="rounded-2xl bg-gray-50 border border-gray-100 p-8 text-center">
                      <p className="text-3xl mb-2">💼</p>
                      <p className="text-sm font-semibold text-gray-900">Δεν υπάρχουν ανοιχτές θέσεις</p>
                      <p className="mt-1 text-xs text-gray-500">Ακολουθήστε την επιχείρηση για ενημερώσεις</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {businessJobs.map((j: any) => (
                        <div
                          key={j.id}
                          className="rounded-2xl bg-gray-50 border border-gray-100 p-3.5"
                        >
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-gray-900 text-sm">{j.title}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                {j.city && (
                                  <span className="text-[10px] text-gray-400">📍 {j.city}</span>
                                )}
                                {j.employment_type && (
                                  <span className="text-[10px] text-gray-400">
                                    {j.employment_type === 'seasonal' ? '☀️ Σεζόν' : j.employment_type === 'full_time' ? '📅 Πλήρης' : j.employment_type === 'part_time' ? '⏰ Μερική' : j.employment_type}
                                  </span>
                                )}
                              </div>
                              {j.roles && j.roles.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {j.roles.map((r: string) => (
                                    <span key={r} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                                      {WORKER_JOB_ROLE_LABELS_EL[r] || r}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-3">
                              {(j.salary_min || j.salary_max) && (
                                <span className="text-xs font-bold text-emerald-700">
                                  {j.salary_min}{j.salary_max ? `–${j.salary_max}` : ''}€
                                  {j.salary_type === 'hourly' ? '/ωρ' : j.salary_type === 'daily' ? '/ημ' : '/μ'}
                                </span>
                              )}
                              <div className="flex gap-1 mt-1">
                                {j.housing_provided === 1 && <span className="text-[10px]">🏠</span>}
                                {j.meals_provided === 1 && <span className="text-[10px]">🍽️</span>}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedBusiness(null);
                              setShowAuthModal(true);
                            }}
                            className="mt-2.5 w-full rounded-xl bg-blue-600 py-2 text-xs font-bold text-white active:scale-[0.98]"
                          >
                            Στείλε αίτηση
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ---- Κριτικές tab ---- */}
              {businessProfileTab === 'reviews' && (
                <div className="mt-4">
                  {/* Rating summary */}
                  <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 mb-4">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-3xl font-extrabold text-gray-900">4.6</p>
                        <div className="flex gap-0.5 mt-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <svg
                              key={s}
                              className={`h-3.5 w-3.5 ${s <= 4 ? 'text-amber-400' : 'text-gray-300'}`}
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          ))}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">23 κριτικές</p>
                      </div>
                      <div className="flex-1 space-y-1">
                        {[
                          { stars: 5, pct: 65 },
                          { stars: 4, pct: 22 },
                          { stars: 3, pct: 9 },
                          { stars: 2, pct: 3 },
                          { stars: 1, pct: 1 },
                        ].map((row) => (
                          <div key={row.stars} className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500 w-3 text-right">{row.stars}</span>
                            <svg className="h-2.5 w-2.5 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                              <div className="h-full rounded-full bg-amber-400" style={{ width: `${row.pct}%` }} />
                            </div>
                            <span className="text-[10px] text-gray-400 w-7 text-right">{row.pct}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Individual reviews */}
                  <div className="space-y-3">
                    {MOCK_REVIEWS.map((rev, i) => (
                      <div key={i} className="rounded-2xl bg-gray-50 border border-gray-100 p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                            {rev.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900">{rev.name}</p>
                            <p className="text-[10px] text-gray-400">{rev.role} · {rev.time}</p>
                          </div>
                          <div className="flex gap-0.5 flex-shrink-0">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <svg
                                key={s}
                                className={`h-3 w-3 ${s <= rev.rating ? 'text-amber-400' : 'text-gray-300'}`}
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                              </svg>
                            ))}
                          </div>
                        </div>
                        <p className="mt-2 text-xs text-gray-600 leading-relaxed">{rev.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom sticky CTA */}
            <div className="fixed bottom-0 inset-x-0 z-[55] bg-white border-t border-gray-100 px-5 py-3 shadow-lg">
              <button
                onClick={() => {
                  setSelectedBusiness(null);
                  setShowAuthModal(true);
                }}
                className="w-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/30 active:scale-[0.97]"
              >
                Στείλε αίτηση
              </button>
            </div>
          </div>
        </>
      )}

      {/* ====== AUTH MODAL ====== */}
      {showAuthModal && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={() => setShowAuthModal(false)} />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="w-full max-w-sm animate-in zoom-in-95 duration-300">
              <div className="rounded-3xl bg-white p-7 shadow-2xl relative">
                <button
                  onClick={() => setShowAuthModal(false)}
                  className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500"
                >
                  ✕
                </button>

                <div className="text-center mb-5">
                  <img src="/staffnow-logo.png" alt="StaffNow" className="mx-auto mb-3 h-14 w-14 rounded-full" />
                  <h2 className="text-lg font-extrabold text-gray-900">Δημιούργησε λογαριασμό</h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Για να δείξεις ενδιαφέρον χρειάζεται δωρεάν εγγραφή (30")
                  </p>
                </div>

                <a
                  href={`${API_BASE}/auth/google?role=${role}`}
                  className="mb-3 flex w-full items-center justify-center gap-3 rounded-full border-2 border-gray-200 bg-white py-3 text-sm font-bold text-gray-700 active:scale-[0.98]"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Εγγραφή με Google
                </a>

                <Link
                  href="/?register=1"
                  className="mb-2 flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 py-3 text-sm font-bold text-white active:scale-[0.98]"
                >
                  ✉️ Εγγραφή με Email
                </Link>

                <p className="mt-4 text-center text-xs text-gray-400">
                  Ήδη έχεις λογαριασμό; <Link href="/?login=1" className="font-bold text-blue-600">Σύνδεση</Link>
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ====== FILTER DRAWER (bottom sheet) ====== */}
      {showFilters && (
        <>
          <div className="fixed inset-0 z-[55] bg-black/50" onClick={() => setShowFilters(false)} />
          <div className="fixed inset-x-0 bottom-0 z-[56] rounded-t-3xl bg-white shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-gray-300" />
            </div>
            <div className="px-5 pb-8">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-extrabold text-gray-900">Φίλτρα</h3>
                <button
                  onClick={() => setShowFilters(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500"
                >
                  ✕
                </button>
              </div>

              {/* Τοποθεσία */}
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-400">
                  📍 Τοποθεσία
                </label>
                <input
                  type="text"
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  placeholder="π.χ. Μύκονος, Θεσσαλονίκη, Σαντορίνη..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                />
                {/* Quick location chips */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {['Μύκονος', 'Σαντορίνη', 'Αθήνα', 'Θεσσαλονίκη', 'Κρήτη', 'Ρόδος', 'Κέρκυρα'].map((loc) => (
                    <button
                      key={loc}
                      onClick={() => setFilterLocation(loc)}
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                        filterLocation === loc
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Κατηγορία (for worker view) */}
              {!isBusiness && (
                <div className="mb-4">
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-400">
                    📂 Κατηγορία
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {BUSINESS_CATEGORIES.map((cat) => (
                      <button
                        key={cat.key}
                        onClick={() => setBusinessCategory(cat.key)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                          businessCategory === cat.key
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Ειδικότητα */}
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-400">
                  🎯 Ειδικότητα που ψάχνεις
                </label>
                <input
                  type="text"
                  value={filterSpecialty}
                  onChange={(e) => setFilterSpecialty(e.target.value)}
                  placeholder="π.χ. Σερβιτόρος, Bartender, Σεφ..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {['waiter', 'bartender', 'chef', 'maid', 'receptionist', 'dj', 'barista', 'technician'].map((key) => {
                    const spec = WORKER_JOB_ROLE_LABELS_EL[key] || key;
                    return (
                    <button
                      key={key}
                      onClick={() => setFilterSpecialty(spec)}
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                        filterSpecialty === spec
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {spec}
                    </button>
                  );
                  })}
                </div>
              </div>

              {/* Apply + Clear */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setFilterLocation('');
                    setFilterSpecialty('');
                    setBusinessCategory('all');
                  }}
                  className="flex-1 rounded-xl border-2 border-gray-200 py-3 text-sm font-bold text-gray-600 active:scale-[0.98]"
                >
                  Καθαρισμός
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="flex-[2] rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 active:scale-[0.98]"
                >
                  Εφαρμογή φίλτρων
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ====== BOTTOM NAV ====== */}
      <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur-md">
        <div className="flex">
          {[
            { icon: '🔍', label: 'Αναζήτηση', active: true },
            { icon: '🔖', label: isBusiness ? 'Αποθηκευμένα' : 'Αιτήσεις', active: false },
            { icon: '💬', label: 'Μηνύματα', active: false },
            { icon: '👤', label: 'Προφίλ', active: false },
          ].map((tab, i) => (
            <button
              key={tab.label}
              onClick={() => {
                if (i === 0) return;
                setShowAuthModal(true);
              }}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 ${
                tab.active ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-[10px] font-semibold">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    }>
      <BrowseContent />
    </Suspense>
  );
}
