'use client';

/**
 * Τα στοιχεία μιας δημόσιας αγγελίας που εξαρτώνται από τη γλώσσα του
 * επισκέπτη (αμοιβή, τύπος απασχόλησης, ειδικότητες, περιγραφή).
 *
 * ΓΙΑΤΙ ΞΕΧΩΡΙΣΤΟ ΑΠΟ ΤΗ ΣΕΛΙΔΑ: η σελίδα (jobs/[id]/page.tsx) είναι server
 * component — έχει generateStaticParams/generateMetadata και χτίζεται στατικά.
 * Οι ετικέτες εδώ (ρόλος, τύπος απασχόλησης) έρχονται από τον κεντρικό
 * κατάλογο μέσω useLabels()/useT(), που χρειάζονται React hooks — γι' αυτό
 * ζουν σε αυτό το μικρό client υποcomponent, όπως προβλέπει ο κανόνας i18n.
 */

import { useLabels } from '@/i18n/labels';
import { useT } from '@/i18n/locale-provider';
import { useJobTranslation } from './job-localized';

export type JobFactsData = {
  /** Με αναγνωριστικό, η περιγραφή έρχεται μεταφρασμένη όταν ο επισκέπτης διαλέξει αγγλικά. */
  jobId?: string;
  title: string;
  company: string;
  location: string;
  employmentType?: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryType?: string;
  housingProvided?: boolean;
  mealsProvided?: boolean;
  roleKeys?: string[];
  /** Περιγραφή γραμμένη από την επιχείρηση — μένει όπως γράφτηκε, σε όποια γλώσσα. */
  customDescription?: string;
};

function useSalaryText(job: JobFactsData): string {
  const t = useT();
  const unit =
    job.salaryType === 'hourly' ? t('lists.jobs.perHour') :
    job.salaryType === 'daily' ? t('lists.jobs.perDay') :
    job.salaryType === 'monthly' ? t('lists.jobs.perMonth') : '€';
  if (job.salaryMin && job.salaryMax) return `${job.salaryMin}-${job.salaryMax} ${unit}`;
  if (job.salaryMin) return t('jobPage.salaryFrom', { value: `${job.salaryMin} ${unit}` });
  if (job.salaryMax) return t('jobPage.salaryTo', { value: `${job.salaryMax} ${unit}` });
  return '—';
}

export function JobFacts({ job }: { job: JobFactsData }) {
  const t = useT();
  const labels = useLabels();
  const salary = useSalaryText(job);
  const translated = useJobTranslation(job.jobId);
  const employmentLabel = job.employmentType ? labels.employment(job.employmentType) : '';
  const roleKeys = job.roleKeys ?? [];

  const perks = [
    job.housingProvided ? t('jobPage.perkHousing') : '',
    job.mealsProvided ? t('jobPage.perkMeals') : '',
  ].filter(Boolean);

  const customDescription = translated?.description || job.customDescription;
  const description =
    customDescription && customDescription.trim().length > 0
      ? customDescription.trim()
      : t('jobPage.autoDescription', {
          company: job.company,
          title: job.title,
          loc: job.location,
          type: employmentLabel,
          salary,
          perksPart: perks.length ? t('jobPage.perksIntro', { perks: perks.join(' & ') }) : '',
        });

  return (
    <>
      <dl className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-gray-50 p-3">
          <dt className="text-xs text-gray-500">{t('jobPage.salaryLabel')}</dt>
          <dd className="text-sm font-bold text-gray-900">{salary}</dd>
        </div>
        <div className="rounded-xl bg-gray-50 p-3">
          <dt className="text-xs text-gray-500">{t('jobPage.typeLabel')}</dt>
          <dd className="text-sm font-bold text-gray-900">{employmentLabel}</dd>
        </div>
        <div className="rounded-xl bg-gray-50 p-3">
          <dt className="text-xs text-gray-500">{t('jobPage.housingLabel')}</dt>
          <dd className="text-sm font-bold text-gray-900">{job.housingProvided ? `🏠 ${t('jobPage.yes')}` : '—'}</dd>
        </div>
        <div className="rounded-xl bg-gray-50 p-3">
          <dt className="text-xs text-gray-500">{t('jobPage.mealsLabel')}</dt>
          <dd className="text-sm font-bold text-gray-900">{job.mealsProvided ? `🍽️ ${t('jobPage.yes')}` : '—'}</dd>
        </div>
      </dl>

      {roleKeys.length > 0 && (
        <div className="mt-5">
          <h2 className="text-xs text-gray-500 mb-1.5">{t('jobPage.specialties')}</h2>
          <div className="flex flex-wrap gap-2">
            {roleKeys.map((r) => (
              <span key={r} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                {labels.role(r)}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-sm font-bold text-gray-900 mb-2">{t('jobPage.descriptionTitle')}</h2>
        <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{description}</p>
      </div>
    </>
  );
}
