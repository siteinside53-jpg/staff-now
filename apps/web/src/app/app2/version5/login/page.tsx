'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';

export default function LoginV4() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json() as any;
      if (data.success && data.data?.token) {
        localStorage.setItem('staffnow_token', data.data.token);
        const role = data.data.user?.role;
        if (role === 'admin') window.location.href = '/admin';
        else router.replace('/app2/version5/dashboard');
      } else {
        setErr(data?.error?.message || 'Λάθος email ή κωδικός');
      }
    } catch {
      setErr('Σφάλμα σύνδεσης');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 flex flex-col">
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-4">
        <Link href="/app2/version5" className="p-1.5 -ml-1.5 text-white">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <span className="flex-1 text-center text-sm font-extrabold text-white">
          Staff<span className="text-blue-200">Now</span>
        </span>
        <div className="w-10" />
      </div>

      <div className="flex-1 flex flex-col justify-end">
        <div className="text-center text-white px-6 pb-6">
          <div className="text-5xl mb-2">👋</div>
          <h1 className="text-3xl font-black">Καλώς ήρθες πίσω</h1>
          <p className="mt-1 text-sm text-white/80">Σύνδεση στον λογαριασμό σου</p>
        </div>

        <div className="bg-white rounded-t-3xl px-6 pt-6 pb-10 shadow-2xl">
          {/* Google OAuth */}
          <a
            href={`${API_BASE}/auth/google?role=worker`}
            onClick={() => { try { sessionStorage.setItem('staffnow_return_to', '/app2/version5/dashboard'); } catch {} }}
            className="mb-4 flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-gray-200 bg-white py-3.5 text-sm font-bold text-gray-700 shadow-sm active:scale-[0.98] transition-transform"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Συνέχεια με Google
          </a>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center text-[11px]"><span className="bg-white px-3 text-gray-400 font-medium">ή με email</span></div>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoComplete="email"
              className="w-full rounded-xl border border-gray-300 px-4 py-3.5 text-sm outline-none focus:border-blue-500"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Κωδικός"
              autoComplete="current-password"
              className="w-full rounded-xl border border-gray-300 px-4 py-3.5 text-sm outline-none focus:border-blue-500"
            />

            <Link href="/auth/forgot-password" className="block text-right text-xs text-blue-600 font-semibold">
              Ξέχασα τον κωδικό
            </Link>

            {err && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{err}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 py-4 text-sm font-bold text-white shadow-xl disabled:opacity-50"
            >
              {loading ? '...' : 'Σύνδεση'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-gray-500">
            Πρώτη φορά;{' '}
            <Link href="/app2/version5/signup" className="font-bold text-blue-600">Κάνε εγγραφή δωρεάν</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
