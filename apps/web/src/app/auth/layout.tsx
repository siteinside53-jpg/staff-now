export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
      <p className="py-6 text-center text-sm text-gray-400">
        &copy; {new Date().getFullYear()} StaffNow. Με επιφύλαξη κάθε δικαιώματος.
      </p>
    </div>
  );
}
