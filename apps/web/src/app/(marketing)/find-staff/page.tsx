import Link from 'next/link';
import { PublicWorkersList } from '@/components/marketing/public-workers-list';
import { BrowseHero } from '@/components/marketing/browse-hero';
import { RedirectIfAuthed } from '@/components/marketing/redirect-if-authed';
import { Tr } from '@/i18n/locale-provider';

export const metadata = {
  title: 'Διαθέσιμοι Εργαζόμενοι',
  description:
    'Δες ποιοι εργαζόμενοι είναι διαθέσιμοι τώρα στην περιοχή σου — τουρισμός, εστίαση, retail και άλλα.',
  alternates: { canonical: '/find-staff' },
};

export default function FindStaffPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <RedirectIfAuthed to="/dashboard/discover" />
      <section className="pt-6 pb-16 sm:pt-8 sm:pb-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <nav className="text-xs text-gray-500 mb-3" aria-label="breadcrumb">
            <Link href="/" className="hover:text-gray-700">
              <Tr k="findStaff.breadcrumbHome" />
            </Link>{' '}
            <span aria-hidden="true">/</span>{' '}
            <span className="text-gray-700"><Tr k="findStaff.breadcrumbCurrent" /></span>
          </nav>

          <BrowseHero
            accent="blue"
            metric="workers"
            icon="👥"
            nounOneKey="findStaff.nounOne"
            nounManyKey="findStaff.nounMany"
            headlineKey="findStaff.headline"
            subtitleKey="findStaff.subtitle"
          />

          <h1 className="sr-only"><Tr k="findStaff.h1" /></h1>

          <div className="mt-5">
            <PublicWorkersList />
          </div>

          <div className="mt-10 rounded-2xl bg-white border border-gray-100 p-6 sm:p-8 text-center shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              <Tr k="findStaff.ctaTitle" />
            </h2>
            <p className="mt-2 text-sm sm:text-base text-gray-600 max-w-xl mx-auto">
              <Tr k="findStaff.ctaText" />
            </p>
            <Link
              href="/auth/register?role=business&next=/dashboard/discover"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition"
            >
              <Tr k="findStaff.ctaRegister" />
            </Link>
            <p className="mt-3 text-xs text-gray-400">
              <Tr k="findStaff.hasAccount" />{' '}
              <Link href="/auth/login" className="text-blue-600 hover:underline">
                <Tr k="findStaff.login" />
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
