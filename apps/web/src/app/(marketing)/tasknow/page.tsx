import Link from 'next/link';
import { TaskFeed } from '@/components/tasknow/task-feed';
import { HeroCtas } from '@/components/tasknow/hero-ctas';
import { LEVELS } from '@/components/tasknow/data';

/**
 * ΜΑΚΕΤΑ — TaskNow (μικροδουλειές).
 *
 * Ξεχωριστή ενότητα μέσα στο StaffNow: δική της διαδρομή, δικό της χρώμα,
 * δικό της όνομα. Δεν αγγίζει καμία υπάρχουσα σελίδα ή πίνακα.
 *
 * `robots: noindex` όσο είναι μακέτα — δεν θέλουμε να μπει στη Google σελίδα
 * με παραδείγματα αντί για αληθινές αγγελίες.
 */
export const metadata = {
  title: 'TaskNow — Μικροδουλειές στη Θεσσαλονίκη',
  description:
    'Μικρές δουλειές που θέλουν χέρια σήμερα: βόλτα με τον σκύλο, μεταφορά, καθαρισμός, θελήματα. Ανέβασε δουλειά ή κάνε προσφορά.',
  robots: { index: false, follow: false },
};

function TaskNowLogo() {
  return (
    <span className="inline-flex items-center gap-2 text-2xl font-extrabold tracking-tight">
      <svg viewBox="0 0 32 32" className="block h-7 w-7" aria-hidden="true">
        <circle cx="16" cy="16" r="16" fill="#f59e0b" />
        <path
          d="M17.5 6l-8 11h5.5l-1.5 9 8-11h-5.5z"
          fill="white"
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      <span>
        <span className="text-gray-900">Task</span>
        <span className="text-amber-500">Now</span>
      </span>
    </span>
  );
}

export default function TaskNowPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Ειλικρίνεια πάνω-πάνω: αυτό είναι μακέτα, όχι αληθινές αγγελίες. */}
      <div className="bg-gray-900 px-4 py-2.5 text-center text-sm text-amber-300">
        <strong className="font-semibold">ΜΑΚΕΤΑ</strong> — παραδείγματα, όχι
        αληθινές αγγελίες.{' '}
        <Link href="/tasknow/preview/dashboard" className="underline hover:text-white">
          πίνακας χρήστη
        </Link>{' '}
        ·{' '}
        <Link href="/tasknow/preview/admin" className="underline hover:text-white">
          διαχειριστικό
        </Link>
      </div>

      {/* Hero — σύντομο επίτηδες, ώστε η ροή να φαίνεται αμέσως */}
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <nav className="mb-4 text-xs text-gray-500" aria-label="breadcrumb">
            <Link href="/" className="hover:text-gray-700">
              StaffNow
            </Link>{' '}
            <span aria-hidden="true">/</span>{' '}
            <span className="text-gray-700">TaskNow</span>
          </nav>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <TaskNowLogo />
              <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-gray-900 sm:text-4xl">
                Μικρές δουλειές που θέλουν χέρια{' '}
                <span className="text-amber-500">σήμερα</span>.
              </h1>
              <p className="mt-3 text-base text-gray-600 sm:text-lg">
                Κάποιος να βγάλει βόλτα τον σκύλο, να μεταφέρει έναν καναπέ, να
                καθαρίσει ένα σπίτι. Ανεβάζεις τι θέλεις, δέχεσαι προσφορές,
                διαλέγεις ποιον εμπιστεύεσαι.
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800">
                <span aria-hidden="true">📍</span>
                Ξεκινάμε μόνο από τη Θεσσαλονίκη
              </div>
            </div>

            <HeroCtas />
          </div>
        </div>
      </section>

      {/* Η ροή — το πρώτο πράγμα που βλέπει ο επισκέπτης */}
      <section id="roi" className="scroll-mt-20 py-8 sm:py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <TaskFeed />
        </div>
      </section>

      {/* Και οι δύο πλευρές — ο ίδιος λογαριασμός */}
      <section className="border-t border-gray-100 bg-white py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-gray-900">
            Ο ίδιος λογαριασμός, και οι δύο πλευρές
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm leading-relaxed text-gray-600">
            Δεν χρειάζεται να διαλέξεις αν είσαι «αυτός που ζητά» ή «αυτός που κάνει».
            Ανεβάζεις μια δουλειά όταν σου χρειάζονται χέρια και αναλαμβάνεις μια άλλη
            όταν σου χρειάζονται χρήματα. Το ίδιο ισχύει και για επιχειρήσεις.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
              <span className="text-2xl" aria-hidden="true">📤</span>
              <h3 className="mt-3 font-semibold text-gray-900">Όταν ανεβάζεις</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                Δέχεσαι προσφορές με ποσό και δυο λόγια, βλέπεις βαθμολογία, επίπεδο και
                τι έχει επαληθευτεί, και διαλέγεις εσύ. Βαθμολογείς στο τέλος.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
              <span className="text-2xl" aria-hidden="true">📥</span>
              <h3 className="mt-3 font-semibold text-gray-900">Όταν αναλαμβάνεις</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                Βλέπεις τι υπάρχει κοντά σου στον χάρτη, προτείνεις δικό σου ποσό και
                χτίζεις φήμη με κάθε δουλειά που ολοκληρώνεις. Βαθμολογείσαι κι εσύ.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Επίπεδα */}
      <section className="py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-gray-900">
            Η φήμη σου χτίζεται και φαίνεται
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm leading-relaxed text-gray-600">
            Κάθε ολοκληρωμένη δουλειά και κάθε βαθμολογία μετράνε. Τα κριτήρια είναι
            γραμμένα — κανένα επίπεδο δεν δίνεται στην τύχη και κανένα δεν υπόσχεται
            δουλειά.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {LEVELS.map((l) => (
              <div key={l.key} className="rounded-2xl border border-gray-200 bg-white p-5">
                <span className={'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ' + l.className}>
                  {l.icon} {l.label}
                </span>
                <p className="mt-3 text-xs font-medium text-gray-900">
                  {l.minCompleted === 0
                    ? 'από την αρχή'
                    : `${l.minCompleted}+ δουλειές · βαθμός ${l.minRating.toFixed(1).replace('.', ',')}+`}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-gray-600">{l.perk}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Πώς δουλεύει */}
      <section className="border-t border-gray-100 bg-white py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-gray-900">Πώς δουλεύει</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
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
              <div key={s.n} className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-lg font-bold text-white">
                  {s.n}
                </div>
                <h3 className="mt-4 font-semibold text-gray-900">{s.t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ευθύνη — ρητά στην οθόνη, όχι κρυμμένο στους όρους */}
      <section className="py-12">
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

          <p className="mt-6 text-center text-xs leading-relaxed text-gray-500">
            Δεν επιτρέπονται παράνομες υπηρεσίες ούτε ερωτικό ή συνοδευτικό περιεχόμενο.
          </p>

          <div className="mt-8 text-center">
            <Link
              href="/"
              className="text-sm font-medium text-gray-500 hover:text-gray-900"
            >
              ← Πίσω στο StaffNow
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
