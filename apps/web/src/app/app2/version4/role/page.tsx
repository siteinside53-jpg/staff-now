'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RolePicker() {
  const router = useRouter();

  const pick = (role: 'worker' | 'business') => {
    try {
      sessionStorage.setItem('staffnow_intent', role);
    } catch {}
    router.push(role === 'worker' ? '/app2/version4/browse/jobs' : '/app2/version4/browse/workers');
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 overflow-y-auto">
      {/* Top nav */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-4">
        <Link href="/app2/version4" className="p-2 -ml-2">
          <svg className="h-6 w-6 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <span className="text-sm font-bold text-white">
          <span>Staff</span><span className="text-blue-400">Now</span>
        </span>
        <div className="w-10" />
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 py-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-white leading-tight">
            Τι ψάχνεις;
          </h1>
          <p className="mt-2 text-base text-white/60">
            Επίλεξε για να ξεκινήσουμε
          </p>
        </div>

        <div className="space-y-4 max-w-md mx-auto w-full">
          {/* Worker */}
          <button
            onClick={() => pick('worker')}
            className="group w-full relative rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-left text-white shadow-2xl shadow-emerald-600/30 active:scale-[0.98] transition-transform overflow-hidden"
          >
            <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
            <div className="absolute -right-4 -bottom-12 w-32 h-32 rounded-full bg-white/5" />
            <div className="relative">
              <div className="text-6xl mb-3">👤</div>
              <h3 className="text-2xl font-extrabold">Ψάχνω Δουλειά</h3>
              <p className="mt-1.5 text-sm text-white/80">
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

          {/* Business */}
          <button
            onClick={() => pick('business')}
            className="group w-full relative rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-left text-white shadow-2xl shadow-blue-600/30 active:scale-[0.98] transition-transform overflow-hidden"
          >
            <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
            <div className="absolute -right-4 -bottom-12 w-32 h-32 rounded-full bg-white/5" />
            <div className="relative">
              <div className="text-6xl mb-3">🏢</div>
              <h3 className="text-2xl font-extrabold">Είμαι Επιχείρηση</h3>
              <p className="mt-1.5 text-sm text-white/80">
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

        <p className="mt-8 text-center text-xs text-white/30">
          Μπορείς να αλλάξεις αργότερα
        </p>
      </div>
    </div>
  );
}
