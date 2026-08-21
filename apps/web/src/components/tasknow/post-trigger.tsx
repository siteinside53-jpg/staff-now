'use client';

import { useEffect, useState } from 'react';
import { PostTaskModal, type Poster } from './post-task-modal';
import { TaskDetailModal } from './task-detail-modal';
import { TaskNowTermsGate, hasAcceptedTaskNowTerms } from './terms';
import { DEFAULT_CENTER } from './data';
import { useMockTasks } from './mock-store';

/**
 * Το κουμπί «ανέβασε δουλειά», μαζί με ό,τι κρέμεται από πάνω του.
 *
 * ΓΙΑΤΙ ΞΕΧΩΡΙΣΤΟ: το κουμπί υπάρχει σε τρία σημεία (μπάρα της ροής, μέσα στη
 * λίστα, τέλος σελίδας) και όλα πρέπει να περνούν από την ΙΔΙΑ πύλη όρων.
 * Τρία αντίγραφα της λογικής σημαίνει ότι κάποιο θα ξεχαστεί.
 */
export function PostTaskButton({
  className,
  children,
  ariaLabel,
  poster,
}: {
  className: string;
  children: React.ReactNode;
  ariaLabel?: string;
  poster?: Poster;
}) {
  const { tasks } = useMockTasks();
  const [accepted, setAccepted] = useState(false);
  const [gate, setGate] = useState(false);
  const [posting, setPosting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  useEffect(() => {
    setAccepted(hasAcceptedTaskNowTerms());
  }, []);

  const created = createdId ? (tasks.find((t) => t.id === createdId) ?? null) : null;

  return (
    <>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => (accepted ? setPosting(true) : setGate(true))}
        className={className}
      >
        {children}
      </button>

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
          poster={poster}
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
