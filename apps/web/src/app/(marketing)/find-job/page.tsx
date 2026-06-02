import Link from 'next/link';
import { PublicJobsList } from '@/components/marketing/public-jobs-list';

export const metadata = {
  title: 'Διαθέσιμες Θέσεις Εργασίας | StaffNow',
  description:
    'Δες τις τελευταίες θέσεις εργασίας σε τουρισμό, εστίαση, retail, logistics και άλλους κλάδους — σε όλη την Ελλάδα.',
  alternates: { canonical: '/find-job' },
};

export default function FindJobPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-b from-white to-gray-50 py-10 sm:py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <nav className="text-xs text-gray-500 mb-4" aria-label="breadcrumb">
            <Link href="/" className="hover:text-gray-700">
              Αρχική
            </Link>{' '}
            <span aria-hidden="true">/</span>{' '}
            <span className="text-gray-700">Διαθέσιμες θέσεις εργασίας</span>
          </nav>

          <header className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-semibold text-emerald-700">
              👀 Δείγμα — Χωρίς εγγραφή
            </span>
            <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900">
              Θέσεις εργασίας κοντά σου
            </h1>
            <p className="mt-4 text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              Δες τις πιο πρόσφατες αγγελίες. Για να κάνεις αίτηση, χρειάζεσαι
              λογαριασμό εργαζομένου{' '}
              <span className="text-gray-900 font-semibold">(30 δευτερόλεπτα, δωρεάν)</span>.
            </p>
          </header>
        </div>
      </section>

      <section className="pb-16 sm:pb-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <PublicJobsList />

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
    </main>
  );
}
