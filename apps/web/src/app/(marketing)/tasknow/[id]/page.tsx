import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  CATEGORY_BY_KEY,
  isLicensedCategory,
} from '@/components/tasknow/data';
import { TaskNowLogo } from '@/components/tasknow/logo';
import { fetchAllTasks } from '@/lib/seo-data';
import { TaskPageActions } from '@/components/tasknow/task-page-actions';
import { TaskCategoryBadge, TaskPageBadges, TaskPostedAgo, TaskLicenceNote } from '@/components/tasknow/task-page-facts';
import { Tr } from '@/i18n/locale-provider';

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

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-gray-900 px-4 py-2 text-center text-sm text-amber-300">
        <strong className="font-semibold"><Tr k="tasknow.taskPage.mockStrong" /></strong>
        <Tr k="tasknow.taskPage.mockText" />
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
          <span className="text-gray-700"><TaskCategoryBadge categoryKey={task.category} /></span>
        </nav>

        <article className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
          <TaskPageBadges
            categoryKey={task.category}
            categoryIcon={cat?.icon}
            licensed={licensed}
            urgent={task.urgent}
            postedMinutesAgo={task.postedMinutesAgo}
          />

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
                <TaskPostedAgo postedMinutesAgo={task.postedMinutesAgo} />
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-gray-400"><Tr k="tasknow.taskPage.gives" /></p>
              <p className="text-4xl font-extrabold leading-none tracking-tight tabular-nums text-gray-900">
                {task.budget}
                <span className="text-xl font-bold text-gray-400">€</span>
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {task.budgetNote ?? <Tr k="tasknow.taskPage.forWholeJob" />}
              </p>
            </div>
          </div>

          {licensed && <TaskLicenceNote categoryKey={task.category} />}

          <div className="mt-6">
            <TaskPageActions
              taskId={task.id}
              title={task.title}
              budget={task.budget}
              area={task.area}
            />
          </div>

          <p className="mt-5 border-t border-gray-100 pt-4 text-xs leading-relaxed text-gray-500">
            <Tr k="tasknow.taskPage.disclaimer" />
          </p>
        </article>

        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <div className="flex justify-center">
            <TaskNowLogo className="text-xl" markClassName="h-6 w-6" />
          </div>
          <p className="mt-2 text-sm text-gray-700">
            <Tr k="tasknow.taskPage.seeAll" />
          </p>
          <Link
            href="/tasknow"
            className="mt-4 inline-flex rounded-xl bg-amber-500 px-7 py-3 text-sm font-semibold text-white transition hover:bg-amber-600"
          >
            <Tr k="tasknow.taskPage.seeFeed" />
          </Link>
        </div>
      </div>
    </main>
  );
}
