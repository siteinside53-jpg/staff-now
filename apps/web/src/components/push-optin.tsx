'use client';

/**
 * <PushOptIn /> — soft permission prompt για web push notifications.
 *
 * Πώς δουλεύει:
 *  • Μετά από delay (~5 sec on page) εμφανίζει μικρό banner top-center με
 *    NAI / Όχι buttons. Δεν επικαλύπτει native browser dialog — αυτό τρέχει
 *    ΜΟΝΟ αν ο χρήστης πατήσει «Ναι» (καλύτερα consent rates).
 *  • Δυναμικό copy ανάλογα τον ρόλο:
 *      — Worker:   «Θέλεις να βλέπεις πρώτος/η τις νέες θέσεις εργασίας;»
 *      — Business: «Θέλεις να βλέπεις πρώτος/η τους νέους εργαζόμενους;»
 *      — Guest:    «Θέλεις να ενημερώνεσαι για νέες ευκαιρίες;»
 *  • Δεν εμφανίζεται πάλι αν ο χρήστης έχει ήδη απαντήσει ή αν το browser
 *    permission είναι 'granted' / 'denied'.
 *  • Σέβεται το cookie consent — εμφανίζεται μόνο μετά από acceptance,
 *    αλλιώς θεωρείται intrusive (push = tracking signal).
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';

const STORAGE_KEY = 'staffnow_push_optin';
const DELAY_MS = 5000;
const SNOOZE_DAYS = 14;

function shouldShow(): boolean {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window)) return false;
  // Already granted or denied — let browser handle it
  if (Notification.permission !== 'default') return false;
  // Respect cookie consent — don't push if user rejected cookies
  try {
    const cookieChoice = localStorage.getItem('staffnow_cookie_consent');
    if (cookieChoice === 'rejected') return false;
  } catch {}
  // Was this prompt already answered?
  try {
    const decided = localStorage.getItem(STORAGE_KEY);
    if (!decided) return true;
    const parsed = JSON.parse(decided) as { choice: string; at: string };
    if (parsed.choice === 'yes' || parsed.choice === 'never') return false;
    if (parsed.choice === 'no' && parsed.at) {
      const ageMs = Date.now() - new Date(parsed.at).getTime();
      const snoozeMs = SNOOZE_DAYS * 24 * 60 * 60 * 1000;
      return ageMs > snoozeMs; // re-show after snooze period
    }
  } catch {}
  return true;
}

export function PushOptIn() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (shouldShow()) setVisible(true);
    }, DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const remember = (choice: 'yes' | 'no' | 'never') => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice, at: new Date().toISOString() }));
    } catch {}
  };

  const handleYes = async () => {
    remember('yes');
    setVisible(false);
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // Push subscription εντοπίζεται από service worker — εδώ απλά
        // dispatch-άρουμε event ώστε όποιος listener θέλει να κάνει register
        // στον push server μπορεί να το κάνει.
        window.dispatchEvent(new CustomEvent('push:permission-granted'));
      }
    } catch {
      // user dismissed permission dialog — silent
    }
  };

  const handleNo = () => {
    remember('no');
    setVisible(false);
  };

  if (!visible) return null;

  // Δυναμικό μήνυμα ανάλογα με τον ρόλο
  let message: string;
  if (user?.role === 'worker') {
    message = 'Θέλεις να βλέπεις πρώτος/η τις νέες θέσεις εργασίας;';
  } else if (user?.role === 'business') {
    message = 'Θέλεις να βλέπεις πρώτος/η τους νέους εργαζόμενους;';
  } else {
    message = 'Θέλεις να ενημερώνεσαι για νέες ευκαιρίες στην πλατφόρμα;';
  }

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Ενεργοποίηση ειδοποιήσεων"
      className="fixed left-1/2 top-4 z-[90] -translate-x-1/2 px-4 pointer-events-none"
    >
      <div className="flex items-center gap-3 rounded-2xl bg-white shadow-xl border border-gray-200 ring-1 ring-black/5 px-4 py-3 pointer-events-auto max-w-md animate-[slideDown_0.3s_ease-out]">
        <div className="flex flex-shrink-0 items-center gap-1.5">
          <svg viewBox="0 0 32 32" className="h-6 w-6 block" aria-label="StaffNow">
            <circle cx="16" cy="16" r="16" fill="#3b82f6" />
            <path d="M9 16.5l4.5 4.5L23 11" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm font-extrabold tracking-tight"><span className="text-gray-800">Staff</span><span className="text-blue-500">Now</span></span>
        </div>
        <p className="text-sm font-medium text-gray-800 flex-1">{message}</p>
        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleNo}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            Όχι
          </button>
          <button
            type="button"
            onClick={handleYes}
            className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-1.5 text-sm font-semibold text-white transition-colors shadow-sm"
          >
            Ναι
          </button>
        </div>
      </div>
      <style jsx>{`
        @keyframes slideDown {
          from { transform: translate(-50%, -20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
