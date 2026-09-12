import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  fetchAllWorkers,
  roleLabel,
  workerDisplayName,
  type PublicWorker,
} from '@/lib/seo-data';
import { WorkerFacts, WorkerRoleLabel } from '@/components/marketing/worker-facts';
import { Tr } from '@/i18n/locale-provider';

export const dynamic = 'force-static';

type Params = { params: Promise<{ id: string }> };

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
    /*
      ΕΚΤΟΣ GOOGLE — ΕΠΙΤΗΔΕΣ. Δύο λόγοι, και οι δύο σοβαροί.

      1) SEO. Το Search Console έδειχνε 20 καταχωρισμένες σελίδες και 120 όχι,
         από τις οποίες 101 «Εντοπίστηκε — μη ευρετηριασμένη». Ήταν αυτές εδώ:
         105 σχεδόν πανομοιότυπες σελίδες με ~1.000 χαρακτήρες, σχεδόν όλοι
         από το κοινό μενού. Η Google τις έκρινε κενές, σταμάτησε να τις
         διαβάζει, και έριχνε τη συνολική εικόνα του site — άρα και τις
         ΑΓΓΕΛΙΕΣ, που είναι το μόνο που θέλουμε να βρίσκει ο κόσμος.

      2) Ιδιωτικότητα. Οι άνθρωποι έφτιαξαν προφίλ για να τους δουν επιχειρήσεις
         ΜΕΣΑ στην πλατφόρμα, όχι για να είναι ειδικότητα και πόλη τους ανοιχτά
         στο internet. Δεν το ζήτησαν και δεν το ξέρουν.

      «follow: true»: η Google να ΜΗΝ καταχωρίζει τη σελίδα, αλλά να ακολουθεί
      τους συνδέσμους της. Και ΔΕΝ την μπλοκάρουμε στο robots.txt: αν την
      μπλοκάραμε, δεν θα μπορούσε να μπει για να δει αυτή την οδηγία, και οι
      ήδη καταχωρισμένες θα έμεναν για πάντα.

      Η σελίδα λειτουργεί κανονικά για όποιον έχει τον σύνδεσμο.
    */
    robots: { index: false, follow: true },
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
          <Link href="/" className="hover:text-gray-700"><Tr k="workerPage.breadcrumbHome" /></Link>{' '}
          <span aria-hidden="true">/</span>{' '}
          <Link href="/find-staff" className="hover:text-gray-700"><Tr k="workerPage.breadcrumbWorkers" /></Link>{' '}
          <span aria-hidden="true">/</span>{' '}
          <span className="text-gray-700"><WorkerRoleLabel roleKey={w.roles?.[0]} /></span>
        </nav>

        <header className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-gray-100">
          <WorkerFacts
            worker={{
              userId: String(w.user_id),
              name,
              photoUrl: w.photo_url,
              verified: !!w.verified,
              location: loc,
              yearsOfExperience: w.years_of_experience,
              availability: w.availability,
              roleKeys: w.roles,
            }}
          />
        </header>

        <p className="mt-6 text-center text-sm text-gray-500">
          <Tr k="workerPage.lookingForStaff" />{' '}
          <Link href="/find-staff" className="text-blue-600 font-medium hover:underline">
            <Tr k="workerPage.seeAllWorkers" />
          </Link>
        </p>
      </article>
    </main>
  );
}
