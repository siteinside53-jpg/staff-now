import Link from 'next/link';
import { AllListings } from '@/components/dashboard/all-listings';
import { Tr } from '@/i18n/locale-provider';

/**
 * ΜΑΚΕΤΑ — το ταμπλό «Όλες οι αγγελίες», ορατό χωρίς σύνδεση.
 *
 * ΙΔΙΟ component με τον πίνακα ελέγχου (`/dashboard/board`) — καμία αντιγραφή,
 * ώστε ό,τι διορθώνεται εδώ να διορθώνεται και εκεί.
 */
export const metadata = {
  title: 'Όλες οι αγγελίες — μακέτα',
  robots: { index: false, follow: false },
};

export default function BoardPreview() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-gray-900 px-4 py-2.5 text-center text-sm text-amber-300">
        <strong className="font-semibold"><Tr k="tasknow.preview.boardMock" /></strong>
        <Tr k="tasknow.preview.boardText" />
        <Link href="/tasknow" className="underline hover:text-white">
          <Tr k="tasknow.preview.publicFeed" />
        </Link>{' '}
        ·{' '}
        <Link href="/tasknow/preview/dashboard" className="underline hover:text-white">
          <Tr k="tasknow.preview.userPanel" />
        </Link>
      </div>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <AllListings />
      </div>
    </main>
  );
}
