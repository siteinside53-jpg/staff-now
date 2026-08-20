'use client';

import { AREA_COORDS, type Coords, distanceKm, formatKm } from './data';
import type { MockTask } from './mock-store';

/**
 * ΜΑΚΕΤΑ — ο χάρτης με τις μικροδουλειές και τα ποσά.
 *
 * ΤΙ ΕΙΝΑΙ ΑΛΗΘΙΝΟ ΕΔΩ: οι συντεταγμένες των γειτονιών και οι αποστάσεις.
 * Το «σε ακτίνα 3 χλμ» υπολογίζεται κανονικά (haversine), οπότε ό,τι βλέπεις
 * μέσα στον κύκλο είναι όντως μέσα στην ακτίνα.
 *
 * ΤΙ ΔΕΝ ΕΙΝΑΙ: υπόβαθρο με δρόμους. Δεν φορτώνουμε πλακίδια χάρτη από τρίτο
 * πάροχο (Google / Mapbox / OpenStreetMap) γιατί αυτό είναι απόφαση με κόστος
 * και όρους χρήσης — δεν την παίρνει μια μακέτα. Οι θέσεις των πινέζων είναι
 * ήδη σε πραγματικές συντεταγμένες, οπότε όταν μπει υπόβαθρο δεν αλλάζει
 * τίποτα άλλο.
 */

const VIEW = 100;

type Placed = { task: MockTask; x: number; y: number; km: number };

/** Χιλιόμετρα ανά μοίρα — αρκετά ακριβές για μία πόλη. */
function toKmOffset(center: Coords, p: Coords) {
  const kmPerLat = 110.574;
  const kmPerLon = 111.32 * Math.cos((center.lat * Math.PI) / 180);
  return { dx: (p.lon - center.lon) * kmPerLon, dy: (center.lat - p.lat) * kmPerLat };
}

export function TaskMap({
  tasks,
  center,
  centerLabel,
  radiusKm,
  selectedId,
  onSelect,
}: {
  tasks: MockTask[];
  center: Coords;
  centerLabel: string;
  radiusKm: number | null;
  selectedId?: string | null;
  onSelect: (task: MockTask) => void;
}) {
  // Πόσα χιλιόμετρα πρέπει να χωρέσει ο χάρτης, ώστε να φαίνονται όλα.
  const offsets = tasks
    .map((t) => {
      const c = AREA_COORDS[t.area];
      return c ? toKmOffset(center, c) : null;
    })
    .filter((o): o is { dx: number; dy: number } => o !== null);

  const needed = Math.max(
    radiusKm ?? 0,
    ...offsets.map((o) => Math.max(Math.abs(o.dx), Math.abs(o.dy))),
    2,
  );
  const span = needed * 1.25;
  const kmToUnits = (km: number) => (km / span) * (VIEW / 2);

  // Πινέζες. Όσες μοιράζονται γειτονιά ανοίγουν λίγο σε κύκλο, για να μην
  // κάθεται η μία πάνω στην άλλη.
  const perArea = new Map<string, number>();
  const placed: Placed[] = [];
  for (const task of tasks) {
    const c = AREA_COORDS[task.area];
    if (!c) continue;
    const seen = perArea.get(task.area) ?? 0;
    perArea.set(task.area, seen + 1);
    const km = distanceKm(center, c);
    // Χρυσή γωνία: οι πινέζες της ίδιας γειτονιάς ανοίγουν σε σπείρα αντί να
    // στοιβάζονται. Και όσες πέφτουν πάνω στο «εσύ» σπρώχνονται λίγο έξω,
    // ώστε να μη σκεπάζουν το σημείο του χρήστη.
    const ring = (km < 0.6 ? 0.7 : 0) + seen * 0.4;
    const angle = seen * 2.399963;
    const { dx, dy } = toKmOffset(center, c);
    placed.push({
      task,
      x: VIEW / 2 + kmToUnits(dx + Math.cos(angle) * ring),
      y: VIEW / 2 + kmToUnits(dy + Math.sin(angle) * ring),
      km,
    });
  }

  const radiusUnits = radiusKm ? kmToUnits(radiusKm) : null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-[#eef2f7]">
      <svg
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        className="block aspect-square w-full sm:aspect-[16/10]"
        role="img"
        aria-label={`Χάρτης με ${placed.length} μικροδουλειές γύρω από ${centerLabel}`}
      >
        <defs>
          <pattern id="tn-grid" width="6.25" height="6.25" patternUnits="userSpaceOnUse">
            <path d="M6.25 0H0V6.25" fill="none" stroke="#d7dee8" strokeWidth="0.25" />
          </pattern>
          <radialGradient id="tn-halo">
            <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
          </radialGradient>
        </defs>

        <rect width={VIEW} height={VIEW} fill="#eef2f7" />
        <rect width={VIEW} height={VIEW} fill="url(#tn-grid)" />

        {/* Η ακτίνα αναζήτησης */}
        {radiusUnits && (
          <>
            <circle cx={VIEW / 2} cy={VIEW / 2} r={radiusUnits} fill="url(#tn-halo)" />
            <circle
              cx={VIEW / 2}
              cy={VIEW / 2}
              r={radiusUnits}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="0.4"
              strokeDasharray="1.6 1.2"
            />
          </>
        )}

        {/* Εσύ */}
        <circle cx={VIEW / 2} cy={VIEW / 2} r="2.2" fill="#2563eb" opacity="0.18" />
        <circle cx={VIEW / 2} cy={VIEW / 2} r="1" fill="#2563eb" stroke="white" strokeWidth="0.35" />

        {/* Οι μικροδουλειές, με το ποσό πάνω στην πινέζα */}
        {placed.map(({ task, x, y, km }) => {
          const label = `${task.budget}€`;
          const w = 5.5 + label.length * 1.9;
          const selected = selectedId === task.id;
          return (
            <g
              key={task.id}
              className="cursor-pointer"
              onClick={() => onSelect(task)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(task);
                }
              }}
            >
              <title>{`${task.title} — ${task.budget}€ · ${task.area} · ${formatKm(km)}`}</title>
              <path
                d={`M ${x} ${y} l -1.5 -2 h 3 z`}
                fill={selected ? '#111827' : '#f59e0b'}
              />
              <rect
                x={x - w / 2}
                y={y - 8}
                width={w}
                height={6}
                rx="3"
                fill={selected ? '#111827' : '#f59e0b'}
                stroke="white"
                strokeWidth="0.5"
              />
              <text
                x={x}
                y={y - 3.8}
                textAnchor="middle"
                fontSize="3.4"
                fontWeight="700"
                fill="white"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Υπόμνημα */}
      <div className="pointer-events-none absolute bottom-2 left-2 rounded-lg bg-white/90 px-2.5 py-1.5 text-[11px] font-medium text-gray-600 shadow-sm">
        <span className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-600 align-middle" /> εσύ
        <span className="mx-1.5 text-gray-300">|</span>
        <span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-500 align-middle" /> μικροδουλειά
      </div>
      <div className="pointer-events-none absolute bottom-2 right-2 rounded-lg bg-white/90 px-2.5 py-1.5 text-[11px] text-gray-500 shadow-sm">
        σχηματικός χάρτης · αληθινές αποστάσεις
      </div>
    </div>
  );
}
