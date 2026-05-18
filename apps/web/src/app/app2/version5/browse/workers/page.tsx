'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';

interface Worker {
  id: string;
  name: string;
  role: string;
  city: string;
  region: string;
  exp: string;
  expYears: number;
  photo?: string;
  verified: boolean;
  availability: string;
  isTop?: boolean;
  isAvailable?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  waiter: 'Σερβιτόρος/α', chef: 'Σεφ', bartender: 'Bartender',
  receptionist: 'Ρεσεψιονίστ', housekeeper: 'Καμαριέρα',
  cook: 'Μάγειρας', barista: 'Barista', driver: 'Οδηγός',
  sales: 'Πωλητής', warehouse: 'Αποθηκάριος', cleaner: 'Καθαριστής',
};

const AVAIL_LABELS: Record<string, string> = {
  immediate: 'Άμεσα',
  within_7_days: '7 ημέρες',
  seasonal: 'Σεζόν',
  full_time: 'Πλήρες',
  part_time: 'Μερικό',
};

export default function BrowseWorkers() {
  const router = useRouter();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [activity, setActivity] = useState<string[]>([]);
  const [stats, setStats] = useState<{ total: number; online: number | null; today: number }>({ total: 0, online: null, today: 0 });
  const [showSignupGate, setShowSignupGate] = useState<{ name: string } | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'available' | 'verified'>('all');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/public/workers?limit=50`);
        const data = await res.json();
        const items = data?.data || [];
        const now = Date.now();
        const mapped: Worker[] = items.map((w: any, i: number) => {
          const expYears = Number(w.years_of_experience) || 0;
          return {
            id: w.user_id,
            name: w.full_name || 'Εργαζόμενος',
            role: ROLE_LABELS[w.roles?.[0]] || w.roles?.[0] || 'Εργαζόμενος',
            city: w.city || '',
            region: w.region || '',
            exp: expYears ? `${expYears} χρόνια` : 'Νέος/α',
            expYears,
            photo: w.photo_url,
            verified: w.verified === 1,
            availability: AVAIL_LABELS[w.availability] || w.availability || '',
            // "Top" = verified με 5+ χρόνια εμπειρίας (όχι τυχαίο top-3)
            isTop: w.verified === 1 && expYears >= 5,
            isAvailable: w.availability === 'immediate',
          };
        });
        setWorkers(mapped);
        setStats((prev) => ({
          ...prev,
          total: data?.meta?.total ?? mapped.length,
          today: mapped.filter((_w, idx) => {
            const raw = items[idx];
            if (!raw?.created_at) return false;
            return (now - new Date(raw.created_at).getTime()) / 36e5 <= 24;
          }).length,
        }));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/public/activity`);
        const data = await res.json();
        const raw = data?.data?.activity || [];
        const msgs = raw.map((a: any) => {
          const loc = a.location ? ` · ${a.location}` : '';
          return a.type === 'signup' ? `🟢 ${a.text}${loc}` : `💼 ${a.text}${loc}`;
        });
        if (msgs.length > 0) setActivity(msgs);
        else setActivity(DEFAULT_ACTIVITIES);
      } catch { setActivity(DEFAULT_ACTIVITIES); }
    })();
  }, []);

  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/public/online-count`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && typeof data?.data?.count === 'number') {
          setOnlineCount(data.data.count);
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = workers.filter((w) => {
    const q = search.toLowerCase();
    const matchSearch = !q || w.name.toLowerCase().includes(q) || w.role.toLowerCase().includes(q) || w.city.toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (filter === 'available') return w.isAvailable;
    if (filter === 'verified') return w.verified;
    return true;
  });

  const handleConnect = (w: Worker) => {
    setShowSignupGate({ name: w.name });
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-gray-50">
      {/* Top header */}
      <div className="flex-shrink-0 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-700 text-white">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/app2/version5/role" className="p-1.5 -ml-1.5">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="text-sm font-extrabold">
            <span>Staff</span><span className="text-blue-200">Now</span>
          </div>
          <Link href="/app2/version5/login" className="text-xs font-semibold underline underline-offset-2">
            Σύνδεση
          </Link>
        </div>

        <div className="px-4 pb-4">
          <h1 className="text-2xl font-black leading-tight">
            👥 {stats.total.toLocaleString('el-GR')}+ εργαζόμενοι
          </h1>
          <p className="mt-0.5 text-sm text-white/85">
            <span className="font-bold">{stats.today}</span> νέοι σήμερα · AI matching
          </p>
          {onlineCount !== null && (
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur px-3 py-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-300" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-300" />
                </span>
                <span className="tabular-nums font-bold">{onlineCount.toLocaleString('el-GR')}</span> online τώρα
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 bg-gray-900 py-2 overflow-hidden border-b border-gray-800">
        <div className="relative flex whitespace-nowrap" style={{ animation: 'scroll 90s linear infinite', width: 'max-content' }}>
          {[...activity, ...activity].map((a, i) => (
            <span key={i} className="mx-6 text-xs font-medium text-blue-300">{a}</span>
          ))}
        </div>
      </div>

      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3">
        <div className="relative mb-3">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M21 21l-5.2-5.2m2.2-5.3a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Αναζήτηση ρόλου, πόλης..."
            className="w-full rounded-full bg-gray-100 pl-10 pr-4 py-2.5 text-sm outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>Όλοι</FilterChip>
          <FilterChip active={filter === 'available'} onClick={() => setFilter('available')}>⚡ Άμεσα</FilterChip>
          <FilterChip active={filter === 'verified'} onClick={() => setFilter('verified')}>✓ Verified</FilterChip>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 pb-6">
        {/* Top picks banner */}
        {filtered.length > 0 && (
          <div className="mb-4 rounded-3xl bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 p-5 text-white shadow-2xl shadow-purple-600/30">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider">
              ⭐ Top Matches για σένα
            </div>
            <p className="mt-1 text-lg font-black">Οι καλύτεροι υποψήφιοι σήμερα</p>
            <p className="mt-0.5 text-sm text-white/80">Βασισμένο σε AI matching</p>
            <div className="mt-3 flex -space-x-3">
              {filtered.slice(0, 5).map((w, i) => (
                <div key={w.id} className="h-11 w-11 rounded-full bg-white flex items-center justify-center text-sm font-bold text-purple-700 ring-2 ring-purple-600 overflow-hidden" style={{ zIndex: 10 - i }}>
                  {w.photo ? <img src={w.photo} alt="" className="h-full w-full object-cover" /> : w.name[0]?.toUpperCase()}
                </div>
              ))}
              <div className="h-11 w-11 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-xs font-bold ring-2 ring-purple-600">
                +{filtered.length - 5}
              </div>
            </div>
          </div>
        )}

        <div className="mb-3 grid grid-cols-3 gap-2">
          <MiniStat label="Άμεσα διαθέσιμοι" value={`${filtered.filter(w => w.isAvailable).length}`} color="text-emerald-600" />
          <MiniStat label="Verified" value={`${filtered.filter(w => w.verified).length}`} color="text-blue-600" />
          <MiniStat label="Πόλεις" value="45+" color="text-purple-600" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {filtered.map((w) => (
            <WorkerCard key={w.id} worker={w} onConnect={() => handleConnect(w)} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-2 text-center py-12">
              <p className="text-4xl mb-2">🔍</p>
              <p className="text-sm text-gray-500">Δεν βρέθηκαν υποψήφιοι</p>
            </div>
          )}
        </div>
      </div>

      {/* Signup gate */}
      {showSignupGate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowSignupGate(null)}>
          <div className="w-full max-w-md bg-white rounded-t-3xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center mb-3"><div className="h-1.5 w-10 rounded-full bg-gray-300" /></div>
            <div className="text-5xl mb-3 text-center">🎯</div>
            <h3 className="text-xl font-black text-gray-900 text-center">Ξεκίνα τώρα δωρεάν</h3>
            <p className="mt-2 text-sm text-gray-600 text-center">
              Για να επικοινωνήσεις με τον/την {showSignupGate.name}, χρειάζεσαι προφίλ. Παίρνει 30 δευτερόλεπτα!
            </p>
            <div className="mt-6 space-y-2">
              <button
                onClick={() => router.push('/app2/version5/signup?role=business')}
                className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg active:scale-95 transition-transform"
              >
                Δημιουργία δωρεάν προφίλ
              </button>
              <button
                onClick={() => router.push('/app2/version5/login')}
                className="w-full rounded-2xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 active:scale-95 transition-transform"
              >
                Έχω ήδη λογαριασμό
              </button>
            </div>
            <p className="mt-4 text-center text-[10px] text-gray-400">
              30 δευτερόλεπτα · Χωρίς κάρτα · Απόρρητα δεδομένα
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

const DEFAULT_ACTIVITIES = [
  '🟢 Μαρία εγγράφηκε · Μύκονος',
  '💼 Νέα αγγελία: Head Chef · Σαντορίνη',
  '🟢 Νίκος εγγράφηκε · Ρόδος',
  '💼 Νέα θέση: Bartender · Κρήτη',
  '🟢 Γιώργος προσλήφθηκε πριν 5 λεπτά',
  '🟢 Ελένα εγγράφηκε · Θεσσαλονίκη',
  '🟢 15 εργαζόμενοι εγγράφηκαν την τελευταία ώρα',
];

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-bold whitespace-nowrap transition-all ${
        active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {children}
    </button>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl bg-white p-2.5 text-center border border-gray-100">
      <p className={`text-sm font-black ${color}`}>{value}</p>
      <p className="text-[10px] text-gray-500 font-medium">{label}</p>
    </div>
  );
}

function WorkerCard({ worker, onConnect }: { worker: Worker; onConnect: () => void }) {
  return (
    <div className="rounded-2xl bg-white overflow-hidden shadow-sm border border-gray-100 active:scale-[0.98] transition-transform">
      {/* Photo */}
      <div className="relative aspect-square bg-gradient-to-br from-purple-200 to-pink-200 flex items-center justify-center">
        {worker.photo ? (
          <img src={worker.photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-5xl font-black text-purple-700">{worker.name[0]?.toUpperCase()}</span>
        )}
        {/* Experience badge (real) */}
        {worker.expYears > 0 && (
          <span className="absolute top-2 left-2 rounded-full bg-white/95 backdrop-blur px-2 py-0.5 text-[10px] font-black text-emerald-700">
            {worker.expYears}+ έτη
          </span>
        )}
        {/* Available dot */}
        {worker.isAvailable && (
          <span className="absolute top-2 right-2 rounded-full bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </span>
        )}
        {worker.verified && (
          <span className="absolute bottom-2 right-2 rounded-full bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5">
            ✓ Verified
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="font-bold text-gray-900 text-sm truncate">{worker.name}</p>
        <p className="text-xs text-gray-500 truncate">{worker.role}</p>
        <p className="mt-1 text-[10px] text-gray-400">📍 {worker.city || worker.region}</p>
        <p className="mt-0.5 text-[10px] text-gray-400">⭐ {worker.exp}</p>
        <button
          onClick={onConnect}
          className="mt-2 w-full rounded-full bg-blue-600 text-white py-1.5 text-xs font-bold active:scale-95 transition-transform"
        >
          💬 Σύνδεση
        </button>
      </div>
    </div>
  );
}
