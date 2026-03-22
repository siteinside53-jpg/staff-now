import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-brand-600 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-8">Η σελίδα δεν βρέθηκε.</p>
        <Link
          href="/"
          className="inline-flex items-center px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
        >
          Πίσω στην αρχική
        </Link>
      </div>
    </div>
  );
}