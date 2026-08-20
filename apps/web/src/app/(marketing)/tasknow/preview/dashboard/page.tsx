import Link from 'next/link';
import { TaskNowDashboardHub } from '@/components/tasknow/dashboard-hub';

/**
 * ΜΑΚΕΤΑ — η οθόνη του χρήστη, ορατή χωρίς σύνδεση.
 *
 * Υπάρχει για να μπορεί να ελεγχθεί και να παρουσιαστεί η οθόνη χωρίς να
 * χρειάζεται λογαριασμός. ΙΔΙΟ component με τον πραγματικό πίνακα ελέγχου —
 * καμία αντιγραφή, άρα ό,τι διορθώνεται εδώ διορθώνεται και εκεί.
 */
export const metadata = {
  title: 'TaskNow — μακέτα πίνακα χρήστη',
  robots: { index: false, follow: false },
};

export default function TaskNowDashboardPreview() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-gray-900 px-4 py-2.5 text-center text-sm text-amber-300">
        <strong className="font-semibold">ΜΑΚΕΤΑ</strong> — έτσι φαίνεται το TaskNow μέσα
        στον λογαριασμό.{' '}
        <Link href="/tasknow" className="underline hover:text-white">
          δημόσια ροή
        </Link>{' '}
        ·{' '}
        <Link href="/tasknow/preview/admin" className="underline hover:text-white">
          διαχειριστικό
        </Link>
      </div>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <TaskNowDashboardHub />
      </div>
    </main>
  );
}
