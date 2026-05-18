'use client';

import { useState } from 'react';
import { toast } from 'sonner';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://staffnow-api-production.siteinside53.workers.dev';

export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      toast.error('Βάλε ένα έγκυρο email');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmed.split('@')[0],
          email: trimmed,
          subject: 'Newsletter signup',
          message: `Newsletter subscription request from ${trimmed}`,
        }),
      });
      if (!res.ok) throw new Error('request failed');
      setDone(true);
      setEmail('');
      toast.success('Εγγράφηκες! Θα σε ενημερώσουμε σύντομα.');
    } catch {
      toast.error('Κάτι πήγε στραβά. Δοκίμασε ξανά.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <p className="mt-8 text-sm font-semibold text-emerald-700">
        ✓ Η εγγραφή σου καταχωρήθηκε. Καλωσόρισες!
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex gap-3 max-w-md mx-auto">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Το email σου"
        required
        className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
      />
      <button
        type="submit"
        disabled={submitting}
        className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap disabled:opacity-60"
      >
        {submitting ? 'Αποστολή...' : 'Εγγραφή'}
      </button>
    </form>
  );
}
