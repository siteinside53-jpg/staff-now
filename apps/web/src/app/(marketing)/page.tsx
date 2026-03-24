import Link from 'next/link';

export const metadata = {
  title: 'StaffNow - Βρες Προσωπικό σε Λίγες Ώρες',
  description: 'Βρες προσωπικό σε λίγες ώρες, όχι σε μέρες. Η πλατφόρμα για τουρισμό και εστίαση στην Ελλάδα.',
};

const workers = [
  { name: 'Μαρία Κ.', role: 'Σερβιτόρα', rating: 4.9, distance: '2.3km', exp: '5 χρόνια', initials: 'ΜΚ', color: 'bg-pink-100 text-pink-700' },
  { name: 'Νίκος Δ.', role: 'Head Chef', rating: 4.8, distance: '4.1km', exp: '10 χρόνια', initials: 'ΝΔ', color: 'bg-amber-100 text-amber-700' },
  { name: 'Ελένα Μ.', role: 'Μαγείρισσα', rating: 4.7, distance: '1.8km', exp: '3 χρόνια', initials: 'ΕΜ', color: 'bg-emerald-100 text-emerald-700' },
  { name: 'Κώστας Ρ.', role: 'Bartender', rating: 4.9, distance: '3.5km', exp: '7 χρόνια', initials: 'ΚΡ', color: 'bg-blue-100 text-blue-700' },
];

const steps = [
  { num: '01', title: 'Δημοσιεύεις αγγελία', desc: 'Περιέγραψε τη θέση εργασίας που χρειάζεσαι σε λιγότερο από 1 λεπτό.', icon: '📝' },
  { num: '02', title: 'Λαμβάνεις άτομα άμεσα', desc: 'Το σύστημα σου προτείνει διαθέσιμους υποψηφίους κοντά σου.', icon: '⚡' },
  { num: '03', title: 'Προσλαμβάνεις', desc: 'Επικοινωνείς, συμφωνείς και ξεκινάτε συνεργασία.', icon: '🤝' },
];

const categories = [
  { name: 'Τουρισμός', icon: '🏨', count: '3,200+' },
  { name: 'Εστίαση', icon: '🍽️', count: '2,800+' },
  { name: 'Beach Bars', icon: '🏖️', count: '1,500+' },
  { name: 'Καθαρισμός', icon: '🧹', count: '900+' },
  { name: 'Delivery', icon: '🛵', count: '600+' },
  { name: 'Events', icon: '🎉', count: '400+' },
];

const stats = [
  { value: '10,000+', label: 'Εργαζόμενοι' },
  { value: '1,000+', label: 'Επιχειρήσεις' },
  { value: '4.8', label: 'Αξιολόγηση' },
  { value: '< 24ω', label: 'Μέσος χρόνος πρόσληψης' },
];

export default function HomePage() {
  return (
    <>
      {/* ====== HERO ====== */}
      <section className="relative overflow-hidden bg-gray-950 text-white">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/95 to-gray-950/70" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-600/10 border border-blue-500/20 px-4 py-1.5 text-sm text-blue-400">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                1,847 εργαζόμενοι online τώρα
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl leading-[1.1]">
                Βρες προσωπικό σε{' '}
                <span className="text-blue-500">λίγες ώρες.</span>
                <br />
                Όχι σε μέρες.
              </h1>

              <p className="mt-6 text-lg text-gray-400 max-w-xl leading-relaxed">
                Άτομα διαθέσιμα τώρα κοντά σου. Χωρίς αγγελίες εφημερίδων. Χωρίς αναμονή. Μόνο swipe &amp; match.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/auth/register?role=business"
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-all"
                >
                  Βρες προσωπικό
                  <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
                <Link
                  href="/auth/register?role=worker"
                  className="inline-flex items-center justify-center rounded-xl border border-gray-600 px-8 py-4 text-base font-semibold text-white hover:bg-white/5 transition-all"
                >
                  Ψάχνω δουλειά
                </Link>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="rounded-2xl border border-gray-800 bg-gray-900/80 backdrop-blur p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white">Διαθέσιμοι τώρα</h3>
                    <p className="text-sm text-gray-400">Στην περιοχή σου</p>
                  </div>
                  <span className="flex h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
                </div>

                <div className="space-y-3">
                  {workers.map((w) => (
                    <div key={w.name} className="flex items-center gap-3 rounded-xl bg-gray-800/50 p-3 hover:bg-gray-800 transition-colors">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold ${w.color}`}>
                        {w.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{w.name}</p>
                        <p className="text-xs text-gray-400">{w.role} &middot; {w.exp}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-yellow-400">&#9733;</span>
                          <span className="text-white font-medium">{w.rating}</span>
                        </div>
                        <p className="text-xs text-gray-500">{w.distance}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Link href="/auth/register?role=business" className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors">
                  Hire τώρα
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== HOW IT WORKS ====== */}
      <section id="how-it-works" className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Απλά &amp; Γρήγορα</p>
            <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">Πώς λειτουργεί</h2>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.num} className="relative text-center group">
                {/* Step number badge */}
                <div className="mx-auto mb-6 relative w-16 h-16">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-2xl group-hover:bg-blue-100 transition-colors">
                    {step.icon}
                  </div>
                  <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-md">
                    {step.num}
                  </span>
                </div>
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+40px)] w-[calc(100%-80px)] border-t-2 border-dashed border-gray-200" />
                )}
                <h3 className="text-xl font-bold text-gray-900">{step.title}</h3>
                <p className="mt-3 text-gray-600 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== AVAILABLE WORKERS ====== */}
      <section className="bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Τώρα διαθέσιμοι</p>
              <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">Διαθέσιμοι στην περιοχή σου</h2>
            </div>
            <Link href="/auth/register" className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700">
              Δες όλους
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {workers.map((w) => (
              <div key={w.name} className="group rounded-2xl bg-white p-5 shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold ${w.color}`}>
                    {w.initials}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{w.name}</h3>
                    <p className="text-sm text-gray-500">{w.role}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500">&#9733;</span>
                    <span className="font-semibold text-gray-900">{w.rating}</span>
                  </div>
                  <span className="text-gray-400">{w.distance}</span>
                  <span className="text-gray-400">{w.exp}</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-medium text-emerald-600">Διαθέσιμος/η τώρα</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== STATS ====== */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-4xl font-extrabold text-gray-900 sm:text-5xl">{stat.value}</p>
                <p className="mt-2 text-sm font-medium text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== CATEGORIES ====== */}
      <section id="categories" className="bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Κλάδοι</p>
            <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">Κατηγορίες εργασίας</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((cat) => (
              <div key={cat.name} className="group flex flex-col items-center gap-3 rounded-2xl bg-white p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer">
                <span className="text-4xl">{cat.icon}</span>
                <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                <span className="text-xs font-medium text-gray-400">{cat.count} θέσεις</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== DOWNLOAD APP ====== */}
      <section className="bg-white py-20 sm:py-28 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left: Text + Buttons */}
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Mobile App</p>
              <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">
                Κατέβασε την εφαρμογή
              </h2>
              <p className="mt-4 text-lg text-gray-600 leading-relaxed">
                Βρες δουλειά ή προσωπικό απευθείας από το κινητό σου.
                Swipe, match και επικοινώνησε άμεσα — όπου κι αν είσαι.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                {/* App Store */}
                <a href="#" className="inline-flex items-center gap-3 rounded-xl bg-gray-950 px-6 py-3.5 text-white hover:bg-gray-800 transition-colors">
                  <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  <div>
                    <p className="text-[10px] font-medium text-gray-400 leading-none">Διαθέσιμο στο</p>
                    <p className="text-lg font-semibold leading-tight">App Store</p>
                  </div>
                </a>

                {/* Google Play */}
                <a href="#" className="inline-flex items-center gap-3 rounded-xl bg-gray-950 px-6 py-3.5 text-white hover:bg-gray-800 transition-colors">
                  <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302a1 1 0 010 1.38l-2.302 2.302L15.396 13l2.302-2.492zM5.864 2.658L16.8 8.99l-2.302 2.302L5.864 2.658z"/>
                  </svg>
                  <div>
                    <p className="text-[10px] font-medium text-gray-400 leading-none">Διαθέσιμο στο</p>
                    <p className="text-lg font-semibold leading-tight">Google Play</p>
                  </div>
                </a>
              </div>

              <div className="mt-6 flex items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                  <span className="text-yellow-500">&#9733;</span>
                  <span className="font-semibold text-gray-900">4.8</span>
                  <span>rating</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-900">50K+</span> downloads
                </div>
                <div>Δωρεάν</div>
              </div>
            </div>

            {/* Right: Phone Mockup */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative">
                {/* Phone frame */}
                <div className="relative w-[280px] h-[560px] bg-gray-950 rounded-[3rem] p-3 shadow-2xl">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-950 rounded-b-2xl z-10" />
                  <div className="w-full h-full bg-white rounded-[2.3rem] overflow-hidden">
                    {/* App screen mockup */}
                    <div className="bg-blue-600 px-5 pt-12 pb-6 text-white">
                      <div className="flex items-center gap-1.5 text-lg font-extrabold mb-4">
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Staff<span className="text-blue-200">Now</span>
                      </div>
                      <p className="text-sm text-blue-100">Ανακάλυψη</p>
                    </div>
                    <div className="p-4 space-y-3">
                      {workers.slice(0, 3).map((w) => (
                        <div key={w.name} className="flex items-center gap-2.5 rounded-xl bg-gray-50 p-3">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${w.color}`}>
                            {w.initials}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-gray-900">{w.name}</p>
                            <p className="text-[10px] text-gray-500">{w.role}</p>
                          </div>
                          <div className="flex items-center gap-0.5 text-[10px]">
                            <span className="text-yellow-500">&#9733;</span>
                            <span className="font-medium">{w.rating}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Bottom nav mockup */}
                    <div className="absolute bottom-3 left-3 right-3 flex justify-around rounded-2xl bg-gray-50 py-2.5">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-base">🔍</span>
                        <span className="text-[9px] font-medium text-blue-600">Ανακάλυψη</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-base">💼</span>
                        <span className="text-[9px] font-medium text-gray-400">Matches</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-base">💬</span>
                        <span className="text-[9px] font-medium text-gray-400">Chat</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-base">👤</span>
                        <span className="text-[9px] font-medium text-gray-400">Προφίλ</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Glow effect */}
                <div className="absolute -inset-4 -z-10 bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-3xl rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== CTA ====== */}
      <section className="bg-gray-950 py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">Έτοιμος να ξεκινήσεις;</h2>
          <p className="mt-4 text-lg text-gray-400">Εγγράψου δωρεάν σε λιγότερο από 2 λεπτά.</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/auth/register?role=business" className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-all">
              Βρες προσωπικό
            </Link>
            <Link href="/auth/register?role=worker" className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-gray-600 px-8 py-4 text-base font-semibold text-white hover:bg-white/5 transition-all">
              Ψάχνω δουλειά
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
