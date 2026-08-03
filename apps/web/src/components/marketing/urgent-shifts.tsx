'use client';

/**
 * «Έκτακτη βάρδια» — marketing section στην αρχική.
 *
 * Δείχνει τις πραγματικές ανοιχτές βάρδιες από το `GET /public/shifts`.
 * Αν δεν υπάρχει καμία, η ενότητα παραμένει ορατή — αλλιώς κανείς δεν μαθαίνει
 * ότι υπάρχει η δυνατότητα — αλλά με μία κάρτα ρητά σημασμένη ως
 * «ΠΑΡΑΔΕΙΓΜΑ»: γκρι, χωρίς countdown, χωρίς κουμπί δήλωσης. Ποτέ δεν
 * παρουσιάζεται ψεύτικη αγγελία σαν πραγματική.
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
 * Παραδείγματα που εμφανίζονται ΜΟΝΟ όταν δεν υπάρχει καμία πραγματική βάρδια,
 * ώστε ο επισκέπτης να καταλάβει ότι υπάρχει η δυνατότητα. Εμφανίζονται πάντα
 * με τη σήμανση «ΠΑΡΑΔΕΙΓΜΑ» και χωρίς κουμπί δήλωσης διαθεσιμότητας.
 */
const EXAMPLE_SHIFTS: PublicShift[] = [
  {
    id: 'example-1',
    title: 'Σερβιτόρος',
    display_company_name: 'Ουζερί «Το Στέκι»',
    display_city: 'Γλυφάδα',
    salary_min: 70,
    shift_days: 1,
    shift_start_time: '18:00',
    shift_end_time: '02:00',
    shift_positions: 1,
    roles: ['waiter'],
  },
  {
    id: 'example-2',
    title: 'Bartender',
    display_company_name: 'Beach bar',
    display_city: 'Βούλα',
    salary_min: 90,
    shift_days: 2,
    shift_start_time: '20:00',
    shift_end_time: '04:00',
    shift_positions: 2,
    roles: ['bartender'],
  },
  {
    id: 'example-3',
    title: 'Βοηθός κουζίνας',
    display_company_name: 'Ταβέρνα',
    display_city: 'Θεσσαλονίκη',
    salary_min: 60,
    shift_days: 1,
    shift_start_time: '17:00',
    shift_end_time: '01:00',
    shift_positions: 1,
    roles: ['kitchen_assistant'],
  },
];

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

/** Παστέλ πλακίδιο πίσω από το emoji — δίνει χρώμα χωρίς φωτογραφίες. */
const TILE_GRADIENTS = [
  'from-blue-100 to-blue-300',
  'from-indigo-100 to-indigo-300',
  'from-emerald-100 to-emerald-300',
  'from-sky-100 to-sky-300',
] as const;

function tileGradient(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TILE_GRADIENTS[h % TILE_GRADIENTS.length] ?? TILE_GRADIENTS[0];
}

const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="flex-shrink-0 opacity-45" aria-hidden>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="flex-shrink-0 opacity-45" aria-hidden>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);

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
        setShifts(json?.data ?? []);
      } catch {
        // Χωρίς δίκτυο μένουμε στα παραδείγματα.
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
  const live = shifts.filter(
    (s) => !s.shift_start_utc || nowTick === 0 || expiresLabel(s.shift_start_utc, now) !== null,
  );

  // Χωρίς πραγματικές βάρδιες δείχνουμε παραδείγματα — σημασμένα ως τέτοια.
  const isExample = live.length === 0;
  const visible = isExample ? EXAMPLE_SHIFTS : live;

  return (
    <section className="border-t border-gray-200 bg-gray-50 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-[640px]">
          <div className="text-[12.5px] font-extrabold uppercase tracking-[0.13em] text-red-600">
            Νέο · Έκτακτη βάρδια
          </div>
          <h2 className="mt-3.5 text-[clamp(28px,4.2vw,46px)] font-extrabold leading-[1.08] tracking-[-0.03em] text-gray-900">
            Χρειάζεσαι άτομο απόψε;
            <br />
            Όχι σε δύο εβδομάδες.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-gray-500">
            Μία βάρδια, όχι θέση εργασίας. Ανεβάζεις ώρα και αμοιβή — βρίσκεις άτομο μέσα σε λεπτά.
            Χωρίς βιογραφικά, χωρίς δέσμευση.
          </p>
          {isExample && (
            <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-600">
              Δεν υπάρχει ενεργή βάρδια αυτή τη στιγμή — έτσι φαίνονται
            </p>
          )}
        </div>

        <div className="mt-[52px] grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((s) => {
            const countdown =
              !isExample && nowTick > 0 ? expiresLabel(s.shift_start_utc, now) : null;
            const net = netOf(s.salary_min);
            const company = s.display_company_name || s.company_name || 'Επιχείρηση';
            const city = s.display_city || s.city || s.region;
            const when = s.shift_date ? whenLabel(s.shift_date, now) : 'ΣΗΜΕΡΑ';

            return (
              <article
                key={s.id}
                data-testid="urgent-shift-card"
                className={`relative overflow-hidden rounded-[18px] border-[1.5px] border-gray-200 bg-white p-5 transition duration-200 hover:-translate-y-[3px] hover:shadow-card ${
                  isExample ? '' : 'hover:border-red-300'
                }`}
              >
                {/* κόκκινη ράχη — το οπτικό σήμα της βάρδιας */}
                <span
                  className={`absolute inset-y-0 left-0 w-1 ${isExample ? 'bg-gray-300' : 'bg-red-600'}`}
                  aria-hidden
                />

                {countdown && (
                  <span className="absolute right-[18px] top-5 text-[11.5px] font-extrabold text-red-600">
                    λήγει {countdown}
                  </span>
                )}

                {isExample ? (
                  <span className="mb-[13px] inline-flex items-center rounded-full bg-gray-100 px-[11px] py-[5px] text-[11.5px] font-extrabold uppercase tracking-[0.03em] text-gray-500">
                    Παράδειγμα
                  </span>
                ) : (
                  <span className="mb-[13px] inline-flex items-center gap-1.5 rounded-full bg-red-100 px-[11px] py-[5px] text-[11.5px] font-extrabold uppercase tracking-[0.03em] text-red-600">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-600" />
                    {when}
                  </span>
                )}

                <div className="flex items-start gap-3">
                  <div
                    className={`grid h-[42px] w-[42px] flex-shrink-0 place-items-center rounded-xl bg-gradient-to-br text-[19px] ${tileGradient(s.id)}`}
                    aria-hidden
                  >
                    {shiftEmoji(s.roles)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[17px] font-extrabold leading-snug tracking-[-0.02em] text-gray-900">
                      {s.title}
                    </h3>
                    <p className="mt-0.5 text-[13px] text-gray-500">
                      {company}
                      {city ? ` · ${city}` : ''}
                    </p>
                  </div>
                </div>

                <div className="mt-[14px] space-y-[7px] text-[13.5px] font-semibold text-slate-800">
                  {s.shift_start_time && s.shift_end_time && (
                    <div className="flex items-center gap-2">
                      <ClockIcon />
                      {s.shift_start_time} – {s.shift_end_time}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <CalendarIcon />
                    {durationLabel(s)}
                  </div>
                </div>

                {s.salary_min ? (
                  <>
                    <div className="mt-[15px] flex items-baseline gap-1.5 text-[27px] font-black tracking-[-0.03em] text-emerald-700">
                      {s.salary_min}€
                      <span className="text-[12.5px] font-semibold tracking-normal text-gray-500">
                        μικτά για τη βάρδια
                      </span>
                    </div>
                    {net && (
                      <div className="mt-1 text-xs text-gray-500">
                        ≈ <b className="font-bold text-slate-800">{net}€ καθαρά</b> στο χέρι
                        (ενδεικτικά) · δηλώνεται στην ΕΡΓΑΝΗ
                      </div>
                    )}
                  </>
                ) : null}

                {isExample ? (
                  <div className="mt-[15px] w-full rounded-[11px] border border-dashed border-gray-300 py-3 text-center text-sm font-bold text-gray-400">
                    Δείγμα αγγελίας
                  </div>
                ) : (
                  <Link
                    href="/auth/register?role=worker"
                    className="mt-[15px] block w-full rounded-[11px] bg-[#020817] py-3 text-center text-sm font-bold text-white transition-colors hover:bg-red-600"
                  >
                    Δήλωσε διαθεσιμότητα
                  </Link>
                )}
              </article>
            );
          })}
        </div>

        <div className="mt-[26px] flex items-start gap-3 rounded-[14px] border border-emerald-200 bg-emerald-50 px-[19px] py-[17px] text-[13.5px] leading-[1.6] text-slate-800">
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
