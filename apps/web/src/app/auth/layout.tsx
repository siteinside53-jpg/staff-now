import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12">
      <Link
        href="/"
        className="mb-8 text-2xl font-bold text-blue-600 hover:text-blue-700"
      >
        StaffNow
      </Link>
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-8 text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} StaffNow. Με επιφύλαξη κάθε δικαιώματος.
      </p>
    </div>
  );
}
