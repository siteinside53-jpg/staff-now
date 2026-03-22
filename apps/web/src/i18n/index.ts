import elCommon from './locales/el/common.json';
import enCommon from './locales/en/common.json';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Locale = 'el' | 'en';

type TranslationMap = Record<string, string | TranslationMap>;

interface Translations {
  el: { common: TranslationMap };
  en: { common: TranslationMap };
}

// ---------------------------------------------------------------------------
// Translation data
// ---------------------------------------------------------------------------

const translations: Translations = {
  el: { common: elCommon as unknown as TranslationMap },
  en: { common: enCommon as unknown as TranslationMap },
};

// Default locale (Greek is the primary language)
let currentLocale: Locale = 'el';

// ---------------------------------------------------------------------------
// Locale management
// ---------------------------------------------------------------------------

export function setLocale(locale: Locale): void {
  currentLocale = locale;
  if (typeof window !== 'undefined') {
    document.documentElement.lang = locale;
    try {
      localStorage.setItem('staffnow_locale', locale);
    } catch {
      // SSR or storage unavailable
    }
  }
}

export function getLocale(): Locale {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('staffnow_locale') as Locale | null;
      if (stored && (stored === 'el' || stored === 'en')) {
        currentLocale = stored;
      }
    } catch {
      // SSR or storage unavailable
    }
  }
  return currentLocale;
}

// ---------------------------------------------------------------------------
// Translation function
// ---------------------------------------------------------------------------

/**
 * Look up a translation by dot-separated key.
 *
 * @example
 *   t('nav.home')           // "Αρχική"
 *   t('hero.stats.workers') // "Εργαζόμενοι"
 *   t('billing.renewsOn', { date: '15/04/2026' })
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const locale = getLocale();
  const dict = translations[locale]?.common;
  if (!dict) return key;

  const segments = key.split('.');
  let current: TranslationMap | string = dict;

  for (const segment of segments) {
    if (typeof current === 'string') return key;
    current = current[segment];
    if (current === undefined) return key;
  }

  if (typeof current !== 'string') return key;

  // Interpolate parameters  e.g. "{count}" -> "42"
  let result = current;
  if (params) {
    for (const [pKey, pValue] of Object.entries(params)) {
      result = result.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pValue));
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Namespace helper (optional convenience)
// ---------------------------------------------------------------------------

/**
 * Returns a scoped translation function.
 *
 * @example
 *   const tc = scopedT('auth');
 *   tc('loginTitle'); // "Σύνδεση"
 */
export function scopedT(namespace: string) {
  return (key: string, params?: Record<string, string | number>): string => {
    return t(`${namespace}.${key}`, params);
  };
}
