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
  { num: '01', title: 'Δημοσιεύεις ανάγκη', desc: 'Περιέγραψε τη θέση εργασίας που χρειάζεσαι σε λιγότερο από 1 λεπτό.', icon: '📝' },
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
            {steps.map((step) => (
              <div key={step.num} className="relative text-center group">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-2xl group-hover:bg-blue-100 transition-colors">
                  {step.icon}
                </div>
                <span className="absolute -top-2 right-1/3 text-6xl font-extrabold text-gray-100">{step.num}</span>
                <h3 className="relative text-xl font-bold text-gray-900">{step.title}</h3>
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
