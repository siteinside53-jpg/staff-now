import Link from 'next/link';
import { TaskNowDemo } from '@/components/tasknow/demo-entry';
import { HeroCtas } from '@/components/tasknow/hero-ctas';
import { TaskNowLevelsBlock } from '@/components/tasknow/levels-block';
import { TaskNowLogo } from '@/components/tasknow/logo';
import { Tr } from '@/i18n/locale-provider';

/**
 * ΜΑΚΕΤΑ — TaskNow (μικροδουλειές).
 *
 * ΣΕΙΡΑ ΤΩΝ ΜΠΛΟΚ: πρώτα οι αγγελίες, μετά η ευθύνη, μετά τα εξηγητικά, και
 * τελευταία η ταυτότητα. Ο επισκέπτης ρωτάει «τι μου προσφέρει αυτό»· του
 * απαντάμε με ποσά. Το hero μετακόμισε στο τέλος — δεν χάθηκε.
 *
 * Η κάρτα ευθύνης μπαίνει ΑΜΕΣΩΣ κάτω από τη ροή, γιατί εκεί φτάνει όποιος
 * πρόκειται να ενεργήσει.
 *
 * `robots: noindex` όσο είναι μακέτα — δεν θέλουμε να μπει στη Google σελίδα
 * με παραδείγματα αντί για αληθινές αγγελίες.
 */
const TASKNOW_TITLE = 'TaskNow — Μικροδουλειές στη Θεσσαλονίκη';
const TASKNOW_DESCRIPTION =
  'Μικρές δουλειές που θέλουν χέρια: βόλτα με τον σκύλο, μεταφορά, καθαρισμός, θελήματα. Δες τι υπάρχει κοντά σου και πρότεινε δικό σου ποσό.';

export const metadata = {
  title: TASKNOW_TITLE,
  description: TASKNOW_DESCRIPTION,
  robots: { index: false, follow: false },
  /*
    ΤΙ ΦΑΙΝΕΤΑΙ ΟΤΑΝ ΣΤΕΛΝΕΙΣ ΤΟΝ ΣΥΝΔΕΣΜΟ.

    Η σελίδα δεν δήλωνε δικά της στοιχεία κοινοποίησης, οπότε κληρονομούσε της
    αρχικής: όποιος έστελνε το staffnow.gr/tasknow σε φίλο, εκείνος έβλεπε
    «Βρες Προσωπικό & Δουλειά σε Κάθε Κλάδο» — άσχετο με μικροδουλειές — ή
    σκέτο σύνδεσμο χωρίς εικόνα.

    Ο σύνδεσμος στέλνεται από άνθρωπο σε άνθρωπο· είναι ο φθηνότερος τρόπος να
    μαθευτεί το TaskNow και δεν επιτρέπεται να δείχνει λάθος πράγμα.
  */
  openGraph: {
    type: 'website',
    url: 'https://staffnow.gr/tasknow',
    siteName: 'StaffNow',
    locale: 'el_GR',
    title: TASKNOW_TITLE,
    description: TASKNOW_DESCRIPTION,
    images: [
      {
        url: 'https://staffnow.gr/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TaskNow — μικροδουλειές στη Θεσσαλονίκη',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TASKNOW_TITLE,
    description: TASKNOW_DESCRIPTION,
    images: ['https://staffnow.gr/og-image.png'],
  },
};

/**
 * Τι βλέπει ο επισκέπτης στο live, όσο δεν υπάρχουν αληθινές μικροδουλειές.
 *
 * ΟΧΙ ψεύτικες αγγελίες, ΟΧΙ φόρμα που δεν πάει πουθενά. Πραγματική
 * πληροφορία για κάτι που πραγματικά έρχεται, και ένα κουμπί που όντως
 * δουλεύει: δωρεάν λογαριασμός. Ο λογαριασμός χρειάζεται ούτως ή άλλως για
 * να ανεβάσεις ή να αναλάβεις — οπότε δεν είναι παρακαμπτήριος.
 */

const HOW_STEPS = [
  { n: '1', tKey: 'tasknow.page.how1t', dKey: 'tasknow.page.how1d' },
  { n: '2', tKey: 'tasknow.page.how2t', dKey: 'tasknow.page.how2d' },
  { n: '3', tKey: 'tasknow.page.how3t', dKey: 'tasknow.page.how3d' },
] as const;

export default function TaskNowPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <h1 className="sr-only"><Tr k="tasknow.page.h1" /></h1>

      {/* ── Οι αγγελίες, αμέσως ── */}
      <section className="pb-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <TaskNowDemo />
        </div>
      </section>

      {/* ── Η ευθύνη, εκεί που φτάνει όποιος πρόκειται να ενεργήσει ── */}
      <section id="efthyni" className="scroll-mt-24 pb-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-gray-900">
              <Tr k="tasknow.page.respTitle" />
            </h2>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-gray-700">
              <li className="flex gap-3">
                <span aria-hidden="true">✓</span>
                <span><Tr k="tasknow.page.r1" /></span>
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true">✓</span>
                <span>
                  <Tr k="tasknow.page.r2a" /> <strong><Tr k="tasknow.page.r2strong" /></strong>
                  <Tr k="tasknow.page.r2b" />
                </span>
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true">✕</span>
                <span>
                  <strong><Tr k="tasknow.page.r3strong" /></strong>
                  <Tr k="tasknow.page.r3" />
                </span>
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true">✕</span>
                <span>
                  <strong><Tr k="tasknow.page.r4strong" /></strong>
                  <Tr k="tasknow.page.r4" />
                </span>
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true">✓</span>
                <span>
                  <strong><Tr k="tasknow.page.r5strong" /></strong>
                  <Tr k="tasknow.page.r5" />
                </span>
              </li>
            </ul>
            <p className="mt-5 border-t border-amber-200 pt-4 text-sm font-medium text-gray-900">
              <Tr k="tasknow.page.respFooter" />
            </p>
          </div>

          <p className="mt-4 text-center text-xs leading-relaxed text-gray-500">
            <Tr k="tasknow.page.prohibited" />
          </p>
        </div>
      </section>

      {/* ── Πώς δουλεύει ── */}
      <section className="border-t border-gray-100 bg-white py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-gray-900"><Tr k="tasknow.page.howTitle" /></h2>
          <div className="mt-6 space-y-3 sm:mt-8 sm:grid sm:grid-cols-3 sm:gap-6 sm:space-y-0">
            {HOW_STEPS.map((s) => (
              <div
                key={s.n}
                className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 sm:block sm:p-6"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-white sm:h-10 sm:w-10 sm:text-lg">
                  {s.n}
                </div>
                <div className="sm:mt-4">
                  <h3 className="text-sm font-semibold text-gray-900 sm:text-base"><Tr k={s.tKey} /></h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-600 sm:mt-1.5 sm:text-sm">
                    <Tr k={s.dKey} />
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Και οι δύο πλευρές ── */}
      <section className="py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-gray-900">
            <Tr k="tasknow.page.bothTitle" />
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm leading-relaxed text-gray-600">
            <Tr k="tasknow.page.bothText" />
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-6">
              <span className="text-2xl" aria-hidden="true">📤</span>
              <h3 className="mt-2 font-semibold text-gray-900"><Tr k="tasknow.page.whenPost" /></h3>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                <Tr k="tasknow.page.whenPostText" />
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-6">
              <span className="text-2xl" aria-hidden="true">📥</span>
              <h3 className="mt-2 font-semibold text-gray-900"><Tr k="tasknow.page.whenTake" /></h3>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                <Tr k="tasknow.page.whenTakeText" />
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Επίπεδα ── */}
      <section className="border-t border-gray-100 bg-white py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-gray-900">
            <Tr k="tasknow.page.repTitle" />
          </h2>
          {/* Ο όρος μένει ΕΞΩ από το πτυσσόμενο: ανταμοιβή ορατή και όροι
              κρυμμένοι είναι το εγχειρίδιο του σκοτεινού κόλπου. */}
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm leading-relaxed text-gray-600">
            <Tr k="tasknow.page.repText" />
          </p>

          <TaskNowLevelsBlock />
        </div>
      </section>

      {/* ── Ποιοι είμαστε — στο τέλος, όχι στην αρχή ── */}
      <section className="py-12">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <nav className="mb-4 hidden text-xs text-gray-500 sm:block" aria-label="breadcrumb">
            <Link href="/" className="hover:text-gray-700">
              StaffNow
            </Link>{' '}
            <span aria-hidden="true">/</span> <span className="text-gray-700">TaskNow</span>
          </nav>

          <div className="flex justify-center">
            <TaskNowLogo />
          </div>
          <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-gray-900 sm:text-3xl">
            <Tr k="tasknow.page.heroTitle" /> <span className="text-amber-500"><Tr k="tasknow.page.heroAccent" /></span>.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-gray-600">
            <Tr k="tasknow.page.heroText" />
          </p>
          {/* Δύο πράγματα που πρέπει να ξέρει πριν σκεφτεί οτιδήποτε άλλο:
              πού ισχύει, και ότι δεν πληρώνει τίποτα. Το δεύτερο είναι η πιο
              συχνή σιωπηλή ερώτηση σε κάθε τέτοια πλατφόρμα — αν δεν
              απαντηθεί, ο κόσμος υποθέτει προμήθεια και φεύγει. */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800">
              <span aria-hidden="true">📍</span>
              <Tr k="tasknow.page.onlyThess" />
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800">
              <span aria-hidden="true">✓</span>
              <Tr k="tasknow.page.freeNoFee" />
            </span>
          </div>

          <div className="mt-6 flex justify-center">
            <HeroCtas />
          </div>


          <div className="mt-6">
            <Link href="/" className="text-sm font-medium text-gray-500 hover:text-gray-900">
              <Tr k="tasknow.page.back" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
