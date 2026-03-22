'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !password) {
      setErrorMsg('Συμπληρώστε email και κωδικό.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Λάθος email ή κωδικός.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link href="/" className="text-2xl font-bold text-blue-600">StaffNow</Link>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-1">Σύνδεση</h1>
          <p className="text-sm text-gray-500 text-center mb-6">Καλώς ήρθες πίσω!</p>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{errorMsg}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com" required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="login-password" className="block text-sm font-medium text-gray-700">Κωδικός</label>
                <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">
                  Ξέχασες τον κωδικό;
                </Link>
              </div>
              <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Εισάγετε τον κωδικό σας" required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
              {loading ? 'Σύνδεση...' : 'Σύνδεση'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Δεν έχεις λογαριασμό;{' '}
            <Link href="/auth/register" className="text-blue-600 font-medium hover:text-blue-700">Εγγραφή</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
