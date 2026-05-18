'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';

export default function LoginV3() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<'worker' | 'business'>('worker');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!email || !password) { setErr('Συμπλήρωσε όλα τα πεδία'); return; }
    if (mode === 'register' && password !== confirm) { setErr('Οι κωδικοί δεν ταιριάζουν'); return; }
    if (mode === 'register' && password.length < 8) { setErr('Ο κωδικός θέλει τουλάχιστον 8 χαρακτήρες'); return; }

    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const body = mode === 'login'
        ? { email, password }
        : { email, password, confirmPassword: password, role, acceptTerms: true };
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json() as any;
      if (data.success && data.data?.token) {
        localStorage.setItem('staffnow_token', data.data.token);
        const userRole = data.data.user?.role;
        if (userRole === 'admin') {
          window.location.href = '/admin';
        } else {
          router.replace('/app2/version3/swipe');
        }
      } else {
        setErr(data?.error?.message || 'Κάτι πήγε στραβά');
      }
    } catch {
      setErr('Σφάλμα σύνδεσης');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center text-white px-6 pt-12 pb-8">
        <div className="text-6xl mb-4">💼</div>
        <h1 className="text-4xl font-extrabold tracking-tight">
          Staff<span className="text-blue-200">Now</span>
        </h1>
        <p className="mt-3 text-center text-white/90 text-sm">
          Swipe, match & ξεκίνα. Γρήγορα.
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-t-3xl px-6 pt-6 pb-10 shadow-2xl">
        {/* Mode Toggle */}
        <div className="flex rounded-full bg-gray-100 p-1 mb-6">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-full transition-all ${
              mode === 'login' ? 'bg-white text-gray-900 shadow' : 'text-gray-500'
            }`}
          >
            Σύνδεση
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-full transition-all ${
              mode === 'register' ? 'bg-white text-gray-900 shadow' : 'text-gray-500'
            }`}
          >
            Εγγραφή
          </button>
        </div>

        {/* Role Selector (only for register) */}
        {mode === 'register' && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              type="button"
              onClick={() => setRole('worker')}
              className={`rounded-xl p-3 border-2 transition-all ${role === 'worker' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}
            >
              <div className="text-2xl">👤</div>
              <p className="mt-1 text-xs font-bold">Ψάχνω Δουλειά</p>
            </button>
            <button
              type="button"
              onClick={() => setRole('business')}
              className={`rounded-xl p-3 border-2 transition-all ${role === 'business' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}
            >
              <div className="text-2xl">🏢</div>
              <p className="mt-1 text-xs font-bold">Επιχείρηση</p>
            </button>
          </div>
        )}

        <form onSubmit={submit} className="space-y-3">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoComplete="email"
              className="w-full rounded-xl border border-gray-300 px-4 py-3.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Κωδικός"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full rounded-xl border border-gray-300 px-4 py-3.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          {mode === 'register' && (
            <div>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Επιβεβαίωση κωδικού"
                autoComplete="new-password"
                className="w-full rounded-xl border border-gray-300 px-4 py-3.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          )}

          {err && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg disabled:opacity-50"
          >
            {loading ? '...' : mode === 'login' ? 'Σύνδεση' : 'Εγγραφή Δωρεάν'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-gray-500">
          {mode === 'login' ? 'Πρώτη φορά; ' : 'Έχεις ήδη λογαριασμό; '}
          <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="font-bold text-blue-600">
            {mode === 'login' ? 'Κάνε εγγραφή' : 'Σύνδεση'}
          </button>
        </p>

        <p className="mt-6 text-center text-[10px] text-gray-400">
          Κάνοντας εγγραφή αποδέχεσαι τους{' '}
          <a href="/terms" className="underline">Όρους Χρήσης</a>
        </p>
      </div>
    </div>
  );
}
