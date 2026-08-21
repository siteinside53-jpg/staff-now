'use client';

import { Amount } from './amount';
import {
  CATEGORY_BY_KEY,
  NEW_MINUTES,
  type CenterSource,
  distanceLabel,
  formatPostedAgo,
  isLicensedCategory,
  posterLabel,
} from './data';
import type { MockTask } from './mock-store';

/**
 * Η γραμμή μιας μικροδουλειάς — ΜΙΑ φορά γραμμένη, παντού η ίδια.
 *
 * Εμφανίζεται στη δημόσια ροή, στον πίνακα ελέγχου, στο ταμπλό «Όλες οι
 * αγγελίες» και όπου αλλού χρειαστεί. Ήταν γραμμένη τρεις φορές με μικρές
 * διαφορές — άλλο μέγεθος ποσού εδώ, χωρίς «δίνει» εκεί — και το αποτέλεσμα
 * ήταν να μη μοιάζει τίποτα με τίποτα.
 *
 * Η ΑΝΑΤΟΜΙΑ ΔΕΝ ΑΛΛΑΖΕΙ: τίτλος, πού και πότε, πόσο παλιά και πόσες
 * προσφορές, ετικέτες, και δεξιά η στήλη του ποσού με στοιχισμένα ψηφία.
 * Αυτή η στήλη ΕΙΝΑΙ ο σχεδιασμός: όλα τα ευρώ πέφτουν στην ίδια κατακόρυφη
 * γραμμή και συγκρίνονται με μια ματιά.
 */

export function TaskRow({
  task,
  km,
  source = 'default',
  centerLabel = 'το κέντρο',
  onOpen,
  onOffer,
}: {
  task: MockTask;
  /**
   * Απόσταση από το σημείο αναφοράς.
   *  · αριθμός → γράφεται με το σημείο αναφοράς δίπλα
   *  · null    → η δουλειά γίνεται εξ αποστάσεως
   *  · παράλειψη → δεν ξέρουμε από πού μετράμε, οπότε δεν γράφουμε τίποτα
   *
   * Η τρίτη περίπτωση χρειάστηκε όταν η ίδια γραμμή μπήκε στον πίνακα
   * ελέγχου, όπου δεν υπάρχει χάρτης: χωρίς αυτήν, κάθε δουλειά έγραφε
   * «Εξ αποστάσεως» — που ήταν απλώς ψέμα.
   */
  km?: number | null;
  source?: CenterSource;
  centerLabel?: string;
  onOpen: () => void;
  onOffer: () => void;
}) {
  const cat = CATEGORY_BY_KEY[task.category];
  const licensed = isLicensedCategory(task.category);
  const mineOffer = task.offersList.some((o) => o.mine);
  const isNew = task.postedMinutesAgo < NEW_MINUTES;

  return (
    <article
      className={
        'relative flex gap-x-3 px-4 py-3.5 transition hover:bg-amber-50/40 ' +
        (licensed ? 'border-l-2 border-red-300' : '')
      }
    >
      {/* Ποιος την ανέβασε — φωτογραφία αν έχει, αλλιώς το αρχικό του γράμμα.
          Μια μικροδουλειά χωρίς πρόσωπο είναι απλώς ένα ποσό. */}
      {task.postedByName && (
        <span className="mt-0.5 mr-3 hidden h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-100 to-orange-100 text-xs font-bold text-amber-700 sm:flex">
          {task.postedByPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={task.postedByPhoto} alt="" className="h-full w-full object-cover" />
          ) : (
            task.postedByName.trim().charAt(0).toUpperCase()
          )}
        </span>
      )}

      <div className="min-w-0">
        {/* Ο τίτλος απλώνεται πάνω σε όλη τη γραμμή· το κουμπί δράσης μένει
            από πάνω του. Έτσι αποφεύγουμε κουμπί μέσα σε κουμπί. */}
        <button
          type="button"
          onClick={onOpen}
          className="text-left text-[15px] font-semibold leading-snug text-gray-900 after:absolute after:inset-0 hover:underline"
        >
          {task.title}
        </button>

        <p className="mt-1 text-[12.5px] text-gray-500">
          <span aria-hidden="true">📍</span> {task.area}
          {km !== undefined && <> · {distanceLabel(km, source, centerLabel)}</>} ·{' '}
          {task.when}
        </p>
        <p className="mt-0.5 text-[12px] text-gray-500">
          {task.postedByName && (
            <>{posterLabel(task.postedByName, task.postedByRole)} · </>
          )}
          {formatPostedAgo(task.postedMinutesAgo)} · {task.offersList.length}{' '}
          {task.offersList.length === 1 ? 'προσφορά' : 'προσφορές'}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
            {cat?.icon} {cat?.label}
          </span>
          {/* Ο περιορισμός της άδειας δεν κρύβεται ποτέ. */}
          {licensed && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
              θέλει άδεια
            </span>
          )}
          {task.urgent && (
            <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-600">
              Επείγον
            </span>
          )}
          {task.remote && (
            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
              Εξ αποστάσεως
            </span>
          )}
          {isNew && !task.mine && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              Νέο
            </span>
          )}
          {task.mine && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
              {task.status === 'assigned'
                ? 'δική σου · ανατέθηκε'
                : task.status === 'done'
                  ? 'δική σου · ολοκληρώθηκε'
                  : 'δική σου'}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end justify-between gap-2">
        <div className="w-[4.75rem]">
          <Amount value={task.budget} note={task.budgetNote} direction muted={mineOffer} />
        </div>

        {task.mine ? (
          <button
            type="button"
            onClick={onOpen}
            className="relative z-10 h-8 shrink-0 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700"
          >
            Δες τις προσφορές
          </button>
        ) : mineOffer ? (
          <span className="relative z-10 h-8 shrink-0 rounded-lg bg-emerald-50 px-3 text-xs font-semibold leading-8 text-emerald-700">
            ✓ Έστειλες προσφορά
          </span>
        ) : (
          <button
            type="button"
            onClick={onOffer}
            className="relative z-10 h-8 shrink-0 rounded-lg bg-gray-900 px-3 text-xs font-semibold text-white transition hover:bg-amber-500"
          >
            Κάνε προσφορά
          </button>
        )}
      </div>
    </article>
  );
}
