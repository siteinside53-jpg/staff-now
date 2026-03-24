'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = searchParams.get('role') || 'worker';
  const { register: registerUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'worker' | 'business'>(defaultRole as 'worker' | 'business');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !password || !confirmPassword) {
      setErrorMsg('Συμπληρώστε όλα τα πεδία.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Ο κωδικός πρέπει να είναι τουλάχιστον 8 χαρακτήρες.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Οι κωδικοί δεν ταιριάζουν.');
      return;
    }
    if (!acceptTerms) {
      setErrorMsg('Πρέπει να αποδεχτείτε τους Όρους Χρήσης.');
      return;
    }

    setLoading(true);
    try {
      await registerUser({ email, password, confirmPassword, role, acceptTerms: true });
      toast.success('Ο λογαριασμός δημιουργήθηκε επιτυχώς!');
      router.push('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Αποτυχία εγγραφής. Δοκιμάστε ξανά.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-3xl font-extrabold">
            <svg className="h-7 w-7 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-gray-900">Staff</span><span className="text-blue-600">Now</span>
          </Link>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-1">Δημιουργία Λογαριασμού</h1>
          <p className="text-sm text-gray-500 text-center mb-4">Ξεκίνα δωρεάν σε λιγότερο από 2 λεπτά</p>

          {/* Google */}
          <button
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors mb-4"
            onClick={() => {}}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Εγγραφή με Google
          </button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-3 text-gray-400">ή με email</span></div>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{errorMsg}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Είμαι...</label>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setRole('worker')}
                  className={`p-3 rounded-lg border-2 text-center text-sm font-medium transition-colors ${role === 'worker' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  Εργαζόμενος
                </button>
                <button type="button" onClick={() => setRole('business')}
                  className={`p-3 rounded-lg border-2 text-center text-sm font-medium transition-colors ${role === 'business' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  Επιχείρηση
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com" required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-1">Κωδικός</label>
              <input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Τουλάχιστον 8 χαρακτήρες" required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              <p className="mt-1 text-xs text-gray-400">Κεφαλαίο, πεζό και αριθμός απαιτούνται</p>
            </div>

            <div>
              <label htmlFor="reg-confirm" className="block text-sm font-medium text-gray-700 mb-1">Επιβεβαίωση Κωδικού</label>
              <input id="reg-confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Επαναλάβετε τον κωδικό" required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
            </div>

            <div className="flex items-start gap-2">
              <input type="checkbox" id="reg-terms" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <label htmlFor="reg-terms" className="text-sm text-gray-600">
                Αποδέχομαι τους{' '}
                <Link href="/terms" className="text-blue-600 hover:underline" target="_blank">Όρους Χρήσης</Link>{' '}
                και την{' '}
                <Link href="/privacy" className="text-blue-600 hover:underline" target="_blank">Πολιτική Απορρήτου</Link>
              </label>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
              {loading ? 'Δημιουργία...' : 'Δημιουργία Λογαριασμού'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Έχεις ήδη λογαριασμό;{' '}
            <Link href="/auth/login" className="text-blue-600 font-medium hover:text-blue-700">Σύνδεση</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><p>Φόρτωση...</p></div>}>
      <RegisterForm />
    </Suspense>
  );
}
