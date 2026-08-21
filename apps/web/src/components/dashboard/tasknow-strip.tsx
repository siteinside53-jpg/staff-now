'use client';

/**
 * Λεπτή γραμμή για τις μικροδουλειές, μέσα στη λειτουργία swipe του κινητού.
 *
 * ΓΙΑΤΙ ΥΠΑΡΧΕΙ: στο swipe κρύβονται όλα εκτός από τις κάρτες, ώστε να έχουν
 * όλη την οθόνη. Σωστό — αλλά εκεί είναι και η περισσότερη κίνηση, οπότε ο
 * χρήστης του κινητού δεν μάθαινε ποτέ ότι υπάρχουν μικροδουλειές μέχρι να
 * του τελειώσουν οι κάρτες.
 *
 * Μία γραμμή, 40 pixel, χωρίς εικόνες και χωρίς κουμπιά που τραβάνε το δάχτυλο
 * από το swipe. Λέει μόνο πόσες είναι και τι ποσά — δηλαδή αυτό που κάνει
 * κάποιον να πατήσει.
 */

import Link from 'next/link';
import { TaskNowMark } from '@/components/tasknow/logo';
import { boardStats, isOpen, useMockTasks } from '@/components/tasknow/mock-store';

export function TaskNowStrip() {
  const state = useMockTasks();
  const open = state.tasks.filter(isOpen);
  const stats = boardStats(open);

  if (stats.count === 0) return null;

  return (
    <Link
      href="/dashboard/tasknow"
      className="mb-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 lg:hidden"
    >
      <TaskNowMark className="h-4 w-4" />
      <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold tabular-nums text-gray-900">
        {stats.count} μικροδουλειές κοντά σου
        {stats.min !== null && stats.max !== null && (
          <span className="font-medium text-gray-600">
            {' '}
            · {stats.min}€–{stats.max}€
          </span>
        )}
      </span>
      <span className="shrink-0 text-[12.5px] font-semibold text-amber-700">Δες →</span>
    </Link>
  );
}
