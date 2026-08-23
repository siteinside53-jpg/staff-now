import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  CATEGORY_BY_KEY,
  formatPostedAgo,
  isLicensedCategory,
  REQUIRED_LICENCE,
} from '@/components/tasknow/data';
import { TaskNowLogo } from '@/components/tasknow/logo';
import { fetchAllTasks } from '@/lib/seo-data';
import { TaskPageActions } from '@/components/tasknow/task-page-actions';

/**
 * ΜΑΚΕΤΑ — η σελίδα μιας μικροδουλειάς.
 *
 * ΓΙΑΤΙ ΥΠΑΡΧΕΙ: χωρίς δική της σελίδα, κάθε κοινοποίηση σε Facebook ή
 * WhatsApp έδειχνε τον γενικό τίτλο και τη γενική εικόνα του StaffNow — ίδιο
 * «post» για κάθε δουλειά. Οι αγγελίες εργασίας έχουν ήδη τέτοια σελίδα· εδώ
 * ακολουθείται το ίδιο μοτίβο.
 *
 * Οι κρυμμένες δουλειές ΔΕΝ αποκτούν σελίδα: ό,τι κόβει το διαχειριστικό δεν
 * πρέπει να αποκτά μόνιμη διεύθυνση που μπορεί να κυκλοφορήσει.
 *
 * `noindex` όσο είναι μακέτα.
 */
export const dynamic = 'force-static';

type Params = { params: Promise<{ id: string }> };

/**
 * ΤΟ ΤΕΧΝΑΣΜΑ ΤΟΥ `_none`:
 *
 * Όταν δεν τρέχει η μακέτα, δεν υπάρχει καμία μικροδουλειά — άρα καμία
 * σελίδα να φτιαχτεί. Το Next όμως ΔΕΝ δέχεται άδεια λίστα σε δυναμική
 * διαδρομή με στατικό χτίσιμο: σταματάει με σφάλμα.
 *
 * Γι' αυτό επιστρέφουμε μία ψεύτικη διεύθυνση που η ίδια η σελίδα γυρίζει σε
 * «δεν βρέθηκε». Αποτέλεσμα: η διαδρομή υπάρχει τεχνικά, καμία σελίδα με
 * περιεχόμενο δεν ανεβαίνει, και το χτίσιμο περνάει.
 */
export async function generateStaticParams() {
  const ids = (await fetchAllTasks()).map((t) => ({ id: t.id }));
  return ids.length > 0 ? ids : [{ id: '_none' }];
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const task = (await fetchAllTasks()).find((t) => t.id === id);
  if (!task) return { title: 'Μικροδουλειά', robots: { index: false, follow: false } };

  const cat = CATEGORY_BY_KEY[task.category]?.label ?? 'Μικροδουλειά';
  const title = `${task.title} — ${task.budget}€ · ${task.area}`;
  // Αν ο χρήστης έγραψε περιγραφή, αυτή μπαίνει πρώτη: είναι δικά του λόγια
  // για τη δουλειά του, όχι δική μας σύνθεση από πεδία.
  const facts =
    `${cat} στην περιοχή ${task.area}. Αμοιβή ${task.budget}€ ` +
    `${task.budgetNote ?? 'για όλη τη δουλειά'}. Πότε: ${task.when}.`;
  const description = task.description
    ? `${task.description.slice(0, 180)}${task.description.length > 180 ? '…' : ''} ${facts}`
    : `${facts} Κάνε προσφορά με δικό σου ποσό στο TaskNow.`;

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, type: 'article' },
  };
}

export default async function TaskPage({ params }: Params) {
  const { id } = await params;
  const task = (await fetchAllTasks()).find((t) => t.id === id);
  if (!task) notFound();

  const cat = CATEGORY_BY_KEY[task.category];
  const licensed = isLicensedCategory(task.category);
  const licenceLabel = REQUIRED_LICENCE[task.category] ?? 'Επαγγελματική άδεια';

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-gray-900 px-4 py-2 text-center text-sm text-amber-300">
        <strong className="font-semibold">ΜΑΚΕΤΑ</strong> — παράδειγμα, όχι αληθινή αγγελία.
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-4 text-xs text-gray-500" aria-label="breadcrumb">
          <Link href="/" className="hover:text-gray-700">
            StaffNow
          </Link>{' '}
          <span aria-hidden="true">/</span>{' '}
          <Link href="/tasknow" className="hover:text-gray-700">
            TaskNow
          </Link>{' '}
          <span aria-hidden="true">/</span>{' '}
          <span className="text-gray-700">{cat?.label}</span>
        </nav>

        <article className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
              {cat?.icon} {cat?.label}
            </span>
            {licensed && (
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                θέλει άδεια
              </span>
            )}
            {task.urgent && (
              <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-600">
                Επείγον
              </span>
            )}
          </div>

          <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-gray-900 sm:text-3xl">
            {task.title}
          </h1>

          {task.description && (
            <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-gray-700">
              {task.description}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-y border-gray-100 py-4">
            <div className="text-sm text-gray-600">
              <p>
                <span aria-hidden="true">📍</span> {task.area}
              </p>
              <p className="mt-1">
                <span aria-hidden="true">🕒</span> {task.when}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Ανέβηκε {formatPostedAgo(task.postedMinutesAgo)}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-gray-400">δίνει</p>
              <p className="text-4xl font-extrabold leading-none tracking-tight tabular-nums text-gray-900">
                {task.budget}
                <span className="text-xl font-bold text-gray-400">€</span>
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {task.budgetNote ?? 'για όλη τη δουλειά'}
              </p>
            </div>
          </div>

          {licensed && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-900">
              Η εργασία απαιτεί <strong>{licenceLabel.toLowerCase()}</strong>. Προσφορά
              μπορούν να κάνουν μόνο όσοι ανεβάσουν την άδειά τους, και η άδεια φαίνεται
              ως «δηλωμένη» μέχρι να την ελέγξει άνθρωπος.
            </p>
          )}

          <div className="mt-6">
            <TaskPageActions
              taskId={task.id}
              title={task.title}
              budget={task.budget}
              area={task.area}
            />
          </div>

          <p className="mt-5 border-t border-gray-100 pt-4 text-xs leading-relaxed text-gray-500">
            Το StaffNow δεν είναι εργοδότης, δεν αναθέτει και δεν κρατά χρήματα. Η
            συμφωνία και η πληρωμή είναι ανάμεσα σε εσένα και σε αυτόν που ανέβασε τη
            δουλειά — η επιλογή γίνεται με δική σας ευθύνη.
          </p>
        </article>

        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <div className="flex justify-center">
            <TaskNowLogo className="text-xl" markClassName="h-6 w-6" />
          </div>
          <p className="mt-2 text-sm text-gray-700">
            Δες όλες τις μικροδουλειές που είναι ανοιχτές τώρα στη Θεσσαλονίκη.
          </p>
          <Link
            href="/tasknow"
            className="mt-4 inline-flex rounded-xl bg-amber-500 px-7 py-3 text-sm font-semibold text-white transition hover:bg-amber-600"
          >
            Δες τη ροή
          </Link>
        </div>
      </div>
    </main>
  );
}
