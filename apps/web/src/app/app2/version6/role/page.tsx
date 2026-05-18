'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from '../_lib/ui';
import { haptic } from '../_lib/haptics';

export default function RolePicker() {
  const router = useRouter();

  const pick = (intent: 'worker' | 'business') => {
    haptic('light');
    try {
      sessionStorage.setItem('staffnow_intent', intent);
    } catch {}
    router.push('/app2/version6/signup');
  };

  return (
    <div
      className="fixed inset-0 flex flex-col bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 overflow-y-auto"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3">
        <Link href="/app2/version6" className="-ml-2 p-2 text-white/70" aria-label="Πίσω">
          <ChevronLeft />
        </Link>
        <span className="text-sm font-bold text-white">
          <span>Staff</span>
          <span className="text-cyan-300">Now</span>
        </span>
        <span className="w-8" />
      </header>

      <div className="flex-1 flex flex-col justify-center px-6 py-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-white leading-tight">Τι ψάχνεις;</h1>
          <p className="mt-2 text-base text-white/60">Επίλεξε για να ξεκινήσουμε</p>
        </div>

        <div className="space-y-4 max-w-md mx-auto w-full">
          <RoleCard
            onClick={() => pick('worker')}
            emoji="👤"
            title="Βρες Δουλειά"
            subtitle="Δες αγγελίες, κάνε swipe και ξεκίνα να εργάζεσαι."
            tags={['Δωρεάν', 'AI matching']}
            cta="Δες θέσεις"
            tone="emerald"
          />
          <RoleCard
            onClick={() => pick('business')}
            emoji="🏢"
            title="Βρες Προσωπικό"
            subtitle="Βρες αξιόπιστο προσωπικό σε λεπτά — όχι σε εβδομάδες."
            tags={['AI shortlist', 'Επαληθευμένα προφίλ']}
            cta="Δες υποψήφιους"
            tone="indigo"
          />
        </div>

        <p className="mt-8 text-center text-xs text-white/40">
          Μπορείς να αλλάξεις αργότερα από τις ρυθμίσεις.
        </p>
      </div>
    </div>
  );
}

function RoleCard({
  onClick,
  emoji,
  title,
  subtitle,
  tags,
  cta,
  tone,
}: {
  onClick: () => void;
  emoji: string;
  title: string;
  subtitle: string;
  tags: string[];
  cta: string;
  tone: 'emerald' | 'indigo';
}) {
  const cls =
    tone === 'emerald'
      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-600/30'
      : 'bg-gradient-to-br from-blue-600 to-indigo-700 shadow-blue-600/30';
  return (
    <button
      onClick={onClick}
      className={`group w-full relative rounded-3xl p-6 text-left text-white shadow-2xl active:scale-[0.98] transition-transform overflow-hidden ${cls}`}
    >
      <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
      <div className="absolute -right-4 -bottom-12 h-32 w-32 rounded-full bg-white/5" />
      <div className="relative">
        <div className="text-6xl mb-3">{emoji}</div>
        <h3 className="text-2xl font-extrabold">{title}</h3>
        <p className="mt-1.5 text-sm text-white/80">{subtitle}</p>
        <div className="mt-4 flex items-center gap-2 text-xs font-bold text-white/90">
          {tags.map((t) => (
            <span key={t} className="rounded-full bg-white/15 px-2.5 py-1">
              {t}
            </span>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-end text-sm font-bold">
          {cta}
          <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
        </div>
      </div>
    </button>
  );
}
