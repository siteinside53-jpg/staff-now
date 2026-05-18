'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';

function SignupInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initRole = (params.get('role') as 'worker' | 'business') || 'worker';
  const [role, setRole] = useState<'worker' | 'business'>(initRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('staffnow_intent') as 'worker' | 'business' | null;
      if (saved) setRole(saved);
    } catch {}
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!email || !password) { setErr('Συμπλήρωσε όλα τα πεδία'); return; }
    if (password.length < 8) { setErr('Ο κωδικός θέλει τουλάχιστον 8 χαρακτήρες'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, confirmPassword: password, role, acceptTerms: true }),
      });
      const data = await res.json() as any;
      if (data.success && data.data?.token) {
        localStorage.setItem('staffnow_token', data.data.token);
        router.replace('/app2/version4/dashboard');
      } else {
        setErr(data?.error?.message || 'Κάτι πήγε στραβά');
      }
    } catch {
      setErr('Σφάλμα σύνδεσης');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-teal-600 to-blue-700 flex flex-col">
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-4">
        <button onClick={() => router.back()} className="p-1.5 -ml-1.5 text-white">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="flex-1 text-center text-sm font-extrabold text-white">
          Staff<span className="text-emerald-200">Now</span>
        </span>
        <div className="w-10" />
      </div>

      <div className="flex-1 flex flex-col justify-end">
        <div className="text-center text-white px-6 pb-6">
          <div className="text-5xl mb-2">🎯</div>
          <h1 className="text-3xl font-black">Είσαι ένα βήμα μακριά</h1>
          <p className="mt-1 text-sm text-white/80">30 δευτερόλεπτα για να ξεκινήσεις</p>
        </div>

        <div className="bg-white rounded-t-3xl px-6 pt-6 pb-10 shadow-2xl">
          {/* Role toggle */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            <button
              type="button"
              onClick={() => setRole('worker')}
              className={`rounded-2xl p-3.5 text-left border-2 transition-all ${role === 'worker' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'}`}
            >
              <div className="text-2xl">👤</div>
              <p className="mt-1 text-sm font-black text-gray-900">Εργαζόμενος</p>
              <p className="text-[11px] text-gray-500">Ψάχνω δουλειά</p>
            </button>
            <button
              type="button"
              onClick={() => setRole('business')}
              className={`rounded-2xl p-3.5 text-left border-2 transition-all ${role === 'business' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
            >
              <div className="text-2xl">🏢</div>
              <p className="mt-1 text-sm font-black text-gray-900">Επιχείρηση</p>
              <p className="text-[11px] text-gray-500">Ψάχνω προσωπικό</p>
            </button>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoComplete="email"
              className="w-full rounded-xl border border-gray-300 px-4 py-3.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Κωδικός (8+ χαρακτήρες)"
              autoComplete="new-password"
              className="w-full rounded-xl border border-gray-300 px-4 py-3.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />

            {err && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{err}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-2xl bg-gradient-to-r ${role === 'worker' ? 'from-emerald-500 to-teal-600' : 'from-blue-500 to-indigo-600'} py-4 text-sm font-bold text-white shadow-xl disabled:opacity-50`}
            >
              {loading ? '...' : '🚀 Ξεκίνα Δωρεάν'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-gray-500">
            Έχεις ήδη λογαριασμό;{' '}
            <Link href="/app2/version4/login" className="font-bold text-blue-600">Σύνδεση</Link>
          </p>

          <p className="mt-4 text-center text-[10px] text-gray-400">
            Εγγραφή = αποδοχή <a href="/terms" className="underline">Όρων</a> & <a href="/privacy" className="underline">Απορρήτου</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Signup() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-gradient-to-br from-emerald-500 to-blue-700" />}>
      <SignupInner />
    </Suspense>
  );
}
