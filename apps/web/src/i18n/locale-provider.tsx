'use client';

/**
 * <LocaleProvider /> — React context for the EL/EN language switch.
 *
 * Το site είναι static export και προ-αποδίδεται ΠΑΝΤΑ στα ελληνικά. Γι' αυτό
 * το πρώτο render (server + hydration) είναι πάντα 'el' και μόνο μετά το mount
 * διαβάζουμε το localStorage — αλλιώς θα είχαμε hydration mismatch.
 *
 * Κρατάει σε συγχρονισμό και το module-level state του `@/i18n` (setLocale /
 * getLocale), ώστε ό,τι ακόμη καλεί το απλό `t()` να βλέπει τη σωστή γλώσσα.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  translate,
  getLocale as getStoredLocale,
  setLocale as setStoredLocale,
  type Locale,
} from '@/i18n';

type TParams = Record<string, string | number>;
type TFn = (key: string, params?: TParams) => string;

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TFn;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  // ΠΑΝΤΑ 'el' στο πρώτο render — ταιριάζει με το προ-αποδομένο HTML.
  const [locale, setLocaleState] = useState<Locale>('el');

  useEffect(() => {
    // Μετά το mount: ό,τι είχε διαλέξει ο επισκέπτης (localStorage).
    const stored = getStoredLocale();
    if (stored !== 'el') {
      setStoredLocale(stored);
      setLocaleState(stored);
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setStoredLocale(next); // localStorage + document.documentElement.lang
    setLocaleState(next);
  }, []);

  const t = useCallback<TFn>((key, params) => translate(locale, key, params), [locale]);

  const value = useMemo<LocaleContextValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/** Locale, setter and bound `t`. Works without a provider too (falls back to 'el'). */
export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (ctx) return ctx;
  return {
    locale: 'el',
    setLocale: setStoredLocale,
    t: (key, params) => translate('el', key, params),
  };
}

/** Bound translation function that re-renders on locale change. */
export function useT(): TFn {
  return useLocale().t;
}

/**
 * <Tr k="home.hero.title" /> — renders a translated string.
 *
 * Επιτρέπει σε server components (σελίδες με `export const metadata`) να
 * εμφανίζουν μεταφρασμένο κείμενο χωρίς να γίνουν client components.
 */
export function Tr({ k, params }: { k: string; params?: TParams }) {
  const t = useT();
  return <>{t(k, params)}</>;
}
