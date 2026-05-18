'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { startHeartbeat, stopHeartbeat, trackPageView } from '@/lib/track-activity';

/**
 * Mount once near the root.
 * - Fires `trackPageView` on every Next.js navigation
 * - Starts a 15s heartbeat so the admin "live visitors" panel knows
 *   when someone is still on the page vs. has closed the tab.
 * Also tracks anonymous (non-logged-in) visitors via a localStorage
 * `staffnow_visitor_id`.
 */
export function TrackPageView() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname) return;
    trackPageView(pathname);
  }, [pathname]);

  useEffect(() => {
    startHeartbeat();
    return () => stopHeartbeat();
  }, []);

  return null;
}
