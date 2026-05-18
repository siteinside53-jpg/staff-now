'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';

interface Job {
  id: string;
  title: string;
  company: string;
  city: string;
  region: string;
  salary: string;
  salaryNum: number;
  type: string;
  logo?: string;
  perks: string[];
  isHigh?: boolean;
  isUrgent?: boolean;
  createdAt: string;
}

const HIGH_SALARY_BOOSTS = [
  { title: 'Head Chef', company: 'Luxury Resort Santorini', city: 'Σαντορίνη', salary: '5.000-7.000€', salaryNum: 5000, type: 'Σεζόν', perks: ['🏠 Διαμονή', '🍽️ Σίτιση', '💎 Bonus'], isHigh: true },
  { title: 'Restaurant Manager', company: 'Mykonos Luxe', city: 'Μύκονος', salary: '4.500-6.000€', salaryNum: 4500, type: 'Σεζόν', perks: ['🏠 Διαμονή', '🚗 Transport'], isHigh: true },
  { title: 'Senior Bartender', company: 'Scorpios Beach Club', city: 'Μύκονος', salary: '3.500-5.000€', salaryNum: 3500, type: 'Σεζόν', perks: ['🏠 Διαμονή', '💰 Tips'], isHigh: true },
];

export default function BrowseJobs() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activity, setActivity] = useState<string[]>([]);
  const [stats, setStats] = useState({ total: 0, today: 0, urgent: 0 });
  const [onlineCount, setOnlineCount] = useState(1847);
  const [showSignupGate, setShowSignupGate] = useState<{ title: string; reason: string } | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'urgent' | 'high'>('all');

  // Fetch jobs
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/public/jobs?limit=50`);
        const data = await res.json();
        const items = data?.data || [];
        const mapped: Job[] = items.map((j: any) => ({
          id: j.id,
          title: j.title || 'Θέση εργασίας',
          company: j.display_company_name || j.company_name || 'Επιχείρηση',
          city: j.display_city || j.city || '',
          region: j.display_region || j.region || '',
          salary: j.salary_min && j.salary_max ? `${j.salary_min}-${j.salary_max}€` : 'Συμφωνία',
          salaryNum: j.salary_max || j.salary_min || 1000,
          type: j.employment_type === 'seasonal' ? 'Σεζόν' : j.employment_type === 'full_time' ? 'Full-time' : j.employment_type || '',
          logo: j.company_logo || j.company_cover_photo,
          perks: [
            j.housing_provided === 1 ? '🏠 Διαμονή' : null,
            j.meals_provided === 1 ? '🍽️ Σίτιση' : null,
            j.bonus_provided === 1 ? '💎 Bonus' : null,
          ].filter(Boolean) as string[],
          isUrgent: Math.random() > 0.7,
          createdAt: j.created_at,
        }));

        // Inject HIGH_SALARY jobs at top for wow factor
        const highSalary: Job[] = HIGH_SALARY_BOOSTS.map((h, i) => ({
          id: `boost_${i}`,
          ...h,
          region: h.city,
          isUrgent: true,
          createdAt: new Date().toISOString(),
        }));

        setJobs([...highSalary, ...mapped]);
        setStats({
          total: mapped.length + 5500,
          today: Math.floor(Math.random() * 80) + 120,
          urgent: mapped.filter((j) => j.isUrgent).length + 3,
        });
      } catch {}
    })();
  }, []);

  // Fetch activity
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
      } catch {
        setActivity(DEFAULT_ACTIVITIES);
      }
    })();
  }, []);

  // Animate online count
  useEffect(() => {
    const id = setInterval(() => {
      setOnlineCount((c) => Math.max(1500, c + Math.floor(Math.random() * 20) - 8));
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const filtered = jobs.filter((j) => {
    const q = search.toLowerCase();
    const matchSearch = !q || j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || j.city.toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (filter === 'urgent') return j.isUrgent;
    if (filter === 'high') return j.salaryNum >= 2500;
    return true;
  });

  const handleApply = (job: Job) => {
    setShowSignupGate({
      title: job.title + ' · ' + job.company,
      reason: `Για να κάνεις αίτηση στη θέση αυτή, χρειάζεσαι προφίλ. Παίρνει 30 δευτερόλεπτα!`,
    });
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-gray-50">
      {/* Top header */}
      <div className="flex-shrink-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 text-white">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/app2/version4/role" className="p-1.5 -ml-1.5">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="text-sm font-extrabold">
            <span>Staff</span><span className="text-emerald-200">Now</span>
          </div>
          <Link href="/app2/version4/login" className="text-xs font-semibold underline underline-offset-2">
            Σύνδεση
          </Link>
        </div>

        {/* Hero area */}
        <div className="px-4 pb-4">
          <h1 className="text-2xl font-black leading-tight">
            🎯 {stats.total.toLocaleString('el-GR')}+ θέσεις εργασίας
          </h1>
          <p className="mt-0.5 text-sm text-white/85">
            <span className="font-bold">{stats.today}</span> νέες σήμερα · <span className="font-bold">{stats.urgent}</span> επείγουσες
          </p>

          {/* Live online counter */}
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur px-3 py-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-300" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-300" />
              </span>
              <span className="tabular-nums font-bold">{onlineCount.toLocaleString('el-GR')}</span> online τώρα
            </span>
          </div>
        </div>
      </div>

      {/* Activity marquee */}
      <div className="flex-shrink-0 bg-gray-900 py-2 overflow-hidden border-b border-gray-800">
        <div className="relative flex whitespace-nowrap" style={{ animation: 'scroll 90s linear infinite', width: 'max-content' }}>
          {[...activity, ...activity].map((a, i) => (
            <span key={i} className="mx-6 text-xs font-medium text-emerald-300">{a}</span>
          ))}
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3">
        <div className="relative mb-3">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M21 21l-5.2-5.2m2.2-5.3a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Αναζήτηση θέσης, εταιρίας, πόλης..."
            className="w-full rounded-full bg-gray-100 pl-10 pr-4 py-2.5 text-sm outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>Όλα</FilterChip>
          <FilterChip active={filter === 'urgent'} onClick={() => setFilter('urgent')}>🔥 Επείγει</FilterChip>
          <FilterChip active={filter === 'high'} onClick={() => setFilter('high')}>💎 Υψηλός μισθός</FilterChip>
        </div>
      </div>

      {/* Jobs scroll */}
      <div className="flex-1 overflow-y-auto px-4 py-3 pb-6">
        {/* Hero job card — the WOW */}
        {filtered.length > 0 && filtered[0].isHigh && (
          <div className="mb-4 relative rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-6 text-white shadow-2xl shadow-orange-500/40 overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
            <span className="relative inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur px-3 py-1 text-[10px] font-black uppercase tracking-wider">
              ⭐ Premium Offer
            </span>
            <h3 className="relative mt-3 text-2xl font-black leading-tight">{filtered[0].title}</h3>
            <p className="relative mt-0.5 text-sm opacity-90">{filtered[0].company}</p>
            <p className="relative mt-4 text-4xl font-black">
              💰 {filtered[0].salary}
            </p>
            <p className="relative mt-1 text-sm font-bold text-yellow-100">/μήνα · Σε περιμένει!</p>
            <div className="relative mt-4 flex flex-wrap gap-2">
              {filtered[0].perks.map((p) => (
                <span key={p} className="rounded-full bg-white/20 backdrop-blur px-2.5 py-1 text-xs font-bold">{p}</span>
              ))}
            </div>
            <button
              onClick={() => handleApply(filtered[0])}
              className="relative mt-5 w-full rounded-2xl bg-white py-3 text-sm font-black text-orange-700 active:scale-95 transition-transform"
            >
              🚀 Κάνε αίτηση τώρα
            </button>
          </div>
        )}

        {/* Stats band */}
        <div className="mb-3 grid grid-cols-3 gap-2">
          <MiniStat label="Μέσος μισθός" value="1.450€" color="text-emerald-600" />
          <MiniStat label="Max σήμερα" value="7.000€" color="text-amber-600" />
          <MiniStat label="Πόλεις" value="127" color="text-blue-600" />
        </div>

        {/* Regular jobs */}
        <div className="space-y-3">
          {filtered.slice(filtered.length > 0 && filtered[0].isHigh ? 1 : 0).map((j) => (
            <JobCard key={j.id} job={j} onApply={() => handleApply(j)} />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-4xl mb-2">🔍</p>
              <p className="text-sm text-gray-500">Δεν βρέθηκαν θέσεις με αυτά τα κριτήρια</p>
            </div>
          )}
        </div>
      </div>

      {/* Signup Gate Modal */}
      {showSignupGate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowSignupGate(null)}>
          <div className="w-full max-w-md bg-white rounded-t-3xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center mb-3"><div className="h-1.5 w-10 rounded-full bg-gray-300" /></div>
            <div className="text-5xl mb-3 text-center">🎯</div>
            <h3 className="text-xl font-black text-gray-900 text-center">Ξεκίνα τώρα δωρεάν</h3>
            <p className="mt-2 text-sm text-gray-600 text-center">
              {showSignupGate.reason}
            </p>
            <p className="mt-2 text-xs text-gray-400 text-center font-medium">
              {showSignupGate.title}
            </p>
            <div className="mt-6 space-y-2">
              <button
                onClick={() => router.push('/app2/version4/signup?role=worker')}
                className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3.5 text-sm font-bold text-white shadow-lg active:scale-95 transition-transform"
              >
                Δημιουργία δωρεάν προφίλ
              </button>
              <button
                onClick={() => router.push('/app2/version4/login')}
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
  '💼 Σερβιτόρα · Μύκονος · 1.500€',
  '🟢 Ελένα εγγράφηκε · Θεσσαλονίκη',
  '💼 Head Chef · 5.000€ · Σαντορίνη',
  '🟢 Κώστας εγγράφηκε · Μύκονος',
  '💼 3 matches την τελευταία ώρα',
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

function JobCard({ job, onApply }: { job: Job; onApply: () => void }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform">
      <div className="flex gap-3">
        <div className="flex-shrink-0 h-14 w-14 rounded-xl overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-xl font-bold text-blue-700">
          {job.logo ? <img src={job.logo} alt="" className="h-full w-full object-cover" /> : job.company[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 truncate">{job.title}</p>
              <p className="text-xs text-gray-500 truncate">{job.company}</p>
            </div>
            {job.isUrgent && (
              <span className="flex-shrink-0 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-bold text-red-600">🔥</span>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-500">
            <span>📍 {job.city}{job.region && job.region !== job.city ? `, ${job.region}` : ''}</span>
            {job.type && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold">{job.type}</span>}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className={`text-base font-extrabold ${job.salaryNum >= 3000 ? 'text-orange-600' : job.salaryNum >= 1500 ? 'text-emerald-600' : 'text-gray-900'}`}>
              💰 {job.salary}
            </p>
            <button
              onClick={onApply}
              className="rounded-full bg-emerald-600 text-white px-4 py-1.5 text-xs font-bold shadow-sm active:scale-95 transition-transform"
            >
              Αίτηση
            </button>
          </div>
          {job.perks.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {job.perks.map((p) => (
                <span key={p} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{p}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
