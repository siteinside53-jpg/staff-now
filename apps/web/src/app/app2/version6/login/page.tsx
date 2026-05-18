'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, setToken, ApiError } from '../_lib/api';
import { ChevronLeft } from '../_lib/ui';
import { haptic } from '../_lib/haptics';

export default function LoginV6() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setErr(null);
    if (!email.trim() || !password) {
      setErr('Συμπλήρωσε email και κωδικό.');
      return;
    }
    setSubmitting(true);
    try {
      const data = await auth.login(email.trim(), password);
      setToken(data.token);
      haptic('success');
      router.replace('/app2/version6/dashboard');
    } catch (e) {
      const message =
        e instanceof ApiError
          ? e.status === 401
            ? 'Λάθος email ή κωδικός.'
            : e.message
          : 'Σφάλμα σύνδεσης.';
      setErr(message);
      haptic('error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 flex flex-col bg-gradient-to-br from-blue-700 via-indigo-700 to-blue-900 overflow-y-auto text-white"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3">
        <Link href="/app2/version6" className="-ml-2 p-2 text-white/70" aria-label="Πίσω">
          <ChevronLeft />
        </Link>
        <span className="text-sm font-bold">
          Staff<span className="text-cyan-300">Now</span>
        </span>
        <span className="w-8" />
      </header>

      <div className="flex-1 flex flex-col justify-center px-6 pb-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tight">Καλώς όρισες πίσω</h1>
          <p className="mt-2 text-sm text-white/70">Συνδέσου για να συνεχίσεις</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 max-w-sm mx-auto w-full">
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="example@email.com"
            autoComplete="email"
          />

          <div>
            <Field
              label="Κωδικός"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="mt-1 text-xs text-white/60 underline-offset-2 hover:underline"
            >
              {showPassword ? 'Απόκρυψη κωδικού' : 'Εμφάνιση κωδικού'}
            </button>
          </div>

          {err && (
            <div className="rounded-xl bg-rose-500/20 border border-rose-300/40 px-4 py-2.5 text-sm font-semibold text-rose-100">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-white px-6 py-3.5 text-base font-bold text-blue-700 shadow-xl active:scale-[0.99] transition-transform disabled:opacity-60"
          >
            {submitting ? 'Συνδέεται…' : 'Σύνδεση'}
          </button>

          <div className="text-center pt-2">
            <Link
              href="/app2/version6/forgot-password"
              className="text-sm font-semibold text-white/80 hover:text-white"
            >
              Ξέχασες τον κωδικό;
            </Link>
          </div>
        </form>

        <div className="mt-10 text-center text-sm text-white/70 max-w-sm mx-auto w-full">
          Δεν έχεις λογαριασμό;{' '}
          <Link href="/app2/version6/role" className="font-bold text-cyan-300 underline">
            Εγγραφή
          </Link>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-white/70">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="mt-1.5 block w-full rounded-2xl bg-white/10 border border-white/20 px-4 py-3.5 text-base text-white placeholder:text-white/40 outline-none focus:bg-white/15 focus:border-cyan-300"
      />
    </label>
  );
}
