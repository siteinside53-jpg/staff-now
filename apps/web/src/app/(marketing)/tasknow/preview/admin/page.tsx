import Link from 'next/link';
import { TaskNowAdminConsole } from '@/components/tasknow/admin-console';

/**
 * ΜΑΚΕΤΑ — το διαχειριστικό του TaskNow, ορατό χωρίς σύνδεση.
 *
 * ΙΔΙΟ component με το πραγματικό διαχειριστικό — καμία αντιγραφή.
 */
export const metadata = {
  title: 'TaskNow — μακέτα διαχειριστικού',
  robots: { index: false, follow: false },
};

export default function TaskNowAdminPreview() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-gray-900 px-4 py-2.5 text-center text-sm text-amber-300">
        <strong className="font-semibold">ΜΑΚΕΤΑ</strong> — έτσι φαίνεται το TaskNow στο
        διαχειριστικό.{' '}
        <Link href="/tasknow" className="underline hover:text-white">
          δημόσια ροή
        </Link>{' '}
        ·{' '}
        <Link href="/tasknow/preview/dashboard" className="underline hover:text-white">
          πίνακας χρήστη
        </Link>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <TaskNowAdminConsole />
      </div>
    </main>
  );
}
