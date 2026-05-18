'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, setToken, API_BASE } from '../_lib/api';
import { FullPageSpinner } from '../_lib/ui';

type Mode = 'signin' | 'signup';
type Role = 'worker' | 'business';

export default function AuthPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <AuthInner />
    </Suspense>
  );
}

function AuthInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initialMode = (params?.get('mode') as Mode) || 'signin';
  const initialRole = (params?.get('role') as Role) || 'worker';

  const [mode, setMode] = useState<Mode>(initialMode);
  const [role, setRole] = useState<Role>(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [accept, setAccept] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const setReturnTo = () => {
    try {
      sessionStorage.setItem('staffnow_return_to', '/app2/version7');
    } catch {}
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (mode === 'signup' && !accept) {
      setErr('Πρέπει να αποδεχθείς τους Όρους Χρήσης.');
      return;
    }
    if (mode === 'signup' && password.length < 8) {
      setErr('Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.');
      return;
    }
    setLoading(true);
    try {
      const res =
        mode === 'signin'
          ? await auth.login(email.trim(), password)
          : await auth.register({
              email: email.trim(),
              password,
              confirmPassword: password,
              role,
              acceptTerms: true,
            });
      setToken(res.token);
      const r = res.user.role;
      router.replace(
        r === 'admin'
          ? '/admin/overview'
          : r === 'business'
            ? '/app2/version7/business/home'
            : '/app2/version7/worker/home',
      );
    } catch (e: any) {
      setErr(e?.message || (mode === 'signin' ? 'Λάθος email ή κωδικός' : 'Σφάλμα εγγραφής'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-white">
      {/* Hero header — gradient blue with logo + tagline */}
      <div
        className="relative flex-shrink-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 text-white"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Πίσω"
          className="absolute left-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 active:bg-white/25"
          style={{ marginTop: 'env(safe-area-inset-top)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="px-6 pt-5 pb-7 text-center">
          <div className="inline-flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-blue-600 shadow-md">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <span className="text-xl font-black tracking-tight">
              Staff<span className="text-cyan-300">Now</span>
            </span>
          </div>
          <h1 className="mt-5 text-2xl font-black tracking-tight">Ξεκίνα με το StaffNow</h1>
          <p className="mt-1 text-[13px] text-white/85">
            Βρες δουλειά ή προσωπικό εύκολα και γρήγορα.
          </p>
        </div>
      </div>

      {/* White card */}
      <main className="flex-1 overflow-y-auto -mt-4">
        <div className="rounded-t-3xl bg-white px-5 pt-5 pb-8 shadow-[0_-8px_24px_rgba(0,0,0,0.04)]">
          {/* Mode toggle (Εγγραφή / Σύνδεση) */}
          <div className="mb-5 flex rounded-2xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 rounded-xl py-2.5 text-[13px] font-extrabold transition-colors ${
                mode === 'signup' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500'
              }`}
            >
              Εγγραφή
            </button>
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`flex-1 rounded-xl py-2.5 text-[13px] font-extrabold transition-colors ${
                mode === 'signin' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500'
              }`}
            >
              Σύνδεση
            </button>
          </div>

          {/* Role picker — only on signup */}
          {mode === 'signup' && (
            <div className="mb-4 flex gap-2">
              <RolePill icon="👤" label="Εργαζόμενος" active={role === 'worker'} onClick={() => setRole('worker')} />
              <RolePill icon="🏢" label="Επιχείρηση" active={role === 'business'} onClick={() => setRole('business')} />
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-3">
            <Field label="Email *" icon={<MailIcon />}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                autoComplete="email"
                required
                className="w-full bg-transparent pl-10 pr-3 py-3.5 text-sm outline-none placeholder:text-gray-400"
              />
            </Field>

            <Field
              label="Κωδικός *"
              icon={<LockIcon />}
              right={
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? 'Απόκρυψη κωδικού' : 'Εμφάνιση κωδικού'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPwd ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              }
            >
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
                className="w-full bg-transparent pl-10 pr-11 py-3.5 text-sm outline-none placeholder:text-gray-400"
              />
            </Field>

            {mode === 'signin' && (
              <div className="text-right">
                <Link href="/app2/version7/forgot-password" className="text-[12px] font-semibold text-blue-600">
                  Ξέχασες τον κωδικό σου;
                </Link>
              </div>
            )}

            {err && (
              <div className="rounded-2xl bg-rose-50 px-3 py-2.5 text-[12px] font-semibold text-rose-700">
                {err}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 py-4 text-sm font-extrabold text-white shadow-xl shadow-blue-600/30 active:scale-[0.99] transition-transform disabled:opacity-50"
            >
              {loading ? '...' : 'Συνέχεια'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-[11px]">
              <span className="bg-white px-3 font-semibold text-gray-400">ή συνέχεια με</span>
            </div>
          </div>

          {/* OAuth row — Google + Apple */}
          <div className="grid grid-cols-2 gap-3">
            <a
              href={`${API_BASE}/auth/google?role=${role}`}
              onClick={setReturnTo}
              className="flex items-center justify-center gap-2 rounded-2xl border-2 border-gray-200 bg-white py-3 text-sm font-bold text-gray-800 active:scale-[0.98] transition-transform"
            >
              <GoogleIcon />
              Google
            </a>
            <a
              href={`${API_BASE}/auth/apple?role=${role}`}
              onClick={setReturnTo}
              className="flex items-center justify-center gap-2 rounded-2xl bg-black py-3 text-sm font-bold text-white active:scale-[0.98] transition-transform"
            >
              <AppleIcon />
              Apple
            </a>
          </div>

          {/* Terms (signup only) */}
          {mode === 'signup' && (
            <label className="mt-5 flex items-start gap-2.5 text-[12px] text-gray-600 leading-snug">
              <input
                type="checkbox"
                checked={accept}
                onChange={(e) => setAccept(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>
                Συμφωνώ με τους{' '}
                <Link href="/terms" className="font-bold text-blue-600 underline">Όρους Χρήσης</Link>{' '}
                και την{' '}
                <Link href="/privacy" className="font-bold text-blue-600 underline">Πολιτική Απορρήτου</Link>.
              </span>
            </label>
          )}
        </div>
      </main>
    </div>
  );
}

// ───────── Helpers ─────────

function Field({
  label,
  icon,
  right,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-bold text-gray-700">{label}</span>
      <span className="relative block rounded-2xl border-2 border-gray-200 bg-white focus-within:border-blue-500 transition-colors">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>
        )}
        {children}
        {right}
      </span>
    </label>
  );
}

function RolePill({
  icon, label, active, onClick,
}: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 rounded-2xl border-2 py-2.5 text-[12px] font-extrabold transition-all ${
        active
          ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-100'
          : 'border-gray-200 bg-white text-gray-600'
      }`}
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 text-gray-400">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 text-gray-400">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v3m-7 7h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2Zm10-10V7a5 5 0 1 0-10 0v4" />
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8S2 12 2 12Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10 10 0 0 1 12 4c5 0 9 4.5 10 8-.3 1-1 2.4-2.1 3.7M6.3 6.3C3.7 8 2.3 11 2 12c1 3.5 5 8 10 8 1.6 0 3-.4 4.3-1" />
    </svg>
  );
}
function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
function AppleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}
