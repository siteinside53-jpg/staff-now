import Link from 'next/link';

export const metadata = {
  title: 'StaffNow - Βρες Προσωπικό σε Λίγες Ώρες',
  description: 'Βρες προσωπικό σε λίγες ώρες, όχι σε μέρες. Η πλατφόρμα για τουρισμό και εστίαση στην Ελλάδα.',
};

function CategoryIcon({ name }: { name: string }) {
  const cls = "h-6 w-6 text-blue-600";
  switch (name) {
    case 'hotel': return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" /></svg>;
    case 'restaurant': return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.379a48.474 48.474 0 00-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M16.5 8.25V6.75a4.5 4.5 0 10-9 0v1.5" /></svg>;
    case 'bar': return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" /></svg>;
    case 'cleaning': return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" /></svg>;
    case 'tour': return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12.75 3.03v.568c0 .334.148.65.405.864l1.068.89c.442.369.535 1.01.216 1.49l-.51.766a2.25 2.25 0 01-1.161.886l-.143.048a1.107 1.107 0 00-.57 1.664c.369.555.169 1.307-.427 1.605L9 13.125l.423 1.059a.956.956 0 01-1.652.928l-.679-.906a1.125 1.125 0 00-1.906.172L4.5 15.75l-.612.153M12.75 3.031a9 9 0 00-8.862 12.872M12.75 3.031a9 9 0 016.69 14.036m0 0l-.177-.529A2.25 2.25 0 0017.128 15H16.5l-.324-.324a1.453 1.453 0 00-2.328.377l-.036.073a1.586 1.586 0 01-.982.816l-.99.282c-.55.157-.894.702-.8 1.267l.073.438c.08.474.49.821.97.821.846 0 1.598.542 1.865 1.345l.215.643m5.276-3.67a9.012 9.012 0 01-5.276 3.67m0 0a9 9 0 01-10.275-4.835M15.75 9c0 .896-.393 1.7-1.016 2.25" /></svg>;
    case 'events': return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" /></svg>;
    default: return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" /></svg>;
  }
}

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
  { name: 'Ξενοδοχεία & Resorts', icon: 'hotel', count: '3,200+', desc: 'Ρεσεψιόν, καμαριέρες, concierge, θυρωροί' },
  { name: 'Εστιατόρια & Ταβέρνες', icon: 'restaurant', count: '2,800+', desc: 'Σερβιτόροι, μάγειρες, σεφ, βοηθοί κουζίνας' },
  { name: 'Bars & Beach Bars', icon: 'bar', count: '1,500+', desc: 'Bartenders, baristas, DJs, προσωπικό μπαρ' },
  { name: 'Καθαρισμός', icon: 'cleaning', count: '900+', desc: 'Καθαριστές, housekeeping, συντηρητές' },
  { name: 'Τουριστικά Γραφεία', icon: 'tour', count: '600+', desc: 'Ξεναγοί, οδηγοί, tour operators, transfer' },
  { name: 'Events & Catering', icon: 'events', count: '400+', desc: 'Σερβιτόροι events, catering staff, animateurs' },
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => (
              <div key={cat.name} className="group flex items-start gap-4 rounded-2xl bg-white p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 group-hover:bg-blue-100 transition-colors">
                  <CategoryIcon name={cat.icon} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{cat.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">{cat.desc}</p>
                  <span className="mt-2 inline-block text-xs font-semibold text-blue-600">{cat.count} θέσεις</span>
                </div>
              </div>
            ))}
          </div>

          {/* Employment Types */}
          <div className="mt-16 text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-8">Τύποι απασχόλησης</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: 'Σεζόν', desc: 'Απρίλιος — Οκτώβριος', icon: '☀️', color: 'bg-amber-50 border-amber-200 text-amber-700' },
                { label: 'Όλο τον χρόνο', desc: 'Μόνιμη απασχόληση', icon: '📅', color: 'bg-blue-50 border-blue-200 text-blue-700' },
                { label: 'Part-time', desc: 'Μερική απασχόληση', icon: '⏰', color: 'bg-purple-50 border-purple-200 text-purple-700' },
                { label: 'Freelancer', desc: 'Ελεύθερος επαγγελματίας', icon: '💼', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
              ].map((type) => (
                <div key={type.label} className={`rounded-2xl border p-5 text-center ${type.color} transition-all hover:shadow-md cursor-pointer`}>
                  <span className="text-3xl">{type.icon}</span>
                  <h4 className="mt-3 font-bold">{type.label}</h4>
                  <p className="mt-1 text-xs opacity-75">{type.desc}</p>
                </div>
              ))}
            </div>
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
