'use client';

/**
 * Το περιεχόμενο της δημόσιας σελίδας ενός εργαζόμενου που εξαρτάται από τη
 * γλώσσα του επισκέπτη (ρόλος, εμπειρία, διαθεσιμότητα, ετικέτες).
 *
 * ΓΙΑΤΙ ΞΕΧΩΡΙΣΤΟ ΑΠΟ ΤΗ ΣΕΛΙΔΑ: η σελίδα (workers/[id]/page.tsx) είναι server
 * component — έχει generateStaticParams/generateMetadata και χτίζεται στατικά.
 * Σχεδόν όλο το ορατό κείμενο εδώ εξαρτάται από δεδομένα (ρόλος, εμπειρία), άρα
 * χρειάζεται useLabels()/useT() — ζει σε αυτό το client υποcomponent, όπως και
 * το job-facts.tsx δίπλα του.
 */

import Link from 'next/link';
import { useLabels } from '@/i18n/labels';
import { useT } from '@/i18n/locale-provider';

export type WorkerFactsData = {
  userId: string;
  name: string;
  photoUrl?: string | null;
  verified?: boolean;
  location: string;
  yearsOfExperience?: number;
  availability?: string;
  roleKeys?: string[];
};

function useExpText(years?: number): string {
  const t = useT();
  if (!years || years <= 0) return t('workerPage.expNewToIndustry');
  if (years === 1) return t('lists.workers.expOneYear');
  return t('lists.workers.expYears', { n: years });
}

const AVAILABILITY_KEYS: Record<string, string> = {
  immediate: 'lists.workers.availImmediate',
  within_7_days: 'lists.workers.availWithin7',
  seasonal: 'lists.workers.availSeasonal',
  part_time: 'lists.workers.availPartTime',
  full_time: 'lists.workers.availFullTime',
};

export function WorkerRoleLabel({ roleKey }: { roleKey?: string }) {
  const labels = useLabels();
  return <>{labels.role(roleKey ?? '')}</>;
}

export function WorkerFacts({ worker }: { worker: WorkerFactsData }) {
  const t = useT();
  const labels = useLabels();
  const expText = useExpText(worker.yearsOfExperience);
  const role = labels.role(worker.roleKeys?.[0] ?? '');
  const roleKeys = worker.roleKeys ?? [];
  const availabilityLabel = worker.availability
    ? t(AVAILABILITY_KEYS[worker.availability] ?? worker.availability)
    : '';

  return (
    <>
      <div className="flex items-center gap-4">
        {worker.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={worker.photoUrl} alt="" className="h-20 w-20 rounded-full object-cover ring-1 ring-gray-100" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-700 font-bold text-xl">
            {(worker.name.match(/\p{L}/u)?.[0] || '?').toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex items-center gap-2 flex-wrap">
            {role}
            {worker.verified ? (
              <span className="text-blue-600 text-xs font-semibold">✓ {t('lists.workers.verified')}</span>
            ) : null}
          </h1>
          <p className="mt-1 text-gray-600">{worker.name} · 📍 {worker.location}</p>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-gray-50 p-3">
          <dt className="text-xs text-gray-500">{t('lists.workers.experienceTitle')}</dt>
          <dd className="text-sm font-bold text-gray-900">{expText}</dd>
        </div>
        <div className="rounded-xl bg-gray-50 p-3">
          <dt className="text-xs text-gray-500">{t('lists.workers.areaLabel')}</dt>
          <dd className="text-sm font-bold text-gray-900">{worker.location}</dd>
        </div>
        {worker.availability && (
          <div className="rounded-xl bg-gray-50 p-3">
            <dt className="text-xs text-gray-500">{t('lists.workers.availabilityTitle')}</dt>
            <dd className="text-sm font-bold text-gray-900">{availabilityLabel}</dd>
          </div>
        )}
        <div className="rounded-xl bg-gray-50 p-3">
          <dt className="text-xs text-gray-500">{t('lists.workers.statusLabel')}</dt>
          <dd className="text-sm font-bold text-gray-900">
            {worker.verified ? t('lists.workers.verified') : t('lists.workers.active')}
          </dd>
        </div>
      </dl>

      {roleKeys.length > 0 && (
        <div className="mt-5">
          <h2 className="text-xs text-gray-500 mb-1.5">{t('lists.workers.specialties')}</h2>
          <div className="flex flex-wrap gap-2">
            {roleKeys.map((r) => (
              <span key={r} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                {labels.role(r)}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center">
        <p className="text-sm text-gray-600">🔒 {t('lists.workers.contactLocked')}</p>
      </div>

      <div className="mt-4">
        <Link
          href={`/auth/register?role=business&next=${encodeURIComponent(`/dashboard/discover?focus=${worker.userId}`)}`}
          className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 px-8 py-3.5 text-sm font-semibold text-white shadow transition"
        >
          {t('workerPage.ctaConnect')}
        </Link>
        <p className="mt-2 text-xs text-gray-400">{t('workerPage.freeSignupNote')}</p>
      </div>
    </>
  );
}
