'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';

/** Πόσες κάρτες μπορεί να δει ο επισκέπτης πριν το κλείδωμα εγγραφής. */
const FREE_SWIPES = 3;

interface Job {
  id: string;
  title: string;
  city: string | null;
  region: string | null;
  employment_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_type: string | null;
  housing_provided?: number;
  meals_provided?: number;
  created_at: string;
  display_company_name?: string | null;
  company_logo?: string | null;
  company_cover_photo?: string | null;
  roles?: string[];
}

/** Η κύρια εικόνα της κάρτας: cover φωτογραφία → λογότυπο → καμία. */
function heroImage(j: Job): string | null {
  return j.company_cover_photo || j.company_logo || null;
}

/** Αγγελίες με εικόνα πρώτες, μετά οι υπόλοιπες (σταθερή σειρά ανά ημερομηνία). */
function withImagesFirst(list: Job[]): Job[] {
  return [...list].sort((a, b) => (heroImage(b) ? 1 : 0) - (heroImage(a) ? 1 : 0));
}

/**
 * Demo δεδομένα ΜΟΝΟ για local development ώστε να φαίνεται το UX.
 * Το `process.env.NODE_ENV !== 'production'` γίνεται tree-shake στο production build,
 * οπότε ΠΟΤΕ δεν φτάνει στους πραγματικούς χρήστες — εκεί δείχνει μόνο πραγματικά.
 */
const DEV_DEMO: Job[] =
  process.env.NODE_ENV !== 'production'
    ? [
        { id: 'demo-1', title: 'Σερβιτόρος/α', city: 'Μύκονος', region: 'Κυκλάδες', employment_type: 'seasonal', salary_min: 1200, salary_max: 1500, salary_type: 'monthly', housing_provided: 1, meals_provided: 1, created_at: new Date(Date.now() - 2 * 3600e3).toISOString(), display_company_name: 'Sunset Beach Bar', company_cover_photo: 'https://images.unsplash.com/photo-1544148103-0773bf10d330?w=600&h=400&fit=crop', roles: ['waiter'] },
        { id: 'demo-2', title: 'Πωλητής/τρια', city: 'Αθήνα', region: 'Αττική', employment_type: 'full_time', salary_min: 900, salary_max: 1200, salary_type: 'monthly', created_at: new Date(Date.now() - 5 * 3600e3).toISOString(), display_company_name: 'Fashion Store', company_cover_photo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=400&fit=crop', roles: ['retail_seller'] },
        { id: 'demo-3', title: 'Αποθηκάριος', city: 'Θεσσαλονίκη', region: 'Θεσσαλονίκη', employment_type: 'full_time', salary_min: 1100, salary_max: 1400, salary_type: 'monthly', created_at: new Date(Date.now() - 26 * 3600e3).toISOString(), display_company_name: 'Express Logistics', roles: ['warehouse'] },
        { id: 'demo-4', title: 'Barista', city: 'Πάτρα', region: 'Αχαΐα', employment_type: 'part_time', salary_min: 6, salary_max: 7, salary_type: 'hourly', created_at: new Date(Date.now() - 3 * 24 * 3600e3).toISOString(), display_company_name: 'Coffee Lab', company_cover_photo: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=400&fit=crop', roles: ['barista'] },
        { id: 'demo-5', title: 'Μάγειρας Σεφ', city: 'Χανιά', region: 'Κρήτη', employment_type: 'full_time', salary_min: 1600, salary_max: 2000, salary_type: 'monthly', meals_provided: 1, created_at: new Date(Date.now() - 6 * 3600e3).toISOString(), display_company_name: 'Ταβέρνα Ο Μανόλης', company_cover_photo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop', roles: ['chef'] },
      ]
    : [];

const EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: 'Πλήρης',
  part_time: 'Μερική',
  seasonal: 'Σεζόν',
  contract: 'Σύμβαση',
  temporary: 'Προσωρινή',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'μόλις τώρα';
  if (mins < 60) return `πριν ${mins}′`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `πριν ${hours} ${hours === 1 ? 'ώρα' : 'ώρες'}`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `πριν ${days} ${days === 1 ? 'μέρα' : 'μέρες'}`;
  const weeks = Math.floor(days / 7);
  return `πριν ${weeks} ${weeks === 1 ? 'εβδομάδα' : 'εβδομάδες'}`;
}

function salaryText(j: Job): string | null {
  if (j.salary_min == null && j.salary_max == null) return null;
  const suffix =
    j.salary_type === 'hourly' ? '€/ώρα' :
    j.salary_type === 'daily' ? '€/μέρα' :
    j.salary_type === 'monthly' ? '€/μήνα' : '€';
  if (j.salary_min != null && j.salary_max != null)
    return `${j.salary_min}–${j.salary_max} ${suffix}`;
  return `${j.salary_min ?? j.salary_max} ${suffix}`;
}

function initials(name?: string | null): string {
  const n = (name || '').trim();
  if (!n) return '💼';
  const parts = n.split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

export function SwipeTeaser() {
  const [jobs, setJobs] = useState<Job[]>(() => withImagesFirst(DEV_DEMO));
  const [index, setIndex] = useState(0);
  const [seen, setSeen] = useState(0);
  const [gated, setGated] = useState(false);
  const [drag, setDrag] = useState(0);
  const [leaving, setLeaving] = useState<null | 'left' | 'right'>(null);
  const startX = useRef<number | null>(null);

  // Πραγματικά δεδομένα από το API (στο production). Στο localhost μπλοκάρει το CORS
  // και κρατάμε το DEV_DEMO ώστε να φαίνεται το UX τοπικά.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/public/jobs?limit=30`);
        if (!res.ok) return;
        const json = await res.json();
        const data: Job[] = json?.data ?? [];
        if (!cancelled && data.length > 0) {
          setJobs(withImagesFirst(data)); // αγγελίες με εικόνα πρώτες
          setIndex(0);
        }
      } catch {
        /* κρατάμε το DEV_DEMO τοπικά· στο prod απλά δεν εμφανίζεται */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const total = jobs.length;
  const current = jobs[index];
  const next = jobs[index + 1];

  const remaining = useMemo(() => Math.max(total - seen, 0), [total, seen]);

  if (total === 0) return null; // κανένα fake — κρύβεται αν δεν υπάρχουν δεδομένα

  function commit(dir: 'left' | 'right') {
    if (leaving) return;
    setLeaving(dir);
    setDrag(0);
    startX.current = null;
    window.setTimeout(() => {
      const nextSeen = seen + 1;
      setSeen(nextSeen);
      setLeaving(null);
      if (nextSeen >= FREE_SWIPES || index + 1 >= total) {
        setGated(true);
      } else {
        setIndex((i) => i + 1);
      }
    }, 280);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (gated || leaving) return;
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (startX.current == null) return;
    setDrag(e.clientX - startX.current);
  }
  function onPointerUp() {
    if (startX.current == null) return;
    if (drag > 90) commit('right');
    else if (drag < -90) commit('left');
    else setDrag(0);
    startX.current = null;
  }

  const rotate = drag / 18;
  const likeOpacity = Math.min(Math.max(drag / 90, 0), 1);
  const nopeOpacity = Math.min(Math.max(-drag / 90, 0), 1);

  return (
    <section className="bg-gray-950 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          {/* Left — pitch */}
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-4 py-1.5 text-sm font-semibold text-blue-300 ring-1 ring-blue-500/20">
              🔥 Δοκίμασέ το τώρα
            </span>
            <h2 className="mt-5 text-3xl font-extrabold text-white sm:text-4xl leading-tight">
              Κάνε swipe σε πραγματικές θέσεις
            </h2>
            <p className="mt-4 text-lg text-gray-400 leading-relaxed max-w-md mx-auto lg:mx-0">
              Δες τι υπάρχει αυτή τη στιγμή κοντά σου. Swipe δεξιά αν σ&apos;αρέσει,
              αριστερά για πάσο. Χωρίς εγγραφή — μέχρι να θες να στείλεις ενδιαφέρον.
            </p>
            <div className="mt-6 flex items-center justify-center gap-6 lg:justify-start text-sm text-gray-500">
              <span>👉 Σύρε την κάρτα ή χρησιμοποίησε τα κουμπιά</span>
            </div>
          </div>

          {/* Right — card stack */}
          <div className="relative mx-auto h-[480px] w-full max-w-sm select-none">
            {/* peek της επόμενης κάρτας */}
            {next && !gated && (
              <div className="absolute inset-x-3 top-4 h-full scale-[0.96] rounded-3xl bg-white/5 ring-1 ring-white/10" />
            )}

            {gated ? (
              <GateCard total={total} seen={seen} remaining={remaining} />
            ) : current ? (
              <div
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className="absolute inset-0 cursor-grab touch-none overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 active:cursor-grabbing"
                style={{
                  transform: leaving
                    ? `translateX(${leaving === 'right' ? 600 : -600}px) rotate(${leaving === 'right' ? 24 : -24}deg)`
                    : `translateX(${drag}px) rotate(${rotate}deg)`,
                  transition: leaving || startX.current == null ? 'transform 280ms ease' : 'none',
                }}
              >
                {/* LIKE / NOPE stamps */}
                <div
                  className="pointer-events-none absolute left-5 top-6 rotate-[-14deg] rounded-lg border-4 border-emerald-500 px-3 py-1 text-xl font-black uppercase text-emerald-500"
                  style={{ opacity: likeOpacity }}
                >
                  Μ&apos;αρέσει
                </div>
                <div
                  className="pointer-events-none absolute right-5 top-6 rotate-[14deg] rounded-lg border-4 border-rose-500 px-3 py-1 text-xl font-black uppercase text-rose-500"
                  style={{ opacity: nopeOpacity }}
                >
                  Πάσο
                </div>

                <div className="flex h-full flex-col">
                  {/* Hero εικόνα αγγελίας (cover → logo → χρωματιστό fallback) */}
                  <div className="relative h-44 w-full flex-shrink-0 overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600">
                    {heroImage(current) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={heroImage(current)!}
                        alt=""
                        draggable={false}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-5xl font-black text-white/90">
                        {initials(current.display_company_name)}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />

                    {/* Urgency badges πάνω στην εικόνα */}
                    <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-amber-700 shadow-sm">
                        🕒 {timeAgo(current.created_at)}
                      </span>
                      {current.employment_type && EMPLOYMENT_LABELS[current.employment_type] && (
                        <span className="rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-blue-700 shadow-sm">
                          {EMPLOYMENT_LABELS[current.employment_type]}
                        </span>
                      )}
                    </div>

                    {/* Επωνυμία + περιοχή κάτω αριστερά */}
                    <div className="absolute inset-x-3 bottom-2.5 flex items-center gap-2">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white text-[11px] font-black text-blue-700 shadow">
                        {current.company_logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={current.company_logo} alt="" className="h-full w-full object-cover" />
                        ) : (
                          initials(current.display_company_name)
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white drop-shadow">
                          {current.display_company_name || 'Επιχείρηση'}
                        </p>
                        <p className="truncate text-[11px] text-white/80 drop-shadow">
                          {[current.city, current.region].filter(Boolean).join(' · ') || 'Ελλάδα'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Σώμα κάρτας */}
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-2xl font-extrabold leading-tight text-gray-900">
                      {current.title}
                    </h3>

                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      {salaryText(current) && (
                        <span className="inline-flex items-center gap-1 rounded-xl bg-gray-900 px-3 py-1.5 text-base font-bold text-white">
                          💶 {salaryText(current)}
                        </span>
                      )}
                      {current.housing_provided ? (
                        <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700">🏠 Στέγαση</span>
                      ) : null}
                      {current.meals_provided ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">🍽️ Γεύματα</span>
                      ) : null}
                    </div>

                    <div className="mt-auto flex items-center justify-between pt-5">
                      <button
                        onClick={() => commit('left')}
                        aria-label="Πάσο"
                        className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl text-rose-500 shadow-lg ring-1 ring-gray-200 transition hover:scale-105 hover:bg-rose-50"
                      >
                        ✕
                      </button>
                      <span className="text-xs font-medium text-gray-400">
                        {Math.min(seen + 1, total)} / {total}
                      </span>
                      <button
                        onClick={() => commit('right')}
                        aria-label="Μ'αρέσει"
                        className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-2xl text-white shadow-lg shadow-emerald-500/30 transition hover:scale-105 hover:bg-emerald-600"
                      >
                        ♥
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function GateCard({ total, seen, remaining }: { total: number; seen: number; remaining: number }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-center shadow-2xl">
      <div className="text-5xl">🔥</div>
      <h3 className="mt-4 text-2xl font-extrabold text-white leading-tight">
        Είδες {seen} από {total} θέσεις
      </h3>
      <p className="mt-2 text-blue-100">
        {remaining > 0
          ? `Άλλες ${remaining} θέσεις σε περιμένουν. Κάνε εγγραφή για να τις δεις όλες και να στείλεις ενδιαφέρον.`
          : 'Κάνε εγγραφή για να στείλεις ενδιαφέρον και να σε βρίσκουν οι επιχειρήσεις.'}
      </p>
      <Link
        href="/auth/register?role=worker"
        className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-white px-6 py-3.5 text-base font-bold text-blue-700 shadow-lg transition hover:bg-blue-50"
      >
        Δωρεάν εγγραφή →
      </Link>
      <Link href="/find-job" className="mt-3 text-sm font-medium text-blue-100 underline-offset-2 hover:underline">
        Δες όλες τις θέσεις
      </Link>
    </div>
  );
}
