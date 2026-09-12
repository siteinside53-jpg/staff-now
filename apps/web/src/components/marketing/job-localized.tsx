'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/i18n/locale-provider';
import { API_URL } from '@/lib/config';

/**
 * Τίτλος και περιγραφή αγγελίας στη γλώσσα του επισκέπτη.
 *
 * Η δημόσια σελίδα αγγελίας χτίζεται στατικά στα ελληνικά (SEO, ελληνική
 * αγορά). Όταν ο επισκέπτης διαλέξει αγγλικά, ρωτάμε τον server για την
 * αποθηκευμένη μετάφραση και αντικαθιστούμε μόνο το κείμενο της αγγελίας.
 * Μέχρι να έρθει (ή αν δεν υπάρχει), φαίνεται το ελληνικό πρωτότυπο — ποτέ κενό.
 */
type Translated = { title?: string; description?: string };
const cache = new Map<string, Promise<Translated | null>>();

function fetchTranslation(jobId: string): Promise<Translated | null> {
  let p = cache.get(jobId);
  if (!p) {
    p = fetch(`${API_URL}/public/jobs/${encodeURIComponent(jobId)}?lang=en`, { headers: { 'X-Locale': 'en' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: any) => (j?.data ? { title: j.data.title, description: j.data.description } : null))
      .catch(() => null);
    cache.set(jobId, p);
  }
  return p;
}

export function useJobTranslation(jobId?: string | null): Translated | null {
  const { locale } = useLocale();
  const [tr, setTr] = useState<Translated | null>(null);
  useEffect(() => {
    if (!jobId || locale !== 'en') {
      setTr(null);
      return;
    }
    let cancelled = false;
    void fetchTranslation(jobId).then((v) => {
      if (!cancelled) setTr(v);
    });
    return () => {
      cancelled = true;
    };
  }, [jobId, locale]);
  return tr;
}

export function LocalizedJobTitle({ jobId, fallback }: { jobId: string; fallback: string }) {
  const tr = useJobTranslation(jobId);
  return <>{tr?.title || fallback}</>;
}
