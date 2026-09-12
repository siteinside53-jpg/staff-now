'use client';

/**
 * Νυχτερινή έκδοση (dark mode).
 *
 * Η επιλογή ζει στον browser (localStorage «staffnow_theme»: light | dark |
 * system). Ένα μικρό script στο <head> (βλ. app/layout.tsx) βάζει την κλάση
 * `dark` στο <html> ΠΡΙΝ ζωγραφιστεί η σελίδα, ώστε να μην αναβοσβήνει
 * λευκή. Εδώ κρατάμε την κατάσταση για τον διακόπτη και ακούμε το σύστημα.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemePref = 'light' | 'dark' | 'system';
const KEY = 'staffnow_theme';

function systemDark(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

function apply(pref: ThemePref) {
  if (typeof document === 'undefined') return;
  const dark = pref === 'dark' || (pref === 'system' && systemDark());
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
}

interface ThemeCtx {
  pref: ThemePref;
  isDark: boolean;
  setPref: (p: ThemePref) => void;
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Πρώτο render = light (ταιριάζει με το προ-αποδομένο HTML)· μετά το mount διαβάζουμε.
  const [pref, setPrefState] = useState<ThemePref>('light');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    let stored: ThemePref = 'system';
    try {
      const raw = localStorage.getItem(KEY);
      if (raw === 'light' || raw === 'dark' || raw === 'system') stored = raw;
    } catch {}
    setPrefState(stored);
    apply(stored);
    setIsDark(document.documentElement.classList.contains('dark'));
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onChange = () => {
      let cur: ThemePref = 'system';
      try {
        const raw = localStorage.getItem(KEY);
        if (raw === 'light' || raw === 'dark' || raw === 'system') cur = raw;
      } catch {}
      if (cur === 'system') {
        apply('system');
        setIsDark(document.documentElement.classList.contains('dark'));
      }
    };
    mq?.addEventListener?.('change', onChange);
    return () => mq?.removeEventListener?.('change', onChange);
  }, []);

  const setPref = useCallback((p: ThemePref) => {
    try {
      localStorage.setItem(KEY, p);
    } catch {}
    setPrefState(p);
    apply(p);
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = useCallback(() => setPref(isDark ? 'light' : 'dark'), [isDark, setPref]);

  const value = useMemo(() => ({ pref, isDark, setPref, toggle }), [pref, isDark, setPref, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (ctx) return ctx;
  return { pref: 'light', isDark: false, setPref: apply, toggle: () => {} };
}

/** Κουμπί ήλιος/φεγγάρι — μπαίνει δίπλα στο EL/EN. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { isDark, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isDark}
      aria-label={isDark ? 'Φωτεινή έκδοση' : 'Νυχτερινή έκδοση'}
      title={isDark ? 'Φωτεινή έκδοση' : 'Νυχτερινή έκδοση'}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 ${className}`}
    >
      {isDark ? (
        // Ήλιος: γραμμικό εικονίδιο, όπως στα κλασικά sites
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        // Φεγγάρι: γραμμικό μισοφέγγαρο
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
        </svg>
      )}
    </button>
  );
}

/** Το inline script για το <head>: εφαρμόζει το σκούρο θέμα πριν το πρώτο ζωγράφισμα. */
export const THEME_BOOT_SCRIPT = `(function(){try{var p=localStorage.getItem('${KEY}');var d=p==='dark'||((!p||p==='system')&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}}catch(e){}})();`;
