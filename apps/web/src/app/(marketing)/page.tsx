import Link from 'next/link';
import { LiveBadge } from '@/components/marketing/live-badge';
import { LiveCounters } from '@/components/marketing/live-counters';
import { ActivityMarquee } from '@/components/marketing/activity-marquee';
import { LiveWorkersHeroCard, LiveWorkersPanel, LiveJobsPanel } from '@/components/marketing/live-workers';
import { HeroGradient } from '@/components/marketing/hero-gradient';
import { AllJobsIndex } from '@/components/marketing/all-jobs-index';
import { heroPhotos } from '@/lib/hero-photos';
import { HowItWorksTabs } from '@/components/marketing/how-it-works-tabs';
import { TrustBar } from '@/components/marketing/trust-bar';
import { SwipeTeaser } from '@/components/marketing/swipe-teaser';
import { UrgentShifts } from '@/components/marketing/urgent-shifts';
import { DownloadAppBadges, AppPromoImage } from '@/components/marketing/download-app-badges';
import { Tr } from '@/i18n/locale-provider';

export const metadata = {
  title: { absolute: 'StaffNow – Βρες Προσωπικό & Δουλειά σε Κάθε Κλάδο | Άμεσο Match' },
  description:
    'Πλατφόρμα swipe-style που συνδέει εργοδότες & εργαζόμενους σε όλους τους κλάδους. Δες τον μισθό πριν κάνεις αίτηση. Μίλα απευθείας με τον άλλον, χωρίς μεσάζοντες.',
  alternates: { canonical: '/' },
};

/* ── tiny data ───────────────────────────────────────────────── */

// All 24 industry categories supported on the platform.
// `slug` matches WORKER_JOB_ROLE_GROUPS.id so the chip can deep-link into /discover.
// Labels live in the i18n dictionary under `categories.<slug>` (EL/EN).
const categories = [
  { slug: 'tourism_hotels', icon: '🏨' },
  { slug: 'food_service', icon: '🍽️' },
  { slug: 'retail_sales', icon: '🛍️' },
  { slug: 'logistics_transport', icon: '📦' },
  { slug: 'health', icon: '🏥' },
  { slug: 'beauty_fitness', icon: '💅' },
  { slug: 'it', icon: '💻' },
  { slug: 'engineering', icon: '🛠️' },
  { slug: 'office_admin', icon: '📋' },
  { slug: 'tech_iek', icon: '🔧' },
  { slug: 'finance', icon: '💼' },
  { slug: 'wholesale_b2b', icon: '🤝' },
  { slug: 'production_workers', icon: '🏭' },
  { slug: 'security_cleaning', icon: '🧹' },
  { slug: 'phone_services', icon: '📞' },
  { slug: 'marketing_advertising', icon: '📣' },
  { slug: 'education', icon: '🎓' },
  { slug: 'insurance_realestate', icon: '🏢' },
  { slug: 'business_hr', icon: '👥' },
  { slug: 'design_arts', icon: '🎨' },
  { slug: 'digital_ecom', icon: '🛒' },
  { slug: 'agriculture', icon: '🌾' },
  { slug: 'legal', icon: '⚖️' },
  { slug: 'maritime', icon: '⚓' },
];

/* ── page ────────────────────────────────────────────────────── */

export default function HomePage() {
  return (
    <>
      {/* ====== HERO ====== */}
      <HeroGradient photos={heroPhotos()}>
        <div className="relative mx-auto max-w-7xl px-4 pt-6 pb-20 sm:px-6 sm:pt-8 sm:pb-28 lg:px-8 lg:pt-10 lg:pb-36">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              {/* Προσωρινά κρυμμένο: αόρατο αλλά κρατάει τη θέση του ώστε να ΜΗΝ μετακινηθεί
                  ο τίτλος/κείμενο. Όταν η πλατφόρμα έχει κίνηση, αφαίρεσε το `invisible` (ή
                  βάλε `visible`) από το wrapper για να ξαναεμφανιστεί. */}
              <div className="invisible mb-6" aria-hidden="true">
                <LiveBadge />
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl leading-[1.1]">
                <Tr k="home.hero.title1" />
                <br />
                <span className="text-blue-500"><Tr k="home.hero.title2" /></span>
              </h1>

              <p className="mt-6 text-lg text-gray-400 max-w-xl leading-relaxed">
                <Tr k="home.hero.sub1" />{' '}<span className="text-white font-semibold"><Tr k="home.hero.subBusinesses" /></span>{' '}<Tr k="home.hero.subWith" />{' '}<span className="text-white font-semibold"><Tr k="home.hero.subWorkers" /></span>{' '}<Tr k="home.hero.sub2" />{' '}<span className="text-blue-400 font-semibold"><Tr k="home.hero.subSwipe" /></span><Tr k="home.hero.sub3" />
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/find-staff"
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-all"
                >
                  <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                  <Tr k="home.hero.findStaff" />
                </Link>
                <Link
                  href="/find-job"
                  className="inline-flex items-center justify-center rounded-xl border border-gray-600 px-8 py-4 text-base font-semibold text-white hover:bg-white/5 transition-all"
                >
                  <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>
                  <Tr k="home.hero.findJob" />
                </Link>
              </div>

              {/* Η κάρτα με τις αγγελίες μένει ΜΟΝΟ στον υπολογιστή, επίτηδες.
                  Τη δοκιμάσαμε και στο κινητό: εκεί δεν χωράει, κοβόταν στη μέση
                  και χάλαγε την πρώτη οθόνη. Στο κινητό οι αγγελίες φαίνονται
                  ούτως ή άλλως λίγο πιο κάτω, σε ολόκληρο πλάτος. */}

              <div className="mt-8 lg:mt-10">
                <LiveCounters />
              </div>
            </div>

            <div className="hidden lg:block">
              <LiveWorkersHeroCard />
            </div>
          </div>
        </div>
      </HeroGradient>

      {/* ====== TRUST BAR (πραγματικοί αριθμοί) ====== */}
      <TrustBar />

      {/* ====== ACTIVITY MARQUEE ====== */}
      <ActivityMarquee />

      {/* ====== SWIPE TEASER (δοκίμασε πριν την εγγραφή) ====== */}
      <SwipeTeaser />

      {/* ====== ΕΚΤΑΚΤΗ ΒΑΡΔΙΑ (εμφανίζεται μόνο αν υπάρχουν ανοιχτές) ====== */}
      <UrgentShifts />

      {/* ΟΙ ΜΙΚΡΟΔΟΥΛΕΙΕΣ ΕΔΩ: όταν υπάρχουν αληθινές, ξαναβάζεις δύο γραμμές —
          `import { TaskNowBanner } from '@/components/tasknow/home-banner';`
          στην κορυφή και `<TaskNowBanner />` εδώ.

          ΓΙΑΤΙ ΒΓΗΚΕ ΕΝΤΕΛΩΣ ΚΑΙ ΔΕΝ ΕΜΕΙΝΕ ΚΛΕΙΣΤΟ: όσο η γραμμή εισαγωγής
          υπήρχε, τα παραδείγματα ταξίδευαν μέσα στο JavaScript κάθε σελίδας
          του site — αόρατα, αλλά κατεβασμένα από κάθε επισκέπτη. */}

      {/* ====== FOR BUSINESSES ====== */}
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left — text */}
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-700">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>
                <Tr k="home.forBusinesses.badge" />
              </span>
              <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl leading-tight">
                <Tr k="home.forBusinesses.title1" /><br />
                <span className="text-blue-600"><Tr k="home.forBusinesses.title2" /></span>
              </h2>
              <p className="mt-4 text-lg text-gray-600 leading-relaxed">
                <Tr k="home.forBusinesses.text" />
              </p>

              <div className="mt-8 space-y-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900"><Tr k="home.forBusinesses.f1Title" /></h3>
                    <p className="mt-1 text-sm text-gray-500"><Tr k="home.forBusinesses.f1Text" /></p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900"><Tr k="home.forBusinesses.f2Title" /></h3>
                    <p className="mt-1 text-sm text-gray-500"><Tr k="home.forBusinesses.f2Text" /></p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900"><Tr k="home.forBusinesses.f3Title" /></h3>
                    <p className="mt-1 text-sm text-gray-500"><Tr k="home.forBusinesses.f3Text" /></p>
                  </div>
                </div>
              </div>

              <Link
                href="/auth/register?role=business"
                className="mt-10 inline-flex items-center justify-center rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-all"
              >
                <Tr k="home.forBusinesses.cta" />
                <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
              </Link>
            </div>

            {/* Right — visual card (πραγματικοί εργαζόμενοι) */}
            <div className="relative hidden lg:block">
              <LiveWorkersPanel />
            </div>
          </div>
        </div>
      </section>

      {/* ====== FOR WORKERS ====== */}
      <section className="bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left — visual (desktop, πραγματικές αγγελίες) */}
            <div className="relative hidden lg:block order-1 lg:order-none">
              <LiveJobsPanel />
            </div>

            {/* Right — text */}
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                <Tr k="home.forWorkers.badge" />
              </span>
              <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl leading-tight">
                <Tr k="home.forWorkers.title1" /><br />
                <span className="text-emerald-600"><Tr k="home.forWorkers.title2" /></span>
              </h2>
              <p className="mt-4 text-lg text-gray-600 leading-relaxed">
                <Tr k="home.forWorkers.text" />
              </p>

              <div className="mt-8 space-y-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900"><Tr k="home.forWorkers.f1Title" /></h3>
                    <p className="mt-1 text-sm text-gray-500"><Tr k="home.forWorkers.f1Text" /></p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900"><Tr k="home.forWorkers.f2Title" /></h3>
                    <p className="mt-1 text-sm text-gray-500"><Tr k="home.forWorkers.f2Text" /></p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900"><Tr k="home.forWorkers.f3Title" /></h3>
                    <p className="mt-1 text-sm text-gray-500"><Tr k="home.forWorkers.f3Text" /></p>
                  </div>
                </div>
              </div>

              <Link
                href="/auth/register?role=worker"
                className="mt-10 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 transition-all"
              >
                <Tr k="home.forWorkers.cta" />
                <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/*
        Εδώ υπήρχε τμήμα «Τι λένε οι χρήστες μας» με τρεις κριτικές γραμμένες
        στο χέρι. Δεν ήταν αληθινές, οπότε αφαιρέθηκε ολόκληρο. Αν κάποτε
        μπουν εδώ κριτικές, θα έρχονται από πραγματικές αξιολογήσεις χρηστών
        και με τη συγκατάθεσή τους — ποτέ γραμμένες από εμάς.
      */}

      {/* ====== HOW IT WORKS (TABS) ====== */}
      <HowItWorksTabs />

      {/* ====== CATEGORIES — όλοι οι κλάδοι ====== */}
      <section className="bg-gray-50 py-16 sm:py-20" aria-labelledby="categories-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 id="categories-heading" className="text-2xl font-bold text-gray-900 sm:text-3xl">
              <Tr k="home.categories.title" />
            </h2>
            <p className="mt-3 text-base text-gray-600">
              <strong className="text-gray-900"><Tr k="home.categories.count" /></strong> · <strong className="text-gray-900"><Tr k="home.categories.roles" /></strong> <Tr k="home.categories.tail" />
            </p>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {categories.map((cat) => (
              <li key={cat.slug}>
                <Link
                  href={`/categories#${cat.slug}`}
                  className="group flex h-full items-center gap-2 rounded-xl bg-white px-3 py-3 shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <span className="text-xl flex-shrink-0">{cat.icon}</span>
                  <span className="text-xs sm:text-sm font-medium text-gray-700 group-hover:text-blue-700 leading-tight"><Tr k={`categories.${cat.slug}`} /></span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-8 text-center">
            <Link
              href="/categories"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition-colors"
            >
              <Tr k="home.categories.cta" />
            </Link>
          </div>
        </div>
      </section>

      {/* ====== DOWNLOAD APP ====== */}
      <section
        id="download-app"
        className="w-full scroll-mt-20 bg-white py-10 sm:py-14"
      >
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-[5fr_7fr] lg:gap-10 lg:px-8">
          {/* LEFT — text + store buttons + stats */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">
              📱 <Tr k="home.app.badge" />
            </span>
            <h2 className="mt-4 text-4xl font-extrabold tracking-tight leading-tight text-gray-900 sm:text-5xl">
              <Tr k="home.app.title1" />
              <br />
              <Tr k="home.app.title2" /> <span className="text-blue-600"><Tr k="home.app.title2Highlight" /></span>
            </h2>
            <p className="mt-5 max-w-xl text-base text-gray-600 sm:text-lg">
              <Tr k="home.app.text1" />
              <br />
              <Tr k="home.app.text2" />
              <br />
              <br />
              <Tr k="home.app.text3" />
              <br />
              <Tr k="home.app.text4" />
            </p>

            <DownloadAppBadges />

            {/* Stats row */}
            <div className="mt-8 grid max-w-md grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-base">💶</div>
                <p className="mt-1.5 text-sm font-bold text-gray-900"><Tr k="home.app.stat1Title" /></p>
                <p className="text-[10px] text-gray-500"><Tr k="home.app.stat1Sub" /></p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-base">⚡</div>
                <p className="mt-1.5 text-sm font-bold text-gray-900"><Tr k="home.app.stat2Title" /></p>
                <p className="text-[10px] text-gray-500"><Tr k="home.app.stat2Sub" /></p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-base">🇬🇷</div>
                <p className="mt-1.5 text-sm font-bold text-gray-900"><Tr k="home.app.stat3Title" /></p>
                <p className="text-[10px] text-gray-500"><Tr k="home.app.stat3Sub" /></p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-base">🔒</div>
                <p className="mt-1.5 text-sm font-bold text-gray-900"><Tr k="home.app.stat4Title" /></p>
                <p className="text-[10px] text-gray-500"><Tr k="home.app.stat4Sub" /></p>
              </div>
            </div>
          </div>

          {/* RIGHT — promo image (transparent, no frame, scaled up) */}
          <div className="relative">
            <AppPromoImage />
          </div>
        </div>
      </section>

      {/* ====== FINAL CTA ====== */}
      <section className="bg-ink py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            <Tr k="home.finalCta.title" />
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            <Tr k="home.finalCta.text" />
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/find-staff" className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-all">
              <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
              <Tr k="home.hero.findStaff" />
            </Link>
            <Link href="/find-job" className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-gray-600 px-8 py-4 text-base font-semibold text-white hover:bg-white/5 transition-all">
              <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>
              <Tr k="home.hero.findJob" />
            </Link>
          </div>
          <p className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
            <Tr k="home.finalCta.secure" />
          </p>
        </div>
      </section>
          {/* Οι πιο πρόσφατες θέσεις — ενότητα σαν τις υπόλοιπες, όχι κατάλογος.
          Έξι, όχι όλες: με 1.000 αγγελίες μια πλήρης λίστα στην αρχική δεν
          στέκει. Ο πλήρης κατάλογος ζει στη /find-job, όπου ανήκει. */}
      <AllJobsIndex limit={6} title={<Tr k="home.recentJobs" />} showAllLink />
</>
  );
}
