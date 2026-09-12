'use client';

/**
 * Τα στοιχεία της σελίδας μιας μικροδουλειάς (tasknow/[id]) που εξαρτώνται
 * από τη γλώσσα του επισκέπτη — κατηγορία, άδεια, πότε ανέβηκε.
 *
 * Ξεχωριστό client component για τον ίδιο λόγο με το job-facts.tsx: η σελίδα
 * είναι server component με generateStaticParams/generateMetadata.
 */

import { useLocale, useT } from '@/i18n/locale-provider';
import { categoryLabelFor, formatPostedAgo, licenceLabelFor } from '@/components/tasknow/data';

export type TaskPageFactsData = {
  categoryKey: string;
  categoryIcon?: string;
  licensed: boolean;
  urgent?: boolean;
  postedMinutesAgo: number;
};

export function TaskCategoryBadge({ categoryKey, categoryIcon }: { categoryKey: string; categoryIcon?: string }) {
  const { locale } = useLocale();
  return <>{categoryIcon} {categoryLabelFor(locale, categoryKey)}</>;
}

export function TaskPageBadges({ categoryKey, categoryIcon, licensed, urgent }: TaskPageFactsData) {
  const { locale } = useLocale();
  const t = useT();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
        {categoryIcon} {categoryLabelFor(locale, categoryKey)}
      </span>
      {licensed && (
        <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
          {t('tasknow.taskPage.needsLicence')}
        </span>
      )}
      {urgent && (
        <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-600">
          {t('tasknow.taskPage.urgent')}
        </span>
      )}
    </div>
  );
}

export function TaskPostedAgo({ postedMinutesAgo }: { postedMinutesAgo: number }) {
  const { locale } = useLocale();
  const t = useT();
  return <>{t('tasknow.taskPage.postedAgo', { ago: formatPostedAgo(postedMinutesAgo, locale) })}</>;
}

export function TaskLicenceNote({ categoryKey }: { categoryKey: string }) {
  const { locale } = useLocale();
  const t = useT();
  return (
    <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-900">
      {t('tasknow.taskPage.licenceNote1')}
      <strong>{licenceLabelFor(locale, categoryKey).toLowerCase()}</strong>
      {t('tasknow.taskPage.licenceNote2')}
    </p>
  );
}
