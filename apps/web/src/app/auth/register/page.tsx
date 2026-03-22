'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

export default function RegisterPage() {
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
          <Link href="/" className="text-2xl font-bold text-blue-600">StaffNow</Link>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-1">Δημιουργία Λογαριασμού</h1>
          <p className="text-sm text-gray-500 text-center mb-6">Ξεκίνα δωρεάν σε λιγότερο από 2 λεπτά</p>

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
