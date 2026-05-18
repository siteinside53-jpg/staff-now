'use client';

import { useState } from 'react';
import { AppBar, Body, Btn, Screen, TextField } from '../_lib/ui';
import { auth } from '../_lib/api';

export default function V7Forgot() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await auth.forgotPassword(email.trim());
      setDone(true);
    } catch (e: any) {
      setErr(e?.message || 'Σφάλμα');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen bg="bg-white">
      <AppBar back title="Ξέχασα τον κωδικό" />
      <Body>
        {done ? (
          <div className="text-center mt-10">
            <div className="text-5xl">📨</div>
            <h2 className="mt-3 text-xl font-extrabold text-gray-900">Έλεγξε το email σου</h2>
            <p className="mt-2 text-sm text-gray-500">
              Σου στείλαμε σύνδεσμο για να ορίσεις νέο κωδικό.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3 mt-2">
            <p className="text-sm text-gray-600 mb-3">
              Δώσε το email σου και θα σου στείλουμε οδηγίες επαναφοράς.
            </p>
            <TextField
              type="email"
              label="Email"
              placeholder="example@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {err && (
              <div className="rounded-2xl bg-rose-50 px-3 py-2.5 text-[12px] font-semibold text-rose-700">
                {err}
              </div>
            )}
            <Btn full size="lg" type="submit" loading={loading}>
              Αποστολή
            </Btn>
          </form>
        )}
      </Body>
    </Screen>
  );
}
