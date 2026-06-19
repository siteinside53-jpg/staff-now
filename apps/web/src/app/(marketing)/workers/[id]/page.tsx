import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  fetchAllWorkers,
  roleLabel,
  workerDisplayName,
  type PublicWorker,
} from '@/lib/seo-data';

export const dynamic = 'force-static';

type Params = { params: Promise<{ id: string }> };

const AVAILABILITY_LABELS: Record<string, string> = {
  immediate: 'Άμεσα διαθέσιμος/η',
  within_7_days: 'Εντός 7 ημερών',
  seasonal: 'Εποχιακά',
  part_time: 'Μερική απασχόληση',
  full_time: 'Πλήρης απασχόληση',
};

function workerLocation(w: PublicWorker): string {
  return (w.city || w.region || 'Ελλάδα').toString().trim();
}

function primaryRole(w: PublicWorker): string {
  return roleLabel(w.roles?.[0]);
}

function expText(years?: number): string {
  if (!years || years <= 0) return 'Νέος/α στον κλάδο';
  if (years === 1) return '1 χρόνος εμπειρία';
  return `${years} χρόνια εμπειρία`;
}

export async function generateStaticParams() {
  const workers = await fetchAllWorkers();
  return workers.map((w) => ({ id: String(w.user_id) }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const workers = await fetchAllWorkers();
  const w = workers.find((x) => String(x.user_id) === id);
  if (!w) return { title: 'Εργαζόμενος' };

  const role = primaryRole(w);
  const loc = workerLocation(w);
  const title = `${role} — ${loc} | Διαθέσιμος εργαζόμενος`;
  const description = `${workerDisplayName(w.full_name)}, ${role} στην περιοχή ${loc}. ${expText(w.years_of_experience)}. Δες το προφίλ & επικοινώνησε μέσω StaffNow.`.slice(0, 160);

  return {
    title,
    description,
    alternates: { canonical: `/workers/${id}` },
    openGraph: { title, description, type: 'profile', url: `https://staffnow.gr/workers/${id}` },
  };
}

export default async function WorkerPage({ params }: Params) {
  const { id } = await params;
  const workers = await fetchAllWorkers();
  const w = workers.find((x) => String(x.user_id) === id);
  if (!w) notFound();

  const name = workerDisplayName(w.full_name);
  const role = primaryRole(w);
  const loc = workerLocation(w);

  const jsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Person',
    name,
    jobTitle: role,
    address: { '@type': 'PostalAddress', addressLocality: loc, addressCountry: 'GR' },
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Αρχική', item: 'https://staffnow.gr/' },
      { '@type': 'ListItem', position: 2, name: 'Εργαζόμενοι', item: 'https://staffnow.gr/find-staff' },
      { '@type': 'ListItem', position: 3, name: role, item: `https://staffnow.gr/workers/${id}` },
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
          <Link href="/find-staff" className="hover:text-gray-700">Εργαζόμενοι</Link>{' '}
          <span aria-hidden="true">/</span>{' '}
          <span className="text-gray-700">{role}</span>
        </nav>

        <header className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            {w.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={w.photo_url} alt="" className="h-20 w-20 rounded-full object-cover ring-1 ring-gray-100" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-700 font-bold text-xl">
                {(name.match(/\p{L}/u)?.[0] || '?').toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex items-center gap-2 flex-wrap">
                {role}
                {w.verified ? <span className="text-blue-600 text-xs font-semibold">✓ Επαληθευμένος</span> : null}
              </h1>
              <p className="mt-1 text-gray-600">{name} · 📍 {loc}</p>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-gray-50 p-3">
              <dt className="text-xs text-gray-500">Εμπειρία</dt>
              <dd className="text-sm font-bold text-gray-900">{expText(w.years_of_experience)}</dd>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <dt className="text-xs text-gray-500">Περιοχή</dt>
              <dd className="text-sm font-bold text-gray-900">{loc}</dd>
            </div>
            {w.availability && (
              <div className="rounded-xl bg-gray-50 p-3">
                <dt className="text-xs text-gray-500">Διαθεσιμότητα</dt>
                <dd className="text-sm font-bold text-gray-900">{AVAILABILITY_LABELS[w.availability] ?? w.availability}</dd>
              </div>
            )}
            <div className="rounded-xl bg-gray-50 p-3">
              <dt className="text-xs text-gray-500">Κατάσταση</dt>
              <dd className="text-sm font-bold text-gray-900">{w.verified ? 'Επαληθευμένος' : 'Ενεργός'}</dd>
            </div>
          </dl>

          {w.roles && w.roles.length > 0 && (
            <div className="mt-5">
              <h2 className="text-xs text-gray-500 mb-1.5">Ειδικότητες</h2>
              <div className="flex flex-wrap gap-2">
                {w.roles.map((r) => (
                  <span key={r} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                    {roleLabel(r)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center">
            <p className="text-sm text-gray-600">🔒 Στοιχεία επικοινωνίας &amp; πλήρες προφίλ διαθέσιμα μετά την εγγραφή</p>
          </div>

          <div className="mt-4">
            <Link
              href={`/auth/register?role=business&next=${encodeURIComponent(`/dashboard/discover?focus=${w.user_id}`)}`}
              className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 px-8 py-3.5 text-sm font-semibold text-white shadow transition"
            >
              Σύνδεση / Εγγραφή για επικοινωνία →
            </Link>
            <p className="mt-2 text-xs text-gray-400">Δωρεάν εγγραφή επιχείρησης σε 30''</p>
          </div>
        </header>

        <p className="mt-6 text-center text-sm text-gray-500">
          Ψάχνεις προσωπικό;{' '}
          <Link href="/find-staff" className="text-blue-600 font-medium hover:underline">
            Δες όλους τους εργαζόμενους
          </Link>
        </p>
      </article>
    </main>
  );
}
