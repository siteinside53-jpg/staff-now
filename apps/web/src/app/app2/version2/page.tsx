'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AppV2Entry() {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect to swipe screen
    router.replace('/app2/version2/swipe');
  }, [router]);

  return (
    <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white">
      <div className="text-center">
        <div className="text-5xl mb-3 animate-bounce">💼</div>
        <div className="text-2xl font-extrabold">
          Staff<span className="text-blue-200">Now</span>
        </div>
        <div className="mt-4 h-8 w-8 mx-auto border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    </div>
  );
}
