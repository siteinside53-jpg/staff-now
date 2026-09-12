'use client';

import Link from 'next/link';
import { Amount } from './amount';
import { TaskNowLogo, TaskNowMark } from './logo';
import { isLicensedCategory } from './data';
import { SHOW_TASKNOW_ON_MARKETING } from './flags';
import { boardStats, previewTasks, publicOpenTasks, useMockTasks } from './mock-store';
import { useT } from '@/i18n/locale-provider';

/**
 * ΜΑΚΕΤΑ — το TaskNow μέσα στο υπόλοιπο site.
 *
 * ΓΙΑΤΙ ΥΠΑΡΧΕΙ: οι μικροδουλειές χρειάζονται ορατότητα εκεί όπου ήδη περνάει
 * κόσμος. Κάποιος που ψάχνει δουλειά και δεν βρίσκει σήμερα, μπορεί να βγάλει
 * 40 ευρώ σήμερα.
 *
 * ΤΙ ΔΕΝ ΓΡΑΦΕΤΑΙ ΕΔΩ:
 *  · «πληρώνονται σήμερα» — υπόσχεση χρόνου πληρωμής από πλατφόρμα που, κατά
 *    τους ίδιους της τους όρους, δεν εισπράττει και δεν αποδίδει αμοιβές.
 *  · άθροισμα αμοιβών («1.020€ συνολικά») — παράγεται μεν από τα δεδομένα,
 *    αλλά κανείς δεν το κερδίζει· το εύρος ανά δουλειά απαντά το ίδιο
 *    ερώτημα τίμια.
 *  · «έως 200€» — το ταβάνι το κρατάει μια αδειοδοτούμενη δουλειά, που οι
 *    περισσότεροι δεν μπορούν νόμιμα να αναλάβουν.
 *
 * Οι εγγραφές είναι ΠΑΝΤΑ οι πιο πρόσφατες, ποτέ οι ακριβότερες.
 */

/** Το σήμα ότι βλέπεις παράδειγμα — μπαίνει πάνω σε κάθε δείγμα αγγελίας. */
function MockChip({ className = '' }: { className?: string }) {
  const t = useT();
  return (
    <span
      className={
        'rounded bg-amber-100 px-1 text-[10px] font-bold text-amber-800 ' + className
      }
    >
      {t('tasknow.banner.mock')}
    </span>
  );
}

export function TaskNowBanner({ variant = 'full' }: { variant?: 'full' | 'strip' }) {
  const t = useT();
  const state = useMockTasks();

  // Όσο οι μικροδουλειές είναι παραδείγματα, δεν στέκονται δίπλα σε αληθινές
  // αγγελίες στις δύο σελίδες που φέρνουν πελάτες. Δες ./flags.ts.
  const show = SHOW_TASKNOW_ON_MARKETING;
  const open = publicOpenTasks(state);
  const stats = boardStats(open);
  const preview = previewTasks(state, 3);

  const range =
    stats.min !== null && stats.max !== null
      ? t('tasknow.banner.range', { min: stats.min, max: stats.max })
      : null;

  if (!show) return null;

  // ── Λωρίδα στη σελίδα με τις αγγελίες ────────────────────────────────────
  // Η σελίδα αυτή είναι ορατή στη Google και δίπλα κάθονται αληθινές
  // αγγελίες: το «ΜΑΚΕΤΑ» μπαίνει πριν από κάθε τίτλο δείγματος.
  if (variant === 'strip') {
    return (
      <Link
        href="/tasknow"
        className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-3 transition hover:border-amber-400"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500">
          <TaskNowMark className="h-5 w-5" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-bold tabular-nums text-gray-900">
            {t('tasknow.banner.openNow', { count: stats.count })}
            {range ? ` · ${range}` : ''}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-gray-600">
            <MockChip className="mr-1.5" />
            {preview.map((task, i) => (
              <span key={task.id}>
                {i > 0 && ' · '}
                <span className="font-semibold tabular-nums text-gray-800">{task.budget}€</span>{' '}
                {task.title}
              </span>
            ))}
          </span>
          <span className="mt-0.5 block text-[11px] text-gray-500">
            {t('tasknow.banner.notFound')}
          </span>
        </span>

        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white sm:hidden">
          →
        </span>
        <span className="hidden shrink-0 text-sm font-semibold text-amber-700 sm:block">
          {t('tasknow.banner.seeAll')}
        </span>
      </Link>
    );
  }

  // ── Η ζώνη στην αρχική ───────────────────────────────────────────────────
  return (
    <section className="bg-gradient-to-br from-amber-500 to-orange-500 py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl text-white">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1">
                <TaskNowLogo
                  className="text-base"
                  markClassName="h-5 w-5"
                  darkClassName="text-white"
                  accentClassName="text-amber-100"
                />
              </span>
              <span className="rounded bg-black/30 px-2 py-0.5 text-[11px] font-bold text-white">
                {t('tasknow.banner.mock')}
              </span>
            </div>

            <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
              {t('tasknow.banner.title')}
            </h2>

            <p className="mt-4 text-sm font-medium tabular-nums text-white/90 sm:text-base">
              <strong className="text-lg font-bold text-white">{stats.count}</strong>
              {t('tasknow.banner.openNowFull')}
              {range ? ` · ${range}` : ''}
              {t('tasknow.banner.thessaloniki')}
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/tasknow"
                className="w-full rounded-xl bg-white px-7 py-3.5 text-center text-sm font-bold text-amber-600 shadow-lg transition hover:bg-amber-50 sm:w-auto"
              >
                {t('tasknow.banner.seeTasks')}
              </Link>
              <Link
                href="/tasknow"
                className="hidden rounded-xl bg-black/20 px-7 py-3.5 text-sm font-semibold text-white ring-1 ring-white/40 transition hover:bg-black/30 sm:inline-flex"
              >
                {t('tasknow.banner.postJob')}
              </Link>
            </div>

            <p className="mt-4 hidden text-base leading-relaxed text-white/90 sm:block">
              {t('tasknow.banner.blurb')}
            </p>
          </div>

          {/* Οι πραγματικές εγγραφές — το μόνο πράγμα που πείθει */}
          <div className="w-full max-w-sm space-y-2.5">
            {preview.map((task) => (
              <Link
                key={task.id}
                href={`/tasknow?task=${task.id}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-white/95 p-3.5 shadow-lg transition hover:bg-white"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-semibold text-gray-900">
                    {task.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-gray-500">
                    <MockChip className="mr-1.5" />
                    {/* Ο περιορισμός της άδειας δεν κρύβεται ούτε στα δείγματα:
                        αλλιώς κάποιος κάνει κλικ νομίζοντας ότι μπορεί. */}
                    {isLicensedCategory(task.category) && (
                      <span className="mr-1.5 rounded bg-red-50 px-1 text-[10px] font-semibold text-red-700">
                        {t('tasknow.common.needsLicence')}
                      </span>
                    )}
                    {task.area} · {task.when}
                  </span>
                </span>
                <Amount value={task.budget} note={task.budgetNote} size="band" direction />
              </Link>
            ))}

            {open.length > preview.length && (
              <Link
                href="/tasknow"
                className="block text-center text-sm font-semibold text-white underline"
              >
                {t('tasknow.banner.more', { n: open.length - preview.length })}
              </Link>
            )}
          </div>
        </div>

        <p className="mt-6 text-xs text-white">
          {t('tasknow.banner.mockFooter')}
        </p>
      </div>
    </section>
  );
}
