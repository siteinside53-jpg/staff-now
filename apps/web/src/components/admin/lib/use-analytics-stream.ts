'use client';

import { useEffect, useRef, useState } from 'react';
import { adminApi } from './admin-api';

export interface AnalyticsSnapshot {
  stats: any;
  series: {
    signups: number[];
    matches: number[];
    jobs: number[];
    messages: number[];
    dau: number[];
  };
  ts: string;
}

interface UseAnalyticsStreamOptions {
  enabled?: boolean;
}

/**
 * Subscribes to /admin/analytics/stream via Server-Sent Events.
 *
 * Mirrors useSecurityStream's reconnection / heartbeat logic, but holds
 * only the *latest* snapshot (analytics is "current state" not "event log"),
 * so consumers re-render on each tick with fresh stats + series.
 *
 * Cloudflare Workers will close the underlying connection after a few
 * minutes of CPU/wall-time, so we transparently reconnect with backoff.
 */
export function useAnalyticsStream({ enabled = true }: UseAnalyticsStreamOptions = {}) {
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | null>(null);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'open' | 'closed' | 'error'>('idle');
  const [lastHeartbeat, setLastHeartbeat] = useState<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);
  const retryRef = useRef(0);
  const closedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    closedRef.current = false;

    const connect = () => {
      if (closedRef.current) return;
      setStatus('connecting');
      const es = adminApi.openAnalyticsStream();
      if (!es) {
        setStatus('error');
        return;
      }
      sourceRef.current = es;

      es.onopen = () => {
        retryRef.current = 0;
        setStatus('open');
      };

      es.addEventListener('hello', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          setLastHeartbeat(data.ts);
        } catch {}
      });

      es.addEventListener('heartbeat', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          setLastHeartbeat(data.ts);
        } catch {}
      });

      es.addEventListener('snapshot', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data) as AnalyticsSnapshot;
          setSnapshot(data);
        } catch {}
      });

      es.onerror = () => {
        setStatus('error');
        es.close();
        sourceRef.current = null;
        if (closedRef.current) return;
        // Exponential backoff up to ~30s.
        const delay = Math.min(30_000, 1_000 * 2 ** retryRef.current);
        retryRef.current += 1;
        setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      closedRef.current = true;
      sourceRef.current?.close();
      sourceRef.current = null;
      setStatus('closed');
    };
  }, [enabled]);

  return { snapshot, status, lastHeartbeat };
}
