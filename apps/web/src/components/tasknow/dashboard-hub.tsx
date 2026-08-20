'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PostTaskModal } from './post-task-modal';
import { TaskDetailModal } from './task-detail-modal';
import { TaskNowTermsGate, hasAcceptedTaskNowTerms, forgetTaskNowTerms } from './terms';
import { DEFAULT_CENTER, isLicensedCategory, levelFor, nextLevel } from './data';
import { TaskNowLogo } from './logo';
import { myOffers, myTasks, resetMock, useMockTasks, type MockTask } from './mock-store';

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

const STATUS_LABEL: Record<MockTask['status'], string> = {
  open: 'Ανοιχτή',
  assigned: 'Ανατέθηκε',
  done: 'Ολοκληρώθηκε',
};

const STATUS_CLASS: Record<MockTask['status'], string> = {
  open: 'bg-amber-50 text-amber-700',
  assigned: 'bg-blue-50 text-blue-700',
  done: 'bg-emerald-50 text-emerald-700',
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
  const [posting, setPosting] = useState(false);
  const [detail, setDetail] = useState<MockTask | null>(null);
  const [tab, setTab] = useState<'tasks' | 'offers'>('tasks');
  const [goal, setGoal] = useState('300');
  const [notify, setNotify] = useState(true);

  // Το localStorage διαβάζεται μόνο στον browser — ποτέ κατά το χτίσιμο.
  useEffect(() => {
    setAccepted(hasAcceptedTaskNowTerms());
  }, []);

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

      {/* Τα δύο κουμπιά που ζητήθηκαν */}
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => start('post')}
          className="group rounded-2xl border border-amber-200 bg-amber-50 p-6 text-left transition hover:border-amber-400 hover:bg-amber-100"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-xl text-white">
            +
          </span>
          <h3 className="mt-4 text-base font-bold text-gray-900">Ανέβασε μικροδουλειά</h3>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">
            Γράψε τι θέλεις να γίνει, πόσα δίνεις και πότε. Δέχεσαι προσφορές και
            διαλέγεις εσύ.
          </p>
          <span className="mt-3 inline-block text-sm font-semibold text-amber-700 group-hover:underline">
            Ξεκίνα →
          </span>
        </button>

        <button
          type="button"
          onClick={() => start('browse')}
          className="group rounded-2xl border border-gray-200 bg-white p-6 text-left transition hover:border-gray-400 hover:bg-gray-50"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-900 text-white">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
            </svg>
          </span>
          <h3 className="mt-4 text-base font-bold text-gray-900">Βρες μικροδουλειά</h3>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">
            Δες τι υπάρχει κοντά σου στον χάρτη και κάνε προσφορά. Η πρώτη φορά θέλει
            επαλήθευση κινητού.
          </p>
          <span className="mt-3 inline-block text-sm font-semibold text-gray-900 group-hover:underline">
            Δες τη ροή →
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

        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-amber-50 px-4 py-3">
          <input
            type="checkbox"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-amber-500"
          />
          <span className="text-xs leading-relaxed text-amber-900">
            <strong>Ειδοποίησέ με</strong> όταν βγαίνει μικροδουλειά στην περιοχή και την
            ειδικότητά μου. Δεν χρειάζεται να μπαίνεις να κοιτάς — σε ειδοποιούμε εμείς.
          </span>
        </label>
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
                  onClick={() => setDetail(t)}
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

      {pending && (
        <TaskNowTermsGate
          onAccept={() => {
            setAccepted(true);
            const action = pending;
            setPending(null);
            run(action);
          }}
          onClose={() => setPending(null)}
        />
      )}

      {posting && (
        <PostTaskModal
          onClose={() => setPosting(false)}
          onOpenTask={(t) => {
            setPosting(false);
            setDetail(t);
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
