'use client';

import { useEffect, useState } from 'react';

// Chrome / Edge / Android `beforeinstallprompt` event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type InstallState = 'hidden' | 'available' | 'ios-hint';

const DISMISS_KEY = 'staffnow_install_dismissed';
const DISMISS_DAYS = 14;

/**
 * Install App prompt — smart bottom sheet that adapts to platform:
 *
 * - Android/Desktop Chrome: uses native `beforeinstallprompt` for 1-click install
 * - iOS Safari: shows instructions ("Πάτα το 🔗 Share → Προσθήκη στην αρχική οθόνη")
 * - Already installed (standalone mode): hidden
 * - Dismissed: hidden for 14 days
 */
export function InstallPrompt() {
  const [state, setState] = useState<InstallState>('hidden');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if already installed (display-mode: standalone)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    // Check if user dismissed recently
    try {
      const dismissedAt = localStorage.getItem(DISMISS_KEY);
      if (dismissedAt) {
        const ms = Date.now() - parseInt(dismissedAt, 10);
        if (ms < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;
      }
    } catch {}

    // iOS Safari: no beforeinstallprompt, show manual hint after a delay
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    if (isIOS && isSafari) {
      const t = setTimeout(() => setState('ios-hint'), 8000); // after 8s of browsing
      return () => clearTimeout(t);
    }

    // Android / Desktop Chrome
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Delay showing so user sees the page first
      setTimeout(() => setState('available'), 6000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setState('hidden');
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setState('hidden');
      }
      setDeferredPrompt(null);
    } catch {
      setState('hidden');
    }
  };

  const handleDismiss = () => {
    setState('hidden');
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  };

  if (state === 'hidden') return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-[90] mx-auto max-w-md animate-in slide-in-from-bottom-8 fade-in duration-500"
      role="dialog"
      aria-labelledby="install-prompt-title"
    >
      <div className="rounded-2xl bg-white/95 backdrop-blur-xl border border-gray-200 shadow-2xl p-4 pr-3 flex items-start gap-3">
        {/* Icon */}
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-600/30">
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none">
            <path
              d="M7 12.5l3 3 7-7"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <h3 id="install-prompt-title" className="text-sm font-extrabold text-gray-900 leading-tight">
            Εγκατάσταση StaffNow
          </h3>
          {state === 'available' ? (
            <>
              <p className="mt-0.5 text-[11px] text-gray-600 leading-snug">
                Γρήγορη πρόσβαση, offline support και notifications. Όλες οι λειτουργίες, ίδιο design.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleInstall}
                  className="flex-1 rounded-full bg-blue-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-md hover:bg-blue-700 transition-all active:scale-95"
                >
                  ⬇ Εγκατάσταση
                </button>
                <button
                  onClick={handleDismiss}
                  className="rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Όχι
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-0.5 text-[11px] text-gray-600 leading-snug">
                Πάτα <span className="inline-flex items-center gap-0.5 font-bold text-gray-900">
                  <svg className="inline h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Share
                </span> και μετά <span className="font-bold text-gray-900">«Προσθήκη στην αρχική οθόνη»</span>.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleDismiss}
                  className="flex-1 rounded-full bg-blue-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-blue-700"
                >
                  Κατάλαβα
                </button>
              </div>
            </>
          )}
        </div>

        {/* Close X */}
        <button
          onClick={handleDismiss}
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Κλείσιμο"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
