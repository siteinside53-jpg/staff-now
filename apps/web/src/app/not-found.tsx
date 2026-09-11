'use client';

/**
 * Σελίδα «δεν βρέθηκε» — με ζωντανή εφεδρεία για αγγελίες.
 *
 * Οι σελίδες /jobs/… χτίζονται κάθε 6 ώρες. Μια αγγελία που μόλις
 * δημοσιεύτηκε δεν έχει ακόμη σελίδα, οπότε ο σύνδεσμος που μοιράστηκε η
 * επιχείρηση έβγαζε «404» — ακριβώς τις πρώτες ώρες που έχει τη μεγαλύτερη
 * κίνηση. Τώρα ρωτάμε τον server: αν η αγγελία υπάρχει, τη δείχνουμε εδώ.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { API_URL } from '@/lib/config';

interface LiveJob {
  id: string;
  title: string;
  description?: string | null;
  city?: string | null;
  region?: string | null;
  employment_type?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_type?: string | null;
  housing_provided?: number;
  meals_provided?: number;
  transport_provided?: number;
  bonus_provided?: number;
  insurance_provided?: number;
  display_company_name?: string | null;
  company_name?: string | null;
  company_logo?: string | null;
  roles?: string[];
}

const EMPLOYMENT: Record<string, string> = {
  full_time: 'Πλήρης απασχόληση',
  part_time: 'Μερική απασχόληση',
  seasonal: 'Σεζόν',
  freelancer: 'Freelancer',
  contract: 'Σύμβαση',
};

function salary(j: LiveJob): string | null {
  if (!j.salary_min && !j.salary_max) return null;
  const unit = j.salary_type === 'hourly' ? '/ώρα' : j.salary_type === 'daily' ? '/ημέρα' : '/μήνα';
  if (j.salary_min && j.salary_max && j.salary_min !== j.salary_max) return `${j.salary_min}–${j.salary_max}€ ${unit}`;
  return `${j.salary_min || j.salary_max}€ ${unit}`;
}

export default function NotFound() {
  const [job, setJob] = useState<LiveJob | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const m = typeof window !== 'undefined' ? window.location.pathname.match(/^\/jobs\/([A-Za-z0-9_-]+)\/?$/) : null;
    if (!m) {
      setChecking(false);
      return;
    }
    fetch(`${API_URL}/public/jobs/${encodeURIComponent(m[1]!)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: any) => {
        if (j?.success && j.data) setJob(j.data as LiveJob);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (job) {
    const company = job.display_company_name || job.company_name || 'Επιχείρηση';
    const loc = [job.city, job.region].filter(Boolean).join(', ');
    const pay = salary(job);
    const perks = [
      job.housing_provided ? '🏠 Διαμονή' : null,
      job.meals_provided ? '🍽️ Σίτιση' : null,
      job.transport_provided ? '🚌 Μεταφορά' : null,
      job.bonus_provided ? '💰 Bonus' : null,
      job.insurance_provided ? '🛡️ Ασφάλιση' : null,
    ].filter(Boolean) as string[];
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <header className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            {job.company_logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={job.company_logo} alt={company} className="h-16 w-16 rounded-2xl object-cover ring-1 ring-gray-100" />
            ) : (
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-2xl font-extrabold text-emerald-700">
                {company.trim().charAt(0).toUpperCase() || '💼'}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">{job.title}</h1>
              <p className="mt-1 text-gray-600">
                {company}
                {loc ? ` · 📍 ${loc}` : ''}
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            {pay && <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">{pay}</span>}
            {job.employment_type && <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">{EMPLOYMENT[job.employment_type] || job.employment_type}</span>}
            {perks.map((p) => (
              <span key={p} className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">{p}</span>
            ))}
          </div>
          {job.description && <p className="mt-5 whitespace-pre-wrap leading-relaxed text-gray-700">{job.description}</p>}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/auth/register?role=worker&next=${encodeURIComponent(`/dashboard/discover?focus=${job.id}`)}`}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-8 py-3.5 text-sm font-semibold text-white shadow hover:bg-emerald-700"
            >
              Κάνε αίτηση δωρεάν
            </Link>
            <Link href="/find-job" className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-8 py-3.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Όλες οι θέσεις
            </Link>
          </div>
        </header>
        <p className="mt-4 text-center text-xs text-gray-400">Η αγγελία δημοσιεύτηκε πρόσφατα — η πλήρης σελίδα της ετοιμάζεται.</p>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold text-brand-600">404</h1>
        <p className="mb-8 text-xl text-gray-600">Η σελίδα δεν βρέθηκε.</p>
        <Link href="/" className="inline-flex items-center rounded-lg bg-brand-600 px-6 py-3 text-white transition-colors hover:bg-brand-700">
          Πίσω στην αρχική
        </Link>
      </div>
    </div>
  );
}
