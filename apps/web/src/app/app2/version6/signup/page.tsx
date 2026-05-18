'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, setToken, ApiError, type Role } from '../_lib/api';
import { ChevronLeft } from '../_lib/ui';
import { haptic } from '../_lib/haptics';

type Intent = Exclude<Role, 'admin'>;

export default function SignupV6() {
  const router = useRouter();
  const [role, setRole] = useState<Intent>('worker');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [accept, setAccept] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    try {
      const intent = sessionStorage.getItem('staffnow_intent') as Intent | null;
      if (intent === 'worker' || intent === 'business') setRole(intent);
    } catch {}
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setErr(null);
    if (!email.trim()) return setErr('Βάλε email.');
    if (password.length < 8) return setErr('Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.');
    if (password !== confirm) return setErr('Οι κωδικοί δεν ταιριάζουν.');
    if (!accept) return setErr('Πρέπει να αποδεχτείς τους όρους.');

    setSubmitting(true);
    try {
      const data = await auth.register({
        email: email.trim(),
        password,
        confirmPassword: confirm,
        role,
        acceptTerms: true,
      });
      setToken(data.token);
      haptic('success');
      router.replace('/app2/version6/dashboard');
    } catch (e) {
      const message =
        e instanceof ApiError
          ? e.code === 'EMAIL_EXISTS' || e.status === 409
            ? 'Υπάρχει ήδη λογαριασμός με αυτό το email.'
            : e.message
          : 'Σφάλμα εγγραφής.';
      setErr(message);
      haptic('error');
    } finally {
      setSubmitting(false);
    }
  }

  const isWorker = role === 'worker';
  const accent = isWorker ? 'from-emerald-500 via-teal-600 to-blue-700' : 'from-indigo-600 via-blue-700 to-blue-900';

  return (
    <div
      className={`fixed inset-0 flex flex-col bg-gradient-to-br ${accent} overflow-y-auto text-white`}
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3">
        <Link href="/app2/version6/role" className="-ml-2 p-2 text-white/70" aria-label="Πίσω">
          <ChevronLeft />
        </Link>
        <span className="text-sm font-bold">
          Staff<span className={isWorker ? 'text-emerald-200' : 'text-cyan-300'}>Now</span>
        </span>
        <span className="w-8" />
      </header>

      <div className="flex-1 flex flex-col justify-center px-6 pb-6">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">{isWorker ? '👤' : '🏢'}</div>
          <h1 className="text-3xl font-black tracking-tight">Δημιουργία λογαριασμού</h1>
          <p className="mt-2 text-sm text-white/80">
            {isWorker ? 'Για εργαζόμενους — πάντα δωρεάν.' : 'Για επιχειρήσεις — δοκίμασε δωρεάν.'}
          </p>
        </div>

        <div className="mb-5 max-w-sm mx-auto w-full">
          <div className="grid grid-cols-2 gap-1 rounded-full bg-white/10 p-1">
            <RoleTab active={isWorker} onClick={() => setRole('worker')} label="Εργαζόμενος" />
            <RoleTab active={!isWorker} onClick={() => setRole('business')} label="Επιχείρηση" />
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-3.5 max-w-sm mx-auto w-full">
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="example@email.com"
            autoComplete="email"
          />
          <Field
            label="Κωδικός"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={setPassword}
            placeholder="Τουλάχιστον 8 χαρακτήρες"
            autoComplete="new-password"
          />
          <Field
            label="Επιβεβαίωση κωδικού"
            type={showPassword ? 'text' : 'password'}
            value={confirm}
            onChange={setConfirm}
            placeholder="Ξανά τον ίδιο κωδικό"
            autoComplete="new-password"
          />

          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="text-xs text-white/70 underline-offset-2 hover:underline"
          >
            {showPassword ? 'Απόκρυψη κωδικών' : 'Εμφάνιση κωδικών'}
          </button>

          <label className="flex items-start gap-2 text-xs text-white/85 select-none">
            <input
              type="checkbox"
              checked={accept}
              onChange={(e) => setAccept(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-white/40 bg-white/10"
            />
            <span>
              Αποδέχομαι τους{' '}
              <Link href="/terms" className="underline">
                Όρους
              </Link>{' '}
              και την{' '}
              <Link href="/privacy" className="underline">
                Πολιτική Απορρήτου
              </Link>
              .
            </span>
          </label>

          {err && (
            <div className="rounded-xl bg-rose-500/20 border border-rose-300/40 px-4 py-2.5 text-sm font-semibold text-rose-100">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-white px-6 py-3.5 text-base font-bold text-gray-900 shadow-xl active:scale-[0.99] transition-transform disabled:opacity-60"
          >
            {submitting ? 'Δημιουργία…' : 'Εγγραφή'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-white/80 max-w-sm mx-auto w-full">
          Έχεις ήδη λογαριασμό;{' '}
          <Link href="/app2/version6/login" className="font-bold text-white underline">
            Σύνδεση
          </Link>
        </div>
      </div>
    </div>
  );
}

function RoleTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
        active ? 'bg-white text-gray-900 shadow' : 'text-white/80'
      }`}
    >
      {label}
    </button>
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
      <span className="text-xs font-semibold uppercase tracking-wider text-white/80">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="mt-1.5 block w-full rounded-2xl bg-white/10 border border-white/20 px-4 py-3.5 text-base text-white placeholder:text-white/40 outline-none focus:bg-white/15 focus:border-white"
      />
    </label>
  );
}
