'use client';

import { useCallback, useRef, useState } from 'react';
import { usePoll } from '@/lib/use-poll';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';

interface Props {
  className?: string;
}

/**
 * "LIVE · N χρήστες online τώρα" chip με ΠΡΑΓΜΑΤΙΚΟ αριθμό.
 *
 * Διαβάζει το stats.onlineNow από /public/activity (ενεργές συνεδρίες
 * τα τελευταία ~40s) και κάνει poll κάθε 20s ώστε ο αριθμός να
 * ανεβοκατεβαίνει live καθώς μπαίνουν/βγαίνουν επισκέπτες.
 * Δείχνει τουλάχιστον 1 (ο τρέχων επισκέπτης).
 */
export function LiveBadge({ className = '' }: Props) {
  const [count, setCount] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const prev = useRef<number | null>(null);

  const fetchOnline = useCallback(async () => {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${API_BASE}/public/activity`, { signal: controller.signal });
      clearTimeout(t);
      // Το 429 ανεβαίνει ώστε το usePoll να υποχωρήσει αντί να επιμείνει.
      if (res.status === 429) throw Object.assign(new Error('rate limited'), { status: 429 });
      if (!res.ok) throw new Error();
      const json = await res.json();
      const online = Number(json?.data?.stats?.onlineNow ?? 0);
      const value = Math.max(1, online); // ο τρέχων επισκέπτης μετράει πάντα
      if (prev.current !== null && value !== prev.current) {
        setFlash(true);
        setTimeout(() => setFlash(false), 600);
      }
      prev.current = value;
      setCount(value);
    } catch (err) {
      if ((err as { status?: number })?.status === 429) throw err;
      if (prev.current === null) {
        // Πρώτο load απέτυχε → δείξε τουλάχιστον 1
        prev.current = 1;
        setCount(1);
      }
    }
  }, []);
  usePoll(fetchOnline, 20_000);

  if (count === null) return null;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full bg-blue-600/10 border border-blue-500/20 px-4 py-1.5 text-sm text-blue-300 backdrop-blur-sm ${className}`}
    >
      <span className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">LIVE</span>
      </span>

      <span className="h-3 w-px bg-blue-500/30" />

      <span className="text-sm">
        <span
          className={`tabular-nums font-bold text-white transition-colors duration-300 ${
            flash ? 'text-emerald-400' : ''
          }`}
        >
          {count.toLocaleString('el-GR')}
        </span>{' '}
        {count === 1 ? 'χρήστης online' : 'χρήστες online'}
      </span>
    </div>
  );
}
