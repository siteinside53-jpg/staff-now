'use client';

import { useEffect, useState } from 'react';
import { PostTaskModal } from './post-task-modal';
import { TaskDetailModal } from './task-detail-modal';
import { TaskNowTermsGate, hasAcceptedTaskNowTerms } from './terms';
import { DEFAULT_CENTER } from './data';
import { useMockTasks } from './mock-store';

/**
 * Τα δύο κουμπιά του hero.
 *
 * Η πύλη των όρων είναι ΙΔΙΑ με του πίνακα ελέγχου: ζητιέται την πρώτη φορά
 * που κάποιος πάει να ανεβάσει, και μία μόνο φορά.
 */
export function HeroCtas() {
  const [accepted, setAccepted] = useState(false);
  const [gate, setGate] = useState(false);
  const [posting, setPosting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  // Ζωντανή εικόνα: η καρτέλα ενημερώνεται όταν αλλάζει η επιλογή προσφοράς.
  const { tasks } = useMockTasks();
  const created = createdId ? (tasks.find((t) => t.id === createdId) ?? null) : null;

  useEffect(() => {
    setAccepted(hasAcceptedTaskNowTerms());
  }, []);

  function startPosting() {
    if (accepted) setPosting(true);
    else setGate(true);
  }

  return (
    <>
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
        <button
          type="button"
          onClick={startPosting}
          className="rounded-xl bg-amber-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition hover:bg-amber-600"
        >
          Ανέβασε δουλειά — δωρεάν
        </button>
        <a
          href="#roi"
          className="rounded-xl bg-gray-100 px-7 py-3.5 text-center text-sm font-semibold text-gray-800 transition hover:bg-gray-200"
        >
          Θέλω να δουλέψω
        </a>
      </div>

      {gate && (
        <TaskNowTermsGate
          onAccept={() => {
            setAccepted(true);
            setGate(false);
            setPosting(true);
          }}
          onClose={() => setGate(false)}
        />
      )}

      {posting && (
        <PostTaskModal
          onClose={() => setPosting(false)}
          onOpenTask={(t) => {
            setPosting(false);
            setCreatedId(t.id);
          }}
        />
      )}

      {created && (
        <TaskDetailModal
          task={created}
          center={DEFAULT_CENTER}
          onClose={() => setCreatedId(null)}
          onMakeOffer={() => setCreatedId(null)}
        />
      )}
    </>
  );
}
