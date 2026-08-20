'use client';

import { useState } from 'react';
import { OfferModal } from './offer-modal';
import { ShareTask } from './share-task';
import { useMockTasks } from './mock-store';

/**
 * Τα κουμπιά της σελίδας μιας μικροδουλειάς.
 *
 * Η σελίδα είναι στατική (για να έχει τίτλο, περιγραφή και εικόνα στο
 * Facebook), οπότε τα δεδομένα για την εμφάνιση έρχονται από τον server. Οι
 * ενέργειες όμως θέλουν την κατάσταση της μακέτας, γι' αυτό ζουν εδώ.
 */
export function TaskPageActions({
  taskId,
  title,
  budget,
  area,
}: {
  taskId: string;
  title: string;
  budget: number;
  area: string;
}) {
  const { tasks } = useMockTasks();
  const [offering, setOffering] = useState(false);

  const task = tasks.find((t) => t.id === taskId);
  const alreadyOffered = task?.offersList.some((o) => o.mine) ?? false;
  const stillOpen = task ? task.status === 'open' && !task.hidden : true;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {stillOpen ? (
          alreadyOffered ? (
            <span className="rounded-xl bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700">
              ✓ Έστειλες προσφορά
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setOffering(true)}
              className="rounded-xl bg-amber-500 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition hover:bg-amber-600"
            >
              Κάνε προσφορά
            </button>
          )
        ) : (
          <span className="rounded-xl bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-600">
            Δεν δέχεται πια προσφορές
          </span>
        )}

        <ShareTask taskId={taskId} title={title} budget={budget} area={area} />
      </div>

      {offering && task && <OfferModal task={task} onClose={() => setOffering(false)} />}
    </>
  );
}
