'use client';

/**
 * «Πες μας τη γνώμη σου» — αξιολόγηση της ίδιας της πλατφόρμας.
 *
 * Μικρό κουμπί κάτω αριστερά, σε κάθε σελίδα. Αστέρια + δυο λόγια. Πάει στο
 * διαχειριστικό (Εισερχόμενα › Αξιολογήσεις πλατφόρμας) και με email στην
 * ομάδα. Δέχεται και ανώνυμους.
 */

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { API_URL } from '@/lib/config';

export function FeedbackWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  // Όχι μέσα στο διαχειριστικό — εκεί το βλέπει η ομάδα, όχι το γράφει.
  if (!pathname || pathname.startsWith('/admin')) return null;

  const submit = async () => {
    if (!rating && message.trim().length < 3) {
      toast.error('Διάλεξε αστέρια ή γράψε δυο λόγια.');
      return;
    }
    setSending(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('staffnow_token') : null;
      const res = await fetch(`${API_URL}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ rating: rating || null, message: message.trim(), page: pathname }),
      });
      const j = (await res.json().catch(() => ({}))) as { success?: boolean; error?: { message?: string } };
      if (!res.ok || !j.success) throw new Error(j.error?.message || 'Δεν στάλθηκε');
      setDone(true);
      setTimeout(() => {
        setOpen(false);
        setDone(false);
        setRating(0);
        setMessage('');
      }, 1800);
    } catch (err: any) {
      toast.error(err?.message || 'Δεν στάλθηκε. Δοκίμασε ξανά.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 left-4 z-40 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/95 px-3 py-2 text-xs font-semibold text-gray-700 shadow-lg backdrop-blur transition hover:bg-gray-50 lg:bottom-5"
        aria-label="Πες μας τη γνώμη σου για το StaffNow"
      >
        💬 <span className="hidden sm:inline">Η γνώμη σου</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
          >
            {done ? (
              <div className="py-6 text-center">
                <p className="text-3xl">🙏</p>
                <p className="mt-2 font-bold text-gray-900">Ευχαριστούμε!</p>
                <p className="text-sm text-gray-500">Το διαβάζουμε όλο.</p>
              </div>
            ) : (
              <>
                <h2 id="feedback-title" className="text-lg font-bold text-gray-900">Πείτε μας την εμπειρία σας</h2>
                <p className="mt-1 text-sm text-gray-500">Πώς σου φαίνεται το StaffNow; Τι να φτιάξουμε;</p>
                <div className="mt-4 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      onMouseEnter={() => setHover(n)}
                      className={`text-3xl transition ${(hover || rating) >= n ? 'text-yellow-400' : 'text-gray-300'}`}
                      aria-label={`${n} από 5`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
                  rows={4}
                  placeholder="Δυο λόγια (προαιρετικό)…"
                  className="mt-3 w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                />
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
                    Άκυρο
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={sending}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {sending ? 'Αποστολή…' : 'Αποστολή'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
