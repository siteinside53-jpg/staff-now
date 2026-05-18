'use client';

import { useEffect, useRef, useState } from 'react';
import { adminApi } from './admin-api';

export interface LiveEvent {
  kind: 'error' | 'change' | 'audit';
  payload: any;
  receivedAt: string;
}

interface UseSecurityStreamOptions {
  enabled?: boolean;
  bufferSize?: number;
}

/**
 * Subscribes to /admin/security/stream via Server-Sent Events.
 *
 * Cloudflare Workers will close the underlying connection after a few
 * minutes of CPU/wall-time, so we transparently reconnect with backoff.
 *
 * Returns a rolling buffer of the most recent events (newest first) plus
 * the live connection state.
 */
export function useSecurityStream({
  enabled = true,
  bufferSize = 200,
}: UseSecurityStreamOptions = {}) {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'open' | 'closed' | 'error'>('idle');
  const [lastHeartbeat, setLastHeartbeat] = useState<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);
  const retryRef = useRef(0);
  const closedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    closedRef.current = false;

    const push = (kind: LiveEvent['kind'], payload: any) => {
      setEvents((prev) => {
        const next: LiveEvent[] = [
          { kind, payload, receivedAt: new Date().toISOString() },
          ...prev,
        ];
        return next.length > bufferSize ? next.slice(0, bufferSize) : next;
      });
    };

    const connect = () => {
      if (closedRef.current) return;
      setStatus('connecting');
      const es = adminApi.openSecurityStream();
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

      es.addEventListener('error', (e: MessageEvent) => {
        try {
          push('error', JSON.parse(e.data));
        } catch {}
      });
      es.addEventListener('change', (e: MessageEvent) => {
        try {
          push('change', JSON.parse(e.data));
        } catch {}
      });
      es.addEventListener('audit', (e: MessageEvent) => {
        try {
          push('audit', JSON.parse(e.data));
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
  }, [enabled, bufferSize]);

  return { events, status, lastHeartbeat };
}
