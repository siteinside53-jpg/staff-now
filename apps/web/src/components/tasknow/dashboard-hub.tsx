'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PostTaskModal } from './post-task-modal';
import { TaskDetailModal } from './task-detail-modal';
import { TaskNowTermsGate, hasAcceptedTaskNowTerms, forgetTaskNowTerms } from './terms';
import {
  AREA_COORDS,
  CATEGORIES,
  CATEGORY_BY_KEY,
  DEFAULT_CENTER,
  isLicensedCategory,
  levelFor,
  nextLevel,
} from './data';
import { TaskNowLogo } from './logo';
import { TaskRow } from './task-row';
import {
  isOpen,
  matchingTasks,
  myOffers,
  myTasks,
  resetMock,
  setNotifyPrefs,
  useMockTasks,
  type MockTask,
} from './mock-store';

/**
 * ΜΑΚΕΤΑ — η ενότητα TaskNow μέσα στον πίνακα ελέγχου του χρήστη.
 *
 * Ίδιο component για κάθε ρόλο: εργαζόμενος και επιχείρηση ανεβάζουν και
 * αναλαμβάνουν με τον ίδιο τρόπο, όπως ζητήθηκε.
 *
 * Η ΠΥΛΗ ΤΩΝ ΟΡΩΝ: η αποδοχή ζητιέται την πρώτη φορά που ο χρήστης πατάει
 * «ανέβασε» ή «βρες» — όχι με το που ανοίγει η σελίδα. Έτσι δεν εμποδίζει
 * αυτόν που απλώς κοιτάζει, αλλά κανείς δεν προχωράει χωρίς να την περάσει.
 */

type PendingAction = 'post' | 'browse';

/** Θυμόμαστε ότι ολοκληρώθηκε το δεύτερο βήμα, ώστε ο οδηγός να μην ξαναβγεί. */
const SAW_OFFERS_KEY = 'tasknow_onboarding_saw_offers';

const STATUS_LABEL: Record<MockTask['status'], string> = {
  open: 'Ανοιχτή',
  assigned: 'Ανατέθηκε',
  done: 'Ολοκληρώθηκε',
  cancelled: 'Ακυρώθηκε',
  disputed: 'Σε διαφωνία',
};

const STATUS_CLASS: Record<MockTask['status'], string> = {
  open: 'bg-amber-50 text-amber-700',
  assigned: 'bg-blue-50 text-blue-700',
  done: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-500',
  disputed: 'bg-red-50 text-red-700',
};

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
      {note && <p className="mt-0.5 text-xs text-gray-400">{note}</p>}
    </div>
  );
}

export function TaskNowDashboardHub() {
  const state = useMockTasks();
  const mine = myTasks(state);
  const offers = myOffers(state);

  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  /** Η πύλη ανοίγει μόνη της την πρώτη φορά που μπαίνει στην ενότητα. */
  const [gateOpen, setGateOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [sawOffers, setSawOffers] = useState(false);
  const [posting, setPosting] = useState(false);
  const [detail, setDetail] = useState<MockTask | null>(null);
  const [tab, setTab] = useState<'tasks' | 'offers'>('tasks');
  const [goal, setGoal] = useState('300');
  const [showNotifySettings, setShowNotifySettings] = useState(false);

  /**
   * Το localStorage διαβάζεται μόνο στον browser — ποτέ κατά το χτίσιμο.
   *
   * ΓΙΑΤΙ ΣΤΟ ΑΝΟΙΓΜΑ: μέσα στον λογαριασμό ο χρήστης μπαίνει επίτηδες στην
   * ενότητα, οπότε εδώ είναι η σωστή στιγμή να δει τι αναλαμβάνει.
   *
   * ΓΙΑΤΙ ΔΕΝ ΚΛΕΙΔΩΝΕΙ: αν πει «όχι τώρα», η σελίδα μένει ορατή αλλά χωρίς
   * ενέργειες, με γραμμή που εξηγεί τι λείπει. Τοίχος που κρύβει τα πάντα
   * διώχνει κόσμο — και συναίνεση για κάτι που δεν έχεις δει καθόλου είναι
   * φτωχή συναίνεση.
   */
  useEffect(() => {
    const ok = hasAcceptedTaskNowTerms();
    setAccepted(ok);
    setChecked(true);
    if (!ok) setGateOpen(true);
    try {
      setSawOffers(localStorage.getItem(SAW_OFFERS_KEY) === '1');
    } catch {}
  }, []);

  /** Ο χρήστης άνοιξε τη δική του δουλειά — άρα είδε τις προσφορές της. */
  function openMine(task: MockTask) {
    setDetail(task);
    if (task.mine && task.offersList.length > 0 && !sawOffers) {
      setSawOffers(true);
      try {
        localStorage.setItem(SAW_OFFERS_KEY, '1');
      } catch {}
    }
  }

  function run(action: PendingAction) {
    if (action === 'post') setPosting(true);
    if (action === 'browse') window.location.href = '/tasknow';
  }

  function start(action: PendingAction) {
    if (accepted) run(action);
    else setPending(action);
  }

  const acceptedOffers = state.tasks.flatMap((t) =>
    t.offersList.filter((o) => o.mine && o.status === 'accepted'),
  );
  const earned = acceptedOffers.reduce((sum, o) => sum + o.amount, 0);
  const completed = acceptedOffers.length;
  const level = levelFor(completed, completed > 0 ? 4.8 : null);
  const next = nextLevel(level);
  const goalNumber = Number(goal) || 0;
  const notify = state.notify;
  const liveTasks = state.tasks.filter((t) => isOpen(t) && !t.mine);
  const firstMine = mine[0] ?? null;
  const postedOne = mine.length > 0;
  // «Είδε προσφορές» σημαίνει ΑΚΡΙΒΩΣ αυτό: άνοιξε την καρτέλα μιας δικής του
  // δουλειάς που είχε προσφορές. Δεν το ταυτίζουμε με «διάλεξε κάποιον» — το
  // βήμα λέει «δες», και ένας οδηγός που δεν σβήνει όταν κάνεις αυτό που
  // ζητάει είναι χειρότερος από καθόλου οδηγός.
  const onboardingDone = postedOne && sawOffers;
  const matches = matchingTasks(state);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <TaskNowLogo className="text-xl" markClassName="h-6 w-6" />
          <p className="mt-1 text-sm text-gray-500">
            Μικροδουλειές: ανέβασε μία ή ανάλαβε μία.
          </p>
        </div>

        {accepted && (
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
              ✓ Έχεις αποδεχτεί τους όρους
            </span>
            <button
              type="button"
              onClick={() => {
                forgetTaskNowTerms();
                setAccepted(false);
              }}
              className="text-xs font-medium text-gray-400 underline hover:text-gray-600"
            >
              δες τους ξανά
            </button>
          </div>
        )}
      </div>

      {/* Δεν έχει αποδεχτεί: η σελίδα φαίνεται, οι ενέργειες όχι. */}
      {checked && !accepted && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4">
          <p className="text-sm leading-relaxed text-amber-900">
            <strong className="font-bold">Πριν ξεκινήσεις.</strong> Για να ανεβάσεις
            μικροδουλειά ή να κάνεις προσφορά, χρειάζεται να δεις μία φορά τι αναλαμβάνει
            και τι δεν αναλαμβάνει το StaffNow.
          </p>
          <button
            type="button"
            onClick={() => setGateOpen(true)}
            className="shrink-0 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600"
          >
            Δες τους όρους
          </button>
        </div>
      )}

      {/* Πρώτα βήματα — σβήνει μόνο του όταν γίνουν */}
      {accepted && !onboardingDone && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-bold text-gray-900">Δοκίμασέ το σε δύο βήματα</h3>
          <p className="mt-1 text-xs text-gray-500">
            Ο πιο γρήγορος τρόπος να καταλάβεις πώς δουλεύει είναι να το κάνεις.
          </p>

          <ol className="mt-4 space-y-3">
            <li className="flex items-start gap-3">
              <span
                className={
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ' +
                  (postedOne ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white')
                }
              >
                {postedOne ? '✓' : '1'}
              </span>
              <div className="min-w-0">
                <p
                  className={
                    'text-sm font-semibold ' +
                    (postedOne ? 'text-gray-400 line-through' : 'text-gray-900')
                  }
                >
                  Ανέβασε μια μικροδουλειά
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-600">
                  Ό,τι θέλεις να γίνει: μια μεταφορά, ένα καθάρισμα, ένα θέλημα. Δύο λεπτά.
                </p>
                {!postedOne && (
                  <button
                    type="button"
                    onClick={() => start('post')}
                    className="mt-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-600"
                  >
                    Ανέβασέ την τώρα
                  </button>
                )}
              </div>
            </li>

            <li className="flex items-start gap-3">
              <span
                className={
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ' +
                  (sawOffers
                    ? 'bg-emerald-500 text-white'
                    : postedOne
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-200 text-gray-500')
                }
              >
                {sawOffers ? '✓' : '2'}
              </span>
              <div className="min-w-0">
                <p
                  className={
                    'text-sm font-semibold ' +
                    (sawOffers ? 'text-gray-400 line-through' : 'text-gray-900')
                  }
                >
                  Δες τις προσφορές που έρχονται
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-600">
                  Θα δεις βαθμολογία, επίπεδο, τι έχει επαληθευτεί και τι άδειες έχει ο
                  καθένας — και διαλέγεις εσύ.
                </p>
                {postedOne && !sawOffers && firstMine && (
                  <button
                    type="button"
                    onClick={() => openMine(firstMine)}
                    className="mt-2 rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-gray-800"
                  >
                    Δες τις προσφορές
                  </button>
                )}
              </div>
            </li>
          </ol>
        </div>
      )}

      {/* Τι τρέχει τώρα — ζωντανή λίστα, πάνω από τα δικά σου */}
      {liveTasks.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-3">
            <h3 className="text-sm font-bold text-gray-900">
              Τρέχουν τώρα{' '}
              <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-amber-800">
                {liveTasks.length}
              </span>
            </h3>
            <Link
              href="/tasknow"
              className="text-sm font-semibold text-amber-700 hover:text-amber-800"
            >
              Δες τη ροή →
            </Link>
          </div>

          {/* ΙΔΙΑ γραμμή με τη δημόσια ροή — ένα component, μία εμφάνιση. */}
          <div className="divide-y divide-gray-100">
            {liveTasks.slice(0, 5).map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                onOpen={() => setDetail(t)}
                onOffer={() => setDetail(t)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Τα δύο κουμπιά, στο ΙΔΙΟ στιλ με «Νέα Αγγελία» και «Boost» της
          αρχικής του πίνακα ελέγχου: φαρδιά, με βαθμωτό χρώμα, εικονίδιο
          αριστερά, τίτλος και μία γραμμή εξήγησης. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => start('post')}
          className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 text-left text-white shadow-lg shadow-amber-500/20 transition hover:brightness-105 active:scale-[0.99]"
        >
          <span className="text-3xl leading-none" aria-hidden="true">
            ＋
          </span>
          <span className="min-w-0">
            <span className="block text-lg font-bold">Ανέβασε μικροδουλειά</span>
            <span className="block text-sm text-white/90">
              Γράψε τι θέλεις να γίνει και δέξου προσφορές
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => start('browse')}
          className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-gray-900 to-gray-700 px-6 py-5 text-left text-white shadow-lg shadow-gray-900/20 transition hover:brightness-110 active:scale-[0.99]"
        >
          <span className="text-2xl leading-none" aria-hidden="true">
            🔎
          </span>
          <span className="min-w-0">
            <span className="block text-lg font-bold">Βρες μικροδουλειά</span>
            <span className="block text-sm text-white/80">
              Δες τι υπάρχει κοντά σου και κάνε προσφορά
            </span>
          </span>
        </button>
      </div>

      {/* Πρόοδος: πού είσαι και τι λείπει για το επόμενο σκαλί */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={'rounded-full px-3 py-1.5 text-sm font-bold ' + level.className}>
              {level.icon} {level.label}
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-900">{completed} ολοκληρωμένες δουλειές</p>
              <p className="text-xs text-gray-500">{level.perk}</p>
            </div>
          </div>
          {next && (
            <p className="text-xs text-gray-500">
              Ακόμη{' '}
              <strong className="text-gray-900">
                {Math.max(0, next.minCompleted - completed)}
              </strong>{' '}
              για {next.icon} {next.label}
            </p>
          )}
        </div>

        {next && (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-amber-500 transition-all"
              style={{
                width: `${Math.min(100, next.minCompleted === 0 ? 100 : (completed / next.minCompleted) * 100)}%`,
              }}
            />
          </div>
        )}

        {/* Ο στόχος τον βάζει ο ίδιος. Δεν τον πιέζει η πλατφόρμα. */}
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            Στόχος μήνα:
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              className="w-20 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm"
            />
            €
          </label>
          <div className="h-2 min-w-[120px] flex-1 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${goalNumber > 0 ? Math.min(100, (earned / goalNumber) * 100) : 0}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-gray-900">
            {earned}€ / {goalNumber}€
          </span>
        </div>

        {/* Ειδοποιήσεις — ο πιο δυνατός λόγος να ξαναμπεί κάποιος, γι' αυτό
            είναι πραγματική ρύθμιση και όχι διακοσμητικό κουμπάκι. */}
        <div className="mt-4 rounded-xl bg-amber-50 p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={notify.enabled}
              onChange={(e) => setNotifyPrefs({ enabled: e.target.checked })}
              className="mt-0.5 h-4 w-4 shrink-0 accent-amber-500"
            />
            <span className="text-xs leading-relaxed text-amber-900">
              <strong>Ειδοποίησέ με</strong> όταν βγαίνει μικροδουλειά στην περιοχή και
              την ειδικότητά μου. Δεν χρειάζεται να μπαίνεις να κοιτάς — σε ειδοποιούμε
              εμείς.
            </span>
          </label>

          {notify.enabled && (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-amber-900">
                <label className="flex items-center gap-1.5">
                  περιοχή:
                  <select
                    value={notify.area}
                    onChange={(e) => setNotifyPrefs({ area: e.target.value })}
                    className="rounded-lg border border-amber-300 bg-white px-2 py-1"
                  >
                    {Object.keys(AREA_COORDS).map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-1.5">
                  ακτίνα:
                  <select
                    value={notify.radiusKm}
                    onChange={(e) => setNotifyPrefs({ radiusKm: Number(e.target.value) })}
                    className="rounded-lg border border-amber-300 bg-white px-2 py-1"
                  >
                    {[2, 5, 10, 25].map((r) => (
                      <option key={r} value={r}>
                        {r} χλμ
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => setShowNotifySettings((v) => !v)}
                  className="underline"
                >
                  {showNotifySettings ? 'κλείσε τις ειδικότητες' : 'διάλεξε ειδικότητες'}
                </button>
              </div>

              {showNotifySettings && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setNotifyPrefs({ categories: [] })}
                    className={
                      'rounded-full px-2.5 py-1 text-[11px] font-medium transition ' +
                      (notify.categories.length === 0
                        ? 'bg-gray-900 text-white'
                        : 'bg-white text-gray-600 ring-1 ring-amber-200')
                    }
                  >
                    Όλες
                  </button>
                  {CATEGORIES.map((c) => {
                    const on = notify.categories.includes(c.key);
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() =>
                          setNotifyPrefs({
                            categories: on
                              ? notify.categories.filter((k) => k !== c.key)
                              : [...notify.categories, c.key],
                          })
                        }
                        className={
                          'rounded-full px-2.5 py-1 text-[11px] font-medium transition ' +
                          (on ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 ring-1 ring-amber-200')
                        }
                      >
                        {c.icon} {c.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Η λίστα βγαίνει από τα ΠΡΑΓΜΑΤΙΚΑ δεδομένα κάθε φορά —
                  δεν αποθηκεύουμε ψεύτικες «ειδοποιήσεις». */}
              <div className="mt-3 border-t border-amber-200 pt-3">
                {matches.length === 0 ? (
                  <p className="text-xs text-amber-900">
                    Αυτή τη στιγμή δεν υπάρχει κάτι που να ταιριάζει. Θα σου φτάσει μόλις
                    βγει.
                  </p>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-amber-900">
                      {matches.length} {matches.length === 1 ? 'δουλειά ταιριάζει' : 'δουλειές ταιριάζουν'} τώρα —
                      αυτές θα σου έφταναν:
                    </p>
                    <div className="mt-2 space-y-1.5">
                      {matches.slice(0, 3).map((t) => (
                        <Link
                          key={t.id}
                          href="/tasknow"
                          className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 transition hover:bg-amber-100"
                        >
                          <span className="min-w-0 truncate text-xs text-gray-800">
                            {CATEGORY_BY_KEY[t.category]?.icon} {t.title}
                            <span className="text-gray-400"> · {t.area}</span>
                          </span>
                          <span className="shrink-0 text-sm font-bold text-gray-900">
                            {t.budget}€
                          </span>
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Λόγος να ξαναμπεί: τι έβγαλε, τι έχτισε */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Έβγαλες αυτόν τον μήνα"
          value={`${earned}€`}
          note={earned === 0 ? 'καμία δεκτή προσφορά ακόμη' : 'από δεκτές προσφορές'}
        />
        <Stat label="Δουλειές που ανέβασες" value={String(mine.length)} />
        <Stat label="Προσφορές που έστειλες" value={String(offers.length)} />
        <Stat label="Επαλήθευση" value="Κινητό" note="ταυτότητα: όχι ακόμη" />
      </div>

      {/* Οι δουλειές μου / οι προσφορές μου */}
      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="flex gap-1 border-b border-gray-100 p-2">
          <button
            type="button"
            onClick={() => setTab('tasks')}
            aria-pressed={tab === 'tasks'}
            className={
              'rounded-lg px-4 py-2 text-sm font-medium transition ' +
              (tab === 'tasks' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900')
            }
          >
            Οι δουλειές μου ({mine.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('offers')}
            aria-pressed={tab === 'offers'}
            className={
              'rounded-lg px-4 py-2 text-sm font-medium transition ' +
              (tab === 'offers' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900')
            }
          >
            Οι προσφορές μου ({offers.length})
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {tab === 'tasks' &&
            (mine.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-gray-500">
                Δεν έχεις ανεβάσει μικροδουλειά ακόμη.
              </p>
            ) : (
              mine.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => openMine(t)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {t.title}
                      {isLicensedCategory(t.category) && (
                        <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                          θέλει άδεια
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {t.offersList.length} προσφορές · {t.area} · {t.postedAgo}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-900">{t.budget}€</span>
                    <span className={'rounded-full px-2.5 py-1 text-xs font-medium ' + STATUS_CLASS[t.status]}>
                      {STATUS_LABEL[t.status]}
                    </span>
                  </div>
                </button>
              ))
            ))}

          {tab === 'offers' &&
            (offers.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-gray-500">
                Δεν έχεις στείλει προσφορά ακόμη.
              </p>
            ) : (
              offers.map(({ task, offer }) => (
                <button
                  key={offer.id}
                  type="button"
                  onClick={() => setDetail(task)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{task.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500">Στάλθηκε {offer.createdAgo}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-900">{offer.amount}€</span>
                    <span
                      className={
                        'rounded-full px-2.5 py-1 text-xs font-medium ' +
                        (offer.status === 'accepted'
                          ? 'bg-emerald-50 text-emerald-700'
                          : offer.status === 'rejected'
                            ? 'bg-gray-100 text-gray-500'
                            : 'bg-amber-50 text-amber-700')
                      }
                    >
                      {offer.status === 'accepted'
                        ? 'Δεκτή'
                        : offer.status === 'rejected'
                          ? 'Δεν επιλέχθηκε'
                          : 'Σε αναμονή'}
                    </span>
                  </div>
                </button>
              ))
            ))}
        </div>
      </div>

      <p className="text-center text-xs text-gray-400">
        Όσα βλέπεις εδώ ζουν μόνο σε αυτόν τον browser.{' '}
        <Link href="/tasknow" className="underline hover:text-gray-600">
          Δημόσια ροή
        </Link>{' '}
        ·{' '}
        <button type="button" onClick={resetMock} className="underline hover:text-gray-600">
          καθάρισε τη μακέτα
        </button>
      </p>

      {(pending || gateOpen) && (
        <TaskNowTermsGate
          onAccept={() => {
            setAccepted(true);
            setGateOpen(false);
            const action = pending;
            setPending(null);
            if (action) run(action);
          }}
          onClose={() => {
            setPending(null);
            setGateOpen(false);
          }}
        />
      )}

      {posting && (
        <PostTaskModal
          onClose={() => setPosting(false)}
          onOpenTask={(t) => {
            setPosting(false);
            openMine(t);
          }}
        />
      )}

      {detail && (
        <TaskDetailModal
          task={state.tasks.find((t) => t.id === detail.id) ?? detail}
          center={DEFAULT_CENTER}
          onClose={() => setDetail(null)}
          onMakeOffer={() => setDetail(null)}
        />
      )}
    </div>
  );
}
