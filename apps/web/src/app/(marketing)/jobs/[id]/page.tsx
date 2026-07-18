import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  fetchAllJobs,
  jobCompany,
  jobLocation,
  employmentGreek,
  employmentSchemaType,
  roleLabel,
  type PublicJob,
} from '@/lib/seo-data';

export const dynamic = 'force-static';

type Params = { params: Promise<{ id: string }> };

function salaryText(j: PublicJob): string {
  const unit = j.salary_type === 'hourly' ? '€/ώρα' : '€/μήνα';
  if (j.salary_min && j.salary_max) return `${j.salary_min}-${j.salary_max} ${unit}`;
  if (j.salary_min) return `Από ${j.salary_min} ${unit}`;
  if (j.salary_max) return `Έως ${j.salary_max} ${unit}`;
  return '—';
}

function plainDescription(j: PublicJob): string {
  if (j.description && j.description.trim().length > 0) return j.description.trim();
  const loc = jobLocation(j);
  const perks = [
    j.housing_provided ? 'παροχή στέγης' : '',
    j.meals_provided ? 'παροχή γευμάτων' : '',
  ].filter(Boolean).join(' & ');
  return `Η επιχείρηση ${jobCompany(j)} αναζητά ${j.title} στην περιοχή ${loc}. ` +
    `Τύπος απασχόλησης: ${employmentGreek(j.employment_type)}. Αμοιβή: ${salaryText(j)}.` +
    (perks ? ` Επιπλέον: ${perks}.` : '') +
    ` Κάνε αίτηση μέσω StaffNow.`;
}

export async function generateStaticParams() {
  const jobs = await fetchAllJobs();
  return jobs.map((j) => ({ id: String(j.id) }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const jobs = await fetchAllJobs();
  const job = jobs.find((j) => String(j.id) === id);
  if (!job) return { title: 'Θέση εργασίας' };

  const loc = jobLocation(job);
  const title = `${job.title} — ${jobCompany(job)} | ${loc}`;
  const description = plainDescription(job).slice(0, 160);

  return {
    title,
    description,
    alternates: { canonical: `/jobs/${id}` },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://staffnow.gr/jobs/${id}`,
      images: job.company_logo ? [{ url: job.company_logo }] : undefined,
    },
  };
}

export default async function JobPage({ params }: Params) {
  const { id } = await params;
  const jobs = await fetchAllJobs();
  const job = jobs.find((j) => String(j.id) === id);
  if (!job) notFound();

  const loc = jobLocation(job);
  const company = jobCompany(job);
  const description = plainDescription(job);
  const datePosted = job.created_at || new Date().toISOString();
  const validThrough = new Date(new Date(datePosted).getTime() + 60 * 86400e3).toISOString();

  // Google for Jobs structured data
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org/',
    '@type': 'JobPosting',
    title: job.title,
    description,
    datePosted,
    validThrough,
    employmentType: employmentSchemaType(job.employment_type),
    identifier: { '@type': 'PropertyValue', name: company, value: String(job.id) },
    hiringOrganization: {
      '@type': 'Organization',
      name: company,
      ...(job.company_logo ? { logo: job.company_logo } : {}),
    },
    jobLocation: {
      '@type': 'Place',
      address: { '@type': 'PostalAddress', addressLocality: loc, addressCountry: 'GR' },
    },
    directApply: true,
  };
  if (job.salary_min || job.salary_max) {
    jsonLd.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: 'EUR',
      value: {
        '@type': 'QuantitativeValue',
        ...(job.salary_min ? { minValue: job.salary_min } : {}),
        ...(job.salary_max ? { maxValue: job.salary_max } : {}),
        unitText: job.salary_type === 'hourly' ? 'HOUR' : 'MONTH',
      },
    };
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Αρχική', item: 'https://staffnow.gr/' },
      { '@type': 'ListItem', position: 2, name: 'Θέσεις εργασίας', item: 'https://staffnow.gr/find-job' },
      { '@type': 'ListItem', position: 3, name: job.title, item: `https://staffnow.gr/jobs/${id}` },
    ],
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <nav className="text-xs text-gray-500 mb-4" aria-label="breadcrumb">
          <Link href="/" className="hover:text-gray-700">Αρχική</Link>{' '}
          <span aria-hidden="true">/</span>{' '}
          <Link href="/find-job" className="hover:text-gray-700">Θέσεις εργασίας</Link>{' '}
          <span aria-hidden="true">/</span>{' '}
          <span className="text-gray-700">{job.title}</span>
        </nav>

        <header className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-gray-100">
          <div className="flex items-start gap-4">
            {job.company_logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={job.company_logo} alt={company} className="h-16 w-16 rounded-2xl object-cover ring-1 ring-gray-100" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 font-bold text-xs text-center px-1">
                {employmentGreek(job.employment_type)}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">{job.title}</h1>
              <p className="mt-1 text-gray-600">{company} · 📍 {loc}</p>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-gray-50 p-3">
              <dt className="text-xs text-gray-500">Αμοιβή</dt>
              <dd className="text-sm font-bold text-gray-900">{salaryText(job)}</dd>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <dt className="text-xs text-gray-500">Τύπος</dt>
              <dd className="text-sm font-bold text-gray-900">{employmentGreek(job.employment_type)}</dd>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <dt className="text-xs text-gray-500">Στέγη</dt>
              <dd className="text-sm font-bold text-gray-900">{job.housing_provided ? '🏠 Ναι' : '—'}</dd>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <dt className="text-xs text-gray-500">Φαγητό</dt>
              <dd className="text-sm font-bold text-gray-900">{job.meals_provided ? '🍽️ Ναι' : '—'}</dd>
            </div>
          </dl>

          {job.roles && job.roles.length > 0 && (
            <div className="mt-5">
              <h2 className="text-xs text-gray-500 mb-1.5">Ειδικότητες</h2>
              <div className="flex flex-wrap gap-2">
                {job.roles.map((r) => (
                  <span key={r} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    {roleLabel(r)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            <h2 className="text-sm font-bold text-gray-900 mb-2">Περιγραφή θέσης</h2>
            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{description}</p>
          </div>

          <div className="mt-8">
            <Link
              href={`/auth/register?role=worker&next=${encodeURIComponent(`/dashboard/discover?focus=${job.id}`)}`}
              className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 px-8 py-3.5 text-sm font-semibold text-white shadow transition"
            >
              Κάνε αίτηση δωρεάν →
            </Link>
            <p className="mt-2 text-xs text-gray-400">Δωρεάν εγγραφή σε 30'' · Χωρίς πιστωτική κάρτα</p>
          </div>
        </header>

        <p className="mt-6 text-center text-sm text-gray-500">
          Ψάχνεις κι άλλες θέσεις;{' '}
          <Link href="/find-job" className="text-emerald-600 font-medium hover:underline">
            Δες όλες τις αγγελίες
          </Link>
        </p>
      </article>
    </main>
  );
}
