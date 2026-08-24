'use client';

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
 * Η κάρτα μιας μικροδουλειάς — ΜΙΑ φορά γραμμένη, παντού η ίδια.
 *
 * ΙΔΙΑ ΑΝΑΤΟΜΙΑ ΜΕ ΤΙΣ ΑΓΓΕΛΙΕΣ ΕΡΓΑΣΙΑΣ: πρόσωπο 56px αριστερά, τίτλος,
 * ποιος την ανέβασε, γραμμή με τόπο και ετικέτες, ποσό με 💰 σε έντονο χρώμα
 * και στρογγυλό κουμπί δεξιά. Το site έχει ήδη αυτή τη μορφή στη σελίδα
 * αγγελιών· δεν υπάρχει λόγος οι μικροδουλειές να μοιάζουν με κάτι άλλο.
 *
 * Χρησιμοποιείται στη δημόσια ροή, στον πίνακα ελέγχου («Τρέχουν τώρα», «Οι
 * δουλειές μου») και όπου αλλού εμφανιστεί μικροδουλειά.
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
   * Η τρίτη περίπτωση χρειάστηκε όταν η ίδια κάρτα μπήκε στον πίνακα
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
    <li>
      <div className="relative rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-amber-400 hover:shadow-md">
        <div className="flex gap-3">
          {/* Ποιος την ανέβασε — φωτογραφία αν έχει, αλλιώς το αρχικό γράμμα.
              Μια μικροδουλειά χωρίς πρόσωπο είναι απλώς ένα ποσό. */}
          <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-amber-100 to-orange-300 text-xl font-bold text-amber-800">
            {task.postedByPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={task.postedByPhoto} alt="" loading="lazy" className="h-full w-full object-cover" />
            ) : task.postedByName ? (
              task.postedByName.trim().charAt(0).toUpperCase()
            ) : (
              (cat?.icon ?? '🧰')
            )}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              {/* Ο τίτλος απλώνεται πάνω σε όλη την κάρτα· τα κουμπιά μένουν
                  από πάνω του. Έτσι αποφεύγουμε κουμπί μέσα σε κουμπί. */}
              <button
                type="button"
                onClick={onOpen}
                className="min-w-0 flex-1 truncate text-left font-bold text-gray-900 after:absolute after:inset-0 hover:underline"
              >
                {task.title}
              </button>
              {isNew && !task.mine && (
                <span className="mt-0.5 flex-shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Νέο
                </span>
              )}
            </div>

            {task.postedByName && (
              <p className="truncate text-xs text-gray-500">
                {posterLabel(task.postedByName, task.postedByRole)}
              </p>
            )}

            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span>
                <span aria-hidden="true">📍</span> {task.area}
                {km !== undefined && <> · {distanceLabel(km, source, centerLabel)}</>}
              </span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold">
                {cat?.icon} {cat?.label}
              </span>
              <span className="text-gray-400">
                {formatPostedAgo(task.postedMinutesAgo)} · {task.offersList.length}{' '}
                {task.offersList.length === 1 ? 'προσφορά' : 'προσφορές'}
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <span
                className={
                  'text-base font-extrabold tabular-nums ' +
                  (mineOffer ? 'text-gray-400' : 'text-amber-600')
                }
              >
                💰 {task.budget}€
                <span className="ml-1 text-[11px] font-medium text-gray-400">
                  {task.budgetNote ?? 'για όλη τη δουλειά'}
                </span>
              </span>

              {task.mine ? (
                <button
                  type="button"
                  onClick={onOpen}
                  className="relative z-10 flex-shrink-0 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700"
                >
                  Δες τις προσφορές
                </button>
              ) : mineOffer ? (
                <span className="relative z-10 flex-shrink-0 rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-bold text-emerald-700">
                  ✓ Έστειλες προσφορά
                </span>
              ) : task.isSample ? (
                /* Στο παράδειγμα ΔΕΝ μπαίνει κουμπί προσφοράς. Ένα κουμπί που
                   δεν οδηγεί πουθενά είναι χειρότερο από κανένα κουμπί. */
                <span className="relative z-10 flex-shrink-0 rounded-full bg-gray-100 px-4 py-1.5 text-xs font-bold text-gray-500">
                  Παράδειγμα
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onOffer}
                  className="relative z-10 flex-shrink-0 rounded-full bg-amber-500 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-amber-600"
                >
                  Κάνε προσφορά
                </button>
              )}
            </div>

            {/* Ο περιορισμός της άδειας δεν κρύβεται ποτέ. */}
            {(licensed || task.urgent || task.remote || task.mine || task.isSample) && (
              <div className="mt-2 flex flex-wrap gap-1">
                {task.isSample && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                    δείγμα — έτσι δείχνει μια μικροδουλειά
                  </span>
                )}
                {licensed && (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                    θέλει άδεια
                  </span>
                )}
                {task.urgent && (
                  <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-600">
                    Επείγον
                  </span>
                )}
                {task.remote && (
                  <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                    Εξ αποστάσεως
                  </span>
                )}
                {task.mine && (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                    {task.status === 'assigned'
                      ? 'δική σου · ανατέθηκε'
                      : task.status === 'done'
                        ? 'δική σου · ολοκληρώθηκε'
                        : task.status === 'paused'
                          ? 'δική σου · σε παύση'
                          : 'δική σου'}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
