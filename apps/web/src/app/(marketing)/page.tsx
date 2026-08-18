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

export const metadata = {
  title: { absolute: 'StaffNow – Βρες Προσωπικό & Δουλειά σε Κάθε Κλάδο | Match σε 24 Ώρες' },
  description:
    'Πλατφόρμα swipe-style που συνδέει εργοδότες & εργαζόμενους σε όλους τους κλάδους. Δες τον μισθό πριν κάνεις αίτηση. Πρόσληψη σε λιγότερο από 24 ώρες.',
  alternates: { canonical: '/' },
};

/* ── tiny data ───────────────────────────────────────────────── */

// All 24 industry categories supported on the platform.
// `slug` matches WORKER_JOB_ROLE_GROUPS.id so the chip can deep-link into /discover.
const categories = [
  { slug: 'tourism_hotels',       label: 'Τουρισμός & Ξενοδοχεία',  icon: '🏨' },
  { slug: 'food_service',         label: 'Εστίαση',                 icon: '🍽️' },
  { slug: 'retail_sales',         label: 'Λιανική & Πωλήσεις',      icon: '🛍️' },
  { slug: 'logistics_transport',  label: 'Logistics & Μεταφορές',   icon: '📦' },
  { slug: 'health',               label: 'Υγεία',                   icon: '🏥' },
  { slug: 'beauty_fitness',       label: 'Ομορφιά & Fitness',       icon: '💅' },
  { slug: 'it',                   label: 'Πληροφορική',             icon: '💻' },
  { slug: 'engineering',          label: 'Μηχανικοί & Επιστήμες',   icon: '🛠️' },
  { slug: 'office_admin',         label: 'Γραφείο & Διοίκηση',      icon: '📋' },
  { slug: 'tech_iek',             label: 'Τεχνικοί ΕΠΑΛ/ΙΕΚ',       icon: '🔧' },
  { slug: 'finance',              label: 'Λογιστήριο',              icon: '💼' },
  { slug: 'wholesale_b2b',        label: 'B2B Πωλήσεις',            icon: '🤝' },
  { slug: 'production_workers',   label: 'Παραγωγή & Τεχνίτες',     icon: '🏭' },
  { slug: 'security_cleaning',    label: 'Ασφάλεια & Καθαριότητα',  icon: '🧹' },
  { slug: 'phone_services',       label: 'Call Center',             icon: '📞' },
  { slug: 'marketing_advertising',label: 'Marketing & Διαφήμιση',   icon: '📣' },
  { slug: 'education',            label: 'Εκπαίδευση',              icon: '🎓' },
  { slug: 'insurance_realestate', label: 'Ασφαλιστικά & Real Estate', icon: '🏢' },
  { slug: 'business_hr',          label: 'Διοίκηση & HR',           icon: '👥' },
  { slug: 'design_arts',          label: 'Design & Arts',           icon: '🎨' },
  { slug: 'digital_ecom',         label: 'Digital & E-commerce',    icon: '🛒' },
  { slug: 'agriculture',          label: 'Αγροτικά',                icon: '🌾' },
  { slug: 'legal',                label: 'Νομικά',                  icon: '⚖️' },
  { slug: 'maritime',             label: 'Ναυτιλία',                icon: '⚓' },
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
                Βρες δουλειά ή προσωπικό
                <br />
                <span className="text-blue-500">σε λίγα λεπτά.</span>
              </h1>

              <p className="mt-6 text-lg text-gray-400 max-w-xl leading-relaxed">
                Η πλατφόρμα που συνδέει <span className="text-white font-semibold">επιχειρήσεις</span> με <span className="text-white font-semibold">εργαζόμενους</span> — σε κάθε κλάδο. <span className="text-blue-400 font-semibold">Swipe, match &amp; ξεκίνα</span>. Χωρίς αναμονές.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/find-staff"
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-all"
                >
                  <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                  Βρες προσωπικό
                </Link>
                <Link
                  href="/find-job"
                  className="inline-flex items-center justify-center rounded-xl border border-gray-600 px-8 py-4 text-base font-semibold text-white hover:bg-white/5 transition-all"
                >
                  <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>
                  Βρες εργασία
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

      {/* ====== FOR BUSINESSES ====== */}
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left — text */}
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-700">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>
                Για Επιχειρήσεις
              </span>
              <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl leading-tight">
                Βρες αξιόπιστο προσωπικό<br />
                <span className="text-blue-600">σε λίγα λεπτά, όχι εβδομάδες</span>
              </h2>
              <p className="mt-4 text-lg text-gray-600 leading-relaxed">
                Σου λείπει προσωπικό και χάνεις χρόνο σε αγγελίες; Με το StaffNow βρίσκεις αξιολογημένους εργαζόμενους κοντά σου — σε κάθε κλάδο.
              </p>

              <div className="mt-8 space-y-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Πρόσληψη σε &lt;24 ώρες</h3>
                    <p className="mt-1 text-sm text-gray-500">Δημοσίευσε θέση και λάβε αιτήσεις σε λεπτά — όχι μέρες.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">AI Matching</h3>
                    <p className="mt-1 text-sm text-gray-500">Το σύστημα βρίσκει τους πιο κατάλληλους υποψηφίους βάσει ρόλου, εμπειρίας &amp; τοποθεσίας.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Αξιολογημένοι εργαζόμενοι</h3>
                    <p className="mt-1 text-sm text-gray-500">Κριτικές, βαθμολογίες &amp; ιστορικό εργασίας. Ξέρεις ποιον προσλαμβάνεις.</p>
                  </div>
                </div>
              </div>

              <Link
                href="/auth/register?role=business"
                className="mt-10 inline-flex items-center justify-center rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-all"
              >
                Δοκίμασε Δωρεάν
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
                Για Εργαζόμενους
              </span>
              <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl leading-tight">
                Βρες τη δουλειά που σου αξίζει<br />
                <span className="text-emerald-600">Swipe, match, ξεκίνα</span>
              </h2>
              <p className="mt-4 text-lg text-gray-600 leading-relaxed">
                Ξέχνα τις ατελείωτες αγγελίες και τα βιογραφικά στο email. Φτιάξε προφίλ, κάνε swipe σε θέσεις και βρες δουλειά κοντά σου — απευθείας από το κινητό.
              </p>

              <div className="mt-8 space-y-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Swipe &amp; Match</h3>
                    <p className="mt-1 text-sm text-gray-500">Σαν Tinder — για δουλειές. Κάνε swipe δεξιά στις θέσεις που σε ενδιαφέρουν.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Θέσεις κοντά σου</h3>
                    <p className="mt-1 text-sm text-gray-500">Σε όλη την Ελλάδα — retail, εστίαση, logistics, υγεία &amp; πολλά ακόμα. Φιλτράρισε ανά περιοχή.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Διαφανείς αμοιβές</h3>
                    <p className="mt-1 text-sm text-gray-500">Βλέπεις τον μισθό ΠΡΙΝ κάνεις αίτηση. Χωρίς εκπλήξεις.</p>
                  </div>
                </div>
              </div>

              <Link
                href="/auth/register?role=worker"
                className="mt-10 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 transition-all"
              >
                Κάνε Εγγραφή Δωρεάν
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
              Όλοι οι κλάδοι, μία πλατφόρμα
            </h2>
            <p className="mt-3 text-base text-gray-600">
              <strong className="text-gray-900">24 κατηγορίες</strong> · <strong className="text-gray-900">250+ ειδικότητες</strong> — από τουρισμό μέχρι IT, νομικά και ναυτιλία.
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
                  <span className="text-xs sm:text-sm font-medium text-gray-700 group-hover:text-blue-700 leading-tight">{cat.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-8 text-center">
            <Link
              href="/categories"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition-colors"
            >
              Δες όλους τους κλάδους & ειδικότητες →
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
              📱 Έρχεται σύντομα
            </span>
            <h2 className="mt-4 text-4xl font-extrabold tracking-tight leading-tight text-gray-900 sm:text-5xl">
              Η εφαρμογή
              <br />
              έρχεται <span className="text-blue-600">σύντομα</span>
            </h2>
            <p className="mt-5 max-w-xl text-base text-gray-600 sm:text-lg">
              Θα βρίσκεις δουλειά ή προσωπικό απευθείας
              <br />
              από το κινητό σου.
              <br />
              <br />
              Swipe, match και επικοινωνία άμεσα
              <br />
              — όπου κι αν είσαι.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {/* App Store — σύντομα */}
              <div
                className="relative inline-flex items-center gap-3 rounded-2xl bg-black/90 px-5 py-3 text-left shadow-lg shadow-black/10"
                aria-label="App Store — σύντομα διαθέσιμο"
              >
                <span className="absolute -top-2 -right-2 rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow">
                  Σύντομα
                </span>
                <svg className="h-8 w-8 text-white/80" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/70 leading-none">Λήψη στο</p>
                  <p className="text-base font-bold text-white leading-tight">App Store</p>
                </div>
              </div>

              {/* Google Play — σύντομα */}
              <div
                className="relative inline-flex items-center gap-3 rounded-2xl bg-black/90 px-5 py-3 text-left shadow-lg shadow-black/10"
                aria-label="Google Play — σύντομα διαθέσιμο"
              >
                <span className="absolute -top-2 -right-2 rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow">
                  Σύντομα
                </span>
                <svg className="h-8 w-8 opacity-80" viewBox="0 0 24 24">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92z" fill="#4285F4" />
                  <path d="M14.5 11.293l2.302-2.302-10.937-6.333 8.635 8.635z" fill="#FBBC04" />
                  <path d="M14.5 12.707l-8.635 8.634 10.937-6.332-2.302-2.302z" fill="#EA4335" />
                  <path d="M16.798 9l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L14.5 12.707V11.293L16.798 9z" fill="#34A853" />
                </svg>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/70 leading-none">ΑΠΟΚΤΗΣΤΕ ΣΤΟ</p>
                  <p className="text-base font-bold text-white leading-tight">Google Play</p>
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="mt-8 grid max-w-md grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-base">💶</div>
                <p className="mt-1.5 text-sm font-bold text-gray-900">Δωρεάν</p>
                <p className="text-[10px] text-gray-500">Για εργαζόμενους</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-base">⚡</div>
                <p className="mt-1.5 text-sm font-bold text-gray-900">Σε λεπτά</p>
                <p className="text-[10px] text-gray-500">Match υποψηφίων</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-base">🇬🇷</div>
                <p className="mt-1.5 text-sm font-bold text-gray-900">Πανελλαδικά</p>
                <p className="text-[10px] text-gray-500">Όλη η Ελλάδα</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-base">🔒</div>
                <p className="mt-1.5 text-sm font-bold text-gray-900">Ασφαλές</p>
                <p className="text-[10px] text-gray-500">SSL/TLS</p>
              </div>
            </div>
          </div>

          {/* RIGHT — promo image (transparent, no frame, scaled up) */}
          <div className="relative">
            <img
              src="/app-promo.png?v=3"
              alt="Επιχείρηση και εργαζόμενος συναντιούνται μέσω StaffNow"
              className="block h-auto w-full max-w-none lg:scale-110 lg:origin-left"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* ====== FINAL CTA ====== */}
      <section className="bg-ink py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Ξεκίνα Δωρεάν σε 30 δευτερόλεπτα
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            Χωρίς πιστωτική κάρτα. Χωρίς δεσμεύσεις. Απλά ξεκίνα.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/find-staff" className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-all">
              <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
              Βρες προσωπικό
            </Link>
            <Link href="/find-job" className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-gray-600 px-8 py-4 text-base font-semibold text-white hover:bg-white/5 transition-all">
              <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>
              Βρες εργασία
            </Link>
          </div>
          <p className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
            Τα δεδομένα σου είναι ασφαλή &amp; κρυπτογραφημένα
          </p>
        </div>
      </section>
          {/* Οι πιο πρόσφατες θέσεις — ενότητα σαν τις υπόλοιπες, όχι κατάλογος.
          Έξι, όχι όλες: με 1.000 αγγελίες μια πλήρης λίστα στην αρχική δεν
          στέκει. Ο πλήρης κατάλογος ζει στη /find-job, όπου ανήκει. */}
      <AllJobsIndex limit={6} title="Πρόσφατες θέσεις εργασίας" showAllLink />
</>
  );
}
