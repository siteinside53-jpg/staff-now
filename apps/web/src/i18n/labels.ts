'use client';

/**
 * Ετικέτες που έρχονται από δεδομένα (ειδικότητες, είδη επιχείρησης, τύπος
 * απασχόλησης) — στη γλώσσα του χρήστη.
 *
 * Τα ελληνικά ζουν στο @staffnow/config (ίδια με τον server). Τα αγγλικά στο
 * i18n/locales/en/labels.json με το ίδιο κλειδί. Όταν λείπει μετάφραση,
 * γυρνά το ελληνικό — ποτέ κενό, ποτέ το κλειδί.
 */

import { WORKER_JOB_ROLE_LABELS_EL, BUSINESS_TYPE_LABELS_EL } from '@staffnow/config';
import { useLocale } from './locale-provider';
import { translate, type Locale } from './index';

const EMPLOYMENT_EL: Record<string, string> = {
  full_time: 'Πλήρης απασχόληση',
  part_time: 'Μερική απασχόληση',
  seasonal: 'Σεζόν',
  freelancer: 'Freelancer',
  contract: 'Σύμβαση',
  internship: 'Πρακτική',
};

function lookup(locale: Locale, ns: string, key: string, fallback: string): string {
  if (locale === 'el') return fallback;
  const v = translate(locale, `${ns}.${key}`);
  return v === `${ns}.${key}` ? fallback : v;
}

export function roleLabelFor(locale: Locale, role: string): string {
  return lookup(locale, 'roles', role, WORKER_JOB_ROLE_LABELS_EL[role] || role);
}
export function businessTypeLabelFor(locale: Locale, type: string): string {
  return lookup(locale, 'businessTypes', type, BUSINESS_TYPE_LABELS_EL[type] || type);
}
export function employmentLabelFor(locale: Locale, type: string): string {
  return lookup(locale, 'employment', type, EMPLOYMENT_EL[type] || type);
}
/** Όνομα ομάδας ειδικοτήτων (π.χ. «Εστίαση») — το ελληνικό μένει fallback. */
export function roleGroupLabelFor(locale: Locale, id: string, fallback: string): string {
  return lookup(locale, 'roleGroups', id, fallback);
}

/** Hooks που ξαναζωγραφίζουν όταν αλλάξει η γλώσσα. */
export function useLabels() {
  const { locale } = useLocale();
  return {
    locale,
    role: (r: string) => roleLabelFor(locale, r),
    businessType: (t: string) => businessTypeLabelFor(locale, t),
    employment: (t: string) => employmentLabelFor(locale, t),
    roleGroup: (id: string, fallback: string) => roleGroupLabelFor(locale, id, fallback),
  };
}
