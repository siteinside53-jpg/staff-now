'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RolePicker() {
  const router = useRouter();

  const pick = (role: 'worker' | 'business') => {
    try {
      sessionStorage.setItem('staffnow_intent', role);
    } catch {}
    router.push(role === 'worker' ? '/app2/version5/browse/jobs' : '/app2/version5/browse/workers');
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-white overflow-y-auto">
      {/* Soft pastel background — matches splash */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-blue-50 to-indigo-50 pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-[400px] h-[400px] rounded-full bg-blue-200/40 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] rounded-full bg-indigo-200/40 blur-[110px] pointer-events-none" />

      {/* Top nav */}
      <div className="relative flex-shrink-0 flex items-center justify-between px-4 py-4">
        <Link href="/app2/version5" className="p-2 -ml-2">
          <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <span className="text-sm font-bold">
          <span style={{ color: '#000000' }}>Staff</span><span style={{ color: '#3B82F6' }}>Now</span>
        </span>
        <div className="w-10" />
      </div>

      <div className="relative flex-1 flex flex-col justify-center px-6 py-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-gray-900 leading-tight">
            Τι ψάχνεις;
          </h1>
          <p className="mt-2 text-base text-gray-500">
            Επίλεξε για να ξεκινήσουμε
          </p>
        </div>

        <div className="space-y-4 max-w-md mx-auto w-full">
          {/* Worker — looks FOR a workplace, so building icon */}
          <button
            onClick={() => pick('worker')}
            className="group w-full relative rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-left text-white shadow-2xl shadow-emerald-600/30 active:scale-[0.98] transition-transform overflow-hidden"
          >
            <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
            <div className="absolute -right-4 -bottom-12 w-32 h-32 rounded-full bg-white/5" />
            <div className="relative">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur text-2xl">🏢</span>
                <h3 className="text-2xl font-extrabold">Βρες Εργασία</h3>
              </div>
              <p className="mt-3 text-sm text-white/80">
                Δες θέσεις εργασίας, κάνε swipe και βρες άμεσα τη δουλειά που σου αξίζει
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-white/90">
                <span className="rounded-full bg-white/15 px-2.5 py-1">Δωρεάν</span>
                <span className="rounded-full bg-white/15 px-2.5 py-1">5.500+ θέσεις</span>
              </div>
              <div className="mt-4 flex items-center justify-end text-sm font-bold">
                Δες θέσεις <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </button>

          {/* Business — looks FOR staff, so person icon */}
          <button
            onClick={() => pick('business')}
            className="group w-full relative rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-left text-white shadow-2xl shadow-blue-600/30 active:scale-[0.98] transition-transform overflow-hidden"
          >
            <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
            <div className="absolute -right-4 -bottom-12 w-32 h-32 rounded-full bg-white/5" />
            <div className="relative">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur text-2xl">👤</span>
                <h3 className="text-2xl font-extrabold">Βρες Προσωπικό</h3>
              </div>
              <p className="mt-3 text-sm text-white/80">
                Βρες αξιόπιστο προσωπικό σε λίγα λεπτά — όχι σε εβδομάδες
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-white/90">
                <span className="rounded-full bg-white/15 px-2.5 py-1">50.000+ εργαζόμενοι</span>
                <span className="rounded-full bg-white/15 px-2.5 py-1">AI Match</span>
              </div>
              <div className="mt-4 flex items-center justify-end text-sm font-bold">
                Δες υποψηφίους <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </button>
        </div>

        <p className="mt-8 text-center text-xs text-gray-400">
          Μπορείς να αλλάξεις αργότερα
        </p>
      </div>
    </div>
  );
}
