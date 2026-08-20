import Link from 'next/link';
import { TaskFeedSection } from '@/components/tasknow/feed-section';
import { HeroCtas } from '@/components/tasknow/hero-ctas';
import { LEVELS } from '@/components/tasknow/data';
import { TaskNowLogo } from '@/components/tasknow/logo';

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
export const metadata = {
  title: 'TaskNow — Μικροδουλειές στη Θεσσαλονίκη',
  description:
    'Μικρές δουλειές που θέλουν χέρια: βόλτα με τον σκύλο, μεταφορά, καθαρισμός, θελήματα. Δες τι υπάρχει κοντά σου και πρότεινε δικό σου ποσό.',
  robots: { index: false, follow: false },
};

export default function TaskNowPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Η αποκάλυψη μένει πρώτη και στο ίδιο μέγεθος. Δεν μικραίνει ποτέ
          στην ίδια αλλαγή που μεγαλώνουν τα ποσά. */}
      <div className="bg-gray-900 px-4 py-2 text-center text-sm text-amber-300">
        <strong className="font-semibold">ΜΑΚΕΤΑ</strong> — παραδείγματα, όχι αληθινές
        αγγελίες.{' '}
        <Link href="/tasknow/preview/dashboard" className="hidden underline hover:text-white sm:inline">
          πίνακας χρήστη
        </Link>
        <span className="hidden sm:inline"> · </span>
        <Link href="/tasknow/preview/admin" className="hidden underline hover:text-white sm:inline">
          διαχειριστικό
        </Link>
      </div>

      <h1 className="sr-only">Μικροδουλειές στη Θεσσαλονίκη — TaskNow</h1>

      {/* ── Οι αγγελίες, αμέσως ── */}
      <section className="pb-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <TaskFeedSection />
        </div>
      </section>

      {/* ── Η ευθύνη, εκεί που φτάνει όποιος πρόκειται να ενεργήσει ── */}
      <section id="efthyni" className="scroll-mt-24 pb-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-gray-900">
              Τι κάνει και τι δεν κάνει το TaskNow
            </h2>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-gray-700">
              <li className="flex gap-3">
                <span aria-hidden="true">✓</span>
                <span>
                  Σας φέρνει σε επαφή και σου δείχνει τι ξέρουμε για τον καθένα:
                  βαθμολογία, επίπεδο, ολοκληρωμένες δουλειές, τι έχει επαληθευτεί.
                </span>
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true">✓</span>
                <span>
                  Σε δουλειές που θέλουν άδεια (ηλεκτρολογικά, υδραυλικά, φυσικό αέριο,
                  ψύξη) <strong>δεν γίνεται προσφορά χωρίς ανέβασμα άδειας</strong>. Η
                  άδεια φαίνεται ως «δηλωμένη» μέχρι να την ελέγξει άνθρωπος.
                </span>
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true">✕</span>
                <span>
                  <strong>Δεν</strong> είναι εργοδότης, δεν αναθέτει και δεν εγγυάται την
                  εκτέλεση. Η συμφωνία είναι ανάμεσα στους δύο.
                </span>
              </li>
              <li className="flex gap-3">
                <span aria-hidden="true">✕</span>
                <span>
                  <strong>Δεν</strong> κρατάει χρήματα. Πληρώνεστε μεταξύ σας — και ο
                  καθένας έχει τις δικές του φορολογικές υποχρεώσεις.
                </span>
              </li>
            </ul>
            <p className="mt-5 border-t border-amber-200 pt-4 text-sm font-medium text-gray-900">
              Την επιλογή του ατόμου την κάνεις εσύ, με δική σου ευθύνη.
            </p>
          </div>

          <p className="mt-4 text-center text-xs leading-relaxed text-gray-500">
            Δεν επιτρέπονται παράνομες υπηρεσίες ούτε ερωτικό ή συνοδευτικό περιεχόμενο.
          </p>
        </div>
      </section>

      {/* ── Πώς δουλεύει ── */}
      <section className="border-t border-gray-100 bg-white py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-gray-900">Πώς δουλεύει</h2>
          <div className="mt-6 space-y-3 sm:mt-8 sm:grid sm:grid-cols-3 sm:gap-6 sm:space-y-0">
            {[
              {
                n: '1',
                t: 'Γράψε τι θέλεις να γίνει',
                d: 'Τίτλος, περιοχή, πότε το θες και πόσα δίνεις. Δύο λεπτά.',
              },
              {
                n: '2',
                t: 'Δέξου προσφορές',
                d: 'Επαληθευμένοι χρήστες σου προτείνουν ποσό και σου γράφουν δυο λόγια.',
              },
              {
                n: '3',
                t: 'Διάλεξε και συνεννοήσου',
                d: 'Βλέπεις βαθμολογία, επίπεδο, ολοκληρωμένες δουλειές και επαληθεύσεις.',
              },
            ].map((s) => (
              <div
                key={s.n}
                className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 sm:block sm:p-6"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-white sm:h-10 sm:w-10 sm:text-lg">
                  {s.n}
                </div>
                <div className="sm:mt-4">
                  <h3 className="text-sm font-semibold text-gray-900 sm:text-base">{s.t}</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-600 sm:mt-1.5 sm:text-sm">
                    {s.d}
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
            Ο ίδιος λογαριασμός, και οι δύο πλευρές
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm leading-relaxed text-gray-600">
            Δεν χρειάζεται να διαλέξεις αν είσαι «αυτός που ζητά» ή «αυτός που κάνει».
            Ανεβάζεις μια δουλειά όταν σου χρειάζονται χέρια και αναλαμβάνεις μια άλλη
            όταν σου χρειάζονται χρήματα. Το ίδιο ισχύει και για επιχειρήσεις.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-6">
              <span className="text-2xl" aria-hidden="true">📤</span>
              <h3 className="mt-2 font-semibold text-gray-900">Όταν ανεβάζεις</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                Δέχεσαι προσφορές με ποσό και δυο λόγια, βλέπεις βαθμολογία, επίπεδο και
                τι έχει επαληθευτεί, και διαλέγεις εσύ. Βαθμολογείς στο τέλος.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-6">
              <span className="text-2xl" aria-hidden="true">📥</span>
              <h3 className="mt-2 font-semibold text-gray-900">Όταν αναλαμβάνεις</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                Βλέπεις τι υπάρχει κοντά σου, προτείνεις δικό σου ποσό και χτίζεις φήμη με
                κάθε δουλειά που ολοκληρώνεις. Βαθμολογείσαι κι εσύ.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Επίπεδα ── */}
      <section className="border-t border-gray-100 bg-white py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-gray-900">
            Η φήμη σου χτίζεται και φαίνεται
          </h2>
          {/* Ο όρος μένει ΕΞΩ από το πτυσσόμενο: ανταμοιβή ορατή και όροι
              κρυμμένοι είναι το εγχειρίδιο του σκοτεινού κόλπου. */}
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm leading-relaxed text-gray-600">
            Κάθε ολοκληρωμένη δουλειά και κάθε βαθμολογία μετράνε. Κανένα επίπεδο δεν
            δίνεται στην τύχη και κανένα δεν υπόσχεται δουλειά.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {LEVELS.map((l) => (
              <span
                key={l.key}
                className={'rounded-full px-3 py-1.5 text-sm font-semibold ' + l.className}
              >
                {l.icon} {l.label}
              </span>
            ))}
          </div>

          <details className="mx-auto mt-4 max-w-3xl rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-gray-900">
              Δες τα κριτήρια
            </summary>
            <div className="mt-3 space-y-2">
              {LEVELS.map((l) => (
                <div key={l.key} className="flex flex-wrap items-baseline gap-x-3 text-sm">
                  <span className={'rounded-full px-2 py-0.5 text-xs font-semibold ' + l.className}>
                    {l.icon} {l.label}
                  </span>
                  <span className="text-xs font-medium tabular-nums text-gray-900">
                    {l.minCompleted === 0
                      ? 'από την αρχή'
                      : `${l.minCompleted}+ δουλειές · βαθμός ${l.minRating
                          .toFixed(1)
                          .replace('.', ',')}+`}
                  </span>
                  <span className="text-xs text-gray-600">{l.perk}</span>
                </div>
              ))}
            </div>
          </details>
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
            Μικρές δουλειές που θέλουν χέρια <span className="text-amber-500">σήμερα</span>.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-gray-600">
            Κάποιος να βγάλει βόλτα τον σκύλο, να μεταφέρει έναν καναπέ, να καθαρίσει ένα
            σπίτι. Ανεβάζεις τι θέλεις, δέχεσαι προσφορές, διαλέγεις ποιον εμπιστεύεσαι.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800">
            <span aria-hidden="true">📍</span>
            Ξεκινάμε μόνο από τη Θεσσαλονίκη
          </div>

          <div className="mt-6 flex justify-center">
            <HeroCtas />
          </div>

          <p className="mt-8 text-xs text-gray-400">
            Μακέτα:{' '}
            <Link href="/tasknow/preview/dashboard" className="underline hover:text-gray-600">
              πίνακας χρήστη
            </Link>{' '}
            ·{' '}
            <Link href="/tasknow/preview/admin" className="underline hover:text-gray-600">
              διαχειριστικό
            </Link>
          </p>

          <div className="mt-6">
            <Link href="/" className="text-sm font-medium text-gray-500 hover:text-gray-900">
              ← Πίσω στο StaffNow
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
