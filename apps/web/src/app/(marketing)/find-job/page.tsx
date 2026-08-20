import Link from 'next/link';
import { PublicJobsList } from '@/components/marketing/public-jobs-list';
import { BrowseHero } from '@/components/marketing/browse-hero';
import { RedirectIfAuthed } from '@/components/marketing/redirect-if-authed';
import { AllJobsIndex } from '@/components/marketing/all-jobs-index';
import { TaskNowBanner } from '@/components/tasknow/home-banner';

export const metadata = {
  title: 'Διαθέσιμες Θέσεις Εργασίας',
  description:
    'Δες τις τελευταίες θέσεις εργασίας σε τουρισμό, εστίαση, retail, logistics και άλλους κλάδους — σε όλη την Ελλάδα.',
  alternates: { canonical: '/find-job' },
};

export default function FindJobPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <RedirectIfAuthed to="/dashboard/discover" />
      <section className="pt-6 pb-16 sm:pt-8 sm:pb-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <nav className="text-xs text-gray-500 mb-3" aria-label="breadcrumb">
            <Link href="/" className="hover:text-gray-700">
              Αρχική
            </Link>{' '}
            <span aria-hidden="true">/</span>{' '}
            <span className="text-gray-700">Διαθέσιμες θέσεις εργασίας</span>
          </nav>

          <BrowseHero
            accent="emerald"
            metric="jobs"
            icon="💼"
            noun={['θέση εργασίας', 'θέσεις εργασίας']}
            headline="Διαθέσιμες θέσεις εργασίας"
            subtitle="Δες ελεύθερα τις πιο πρόσφατες αγγελίες. Για να κάνεις αίτηση χρειάζεσαι δωρεάν λογαριασμό εργαζομένου."
          />

          <h1 className="sr-only">Θέσεις εργασίας κοντά σου</h1>

          <div className="mt-5">
            <TaskNowBanner variant="strip" />
          </div>

          <div className="mt-5">
            <PublicJobsList />
          </div>

          <div className="mt-10 rounded-2xl bg-white border border-gray-100 p-6 sm:p-8 text-center shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              Θες πρόσβαση σε όλες τις αγγελίες;
            </h2>
            <p className="mt-2 text-sm sm:text-base text-gray-600 max-w-xl mx-auto">
              Φτιάξε προφίλ εργαζομένου δωρεάν, κάνε swipe και match σε λεπτά.
            </p>
            <Link
              href="/auth/register?role=worker&next=/dashboard/discover"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 transition"
            >
              Δωρεάν εγγραφή εργαζομένου →
            </Link>
            <p className="mt-3 text-xs text-gray-400">
              Έχεις ήδη λογαριασμό;{' '}
              <Link href="/auth/login" className="text-emerald-600 hover:underline">
                Σύνδεση
              </Link>
            </p>
          </div>
        </div>
      </section>
          {/* Λίστα με συνδέσμους, γραμμένη στο χτίσιμο: ο μόνος δρόμος της
          Google προς τις αγγελίες. Δες all-jobs-index.tsx για τον λόγο. */}
      <AllJobsIndex />
</main>
  );
}
