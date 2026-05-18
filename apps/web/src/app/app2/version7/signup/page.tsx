'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FullPageSpinner } from '../_lib/ui';

/**
 * Legacy /signup route — bookmarks/external links land here. We unified
 * signup + login on the /login page with a tab toggle, so just forward.
 */
export default function SignupRedirect() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const router = useRouter();
  const params = useSearchParams();
  const role = params?.get('role');
  useEffect(() => {
    const qs = role ? `?mode=signup&role=${role}` : '?mode=signup';
    router.replace(`/app2/version7/login${qs}`);
  }, [router, role]);
  return <FullPageSpinner />;
}
