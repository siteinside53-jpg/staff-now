'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { PostTaskModal } from './post-task-modal';
import { TaskDetailModal } from './task-detail-modal';
import { TaskNowTermsGate, hasAcceptedTaskNowTerms, forgetTaskNowTerms } from './terms';
import {
  AREA_COORDS,
  CATEGORIES,
  CATEGORY_BY_KEY,
  DEFAULT_CENTER,
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

/**
 * Το τετράγωνο με ένα νούμερο.
 *
 * Το εικονίδιο δεν είναι στολίδι: τα τέσσερα τετράγωνα λένε τέσσερα εντελώς
 * διαφορετικά πράγματα (ευρώ, δουλειές, προσφορές, επαλήθευση) και χωρίς
 * σημάδι διαβάζονταν σαν μία σειρά από ίδια κουτιά. Τα ψηφία είναι
 * `tabular-nums` ώστε τα τέσσερα νούμερα να κάθονται στην ίδια γραμμή.
 */
function Stat({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string;
  note?: string;
  icon: string;
}) {
  return (
    <div className="group rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-base ring-1 ring-inset ring-gray-100"
          aria-hidden="true"
        >
          {icon}
        </span>
        <p className="min-w-0 text-[11px] font-semibold uppercase leading-tight tracking-wide text-gray-400">
          {label}
        </p>
      </div>
      <p className="mt-3 text-3xl font-extrabold tabular-nums leading-none tracking-tight text-gray-900">
        {value}
      </p>
      {note && <p className="mt-1.5 text-xs leading-tight text-gray-400">{note}</p>}
    </div>
  );
}

export function TaskNowDashboardHub() {
  const state = useMockTasks();

  /**
   * Ποιος ανεβάζει: μέσα στον λογαριασμό το ξέρουμε, οπότε η μικροδουλειά
   * παίρνει το κανονικό όνομα και τη φωτογραφία σου — όπως κάθε άλλη αγγελία.
   * Τα πεδία διαβάζονται ακριβώς όπως και στο πλαϊνό μενού του πίνακα, ώστε
   * να μη διαφωνήσουν ποτέ μεταξύ τους.
   */
  const { user, profile } = useAuth();
  const u = user as any;
  const pr = profile as any;
  const poster = {
    name:
      (u?.display_name || '').trim() ||
      (pr?.full_name || '').trim() ||
      (pr?.company_name || '').trim() ||
      undefined,
    photo: u?.avatar_url || pr?.photo_url || pr?.logo_url || undefined,
    role: user?.role === 'business' ? ('business' as const) : ('worker' as const),
  };
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
          <ul className="space-y-3 p-3">
            {liveTasks.slice(0, 5).map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                onOpen={() => setDetail(t)}
                onOffer={() => setDetail(t)}
              />
            ))}
          </ul>
        </div>
      )}

      {/* Τα δύο κουμπιά, στο ΙΔΙΟ στιλ με «Νέα Αγγελία» και «Boost» της
          αρχικής του πίνακα ελέγχου: φαρδιά, με βαθμωτό χρώμα, εικονίδιο
          αριστερά, τίτλος και μία γραμμή εξήγησης.

          ΤΟ ΔΕΥΤΕΡΟ ΕΙΝΑΙ ΜΠΛΕ, ΟΧΙ ΜΑΥΡΟ. Στην αρχική του πίνακα τα δύο
          γρήγορα κουμπιά είναι μπλε + πορτοκαλί· το μαύρο εδώ ήταν το μόνο
          μαύρο πλακίδιο σε όλο τον λογαριασμό και τραβούσε το μάτι σαν λάθος.
          Το εικονίδιο μπαίνει σε τετράγωνο πλαίσιο ώστε τα δύο κουμπιά να
          έχουν την ίδια οπτική αρχή — πριν, το «＋» και η μεγεθυντική είχαν
          διαφορετικό μέγεθος και η δεύτερη σειρά δεν στοίχιζε. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => start('post')}
          className="group flex items-center gap-4 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 px-5 py-5 text-left text-white shadow-lg shadow-amber-500/25 transition hover:brightness-105 active:scale-[0.99]"
        >
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold leading-none"
            aria-hidden="true"
          >
            +
          </span>
          <span className="min-w-0">
            <span className="block text-lg font-bold leading-tight">Ανέβασε μικροδουλειά</span>
            <span className="mt-0.5 block text-sm leading-snug text-white/90">
              Γράψε τι θέλεις να γίνει και δέξου προσφορές
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => start('browse')}
          className="group flex items-center gap-4 rounded-3xl bg-gradient-to-br from-blue-500 to-blue-600 px-5 py-5 text-left text-white shadow-lg shadow-blue-600/25 transition hover:brightness-105 active:scale-[0.99]"
        >
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-xl leading-none"
            aria-hidden="true"
          >
            🔎
          </span>
          <span className="min-w-0">
            <span className="block text-lg font-bold leading-tight">Βρες μικροδουλειά</span>
            <span className="mt-0.5 block text-sm leading-snug text-white/90">
              Δες τι υπάρχει κοντά σου και κάνε προσφορά
            </span>
          </span>
        </button>
      </div>

      {/* Πρόοδος: πού είσαι και τι λείπει για το επόμενο σκαλί.

          ΔΥΟ ΞΕΧΩΡΙΣΤΑ ΠΡΑΓΜΑΤΑ, ΔΥΟ ΞΕΧΩΡΙΣΤΕΣ ΣΕΙΡΕΣ. Πριν, το επίπεδο και
          ο στόχος του μήνα ήταν δύο λεπτές μπάρες η μία κάτω από την άλλη
          χωρίς τίτλο, οπότε δεν φαινόταν ποια μετράει δουλειές και ποια ευρώ.
          Τώρα κάθε μπάρα έχει από πάνω της τι μετράει. */}
      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-4">
          {/* Το μετάλλιο, σε κύκλο. Πριν ήταν ένα μακρόστενο χαπάκι δίπλα στο
              κείμενο και δεν ξεχώριζε από τις άλλες ετικέτες της σελίδας — ενώ
              είναι το μόνο πράγμα εδώ που χτίζεται με τον καιρό. */}
          <span
            className={
              'flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl text-2xl leading-none ring-1 ring-inset ring-black/5 ' +
              level.className
            }
            title={level.label}
          >
            <span aria-hidden="true">{level.icon}</span>
            <span className="text-[9px] font-bold uppercase tracking-wide">{level.label}</span>
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="text-lg font-bold leading-tight tracking-tight text-gray-900">
                {completed} ολοκληρωμένες δουλειές
              </p>
              {next && (
                <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
                  Ακόμη {Math.max(0, next.minCompleted - completed)} για {next.icon}{' '}
                  {next.label}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm leading-snug text-gray-500">{level.perk}</p>

            {next && (
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, next.minCompleted === 0 ? 100 : (completed / next.minCompleted) * 100)}%`,
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Ο στόχος τον βάζει ο ίδιος. Δεν τον πιέζει η πλατφόρμα. */}
        <div className="mt-5 border-t border-gray-100 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <label className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Στόχος μήνα
              </span>
              <span className="flex items-center rounded-full border border-gray-200 bg-gray-50 pr-3 transition focus-within:border-emerald-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-400/20">
                <input
                  value={goal}
                  onChange={(e) => setGoal(e.target.value.replace(/\D/g, ''))}
                  inputMode="numeric"
                  aria-label="Στόχος μήνα σε ευρώ"
                  className="w-14 rounded-full bg-transparent py-1.5 pl-3.5 text-xs font-semibold tabular-nums text-gray-900 outline-none"
                />
                <span className="text-xs font-semibold text-gray-400">€</span>
              </span>
            </label>
            <span className="text-sm font-bold tabular-nums text-gray-900">
              {earned}€ <span className="font-medium text-gray-400">/ {goalNumber}€</span>
            </span>
          </div>
          <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${goalNumber > 0 ? Math.min(100, (earned / goalNumber) * 100) : 0}%` }}
            />
          </div>
        </div>

        {/* Ειδοποιήσεις — ο πιο δυνατός λόγος να ξαναμπεί κάποιος, γι' αυτό
            είναι πραγματική ρύθμιση και όχι διακοσμητικό κουμπάκι.

            ΓΙΑΤΙ ΕΦΥΓΕ ΤΟ ΚΙΤΡΙΝΟ ΠΛΑΚΙΔΙΟ: ήταν το μεγαλύτερο έγχρωμο
            κομμάτι της σελίδας και τραβούσε περισσότερη προσοχή από τα δύο
            κουμπιά δράσης. Χειρότερα, το κίτρινο φόντο σημαίνει «προσοχή» σε
            όλο το υπόλοιπο StaffNow — εδώ δεν υπάρχει τίποτα να προσέξεις.
            Μένει λευκή κάρτα με λεπτό πορτοκαλί πλαίσιο· το χρώμα κρατιέται
            μόνο στο εικονίδιο, όπως λέει ο κανόνας του TaskNow. */}
        <div className="mt-5 rounded-2xl border border-amber-200 bg-white p-4">
          <label className="flex cursor-pointer items-center gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-base"
              aria-hidden="true"
            >
              🔔
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold leading-tight text-gray-900">
                Ειδοποίησέ με
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-gray-600">
                όταν βγαίνει μικροδουλειά στην περιοχή και την ειδικότητά μου. Δεν
                χρειάζεται να μπαίνεις να κοιτάς — σε ειδοποιούμε εμείς.
              </span>
            </span>
            {/* Διακόπτης, όχι τετραγωνάκι. Το τετραγωνάκι του browser είναι
                ό,τι πιο παλιό δείχνει σε μια σελίδα και δεν αλλάζει εμφάνιση
                από μηχάνημα σε μηχάνημα. Το πραγματικό κουτάκι μένει από κάτω
                για το πληκτρολόγιο και τους αναγνώστες οθόνης. */}
            <span className="relative inline-flex shrink-0">
              <input
                type="checkbox"
                checked={notify.enabled}
                onChange={(e) => setNotifyPrefs({ enabled: e.target.checked })}
                aria-label="Ειδοποίησέ με για νέες μικροδουλειές"
                className="peer h-7 w-12 cursor-pointer appearance-none rounded-full bg-gray-200 transition-colors checked:bg-amber-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5"
              />
            </span>
          </label>

          {notify.enabled && (
            <>
              <div className="mt-4 space-y-3">
                {/* Η περιοχή: κουτάκι με δικό μας βελάκι. Το σκέτο κουτάκι του
                    browser έδειχνε αλλιώς σε κάθε σύστημα και χάλαγε τη σειρά. */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">Περιοχή</span>
                  <span className="relative">
                    <select
                      value={notify.area}
                      onChange={(e) => setNotifyPrefs({ area: e.target.value })}
                      aria-label="Περιοχή ειδοποιήσεων"
                      className="cursor-pointer appearance-none rounded-full border border-gray-200 bg-gray-50 py-1.5 pl-3.5 pr-8 text-xs font-semibold text-gray-900 transition hover:border-gray-300 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                    >
                      {Object.keys(AREA_COORDS).map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-gray-400"
                    >
                      ▼
                    </span>
                  </span>
                </div>

                {/* Η ακτίνα: τέσσερις τιμές, άρα κουμπιά. Ένα κουτάκι που
                    ανοίγει για να διαλέξεις ανάμεσα σε τέσσερα είναι δύο
                    κινήσεις εκεί που φτάνει μία. */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">Ακτίνα</span>
                  <div className="inline-flex rounded-full bg-gray-100 p-0.5">
                    {[2, 5, 10, 25].map((r) => {
                      const on = notify.radiusKm === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setNotifyPrefs({ radiusKm: r })}
                          className={
                            'rounded-full px-3 py-1 text-xs font-semibold transition ' +
                            (on
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-500 hover:text-gray-900')
                          }
                        >
                          {r} χλμ
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNotifySettings((v) => !v)}
                    className="rounded-full px-2 py-1 text-xs font-semibold text-amber-700 underline-offset-2 transition hover:bg-amber-50 hover:underline"
                  >
                    {showNotifySettings ? 'κλείσε τις ειδικότητες' : 'διάλεξε ειδικότητες'}
                  </button>
                </div>
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
              <div className="mt-3 border-t border-gray-100 pt-3">
                {matches.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    Αυτή τη στιγμή δεν υπάρχει κάτι που να ταιριάζει. Θα σου φτάσει μόλις
                    βγει.
                  </p>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-gray-900">
                      {matches.length} {matches.length === 1 ? 'δουλειά ταιριάζει' : 'δουλειές ταιριάζουν'} τώρα —
                      αυτές θα σου έφταναν:
                    </p>
                    <div className="mt-2 space-y-1.5">
                      {matches.slice(0, 3).map((t) => (
                        <Link
                          key={t.id}
                          href="/tasknow"
                          className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 transition hover:border-amber-200 hover:bg-amber-50"
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
          icon="💶"
          label="Έβγαλες αυτόν τον μήνα"
          value={`${earned}€`}
          note={earned === 0 ? 'καμία δεκτή προσφορά ακόμη' : 'από δεκτές προσφορές'}
        />
        <Stat icon="📤" label="Δουλειές που ανέβασες" value={String(mine.length)} />
        <Stat icon="📥" label="Προσφορές που έστειλες" value={String(offers.length)} />
        <Stat icon="✅" label="Επαλήθευση" value="Κινητό" note="ταυτότητα: όχι ακόμη" />
      </div>

      {/* Οι δουλειές μου / οι προσφορές μου */}
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="flex gap-1 border-b border-gray-100 p-2">
          <button
            type="button"
            onClick={() => setTab('tasks')}
            aria-pressed={tab === 'tasks'}
            className={
              'rounded-lg px-4 py-2 text-sm font-medium transition ' +
              (tab === 'tasks' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900')
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
              (tab === 'offers' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900')
            }
          >
            Οι προσφορές μου ({offers.length})
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {/* ΙΔΙΑ γραμμή με παντού αλλού — μαζί με το πρόσωπό σου. Πριν, οι
              δικές σου δουλειές είχαν δική τους εμφάνιση χωρίς εικόνα, και
              γι' αυτό δεν φαινόταν η φωτογραφία σου εκεί που την έψαχνες. */}
          {tab === 'tasks' &&
            (mine.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-gray-500">
                Δεν έχεις ανεβάσει μικροδουλειά ακόμη.
              </p>
            ) : (
              <ul className="space-y-3 p-3">
                {mine.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    onOpen={() => openMine(t)}
                    onOffer={() => openMine(t)}
                  />
                ))}
              </ul>
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
                  <div className="flex min-w-0 items-center gap-3">
                    {task.postedByName && (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-100 to-orange-100 text-xs font-bold text-amber-700">
                        {task.postedByPhoto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={task.postedByPhoto} alt="" className="h-full w-full object-cover" />
                        ) : (
                          task.postedByName.trim().charAt(0).toUpperCase()
                        )}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{task.title}</p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {task.postedByName ? `${task.postedByName} · ` : ''}
                        στάλθηκε {offer.createdAgo}
                      </p>
                    </div>
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
          poster={poster}
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
