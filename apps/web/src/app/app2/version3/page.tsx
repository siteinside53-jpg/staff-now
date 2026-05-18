'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Entry() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/app2/version3/swipe');
  }, [router]);
  return null;
}
