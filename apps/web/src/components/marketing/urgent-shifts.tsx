'use client';

/**
 * «Έκτακτη βάρδια» — marketing section στην αρχική.
 *
 * Δείχνει τις πραγματικές ανοιχτές βάρδιες από το `GET /public/shifts`.
 * Αν δεν υπάρχει καμία, το section ΔΕΝ εμφανίζεται καθόλου — καμία ψεύτικη
 * αγγελία σε πραγματικούς χρήστες.
 *
 * Το countdown («λήγει σε 3ω») ΠΡΕΠΕΙ να υπολογίζεται client-side: το site
 * είναι static export (`output: 'export'`), οπότε ό,τι υπολογιστεί σε render
 * χρόνο θα πάγωνε στη στιγμή του build.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { API_URL } from '@/lib/config';
import { durationLabel, expiresLabel, netOf, whenLabel } from '@/lib/shift-display';

interface PublicShift {
  id: string;
  title: string;
  city?: string | null;
  region?: string | null;
  display_city?: string | null;
  salary_min?: number | null;
  shift_date?: string | null;
  shift_days?: number | null;
  shift_start_time?: string | null;
  shift_end_time?: string | null;
  shift_positions?: number | null;
  shift_start_utc?: string | null;
  company_name?: string | null;
  display_company_name?: string | null;
  roles?: string[];
}

/**
 * Δείγμα μόνο για τοπική ανάπτυξη. Το `process.env.NODE_ENV !== 'production'`
 * γίνεται tree-shake στο production build, οπότε ΠΟΤΕ δεν φτάνει στους
 * πραγματικούς χρήστες.
 */
const DEV_DEMO_SHIFTS: PublicShift[] =
  process.env.NODE_ENV !== 'production'
    ? [
        {
          id: 'demo-1',
          title: 'Σερβιτόρος',
          display_company_name: 'Ουζερί «Το Στέκι»',
          display_city: 'Γλυφάδα',
          salary_min: 70,
          shift_date: null,
          shift_days: 1,
          shift_start_time: '18:00',
          shift_end_time: '02:00',
          shift_positions: 1,
          shift_start_utc: null,
          roles: ['waiter'],
        },
      ]
    : [];

const ROLE_EMOJI: Record<string, string> = {
  waiter: '🍽️',
  bartender: '🍸',
  barista: '☕',
  chef: '👨‍🍳',
  cook: '👨‍🍳',
  kitchen_assistant: '🔪',
  dishwasher: '🧼',
  receptionist: '🛎️',
  housekeeping: '🧹',
  cleaner: '🧹',
  cashier: '🧾',
  sales_assistant: '🛍️',
  warehouse_worker: '📦',
  driver: '🚚',
  security_guard: '🛡️',
  promoter: '📣',
};

function shiftEmoji(roles?: string[]): string {
  const first = roles?.[0];
  return (first && ROLE_EMOJI[first]) || '⚡';
}

export function UrgentShifts() {
  const [shifts, setShifts] = useState<PublicShift[]>([]);
  // Ξεκινάει στο 0 ώστε server και client να κάνουν render το ίδιο πράγμα
  // (μηδέν countdown) — το πραγματικό ρολόι μπαίνει μετά το mount.
  const [nowTick, setNowTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    (async () => {
      try {
        const res = await fetch(`${API_URL}/public/shifts?limit=6`, {
          signal: controller.signal,
        });
        const json = res.ok ? await res.json() : null;
        if (cancelled) return;
        const data: PublicShift[] = json?.data ?? [];
        setShifts(data.length > 0 ? data : DEV_DEMO_SHIFTS);
      } catch {
        if (!cancelled) setShifts(DEV_DEMO_SHIFTS);
      } finally {
        clearTimeout(timeout);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  // Ζωντανό countdown + επαναφιλτράρισμα όσων ξεκίνησαν, κάθε λεπτό.
  useEffect(() => {
    setNowTick(Date.now());
    const t = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const now = nowTick > 0 ? new Date(nowTick) : new Date(0);
  // Κρύβουμε όσες ξεκίνησαν όσο ο χρήστης έχει ανοιχτή τη σελίδα.
  // Τα demo (χωρίς shift_start_utc) περνάνε πάντα.
  const visible = shifts.filter(
    (s) => !s.shift_start_utc || nowTick === 0 || expiresLabel(s.shift_start_utc, now) !== null,
  );

  if (visible.length === 0) return null;

  return (
    <section className="border-t border-gray-200 bg-gradient-to-b from-red-50/60 to-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-sm font-extrabold uppercase tracking-wide text-red-600">
            Νέο · Έκτακτη βάρδια
          </div>
          <h2 className="mt-3 text-3xl font-bold leading-tight text-gray-900 sm:text-4xl">
            Χρειάζεσαι άτομο <em className="font-serif italic text-red-600">απόψε</em>;
            <br />
            Όχι σε δύο εβδομάδες.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-gray-600">
            Μία βάρδια, όχι θέση εργασίας. Ανεβάζεις ώρα και αμοιβή — βρίσκεις άτομο μέσα σε λεπτά.
            Χωρίς βιογραφικά, χωρίς δέσμευση.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((s) => {
            const countdown = nowTick > 0 ? expiresLabel(s.shift_start_utc, now) : null;
            const net = netOf(s.salary_min);
            const company = s.display_company_name || s.company_name || 'Επιχείρηση';
            const city = s.display_city || s.city || s.region;
            const when = s.shift_date ? whenLabel(s.shift_date, now) : 'ΣΗΜΕΡΑ';

            return (
              <article
                key={s.id}
                data-testid="urgent-shift-card"
                className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                {/* κόκκινη ράχη — το οπτικό σήμα της βάρδιας */}
                <span className="absolute inset-y-0 left-0 w-1 bg-red-600" aria-hidden />

                {countdown && (
                  <span className="absolute right-4 top-5 text-[11.5px] font-extrabold text-red-600">
                    λήγει {countdown}
                  </span>
                )}

                <div className="pl-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11.5px] font-extrabold uppercase tracking-wide text-red-600">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600" />
                    {when}
                  </span>

                  <h3 className="mt-3 flex items-center gap-2 text-lg font-bold text-gray-900">
                    <span aria-hidden>{shiftEmoji(s.roles)}</span>
                    {s.title}
                  </h3>
                  <p className="mt-0.5 text-sm text-gray-600">
                    {company}
                    {city ? ` · ${city}` : ''}
                  </p>

                  <div className="mt-4 space-y-1 text-sm text-gray-700">
                    {s.shift_start_time && s.shift_end_time && (
                      <div>
                        🕒 {s.shift_start_time} – {s.shift_end_time}
                      </div>
                    )}
                    <div className="text-gray-500">⏱️ {durationLabel(s)}</div>
                  </div>

                  {s.salary_min ? (
                    <div className="mt-4">
                      <div className="text-[27px] font-black leading-none text-teal-600">
                        {s.salary_min}€
                        <span className="ml-1 text-sm font-semibold text-gray-500">μικτά</span>
                      </div>
                      {net && (
                        <div className="mt-1 text-xs text-gray-500">
                          ≈ {net}€ καθαρά (ενδεικτικά) · δηλώνεται στην ΕΡΓΑΝΗ
                        </div>
                      )}
                    </div>
                  ) : null}

                  <Link
                    href="/auth/register?role=worker"
                    className="mt-5 block w-full rounded-xl bg-gray-900 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-red-600"
                  >
                    Δήλωσε διαθεσιμότητα
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-7 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm leading-relaxed text-gray-700">
          <span className="text-lg leading-none" aria-hidden>
            🛡️
          </span>
          <div>
            <b>Νόμιμα, με τον σωστό τρόπο.</b> Η βάρδια σε επιχείρηση είναι{' '}
            <b>εξαρτημένη εργασία</b> — δηλώνεται στην <b>ΕΡΓΑΝΗ</b> πριν ξεκινήσει, με ψηφιακή
            κάρτα εργασίας. Τα «καθαρά» που βλέπεις είναι <b>ενδεικτική εκτίμηση</b> (μόνο εισφορές
            εργαζομένου, χωρίς παρακράτηση φόρου). Το StaffNow δεν αντικαθιστά τον λογιστή σου.
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/auth/register?role=business"
            className="inline-flex items-center justify-center rounded-xl bg-red-600 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-red-700"
          >
            Ανέβασε έκτακτη βάρδια
          </Link>
        </div>
      </div>
    </section>
  );
}
