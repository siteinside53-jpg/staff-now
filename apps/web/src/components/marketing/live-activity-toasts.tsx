'use client';

import { useEffect, useRef, useState } from 'react';
import { WORKER_JOB_ROLE_LABELS_EL } from '@staffnow/config';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';

/**
 * The API bakes the raw role slug into the signup text ("Όνομα εγγράφηκε ως driver").
 * Replace the trailing slug with its human Greek label. Falls back to the original
 * text if the format doesn't match or the slug is unknown.
 */
function humanizeSignup(text: string): string {
  const m = text.match(/^(.* εγγράφηκε ως )(.+)$/);
  if (!m) return text;
  const label = WORKER_JOB_ROLE_LABELS_EL[m[2].trim()];
  return label ? `${m[1]}${label}` : text;
}

interface Toast {
  id: string;
  icon: string;
  text: string;
  subtitle?: string;
  timeAgo: string;
  color: 'emerald' | 'blue';
}

// Raw activity item as returned by GET /public/activity
interface ApiActivity {
  id: string;
  type: 'signup' | 'job';
  icon?: string;
  text: string;
  location?: string;
  company?: string;
  createdAt?: string;
}

const COLOR_MAP = {
  emerald: 'bg-emerald-500 text-white',
  blue: 'bg-blue-500 text-white',
};

function timeAgo(dateStr?: string): string {
  if (!dateStr) return 'πρόσφατα';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'μόλις τώρα';
  if (mins < 60) return `πριν ${mins} λεπτά`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `πριν ${hours} ${hours === 1 ? 'ώρα' : 'ώρες'}`;
  const days = Math.floor(hours / 24);
  return `πριν ${days} ${days === 1 ? 'μέρα' : 'μέρες'}`;
}

/** Map a real API activity into a toast. Returns null for anything unusable. */
function toToast(a: ApiActivity): Toast | null {
  if (!a || !a.text) return null;
  if (a.type === 'job') {
    const title = a.text.replace(/^Νέα αγγελία:\s*/i, '').trim();
    const main = a.company ? `Νέα αγγελία από ${a.company}` : `Νέα αγγελία: ${title}`;
    const subParts = a.company ? [title, a.location] : [a.location];
    return {
      id: a.id,
      icon: '💼',
      text: main,
      subtitle: subParts.filter(Boolean).join(' · ') || undefined,
      timeAgo: timeAgo(a.createdAt),
      color: 'blue',
    };
  }
  // signup
  return {
    id: a.id,
    icon: '🆕',
    text: humanizeSignup(a.text),
    subtitle: a.location || undefined,
    timeAgo: timeAgo(a.createdAt),
    color: 'emerald',
  };
}

/**
 * Bottom-left toast notifications that rotate through REAL platform activity
 * (recent signups + job postings) fetched from GET /public/activity.
 * No fabricated data — if there is no real activity, nothing renders.
 */
export function LiveActivityToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [current, setCurrent] = useState<Toast | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const idxRef = useRef(0);

  // Fetch real activity once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/public/activity`);
        if (!res.ok) return;
        const json = await res.json();
        const activities: ApiActivity[] = json?.data?.activity ?? [];
        const mapped = activities.map(toToast).filter((t): t is Toast => t !== null);
        if (!cancelled && mapped.length > 0) setToasts(mapped);
      } catch {
        // no fake fallback — stays hidden until real data arrives
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Rotate through the real toasts.
  useEffect(() => {
    if (dismissed || toasts.length === 0) return;

    const showNext = () => {
      const t = toasts[idxRef.current % toasts.length];
      idxRef.current += 1;
      setCurrent(t);
    };

    const first = setTimeout(showNext, 3000);
    const interval = setInterval(showNext, 9000 + Math.random() * 3000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [dismissed, toasts]);

  // Auto-hide each toast after 5.5s.
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => setCurrent(null), 5500);
    return () => clearTimeout(t);
  }, [current]);

  if (dismissed || !current) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40 max-w-[320px] sm:max-w-sm pointer-events-auto">
      <div
        className="flex items-start gap-3 rounded-2xl bg-white shadow-2xl border border-gray-100 p-3 pr-8 animate-in slide-in-from-left-8 fade-in duration-500 relative"
        role="status"
        aria-live="polite"
      >
        {/* Dismiss button */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Κλείσιμο ειδοποιήσεων"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Icon */}
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-lg shadow-sm ${COLOR_MAP[current.color]}`}>
          {current.icon}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-xs font-semibold text-gray-900 leading-snug line-clamp-2">
            {current.text}
          </p>
          {current.subtitle && (
            <p className="mt-0.5 text-[11px] text-gray-500 leading-snug line-clamp-1">
              {current.subtitle}
            </p>
          )}
          <div className="mt-1 flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-gray-300" />
            <span className="text-[10px] text-gray-500">{current.timeAgo}</span>
            <span className="text-[10px] text-gray-300">·</span>
            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-blue-600">
              <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
              LIVE
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
