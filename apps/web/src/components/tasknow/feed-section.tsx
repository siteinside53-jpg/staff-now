'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TaskFeed } from './task-feed';

/**
 * Η ροή, τυλιγμένη ώστε να δέχεται βαθύ σύνδεσμο `/tasknow?task=...`.
 *
 * Το `Suspense` δεν είναι διακοσμητικό: χωρίς αυτό το `useSearchParams`
 * σπάει το χτίσιμο της στατικής έκδοσης.
 */
function Inner() {
  const params = useSearchParams();
  return <TaskFeed openTaskId={params.get('task')} />;
}

export function TaskFeedSection() {
  return (
    <Suspense fallback={<TaskFeed />}>
      <Inner />
    </Suspense>
  );
}
