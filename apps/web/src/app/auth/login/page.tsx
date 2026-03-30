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
    if (!email || !password) { setErrorMsg('Συμπληρώστε email και κωδικό.'); return; }
    setLoading(true);
    try {
      await login(email, password);
      window.location.href = '/dashboard';
    } catch (err: any) {
      setErrorMsg(err.message || 'Λάθος email ή κωδικός.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-1.5 text-3xl font-extrabold">
            <svg className="h-7 w-7 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-gray-900">Staff</span><span className="text-blue-600">Now</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-1">Σύνδεση</h1>
          <p className="text-sm text-gray-500 text-center mb-6">Καλώς ήρθες πίσω!</p>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{errorMsg}</div>
          )}

          {/* Google Login */}
          <a
            href="https://staffnow-api-production.siteinside53.workers.dev/auth/google?role=worker"
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors mb-6"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Σύνδεση με Google
          </a>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-3 text-gray-400">ή με email</span></div>
          </div>

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
                <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">Ξέχασες τον κωδικό;</Link>
              </div>
              <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Εισάγετε τον κωδικό σας" required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
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
