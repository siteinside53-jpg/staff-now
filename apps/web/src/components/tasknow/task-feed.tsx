'use client';

import { useEffect, useMemo, useState } from 'react';
import { Amount } from './amount';
import { OfferModal } from './offer-modal';
import { PostTaskButton } from './post-trigger';
import { TaskDetailModal } from './task-detail-modal';
import { TaskMap } from './task-map';
import { TaskNowLogo } from './logo';
import {
  AREA_COORDS,
  CATEGORIES,
  CATEGORY_BY_KEY,
  DEFAULT_CENTER,
  NEW_MINUTES,
  type CenterSource,
  type Coords,
  distanceKm,
  distanceLabel,
  formatPostedAgo,
  isLicensedCategory,
} from './data';
import {
  areaStats,
  boardStats,
  isOpen,
  isPublic,
  publicOpenTasks,
  resetMock,
  useMockTasks,
  type MockTask,
} from './mock-store';

/**
 * ΜΑΚΕΤΑ TaskNow — το ταμπλό με τις μικροδουλειές.
 *
 * ΑΡΧΗ ΣΧΕΔΙΑΣΗΣ (από τον ιδιοκτήτη): «ο κόσμος κοιτάει πρώτα τι του
 * προσφέρει κάτι». Άρα πάνω από τη ροή δεν μπαίνει τίποτα που να μιλάει για
 * εμάς — μπαίνουν αριθμοί. Το ποσό κάθε δουλειάς κάθεται σε δική του στήλη,
 * δεξιά στοιχισμένο, με στοιχισμένα ψηφία: όλα τα ευρώ της σελίδας πέφτουν
 * στην ίδια κατακόρυφη γραμμή και συγκρίνονται με μία ματιά.
 *
 * ΤΟΠΟΘΕΣΙΑ: η αρχική ακτίνα είναι «όλη η πόλη». Ακτίνα γύρω από κέντρο που
 * ΔΕΝ διάλεξε ο χρήστης θα έκρυβε δουλειές και θα έκανε τους μετρητές της
 * αρχικής να διαφωνούν με τη λίστα. Μόλις διαλέξει γειτονιά ή δώσει
 * τοποθεσία, πέφτει στα 5 χλμ και η ταξινόμηση γίνεται «πιο κοντά».
 */

type Sort = 'new' | 'near' | 'budget';

const PREFS_KEY = 'tasknow_prefs_v1';

const RADIUS_OPTIONS: { km: number | null; label: string }[] = [
  { km: 2, label: '2 χλμ' },
  { km: 5, label: '5 χλμ' },
  { km: null, label: 'Όλη η πόλη' },
];

const SORT_LABEL: Record<Sort, string> = {
  new: 'Πιο πρόσφατα',
  near: 'Πιο κοντά',
  budget: 'Μεγαλύτερη αμοιβή',
};

function Row({
  task,
  km,
  source,
  centerLabel,
  onOpen,
  onOffer,
}: {
  task: MockTask;
  km: number | null;
  source: CenterSource;
  centerLabel: string;
  onOpen: () => void;
  onOffer: () => void;
}) {
  const cat = CATEGORY_BY_KEY[task.category];
  const licensed = isLicensedCategory(task.category);
  const mineOffer = task.offersList.some((o) => o.mine);
  const isNew = task.postedMinutesAgo < NEW_MINUTES;

  return (
    <article
      className={
        'relative grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 px-4 py-3.5 transition hover:bg-amber-50/40 ' +
        (licensed ? 'border-l-2 border-red-300' : '')
      }
    >
      <div className="min-w-0">
        {/* Ο τίτλος απλώνεται πάνω σε όλη τη γραμμή· το κουμπί δράσης μένει
            από πάνω του. Έτσι αποφεύγουμε κουμπί μέσα σε κουμπί. */}
        <button
          type="button"
          onClick={onOpen}
          className="text-left text-[15px] font-semibold leading-snug text-gray-900 after:absolute after:inset-0 hover:underline"
        >
          {task.title}
        </button>

        <p className="mt-1 text-[12.5px] text-gray-500">
          <span aria-hidden="true">📍</span> {task.area} · {distanceLabel(km, source, centerLabel)} ·{' '}
          {task.when}
        </p>
        <p className="mt-0.5 text-[12px] text-gray-500">
          {formatPostedAgo(task.postedMinutesAgo)} · {task.offersList.length}{' '}
          {task.offersList.length === 1 ? 'προσφορά' : 'προσφορές'}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
            {cat?.icon} {cat?.label}
          </span>
          {/* Ο περιορισμός της άδειας δεν κρύβεται ποτέ και δεν μπαίνει σε ουρά
              προτεραιότητας: μπαίνει πρώτος, δίπλα στο ποσό. */}
          {licensed && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
              θέλει άδεια
            </span>
          )}
          {task.urgent && (
            <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-600">
              Επείγον
            </span>
          )}
          {task.remote && (
            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
              Εξ αποστάσεως
            </span>
          )}
          {isNew && !task.mine && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              Νέο
            </span>
          )}
          {task.mine && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
              {task.status === 'assigned'
                ? 'δική σου · ανατέθηκε'
                : task.status === 'done'
                  ? 'δική σου · ολοκληρώθηκε'
                  : 'δική σου'}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end justify-between gap-2">
        <div className="w-[4.75rem]">
          <Amount value={task.budget} note={task.budgetNote} direction muted={mineOffer} />
        </div>

        {task.mine ? (
          <button
            type="button"
            onClick={onOpen}
            className="relative z-10 h-8 shrink-0 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700"
          >
            Δες τις προσφορές
          </button>
        ) : mineOffer ? (
          <span className="relative z-10 h-8 shrink-0 rounded-lg bg-emerald-50 px-3 text-xs font-semibold leading-8 text-emerald-700">
            ✓ Έστειλες προσφορά
          </span>
        ) : (
          <button
            type="button"
            onClick={onOffer}
            className="relative z-10 h-8 shrink-0 rounded-lg bg-gray-900 px-3 text-xs font-semibold text-white transition hover:bg-amber-500"
          >
            Κάνε προσφορά
          </button>
        )}
      </div>
    </article>
  );
}

function Pill({
  active,
  onClick,
  children,
  className = '',
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        'h-9 shrink-0 rounded-full border px-3 text-[13px] font-medium transition ' +
        (active
          ? 'border-gray-900 bg-gray-900 text-white'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300') +
        ' ' +
        className
      }
    >
      {children}
    </button>
  );
}

export function TaskFeed({ openTaskId }: { openTaskId?: string | null }) {
  const state = useMockTasks();
  const { tasks } = state;

  const [active, setActive] = useState<string | null>(null);
  const [allCategories, setAllCategories] = useState(false);
  const [sort, setSort] = useState<Sort>('new');
  const [view, setView] = useState<'list' | 'map'>('list');
  const [radius, setRadius] = useState<number | null>(null);

  const [center, setCenter] = useState<Coords>(DEFAULT_CENTER);
  const [centerLabel, setCenterLabel] = useState('το κέντρο');
  const [centerSource, setCenterSource] = useState<CenterSource>('default');
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [geoAllowed, setGeoAllowed] = useState(true);

  const [detail, setDetail] = useState<MockTask | null>(null);
  const [offerFor, setOfferFor] = useState<MockTask | null>(null);

  // ── Προτιμήσεις: θυμόμαστε επιλογές, ΠΟΤΕ συντεταγμένες ──────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as {
        area?: string;
        radius?: number | null;
        sort?: Sort;
        category?: string | null;
        view?: 'list' | 'map';
      };
      if (p.sort) setSort(p.sort);
      if (p.view) setView(p.view);
      if (p.category !== undefined) setActive(p.category);
      if (p.area && AREA_COORDS[p.area]) {
        setCenter(AREA_COORDS[p.area]!);
        setCenterLabel(p.area);
        setCenterSource('area');
        setRadius(p.radius === undefined ? 5 : p.radius);
      } else if (p.radius !== undefined) {
        setRadius(p.radius);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        PREFS_KEY,
        JSON.stringify({
          area: centerSource === 'area' ? centerLabel : undefined,
          radius,
          sort,
          category: active,
          view,
        }),
      );
    } catch {}
  }, [centerSource, centerLabel, radius, sort, active, view]);

  // Αν ο χρήστης έχει ΗΔΗ δώσει άδεια τοποθεσίας, τον τοποθετούμε χωρίς να
  // πεταχτεί παράθυρο. Αν την έχει αρνηθεί, το κουμπί δεν εμφανίζεται καν.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions) return;
    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((status) => {
        if (status.state === 'granted') locate();
        if (status.state === 'denied') setGeoAllowed(false);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function locate() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocError('Ο browser δεν υποστηρίζει τοποθεσία.');
      return;
    }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setCenterLabel('σένα');
        setCenterSource('geo');
        setRadius(5);
        setSort('near');
        setLocating(false);
      },
      () => {
        setLocating(false);
        setLocError('Δεν πήραμε την τοποθεσία σου. Διάλεξε γειτονιά από τη λίστα.');
      },
      { timeout: 8000 },
    );
  }

  function pickArea(area: string) {
    const c = AREA_COORDS[area];
    if (!c) return;
    setCenter(c);
    setCenterLabel(area);
    setCenterSource('area');
    setRadius(5);
    setSort('near');
    setLocError(null);
  }

  function resetArea() {
    setCenter(DEFAULT_CENTER);
    setCenterLabel('το κέντρο');
    setCenterSource('default');
    setRadius(null);
    setSort('new');
  }

  // ── Δεδομένα ─────────────────────────────────────────────────────────────
  const openTasks = publicOpenTasks(state);
  const stats = boardStats(openTasks);
  const areas = areaStats(openTasks);

  const listed = useMemo(() => {
    // Στη ροή μπαίνει ό,τι δέχεται ακόμη προσφορές. Οι δικές σου μένουν
    // ορατές σε κάθε κατάσταση για να τις παρακολουθείς — αλλά δεν μετράνε
    // σε κανέναν δημόσιο αριθμό.
    return tasks
      .filter((t) => isOpen(t) || (t.mine && isPublic(t)))
      .map((task) => {
        const coords = AREA_COORDS[task.area];
        return { task, km: coords ? distanceKm(center, coords) : null };
      });
  }, [tasks, center]);

  const withinRadius = useMemo(() => {
    if (radius === null) return listed;
    // Οι δουλειές εξ αποστάσεως δεν έχουν σημείο — γίνονται από οπουδήποτε.
    return listed.filter((x) => x.km === null || x.km <= radius);
  }, [listed, radius]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const { task } of withinRadius) {
      if (!isOpen(task)) continue;
      counts.set(task.category, (counts.get(task.category) ?? 0) + 1);
    }
    return counts;
  }, [withinRadius]);

  const visible = useMemo(() => {
    const list = active ? withinRadius.filter((x) => x.task.category === active) : withinRadius;
    const sorted = [...list];
    if (sort === 'budget') sorted.sort((a, b) => b.task.budget - a.task.budget);
    else if (sort === 'near') sorted.sort((a, b) => (a.km ?? 1e9) - (b.km ?? 1e9));
    else sorted.sort((a, b) => a.task.postedMinutesAgo - b.task.postedMinutesAgo);
    // Το «Επείγον» κρατάει την κορυφή μέσα σε όποια ταξινόμηση.
    sorted.sort((a, b) => Number(b.task.urgent === true) - Number(a.task.urgent === true));
    return sorted;
  }, [withinRadius, active, sort]);

  const visibleOpen = visible.filter((x) => isOpen(x.task));
  const visibleStats = boardStats(visibleOpen.map((x) => x.task));
  const cutByRadius = openTasks.length - withinRadius.filter((x) => isOpen(x.task)).length;

  // Οι αδειοδοτούμενες κατηγορίες ΔΕΝ κρύβονται ποτέ αυτόματα: δεν επιτρέπεται
  // αυτόματος κανόνας να εξαφανίζει τη νομικά ευαίσθητη ταξινομία.
  const shownCategories = allCategories
    ? CATEGORIES
    : CATEGORIES.filter(
        (c) => (categoryCounts.get(c.key) ?? 0) > 0 || c.licensed || c.key === active,
      );
  const hiddenCategoryCount = CATEGORIES.length - shownCategories.length;

  const mapTasks = useMemo(
    () => visible.map((x) => x.task).filter((t) => AREA_COORDS[t.area]),
    [visible],
  );

  // Βαθύς σύνδεσμος από την αρχική: /tasknow?task=...
  useEffect(() => {
    if (!openTaskId) return;
    const t = tasks.find((x) => x.id === openTaskId);
    if (t) setDetail(t);
  }, [openTaskId, tasks]);

  const liveDetail = detail ? (tasks.find((t) => t.id === detail.id) ?? detail) : null;
  const liveOffer = offerFor ? (tasks.find((t) => t.id === offerFor.id) ?? offerFor) : null;

  return (
    <div>
      {/* ── Μπάρα ταμπλό: ποιοι είμαστε, ότι είναι μακέτα, και το ανέβασμα ── */}
      <div className="sticky top-16 z-30 -mx-4 flex h-14 items-center gap-2 border-b border-gray-100 bg-white/95 px-4 backdrop-blur sm:mx-0 sm:rounded-t-2xl sm:px-5">
        <TaskNowLogo className="text-base" markClassName="h-5 w-5" />
        <span className="rounded bg-gray-900 px-1.5 py-0.5 text-[11px] font-bold tracking-wide text-amber-300">
          ΜΑΚΕΤΑ
        </span>
        <PostTaskButton
          ariaLabel="Ανέβασε δουλειά"
          className="ml-auto h-10 shrink-0 rounded-xl bg-amber-500 px-4 text-sm font-semibold text-white transition hover:bg-amber-600"
        >
          <span className="hidden sm:inline">Ανέβασε δουλειά — δωρεάν</span>
          <span className="sm:hidden">Ανέβασε</span>
        </PostTaskButton>
      </div>

      {/* ── Το άγκιστρο: αριθμοί, όχι λόγια ── */}
      <div className="px-0 py-3">
        <p className="text-[15px] font-semibold tabular-nums text-gray-900">
          {stats.count} ανοιχτές μικροδουλειές
          {stats.min !== null && stats.max !== null && (
            <> · {stats.min}€–{stats.max}€ ανά δουλειά</>
          )}
        </p>
        <p className="mt-0.5 text-xs text-gray-600">
          Διάλεξε μια δουλειά και πρότεινε δικό σου ποσό. Τα ποσά τα ορίζει αυτός που
          ανέβασε τη δουλειά.
        </p>
        <p className="mt-0.5 text-xs text-gray-600">
          Η επιλογή και η συμφωνία γίνονται{' '}
          <a href="#efthyni" className="font-semibold underline">
            με δική σου ευθύνη
          </a>
          .
        </p>
      </div>

      {/* ── Γειτονιές: περιεχόμενο ΚΑΙ χειριστήριο ── */}
      <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {geoAllowed && (
          <button
            type="button"
            onClick={locate}
            disabled={locating}
            className={
              'flex h-14 shrink-0 snap-start flex-col justify-center rounded-xl px-3.5 text-left transition disabled:opacity-60 ' +
              (centerSource === 'geo'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-900/90 text-white hover:bg-gray-900')
            }
          >
            <span className="text-sm font-semibold">
              <span aria-hidden="true">📍</span> {locating ? 'Ψάχνω…' : 'Κοντά μου'}
            </span>
            <span className="text-[11px] text-white/70">με την τοποθεσία σου</span>
          </button>
        )}

        {centerSource !== 'default' && (
          <button
            type="button"
            onClick={resetArea}
            className="flex h-14 shrink-0 snap-start items-center rounded-xl border border-gray-200 bg-white px-3.5 text-sm font-medium text-gray-600 transition hover:border-gray-300"
          >
            ✕ Όλη η πόλη
          </button>
        )}

        {areas.map((a) => (
          <button
            key={a.area}
            type="button"
            onClick={() => pickArea(a.area)}
            aria-pressed={centerSource === 'area' && centerLabel === a.area}
            className={
              'flex h-14 shrink-0 snap-start flex-col justify-center rounded-xl border px-3.5 text-left transition ' +
              (centerSource === 'area' && centerLabel === a.area
                ? 'border-gray-900 bg-gray-900 text-white'
                : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300')
            }
          >
            <span className="text-sm font-semibold">{a.area}</span>
            <span
              className={
                'text-[11px] tabular-nums ' +
                (centerSource === 'area' && centerLabel === a.area
                  ? 'text-white/70'
                  : 'text-gray-500')
              }
            >
              {a.count} · έως {a.max}€
            </span>
          </button>
        ))}
      </div>

      {locError && <p className="mt-2 text-xs font-medium text-red-600">{locError}</p>}

      {/* ── Χειριστήρια σε μία γραμμή ── */}
      <div className="-mx-4 mt-3 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <label className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 text-[13px] font-medium text-gray-700">
          <span className="text-gray-400">Σειρά:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="bg-transparent font-semibold outline-none"
          >
            {(Object.keys(SORT_LABEL) as Sort[]).map((k) => (
              <option key={k} value={k}>
                {SORT_LABEL[k]}
              </option>
            ))}
          </select>
        </label>

        {RADIUS_OPTIONS.map((r) => (
          <Pill key={r.label} active={radius === r.km} onClick={() => setRadius(r.km)}>
            {r.label}
          </Pill>
        ))}

        <span className="h-6 w-px shrink-0 bg-gray-200" aria-hidden="true" />

        <Pill active={active === null} onClick={() => setActive(null)}>
          Όλα {visibleOpen.length > 0 && <span className="tabular-nums">{openTasks.length}</span>}
        </Pill>
        {shownCategories.map((c) => {
          const n = categoryCounts.get(c.key) ?? 0;
          return (
            <Pill key={c.key} active={active === c.key} onClick={() => setActive(c.key)}>
              <span aria-hidden="true" className="mr-1">
                {c.icon}
              </span>
              {c.label}
              {c.licensed && <span className="ml-1 text-[10px] opacity-70">άδεια</span>}
              <span className="ml-1 tabular-nums opacity-60">{n}</span>
            </Pill>
          );
        })}
        {hiddenCategoryCount > 0 && (
          <button
            type="button"
            onClick={() => setAllCategories((v) => !v)}
            className="h-9 shrink-0 rounded-full border border-dashed border-gray-300 px-3 text-[13px] font-medium text-gray-500 transition hover:border-gray-400"
          >
            {allCategories ? 'λιγότερες' : `+${hiddenCategoryCount} ακόμη`}
          </button>
        )}

        <span className="h-6 w-px shrink-0 bg-gray-200" aria-hidden="true" />

        <Pill active={view === 'map'} onClick={() => setView(view === 'map' ? 'list' : 'map')}>
          🗺 Χάρτης
        </Pill>
      </div>

      {/* ── Το ταμπλό ── */}
      {view === 'map' ? (
        <div className="mt-4">
          <TaskMap
            tasks={mapTasks}
            center={center}
            centerLabel={centerLabel}
            radiusKm={radius}
            selectedId={detail?.id ?? null}
            onSelect={(t) => setDetail(t)}
          />
          <p className="mt-2 text-center text-xs text-gray-400">
            Πάτησε πάνω σε ένα ποσό για να δεις τη μικροδουλειά.
          </p>
        </div>
      ) : visible.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <p className="text-sm font-medium text-gray-900">Δεν υπάρχει τίποτα εδώ.</p>
          <p className="mt-1 text-sm text-gray-500">
            Δοκίμασε μεγαλύτερη ακτίνα ή άλλη κατηγορία.
          </p>
          <button
            type="button"
            onClick={() => setRadius(null)}
            className="mt-3 text-sm font-semibold text-amber-600 hover:text-amber-700"
          >
            Δες όλη την πόλη
          </button>
        </div>
      ) : (
        <div className="-mx-4 mt-3 divide-y divide-gray-100 border-y border-gray-100 bg-white sm:mx-0 sm:rounded-b-2xl sm:border-x">
          {visible.slice(0, 6).map(({ task, km }) => (
            <Row
              key={task.id}
              task={task}
              km={km}
              source={centerSource}
              centerLabel={centerLabel}
              onOpen={() => setDetail(task)}
              onOffer={() => setOfferFor(task)}
            />
          ))}

          {/* Το «ανέβασε κι εσύ» μπαίνει ΜΕΣΑ στη λίστα, όχι από πάνω:
              κάθε pixel πάνω από τη ροή είναι pixel που δεν δείχνει ποσό. */}
          <div className="border-y border-amber-200 bg-amber-50 px-4 py-4 text-center">
            <p className="text-sm font-bold text-gray-900">Χρειάζεσαι εσύ χέρια;</p>
            <p className="mt-0.5 text-xs text-gray-600">
              Ανέβασε δουλειά δωρεάν και δέξου προσφορές.
            </p>
            <PostTaskButton className="mt-3 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600">
              Ανέβασε δουλειά
            </PostTaskButton>
          </div>

          {visible.slice(6).map(({ task, km }) => (
            <Row
              key={task.id}
              task={task}
              km={km}
              source={centerSource}
              centerLabel={centerLabel}
              onOpen={() => setDetail(task)}
              onOffer={() => setOfferFor(task)}
            />
          ))}
        </div>
      )}

      {/* ── Πόσα βλέπεις, πόσα υπάρχουν ── */}
      <p className="mt-3 text-center text-xs text-gray-400" aria-live="polite">
        <span className="tabular-nums">{visibleOpen.length}</span> από{' '}
        <span className="tabular-nums">{openTasks.length}</span> μικροδουλειές
        {visibleStats.min !== null && visibleStats.max !== null && (
          <>
            {' · '}
            <span className="tabular-nums">
              {visibleStats.min}€–{visibleStats.max}€
            </span>{' '}
            ανά δουλειά
          </>
        )}
        {cutByRadius > 0 && (
          <>
            {' · '}
            <button
              type="button"
              onClick={() => setRadius(null)}
              className="font-medium text-amber-600 underline hover:text-amber-700"
            >
              {cutByRadius} ακόμη πιο μακριά — άνοιξε την ακτίνα
            </button>
          </>
        )}
      </p>

      <div className="mt-3 text-center">
        <button
          type="button"
          onClick={resetMock}
          className="text-[11px] font-medium text-gray-400 underline hover:text-gray-600"
        >
          Καθάρισε τη μακέτα και ξεκίνα από την αρχή
        </button>
      </div>

      {liveDetail && (
        <TaskDetailModal
          task={liveDetail}
          center={center}
          centerSource={centerSource}
          centerLabel={centerLabel}
          onClose={() => setDetail(null)}
          onMakeOffer={(t) => {
            setDetail(null);
            setOfferFor(t);
          }}
        />
      )}

      {liveOffer && <OfferModal task={liveOffer} onClose={() => setOfferFor(null)} />}
    </div>
  );
}
