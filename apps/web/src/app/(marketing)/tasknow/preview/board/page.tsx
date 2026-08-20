import Link from 'next/link';
import { AllListings } from '@/components/dashboard/all-listings';

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
        <strong className="font-semibold">ΜΑΚΕΤΑ</strong> — έτσι φαίνονται όλες οι
        αγγελίες μαζί μέσα στον λογαριασμό.{' '}
        <Link href="/tasknow" className="underline hover:text-white">
          δημόσια ροή
        </Link>{' '}
        ·{' '}
        <Link href="/tasknow/preview/dashboard" className="underline hover:text-white">
          πίνακας χρήστη
        </Link>
      </div>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <AllListings />
      </div>
    </main>
  );
}
