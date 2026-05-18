'use client';

import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';

interface Props {
  className?: string;
}

/**
 * Pulsing "LIVE · N χρήστες online τώρα" chip.
 * Fetches real total_users from /public/activity stats, then drifts.
 */
export function LiveBadge({ className = '' }: Props) {
  const [count, setCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [flash, setFlash] = useState(false);

  // Fetch real stats on mount — με fail-safe timeout ώστε σε αργό δίκτυο
  // (ή blocked CORS) να εμφανίζεται οπωσδήποτε με fallback count.
  useEffect(() => {
    let cancelled = false;

    // Hard timeout: αν δεν φορτώσει σε 2s, δείξε fallback. Έτσι σε αργό
    // mobile δίκτυο το badge δεν παραμένει αόρατο.
    const fallbackTimer = setTimeout(() => {
      if (!cancelled) {
        setCount((c) => c || 1847);
        setLoaded(true);
      }
    }, 2000);

    (async () => {
      try {
        const controller = new AbortController();
        const abortTimer = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(`${API_BASE}/public/activity`, { signal: controller.signal });
        clearTimeout(abortTimer);
        if (!res.ok) throw new Error();
        const json = await res.json();
        const totalUsers = json?.data?.stats?.totalUsers || 0;
        if (!cancelled) {
          setCount(totalUsers > 0 ? totalUsers : 1847);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setCount(1847);
          setLoaded(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
    };
  }, []);

  // Drift counter after loaded
  useEffect(() => {
    if (!loaded) return;
    const interval = setInterval(() => {
      const delta = Math.floor(Math.random() * 12) - 3;
      setCount((prev) => Math.max(100, prev + delta));
      setFlash(true);
      setTimeout(() => setFlash(false), 600);
    }, 4000 + Math.random() * 3000);

    return () => clearInterval(interval);
  }, [loaded]);

  if (!loaded) return null;

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
        χρήστες online
      </span>
    </div>
  );
}
