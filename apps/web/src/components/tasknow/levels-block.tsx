'use client';

/**
 * Τα σήματα επιπέδου (Νέος/Χάλκινο/…) στη σελίδα-μακέτα του TaskNow.
 * Ξεχωριστό client component επειδή η γονική σελίδα (tasknow/page.tsx) δεν
 * έχει άλλη ανάγκη από hooks — μόνο εδώ χρειάζεται useLocale() για τα ονόματα
 * και τις περιγραφές των επιπέδων.
 */

import { useLocale, useT } from '@/i18n/locale-provider';
import { LEVELS, levelLabelFor, levelPerkFor } from '@/components/tasknow/data';

export function TaskNowLevelsBlock() {
  const t = useT();
  const { locale } = useLocale();

  return (
    <>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {LEVELS.map((l) => (
          <span
            key={l.key}
            className={'rounded-full px-3 py-1.5 text-sm font-semibold ' + l.className}
          >
            {l.icon} {levelLabelFor(locale, l)}
          </span>
        ))}
      </div>

      <details className="mx-auto mt-4 max-w-3xl rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-gray-900">
          {t('tasknow.page.criteria')}
        </summary>
        <div className="mt-3 space-y-2">
          {LEVELS.map((l) => (
            <div key={l.key} className="flex flex-wrap items-baseline gap-x-3 text-sm">
              <span className={'rounded-full px-2 py-0.5 text-xs font-semibold ' + l.className}>
                {l.icon} {levelLabelFor(locale, l)}
              </span>
              <span className="text-xs font-medium tabular-nums text-gray-900">
                {l.minCompleted === 0
                  ? t('tasknow.page.fromStart')
                  : t('tasknow.page.criteriaLine', {
                      n: l.minCompleted,
                      rating: l.minRating.toFixed(1).replace('.', locale === 'en' ? '.' : ','),
                    })}
              </span>
              <span className="text-xs text-gray-600">{levelPerkFor(locale, l)}</span>
            </div>
          ))}
        </div>
      </details>
    </>
  );
}
