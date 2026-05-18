'use client';

import { useState } from 'react';
import Link from 'next/link';
import { auth } from '../_lib/api';
import { ChevronLeft } from '../_lib/ui';

export default function ForgotPasswordV6() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!email.trim()) return setErr('Βάλε το email σου.');
    setSubmitting(true);
    try {
      await auth.forgotPassword(email.trim());
      setDone(true);
    } catch (e: any) {
      // Always show success (avoid email enumeration)
      setDone(true);
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
        <Link href="/app2/version6/login" className="-ml-2 p-2 text-white/70" aria-label="Πίσω">
          <ChevronLeft />
        </Link>
        <span className="text-sm font-bold">
          Staff<span className="text-cyan-300">Now</span>
        </span>
        <span className="w-8" />
      </header>

      <div className="flex-1 flex flex-col justify-center px-6 pb-8">
        {done ? (
          <div className="max-w-sm mx-auto w-full text-center">
            <div className="text-6xl mb-4">📨</div>
            <h1 className="text-2xl font-black">Έλεγξε το email σου</h1>
            <p className="mt-3 text-sm text-white/80">
              Αν υπάρχει λογαριασμός με αυτό το email, σου στείλαμε σύνδεσμο επαναφοράς κωδικού.
            </p>
            <Link
              href="/app2/version6/login"
              className="mt-8 inline-block w-full rounded-full bg-white px-6 py-3.5 text-base font-bold text-blue-700 shadow-xl"
            >
              Πίσω στη σύνδεση
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-black tracking-tight">Επαναφορά κωδικού</h1>
              <p className="mt-2 text-sm text-white/70">Θα σου στείλουμε σύνδεσμο επαναφοράς.</p>
            </div>
            <form onSubmit={onSubmit} className="space-y-4 max-w-sm mx-auto w-full">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-white/70">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  autoComplete="email"
                  className="mt-1.5 block w-full rounded-2xl bg-white/10 border border-white/20 px-4 py-3.5 text-base text-white placeholder:text-white/40 outline-none focus:bg-white/15 focus:border-cyan-300"
                />
              </label>
              {err && (
                <div className="rounded-xl bg-rose-500/20 border border-rose-300/40 px-4 py-2.5 text-sm font-semibold text-rose-100">
                  {err}
                </div>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full bg-white px-6 py-3.5 text-base font-bold text-blue-700 shadow-xl disabled:opacity-60"
              >
                {submitting ? 'Αποστολή…' : 'Στείλε σύνδεσμο'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
