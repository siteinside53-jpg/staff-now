'use client';

/**
 * «Όλες οι αγγελίες» — ένα ταμπλό με τα τρία είδη μαζί, μέσα στον πίνακα
 * ελέγχου.
 *
 * ΓΙΑΤΙ ΜΑΖΙ: μέχρι τώρα οι αγγελίες εργασίας, οι έκτακτες βάρδιες και οι
 * μικροδουλειές ζούσαν σε τρεις διαφορετικές σελίδες. Ο χρήστης που ψάχνει
 * δουλειά δεν σκέφτεται σε ποια «ενότητα» ανήκει αυτό που θα βρει — θέλει να
 * δει τι υπάρχει.
 *
 * ΚΑΘΕ ΕΙΔΟΣ ΚΡΑΤΑΕΙ ΤΟ ΧΡΩΜΑ ΤΟΥ, ώστε να ξεχωρίζει με μια ματιά:
 *   · Αγγελία εργασίας → πράσινο (όπως η «Εύρεση δουλειάς»)
 *   · Έκτακτη βάρδια   → κόκκινο (επείγον, λήγει)
 *   · Μικροδουλειά     → πορτοκαλί (TaskNow)
 *
 * ΕΙΛΙΚΡΙΝΕΙΑ: οι αγγελίες και οι βάρδιες έρχονται από τον πραγματικό server.
 * Αν δεν απαντήσει, το λέμε — ΔΕΝ βάζουμε παραδείγματα στη θέση τους. Οι
 * μικροδουλειές είναι ακόμη μακέτα και φέρουν τη σήμανσή τους.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { API_URL } from '@/lib/config';
import { Spinner } from '@/components/ui/spinner';
import { durationLabel, expiresLabel, netOf, whenLabel } from '@/lib/shift-display';
import { TaskNowMark } from '@/components/tasknow/logo';
import { AmountText } from '@/components/tasknow/amount';
import { CATEGORY_BY_KEY, isLicensedCategory } from '@/components/tasknow/data';
import { isOpen, useMockTasks } from '@/components/tasknow/mock-store';

type Kind = 'job' | 'shift' | 'task';

/** Η σειρά που εμφανίζονται τα φίλτρα — γραμμένη ρητά, όχι από τα κλειδιά. */
const KIND_ORDER: Kind[] = ['job', 'task', 'shift'];

const KIND: Record<
  Kind,
  { label: string; plural: string; chip: string; bar: string; dot: string; href: string }
> = {
  job: {
    label: 'Αγγελία εργασίας',
    plural: 'Αγγελίες εργασίας',
    chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    bar: 'bg-emerald-500',
    dot: 'bg-emerald-500',
    href: '/dashboard/discover',
  },
  shift: {
    label: 'Έκτακτη βάρδια',
    plural: 'Έκτακτες βάρδιες',
    chip: 'bg-rose-50 text-rose-700 ring-rose-200',
    bar: 'bg-rose-500',
    dot: 'bg-rose-500',
    href: '/dashboard/discover',
  },
  task: {
    label: 'Μικροδουλειά',
    plural: 'Μικροδουλειές',
    chip: 'bg-amber-50 text-amber-800 ring-amber-200',
    bar: 'bg-amber-500',
    dot: 'bg-amber-500',
    href: '/dashboard/tasknow',
  },
};

type Item = {
  id: string;
  kind: Kind;
  title: string;
  where: string;
  when: string;
  /** Το ποσό όπως γράφεται (π.χ. «60€», «800-1000 €/μήνα»). */
  money: string;
  /** Η μονάδα, όταν δεν περιέχεται ήδη στο ποσό (π.χ. «για όλη τη δουλειά»). */
  moneyNote?: string;
  extra?: string;
  href: string;
  /** Ετικέτες που πρέπει να φαίνονται πάντα (π.χ. «θέλει άδεια»). */
  flags?: { text: string; className: string }[];
  mock?: boolean;
};

interface PublicJob {
  id: string;
  title: string;
  company_name?: string | null;
  display_company_name?: string | null;
  city?: string | null;
  display_city?: string | null;
  region?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_type?: string | null;
  employment_type?: string | null;
}

interface PublicShift {
  id: string;
  title: string;
  display_city?: string | null;
  city?: string | null;
  display_company_name?: string | null;
  company_name?: string | null;
  salary_min?: number | null;
  shift_date?: string | null;
  shift_days?: number | null;
  shift_start_time?: string | null;
  shift_end_time?: string | null;
  shift_start_utc?: string | null;
}

function salaryText(j: PublicJob): string {
  const unit =
    j.salary_type === 'hourly'
      ? '€/ώρα'
      : j.salary_type === 'daily'
        ? '€/ημέρα'
        : j.salary_type === 'monthly'
          ? '€/μήνα'
          : '€';
  if (j.salary_min && j.salary_max) return `${j.salary_min}-${j.salary_max} ${unit}`;
  if (j.salary_min) return `Από ${j.salary_min} ${unit}`;
  if (j.salary_max) return `Έως ${j.salary_max} ${unit}`;
  return 'Κατόπιν συνεννόησης';
}

function Row({ item }: { item: Item }) {
  const k = KIND[item.kind];
  return (
    <div className="relative grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 px-4 py-3.5 transition hover:bg-gray-50">
      {/* Η χρωματιστή λωρίδα είναι το γρήγορο σήμα «τι είδους είναι αυτό» */}
      <span className={'absolute left-0 top-0 h-full w-1 ' + k.bar} aria-hidden="true" />

      <div className="min-w-0 pl-2">
        <Link
          href={item.href}
          className="text-left text-[15px] font-semibold leading-snug text-gray-900 after:absolute after:inset-0 hover:underline"
        >
          {item.title}
        </Link>

        {(item.where || item.when) && (
          <p className="mt-1 text-[12.5px] text-gray-500">
            {item.where && (
              <>
                <span aria-hidden="true">📍</span> {item.where}
              </>
            )}
            {item.where && item.when ? ' · ' : ''}
            {item.when}
          </p>
        )}
        {item.extra && <p className="mt-0.5 text-[12px] text-gray-500">{item.extra}</p>}

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span
            className={'rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ' + k.chip}
          >
            {item.kind === 'task' && (
              <TaskNowMark className="mr-1 inline-block h-3 w-3 align-[-2px]" />
            )}
            {k.label}
          </span>
          {item.mock && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
              ΜΑΚΕΤΑ
            </span>
          )}
          {item.flags?.map((f) => (
            <span key={f.text} className={'rounded-full px-2 py-0.5 text-[11px] font-semibold ' + f.className}>
              {f.text}
            </span>
          ))}
        </div>
      </div>

      {/* Ίδια τυπογραφία ποσού με τη ροή του TaskNow: όλα τα ευρώ της σελίδας
          πέφτουν στην ίδια κατακόρυφη γραμμή, ό,τι είδος κι αν είναι. */}
      <div className="w-[5.5rem] shrink-0">
        <AmountText value={item.money} note={item.moneyNote} size="band" />
      </div>
    </div>
  );
}

export function AllListings({
  limit,
  heading = true,
}: {
  /** Πόσες γραμμές το πολύ. Χωρίς όριο, δείχνει τα πάντα. */
  limit?: number;
  /** Ο μεγάλος τίτλος — κρύβεται όταν το ταμπλό μπαίνει μέσα σε άλλη σελίδα. */
  heading?: boolean;
} = {}) {
  const state = useMockTasks();

  const [jobs, setJobs] = useState<PublicJob[] | null>(null);
  const [shifts, setShifts] = useState<PublicShift[] | null>(null);
  const [failed, setFailed] = useState<Kind[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Kind | null>(null);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    // Ίδιο όριο με τις υπόλοιπες λίστες: χωρίς αυτό μια αργή απάντηση αφήνει
    // τον χρήστη σε ατέρμονο «φορτώνει».
    const timeout = setTimeout(() => controller.abort(), 6000);

    async function load() {
      const results = await Promise.allSettled([
        fetch(`${API_URL}/public/jobs?limit=100`, { signal: controller.signal }).then((r) =>
          r.ok ? r.json() : Promise.reject(new Error('jobs')),
        ),
        fetch(`${API_URL}/public/shifts?limit=50`, { signal: controller.signal }).then((r) =>
          r.ok ? r.json() : Promise.reject(new Error('shifts')),
        ),
      ]);
      if (!alive) return;

      const bad: Kind[] = [];
      const [jobsRes, shiftsRes] = results;

      if (jobsRes.status === 'fulfilled') {
        const raw = jobsRes.value as { data?: PublicJob[] } | PublicJob[];
        setJobs(Array.isArray(raw) ? raw : (raw?.data ?? []));
      } else {
        bad.push('job');
      }

      if (shiftsRes.status === 'fulfilled') {
        const raw = shiftsRes.value as { data?: PublicShift[] } | PublicShift[];
        setShifts(Array.isArray(raw) ? raw : (raw?.data ?? []));
      } else {
        bad.push('shift');
      }

      setFailed(bad);
      setLoading(false);
      clearTimeout(timeout);
    }

    load();
    return () => {
      alive = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];

    for (const j of jobs ?? []) {
      out.push({
        id: `job-${j.id}`,
        kind: 'job',
        title: j.title,
        // Χωρίς δηλωμένη περιοχή μένει κενό: το «Ελλάδα» θα ήταν δικό μας
        // συμπέρασμα, όχι στοιχείο της αγγελίας (ίδια σύμβαση με τη λίστα
        // αγγελιών στη σελίδα εύρεσης).
        where: (j.display_city || j.city || j.region || '').trim(),
        when: '',
        money: salaryText(j),
        extra: j.display_company_name || j.company_name || undefined,
        href: `/jobs/${j.id}`,
      });
    }

    for (const s of shifts ?? []) {
      const net = netOf(s.salary_min);
      const expires = expiresLabel(s.shift_start_utc);
      out.push({
        id: `shift-${s.id}`,
        kind: 'shift',
        title: s.title,
        where: (s.display_city || s.city || '').trim(),
        when: whenLabel(s.shift_date),
        money: net ? `${net}€` : '—',
        extra:
          [s.display_company_name || s.company_name, durationLabel(s)].filter(Boolean).join(' · ') ||
          undefined,
        href: '/dashboard/discover',
        flags: expires ? [{ text: expires, className: 'bg-rose-50 text-rose-700' }] : undefined,
      });
    }

    for (const t of state.tasks.filter(isOpen)) {
      const cat = CATEGORY_BY_KEY[t.category];
      out.push({
        id: `task-${t.id}`,
        kind: 'task',
        title: t.title,
        where: t.area,
        when: t.when,
        money: `${t.budget}€`,
        moneyNote: t.budgetNote ?? 'για όλη τη δουλειά',
        extra: `${cat?.icon ?? ''} ${cat?.label ?? ''} · ${t.offersList.length} προσφορές`,
        href: `/tasknow?task=${t.id}`,
        mock: true,
        flags: [
          ...(isLicensedCategory(t.category)
            ? [{ text: 'θέλει άδεια', className: 'bg-red-50 text-red-700' }]
            : []),
          ...(t.urgent ? [{ text: 'Επείγον', className: 'bg-orange-50 text-orange-600' }] : []),
        ],
      });
    }

    return out;
  }, [jobs, shifts, state]);

  const counts = useMemo(() => {
    const c: Record<Kind, number> = { job: 0, shift: 0, task: 0 };
    for (const i of items) c[i.kind] += 1;
    return c;
  }, [items]);

  const matching = filter ? items.filter((i) => i.kind === filter) : items;
  const visible = limit ? matching.slice(0, limit) : matching;
  const hidden = matching.length - visible.length;

  return (
    <div className="space-y-4">
      {heading ? (
        <div>
          <h1 className="text-xl font-bold text-gray-900">Όλες οι αγγελίες</h1>
          <p className="mt-1 text-sm text-gray-500">
            Αγγελίες εργασίας, μικροδουλειές και έκτακτες βάρδιες — μαζί, με το χρώμα του
            καθενός.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-gray-900">Όλες οι αγγελίες</h2>
          <Link
            href="/dashboard/board"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            Δες τες όλες →
          </Link>
        </div>
      )}

      {/* Φίλτρα ανά είδος, στα χρώματά τους */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <button
          type="button"
          onClick={() => setFilter(null)}
          aria-pressed={filter === null}
          className={
            'h-9 shrink-0 rounded-full border px-4 text-sm font-medium transition ' +
            (filter === null
              ? 'border-gray-900 bg-gray-900 text-white'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300')
          }
        >
          Όλα <span className="tabular-nums">{items.length}</span>
        </button>

        {KIND_ORDER.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(filter === k ? null : k)}
            aria-pressed={filter === k}
            className={
              'flex h-9 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition ' +
              (filter === k
                ? 'border-gray-900 bg-gray-900 text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300')
            }
          >
            <span className={'h-2 w-2 rounded-full ' + KIND[k].dot} aria-hidden="true" />
            {KIND[k].plural} <span className="tabular-nums">{counts[k]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <>
          {/* Αν κάτι δεν φόρτωσε, το λέμε. Δεν βάζουμε παραδείγματα στη θέση του. */}
          {failed.length > 0 && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
              Δεν φορτώθηκαν {failed.map((k) => KIND[k].plural.toLowerCase()).join(' και ')} —
              ο server δεν απάντησε. Δοκίμασε ανανέωση· δεν δείχνουμε παραδείγματα στη
              θέση τους.
            </p>
          )}

          {visible.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-sm text-gray-500">
              Δεν υπάρχει τίποτα εδώ αυτή τη στιγμή.
            </p>
          ) : (
            <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white">
              {visible.map((item) => (
                <Row key={item.id} item={item} />
              ))}
            </div>
          )}

          {hidden > 0 && (
            <div className="text-center">
              <Link
                href="/dashboard/board"
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                +{hidden} ακόμη →
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
