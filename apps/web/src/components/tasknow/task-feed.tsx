'use client';

import { useEffect, useMemo, useState } from 'react';
import { OfferModal } from './offer-modal';
import { TaskDetailModal } from './task-detail-modal';
import { TaskMap } from './task-map';
import {
  AREA_COORDS,
  CATEGORIES,
  CATEGORY_BY_KEY,
  DEFAULT_CENTER,
  type Coords,
  distanceKm,
  formatKm,
  isLicensedCategory,
} from './data';
import { useMockTasks, resetMock, isOpen, isPublic, type MockTask } from './mock-store';

/**
 * ΜΑΚΕΤΑ TaskNow — η ροή με τις μικροδουλειές.
 *
 * ΤΟΠΟΘΕΣΙΑ: το «κοντά μου» δουλεύει με πραγματικές συντεταγμένες. Αν ο
 * χρήστης δώσει άδεια τοποθεσίας, το κέντρο γίνεται η θέση του· αλλιώς μένει
 * το κέντρο Θεσσαλονίκης και μπορεί να διαλέξει γειτονιά μόνος του.
 *
 * ΓΙΑΤΙ ΔΕΝ ΖΗΤΑΜΕ ΤΟΠΟΘΕΣΙΑ ΜΟΛΙΣ ΑΝΟΙΞΕΙ Η ΣΕΛΙΔΑ: το παράθυρο του browser
 * που πετάγεται πριν καταλάβεις τι βλέπεις διώχνει κόσμο. Ζητιέται με το που
 * πατήσει «κοντά μου» — και αν έχει ήδη δώσει άδεια, γίνεται μόνο του.
 */

const RADIUS_OPTIONS: { km: number | null; label: string }[] = [
  { km: 2, label: '2 χλμ' },
  { km: 5, label: '5 χλμ' },
  { km: 10, label: '10 χλμ' },
  { km: null, label: 'Όλη η πόλη' },
];

function TaskCard({
  task,
  km,
  onOpen,
  onOffer,
}: {
  task: MockTask;
  km: number | null;
  onOpen: () => void;
  onOffer: () => void;
}) {
  const cat = CATEGORY_BY_KEY[task.category];
  const licensed = isLicensedCategory(task.category);
  const mineOffer = task.offersList.some((o) => o.mine);

  return (
    <article className="group flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-amber-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
          <span aria-hidden="true">{cat?.icon}</span>
          {cat?.label}
        </span>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
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

      <button
        type="button"
        onClick={onOpen}
        className="mt-3 text-left text-base font-semibold leading-snug text-gray-900 hover:underline"
      >
        {task.title}
      </button>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true">📍</span>
          {task.area}
          {km !== null && <span className="text-gray-400">· {formatKm(km)}</span>}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true">🕒</span>
          {task.when}
        </span>
      </div>

      {/* mt-auto: τα κουμπιά όλων των καρτών μιας σειράς μένουν στην ίδια γραμμή */}
      <div className="mt-auto flex items-end justify-between border-t border-gray-100 pt-4">
        <div>
          <div className="text-2xl font-bold tracking-tight text-gray-900">{task.budget}€</div>
          <div className="text-xs text-gray-400">{task.budgetNote ?? 'προϋπολογισμός'}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-amber-700">
            {task.offersList.length} {task.offersList.length === 1 ? 'προσφορά' : 'προσφορές'}
          </div>
          <div className="text-xs text-gray-400">{task.postedAgo}</div>
        </div>
      </div>

      {task.mine ? (
        <button
          type="button"
          onClick={onOpen}
          className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Δες τις προσφορές
        </button>
      ) : mineOffer ? (
        <div className="mt-4 w-full rounded-xl bg-emerald-50 px-4 py-2.5 text-center text-sm font-semibold text-emerald-700">
          ✓ Έστειλες προσφορά
        </div>
      ) : (
        <button
          type="button"
          onClick={onOffer}
          className="mt-4 w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition group-hover:bg-amber-500"
        >
          Κάνε προσφορά
        </button>
      )}
    </article>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        'shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ' +
        (active
          ? 'border-gray-900 bg-gray-900 text-white'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300')
      }
    >
      {children}
    </button>
  );
}

export function TaskFeed() {
  const { tasks } = useMockTasks();

  const [active, setActive] = useState<string | null>(null);
  const [allCategories, setAllCategories] = useState(false);
  const [sort, setSort] = useState<'new' | 'budget' | 'near'>('near');
  const [view, setView] = useState<'list' | 'map'>('list');
  const [radius, setRadius] = useState<number | null>(5);

  const [center, setCenter] = useState<Coords>(DEFAULT_CENTER);
  const [centerLabel, setCenterLabel] = useState('Κέντρο Θεσσαλονίκης');
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  const [detail, setDetail] = useState<MockTask | null>(null);
  const [offerFor, setOfferFor] = useState<MockTask | null>(null);

  // Αν ο χρήστης έχει ΗΔΗ δώσει άδεια τοποθεσίας, τον τοποθετούμε μόνοι μας
  // χωρίς να πεταχτεί παράθυρο. Αν δεν έχει, δεν ρωτάμε — περιμένουμε κλικ.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions) return;
    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((status) => {
        if (status.state === 'granted') locate();
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
        setCenterLabel('Η τοποθεσία σου');
        setLocating(false);
      },
      () => {
        setLocating(false);
        setLocError('Δεν πήραμε την τοποθεσία σου. Διάλεξε περιοχή από τη λίστα.');
      },
      { timeout: 8000 },
    );
  }

  const withDistance = useMemo(() => {
    // Στη ροή μπαίνει μόνο ό,τι δέχεται ακόμη προσφορές: κρυμμένες,
    // ακυρωμένες, σε διαφωνία, ανατεθειμένες και ολοκληρωμένες μένουν έξω.
    //
    // ΕΞΑΙΡΕΣΗ: οι δικές σου δουλειές μένουν ορατές σε κάθε κατάσταση, για να
    // τις παρακολουθείς. Βρέθηκε στη δοκιμή: μια δουλειά που είχε ήδη
    // ολοκληρωθεί εμφανιζόταν σε όλους σαν διαθέσιμη.
    return tasks
      .filter((t) => isOpen(t) || (t.mine && isPublic(t) && !t.hidden))
      .map((task) => {
        const coords = AREA_COORDS[task.area];
        return { task, km: coords ? distanceKm(center, coords) : null };
      });
  }, [tasks, center]);

  const visible = useMemo(() => {
    let list = withDistance;
    if (active) list = list.filter((x) => x.task.category === active);
    if (radius !== null) {
      // Οι δουλειές εξ αποστάσεως δεν έχουν σημείο στον χάρτη — δεν τις κόβει
      // η ακτίνα, γιατί γίνονται από οπουδήποτε.
      list = list.filter((x) => x.km === null || x.km <= radius);
    }
    const sorted = [...list];
    if (sort === 'budget') sorted.sort((a, b) => b.task.budget - a.task.budget);
    if (sort === 'near') sorted.sort((a, b) => (a.km ?? 1e9) - (b.km ?? 1e9));
    // Το «Επείγον» σημαίνει κάτι: κρατάει την αγγελία στην κορυφή, μέσα σε
    // όποια ταξινόμηση κι αν διάλεξε ο χρήστης.
    sorted.sort((a, b) => Number(b.task.urgent === true) - Number(a.task.urgent === true));
    return sorted;
  }, [withDistance, active, radius, sort]);

  // Πόσες ανοιχτές δουλειές έχει κάθε κατηγορία αυτή τη στιγμή.
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const { task } of withDistance) {
      counts.set(task.category, (counts.get(task.category) ?? 0) + 1);
    }
    return counts;
  }, [withDistance]);

  const nonEmptyCategories = CATEGORIES.filter((c) => (categoryCounts.get(c.key) ?? 0) > 0);
  // Η επιλεγμένη κατηγορία μένει πάντα ορατή, ακόμη κι αν αδειάσει —
  // αλλιώς εξαφανίζεται το κουμπί που μόλις πάτησε ο χρήστης.
  const shownCategories = allCategories
    ? CATEGORIES
    : CATEGORIES.filter((c) => (categoryCounts.get(c.key) ?? 0) > 0 || c.key === active);
  const hiddenCategoryCount = CATEGORIES.length - nonEmptyCategories.length;

  const openCount = visible.filter((x) => isOpen(x.task)).length;

  const mapTasks = useMemo(() => visible.map((x) => x.task).filter((t) => AREA_COORDS[t.area]), [visible]);

  return (
    <div>
      {/* Κατηγορίες.
          ΔΕΝ δείχνουμε άδειες κατηγορίες: μια ροή με 13 κουμπιά όπου τα μισά
          δίνουν «τίποτα εδώ» δείχνει νεκρή. Όσες γεμίσουν, εμφανίζονται μόνες
          τους — και όποιος θέλει, ανοίγει όλη τη λίστα. */}
      <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <div className="flex w-max items-center gap-2 sm:w-auto sm:flex-wrap">
          <Chip active={active === null} onClick={() => setActive(null)}>
            Όλα
          </Chip>
          {shownCategories.map((c) => (
            <Chip key={c.key} active={active === c.key} onClick={() => setActive(c.key)}>
              <span aria-hidden="true" className="mr-1.5">
                {c.icon}
              </span>
              {c.label}
              {c.licensed && <span className="ml-1.5 text-[10px] opacity-70">άδεια</span>}
            </Chip>
          ))}
          {hiddenCategoryCount > 0 && (
            <button
              type="button"
              onClick={() => setAllCategories((v) => !v)}
              className="shrink-0 rounded-full border border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-500 transition hover:border-gray-400 hover:text-gray-700"
            >
              {allCategories ? 'λιγότερες' : `+${hiddenCategoryCount} ακόμη`}
            </button>
          )}
        </div>
      </div>

      {/* Τοποθεσία και ακτίνα */}
      <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={locate}
            disabled={locating}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60"
          >
            <span aria-hidden="true">📍</span>
            {locating ? 'Ψάχνω…' : 'Κοντά μου'}
          </button>

          <label className="flex items-center gap-2 text-sm text-gray-600">
            ή περιοχή:
            <select
              value={centerLabel}
              onChange={(e) => {
                const name = e.target.value;
                const c = AREA_COORDS[name];
                if (c) {
                  setCenter(c);
                  setCenterLabel(name);
                  setLocError(null);
                }
              }}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            >
              {centerLabel === 'Η τοποθεσία σου' && (
                <option value="Η τοποθεσία σου">Η τοποθεσία σου</option>
              )}
              {centerLabel === 'Κέντρο Θεσσαλονίκης' && (
                <option value="Κέντρο Θεσσαλονίκης">Κέντρο Θεσσαλονίκης</option>
              )}
              {Object.keys(AREA_COORDS).map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-1.5">
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => setRadius(r.km)}
                aria-pressed={radius === r.km}
                className={
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition ' +
                  (radius === r.km
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
                }
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1 rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setView('list')}
              aria-pressed={view === 'list'}
              className={
                'rounded-lg px-3 py-1.5 text-sm font-medium transition ' +
                (view === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')
              }
            >
              Λίστα
            </button>
            <button
              type="button"
              onClick={() => setView('map')}
              aria-pressed={view === 'map'}
              className={
                'rounded-lg px-3 py-1.5 text-sm font-medium transition ' +
                (view === 'map' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')
              }
            >
              Χάρτης
            </button>
          </div>
        </div>

        {locError && <p className="mt-2 text-xs font-medium text-red-600">{locError}</p>}
      </div>

      {/* Μετρητής και ταξινόμηση */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500" aria-live="polite">
          {/* Μετράμε μόνο όσες δέχονται ακόμη προσφορές. Οι δικές σου
              ανατεθειμένες φαίνονται στη λίστα, αλλά δεν είναι «διαθέσιμες». */}
          <span className="font-semibold text-gray-900">{openCount}</span>{' '}
          {openCount === 1 ? 'μικροδουλειά' : 'μικροδουλειές'}{' '}
          {radius === null ? 'σε όλη την πόλη' : `σε ακτίνα ${radius} χλμ`} από{' '}
          {centerLabel.toLowerCase()}
        </p>
        <div className="flex items-center gap-1 text-sm">
          {(
            [
              ['near', 'Πιο κοντά'],
              ['new', 'Πιο πρόσφατα'],
              ['budget', 'Μεγαλύτερη αμοιβή'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSort(key)}
              aria-pressed={sort === key}
              className={
                'rounded-lg px-3 py-1.5 font-medium transition ' +
                (sort === key ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900')
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Χάρτης ή λίστα */}
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
          <p className="text-sm font-medium text-gray-900">
            Δεν υπάρχει τίποτα εδώ αυτή τη στιγμή.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Δοκίμασε μεγαλύτερη ακτίνα ή άλλη κατηγορία.
          </p>
          <button
            type="button"
            onClick={() => {
              setActive(null);
              setRadius(null);
            }}
            className="mt-3 text-sm font-semibold text-amber-600 hover:text-amber-700"
          >
            Δες τα όλα
          </button>
        </div>
      ) : (
        <div className="mt-4 grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map(({ task, km }) => (
            <TaskCard
              key={task.id}
              task={task}
              km={km}
              onOpen={() => setDetail(task)}
              onOffer={() => setOfferFor(task)}
            />
          ))}
        </div>
      )}

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={resetMock}
          className="text-xs font-medium text-gray-400 underline hover:text-gray-600"
        >
          Καθάρισε τη μακέτα και ξεκίνα από την αρχή
        </button>
      </div>

      {detail && (
        <TaskDetailModal
          task={tasks.find((t) => t.id === detail.id) ?? detail}
          center={center}
          onClose={() => setDetail(null)}
          onMakeOffer={(t) => {
            setDetail(null);
            setOfferFor(t);
          }}
        />
      )}

      {offerFor && (
        <OfferModal
          task={tasks.find((t) => t.id === offerFor.id) ?? offerFor}
          onClose={() => setOfferFor(null)}
        />
      )}
    </div>
  );
}
