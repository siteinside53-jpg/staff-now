'use client';

import { useEffect, useState } from 'react';

interface Activity {
  id: string;
  icon: string;
  text: string;
  timeAgo: string;
  color: 'emerald' | 'blue' | 'amber' | 'pink';
}

// Pool of realistic Greek activities
const ACTIVITY_POOL: Omit<Activity, 'id' | 'timeAgo'>[] = [
  { icon: '🎯', text: 'Μαρία Κ. μόλις έκανε match με Beach Bar Oasis', color: 'emerald' },
  { icon: '🔥', text: 'ThessMontarisma προσέλαβε μέσω StaffNow', color: 'amber' },
  { icon: '✨', text: 'Νίκος Δ. βρήκε δουλειά σε 3 ώρες', color: 'emerald' },
  { icon: '🆕', text: '15 εργαζόμενοι εγγράφηκαν την τελευταία ώρα', color: 'blue' },
  { icon: '💼', text: 'Νέα αγγελία: Σερβιτόρος · Μύκονος · 1400€/μήνα', color: 'blue' },
  { icon: '⚡', text: 'Σοφία Τ. συνδέθηκε με Mykonos Suites', color: 'emerald' },
  { icon: '🔥', text: 'Athens Rooftop έκλεισε 3 θέσεις σε 24 ώρες', color: 'amber' },
  { icon: '🎯', text: 'Γιώργος Π. προσλήφθηκε στο Σαντορίνη', color: 'emerald' },
  { icon: '💼', text: 'Νέα αγγελία: Head Chef · Κρήτη · 2200€/μήνα', color: 'blue' },
  { icon: '🏆', text: 'Top εργαζόμενος αυτής της εβδομάδας: Έλενα Μ.', color: 'amber' },
  { icon: '✨', text: 'Taverna Dionysos προσέλαβε 2 σερβιτόρους', color: 'emerald' },
  { icon: '🆕', text: '22 νέες θέσεις άνοιξαν στη Μύκονο σήμερα', color: 'pink' },
  { icon: '🎯', text: 'Δημήτρης Β. ξεκινά σε 2 ημέρες στο Olive Grove', color: 'emerald' },
  { icon: '🔥', text: 'Crete Beach Resort αναζητά 5 άτομα άμεσα', color: 'amber' },
  { icon: '💼', text: 'Νέα αγγελία: Bartender · Αθήνα · 12€/ώρα', color: 'blue' },
  { icon: '⚡', text: 'Κατερίνα Λ. έλαβε 4 προτάσεις εργασίας σήμερα', color: 'emerald' },
];

const TIME_AGO_OPTIONS = [
  'μόλις τώρα',
  'πριν 30 δευτ.',
  'πριν 1 λεπτό',
  'πριν 2 λεπτά',
  'πριν 4 λεπτά',
  'πριν 7 λεπτά',
];

const COLOR_MAP = {
  emerald: 'bg-emerald-500 text-white',
  blue: 'bg-blue-500 text-white',
  amber: 'bg-amber-500 text-white',
  pink: 'bg-pink-500 text-white',
};

function pickRandom(): Activity {
  const pool = ACTIVITY_POOL[Math.floor(Math.random() * ACTIVITY_POOL.length)];
  const timeAgo = TIME_AGO_OPTIONS[Math.floor(Math.random() * TIME_AGO_OPTIONS.length)];
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timeAgo,
    ...pool,
  };
}

/**
 * Bottom-left toast notifications that appear every few seconds.
 * Mimics Booking.com / Airbnb style social proof popups.
 */
export function LiveActivityToasts() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;

    // Show first toast after 3s
    const first = setTimeout(() => {
      setActivities([pickRandom()]);
    }, 3000);

    // Then rotate: hide previous, show new every 8-12s
    const interval = setInterval(() => {
      setActivities([pickRandom()]);
    }, 9000 + Math.random() * 3000);

    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [dismissed]);

  // Auto-hide after 5.5s
  useEffect(() => {
    if (activities.length === 0) return;
    const t = setTimeout(() => setActivities([]), 5500);
    return () => clearTimeout(t);
  }, [activities]);

  if (dismissed || activities.length === 0) return null;

  const activity = activities[0];

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
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-lg shadow-sm ${COLOR_MAP[activity.color]}`}>
          {activity.icon}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-xs font-semibold text-gray-900 leading-snug line-clamp-2">
            {activity.text}
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-gray-300" />
            <span className="text-[10px] text-gray-500">{activity.timeAgo}</span>
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
