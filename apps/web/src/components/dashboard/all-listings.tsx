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
import {
  CATEGORY_BY_KEY,
  NEW_MINUTES,
  isLicensedCategory,
  posterLabel,
} from '@/components/tasknow/data';
import { isOpen, useMockTasks } from '@/components/tasknow/mock-store';

type Kind = 'job' | 'shift' | 'task';

/** Η σειρά που εμφανίζονται τα φίλτρα — γραμμένη ρητά, όχι από τα κλειδιά. */
const KIND_ORDER: Kind[] = ['job', 'task', 'shift'];

const KIND: Record<
  Kind,
  {
    label: string;
    plural: string;
    chip: string;
    bar: string;
    dot: string;
    action: string;
    /** Περίγραμμα όταν είναι νέο — ίδιο μοτίβο με τη λίστα αγγελιών. */
    newBorder: string;
    /** Χρώμα περιγράμματος στο πέρασμα του ποντικιού. */
    hover: string;
    /** Φόντο του αρχικού γράμματος όταν λείπει λογότυπο. */
    avatar: string;
    /** Γεμάτο χρώμα: κουμπί και σήμα «Νέο». */
    solid: string;
    /** Χρώμα του ποσού — σύμβαση που έχει ήδη το site. */
    money: string;
    href: string;
  }
> = {
  job: {
    label: 'Αγγελία εργασίας',
    plural: 'Αγγελίες εργασίας',
    chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    bar: 'bg-emerald-500',
    dot: 'bg-emerald-500',
    action: 'bg-emerald-600 hover:bg-emerald-700',
    newBorder: 'border-2 border-emerald-500/60 shadow-md',
    hover: 'hover:border-emerald-300',
    avatar: 'bg-gradient-to-br from-blue-100 to-purple-100 text-blue-700',
    solid: 'bg-emerald-600',
    money: 'text-emerald-600',
    href: '/dashboard/discover',
  },
  shift: {
    label: 'Έκτακτη βάρδια',
    plural: 'Έκτακτες βάρδιες',
    chip: 'bg-rose-50 text-rose-700 ring-rose-200',
    bar: 'bg-rose-500',
    dot: 'bg-rose-500',
    action: 'bg-rose-600 hover:bg-rose-700',
    newBorder: 'border-2 border-rose-500/60 shadow-md',
    hover: 'hover:border-rose-300',
    avatar: 'bg-gradient-to-br from-rose-100 to-orange-100 text-rose-700',
    solid: 'bg-rose-600',
    money: 'text-rose-600',
    href: '/dashboard/discover',
  },
  task: {
    label: 'Μικροδουλειά',
    plural: 'Μικροδουλειές',
    chip: 'bg-amber-50 text-amber-800 ring-amber-200',
    bar: 'bg-amber-500',
    dot: 'bg-amber-500',
    action: 'bg-gray-900 hover:bg-amber-500',
    newBorder: 'border-2 border-amber-500/60 shadow-md',
    hover: 'hover:border-amber-400',
    avatar: 'bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700',
    solid: 'bg-amber-500',
    money: 'text-amber-600',
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
  /** Λογότυπο επιχείρησης· χωρίς αυτό δείχνουμε το αρχικό γράμμα. */
  logo?: string | null;
  /** Τύπος απασχόλησης, πόσο καιρό πριν — ό,τι δείχνει και η κανονική λίστα. */
  badges?: string[];
  /** Παροχές: στέγη, φαγητό. */
  perks?: string[];
  actionLabel: string;
  /** Ανέβηκε τις τελευταίες 48 ώρες — ίδια σύμβαση με τη λίστα αγγελιών. */
  isNew?: boolean;
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
  company_logo?: string | null;
  created_at?: string | null;
  housing_provided?: boolean | null;
  meals_provided?: boolean | null;
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

function employmentGreek(t?: string | null): string {
  const map: Record<string, string> = {
    full_time: 'Full-time',
    part_time: 'Part-time',
    seasonal: 'Σεζόν',
    freelance: 'Freelance',
  };
  return t ? (map[t] ?? '') : '';
}

/** «πριν 3 ημέρες» — ίδια διατύπωση με την κανονική λίστα αγγελιών. */
function isRecent(iso?: string | null): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  return !Number.isNaN(t) && Date.now() - t < 48 * 3600 * 1000;
}

function agoLabel(iso?: string | null): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const days = Math.floor((Date.now() - t) / 86_400_000);
  if (days <= 0) return 'σήμερα';
  if (days === 1) return 'χθες';
  if (days < 30) return `πριν ${days} ημέρες`;
  const months = Math.floor(days / 30);
  return months === 1 ? 'πριν 1 μήνα' : `πριν ${months} μήνες`;
}

function Row({ item }: { item: Item }) {
  const k = KIND[item.kind];
  return (
    <li>
      {/* ΟΨΗ ΚΑΡΤΑΣ: ίδια ακριβώς με τη λίστα αγγελιών (public-jobs-list).
          Αντιγράφηκε η δομή, όχι το αρχείο — αλλάζει μόνο το χρώμα ανά είδος,
          ώστε αγγελία, μικροδουλειά και βάρδια να ξεχωρίζουν με μια ματιά. */}
      <Link
        href={item.href}
        aria-label={`${k.label}: ${item.title}`}
        className={
          'block w-full rounded-2xl bg-white p-4 text-left transition hover:shadow-md active:scale-[0.99] ' +
          k.hover +
          ' ' +
          /*
           * ΤΟ ΕΝΤΟΝΟ ΠΛΑΙΣΙΟ ΜΟΝΟ ΓΙΑ ΤΙΣ ΑΓΓΕΛΙΕΣ ΕΡΓΑΣΙΑΣ.
           *
           * Οι μικροδουλειές είναι σχεδόν όλες πρόσφατες, οπότε το «νέο»
           * πλαίσιο έμπαινε παντού και έπαυε να σημαίνει κάτι — έδειχνε απλώς
           * σαν διακόσμηση. Η ένδειξη «ΝΕΟ» παραμένει, εκεί που ξεχωρίζει.
           * Το χρώμα εμφανίζεται στο πέρασμα του ποντικιού, όπως και στις
           * υπόλοιπες κάρτες του site.
           */
          (item.isNew && item.kind === 'job'
            ? k.newBorder
            : 'border border-gray-100 shadow-sm')
        }
      >
        <div className="flex gap-3">
          {item.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.logo}
              alt=""
              loading="lazy"
              className="h-14 w-14 flex-shrink-0 rounded-xl object-cover ring-1 ring-gray-100"
            />
          ) : (
            <div
              className={
                'flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl text-xl font-bold ' +
                k.avatar
              }
              aria-hidden="true"
            >
              {(item.extra || item.title).trim().charAt(0).toUpperCase() || '💼'}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <p className="min-w-0 flex-1 truncate font-bold text-gray-900">{item.title}</p>
              {item.isNew && (
                <span
                  className={
                    'mt-0.5 flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ' +
                    k.solid
                  }
                >
                  Νέο
                </span>
              )}
            </div>
            {item.extra && <p className="truncate text-xs text-gray-500">{item.extra}</p>}

            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              {/* Το είδος γράφεται πάντα: είναι όλος ο λόγος που τα βλέπεις μαζί. */}
              <span className={'rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ' + k.chip}>
                {item.kind === 'task' && <TaskNowMark className="mr-1 inline-block h-3 w-3 align-[-2px]" />}
                {k.label}
              </span>
              {item.where && <span>📍 {item.where}</span>}
              {item.badges?.filter(Boolean).map((b) => (
                <span key={b} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold">
                  {b}
                </span>
              ))}
              {item.when && <span className="text-gray-400">{item.when}</span>}
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <span className={'text-base font-extrabold tabular-nums ' + k.money}>
                💰 {item.money}
                {item.moneyNote && (
                  <span className="ml-1 text-[11px] font-medium text-gray-400">
                    {item.moneyNote}
                  </span>
                )}
              </span>
              <span
                className={
                  'flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-bold text-white ' + k.solid
                }
              >
                {item.actionLabel}
              </span>
            </div>

            {(item.perks?.length || item.flags?.length || item.mock) && (
              <div className="mt-2 flex flex-wrap gap-1">
                {item.mock && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    ΜΑΚΕΤΑ
                  </span>
                )}
                {item.perks?.map((p) => (
                  <span
                    key={p}
                    className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700"
                  >
                    {p}
                  </span>
                ))}
                {item.flags?.map((f) => (
                  <span
                    key={f.text}
                    className={'rounded-full px-2 py-0.5 text-[10px] font-semibold ' + f.className}
                  >
                    {f.text}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Link>
    </li>
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
        logo: j.company_logo,
        badges: [employmentGreek(j.employment_type), agoLabel(j.created_at)].filter(Boolean),
        perks: [
          j.housing_provided ? '🏠 Στέγη' : '',
          j.meals_provided ? '🍽️ Φαγητό' : '',
        ].filter(Boolean),
        actionLabel: 'Δες αγγελία',
        isNew: isRecent(j.created_at),
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
        actionLabel: 'Δες τη βάρδια',
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
        // Ποιος την ανέβασε — στη θέση που έχει η επιχείρηση στις αγγελίες.
        extra: posterLabel(t.postedByName, t.postedByRole),
        logo: t.postedByPhoto ?? null,
        badges: [cat?.label ?? '', `${t.offersList.length} προσφορές`].filter(Boolean),
        href: `/tasknow?task=${t.id}`,
        mock: true,
        actionLabel: 'Δες τη δουλειά',
        isNew: t.postedMinutesAgo < NEW_MINUTES,
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
            <ul className="space-y-3">
              {visible.map((item) => (
                <Row key={item.id} item={item} />
              ))}
            </ul>
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
