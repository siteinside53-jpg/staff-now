'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import { AREA_COORDS, type Coords, distanceKm } from './data';
import type { MockTask } from './mock-store';

/**
 * Ο χάρτης με τις μικροδουλειές — με πραγματικούς δρόμους.
 *
 * ΤΙ ΗΤΑΝ ΠΡΙΝ: λευκό φόντο με κάνναβο και πινέζες. Οι αποστάσεις ήταν σωστές,
 * αλλά χωρίς δρόμους από κάτω ο χάρτης δεν έλεγε τίποτα σε κανέναν — και οι
 * πινέζες ήταν ανά ΓΕΙΤΟΝΙΑ, δηλαδή όλες οι δουλειές της Καλαμαριάς κάθονταν
 * στο ίδιο ακριβώς σημείο.
 *
 * ΓΙΑΤΙ OPENSTREETMAP: δωρεάν, χωρίς λογαριασμό και χωρίς κάρτα, οπότε δεν
 * μπλοκάρει το ξεκίνημα σε απόφαση κόστους. Ο πάροχος αλλάζει από ΜΙΑ γραμμή
 * (`TILE_URL`) — αν κάποτε χρειαστεί Mapbox ή Google, δεν ξαναγράφεται τίποτα.
 * Η αναφορά στο υπόμνημα είναι ΥΠΟΧΡΕΩΤΙΚΗ από τους όρους χρήσης· μη τη βγάλεις.
 *
 * Η ΘΕΣΗ ΤΩΝ ΠΙΝΕΖΩΝ: το ακριβές σημείο δεν φτάνει ποτέ εδώ για τους ξένους —
 * ο server το έχει ήδη μετατοπίσει πριν το στείλει. Ο κύκλος γύρω από την
 * πινέζα δεν είναι διακοσμητικός: λέει «κάπου εδώ γύρω», που είναι η αλήθεια.
 */

/** Ο πάροχος του υποβάθρου. Άλλαξε ΜΟΝΟ αυτές τις δύο γραμμές για άλλον. */
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

/** Πόσο μεγάλος είναι ο κύκλος «κάπου εδώ γύρω». Ίδιος με του server. */
const APPROX_RADIUS_M = 300;

type TaskPoint = MockTask & { lat?: number; lon?: number; exactPoint?: boolean };

/** Πού κάθεται μια δουλειά: το σημείο της, αλλιώς η γειτονιά της. */
function pointOf(t: TaskPoint): Coords | null {
  if (typeof t.lat === 'number' && typeof t.lon === 'number') return { lat: t.lat, lon: t.lon };
  return AREA_COORDS[t.area] ?? null;
}

export function TaskMap({
  tasks,
  center,
  centerLabel,
  radiusKm,
  selectedId,
  onSelect,
  onSearchHere,
  autoFit = true,
}: {
  tasks: MockTask[];
  center: Coords;
  centerLabel: string;
  radiusKm: number | null;
  selectedId?: string | null;
  onSelect: (task: MockTask) => void;
  /** «Ψάξε σε αυτή την περιοχή» — δίνει τα όρια της οθόνης του χάρτη. */
  onSearchHere?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  /**
   * Να προσαρμόζεται μόνος του ώστε να χωράνε όλες οι πινέζες;
   *
   * ΟΧΙ αφού ο χρήστης πατήσει «ψάξε σε αυτή την περιοχή»: εκείνος διάλεξε τι
   * κοιτάει, και μια αυτόματη προσαρμογή θα του ξανάνοιγε αμέσως τον χάρτη
   * ακυρώνοντας ό,τι μόλις έκανε.
   */
  autoFit?: boolean;
}) {
  const holder = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  /* Η τελευταία επιλογή, ώστε το κλικ στην πινέζα να μη χρειάζεται να
     ξαναδημιουργεί τον χάρτη σε κάθε αλλαγή. */
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  // ── Ο χάρτης φτιάχνεται ΜΙΑ φορά ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let map: any = null;

    (async () => {
      // Δυναμική εισαγωγή: το Leaflet αγγίζει το `window`, οπότε δεν επιτρέπεται
      // να τρέξει την ώρα του χτισίματος της στατικής έκδοσης.
      const L = (await import('leaflet')).default;
      if (cancelled || !holder.current || mapRef.current) return;

      map = L.map(holder.current, {
        zoomControl: true,
        // Ο χάρτης είναι βοηθητικός, όχι ο κύριος τρόπος περιήγησης: αν έπιανε
        // τον τροχό, ο χρήστης θα κόλλαγε μέσα του κατεβαίνοντας τη σελίδα.
        scrollWheelZoom: false,
      }).setView([center.lat, center.lon], 13);

      L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      // Το ζουμ με τον τροχό ανοίγει μόλις ο χρήστης πατήσει μέσα στον χάρτη —
      // τότε ξέρουμε ότι όντως τον χρησιμοποιεί.
      map.on('click', () => map.scrollWheelZoom.enable());
      map.on('mouseout', () => map.scrollWheelZoom.disable());
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layerRef.current = null;
      }
    };
    // Ο χάρτης δεν ξαναφτιάχνεται όταν αλλάξει το κέντρο — μετακινείται πιο κάτω.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Οι πινέζες ξαναζωγραφίζονται όταν αλλάξουν τα δεδομένα ────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      const map = mapRef.current;
      const layer = layerRef.current;
      if (cancelled || !map || !layer) return;
      layer.clearLayers();

      const pts: [number, number][] = [];

      // Ο κύκλος της ακτίνας αναζήτησης, γύρω από το κέντρο.
      if (radiusKm) {
        L.circle([center.lat, center.lon], {
          radius: radiusKm * 1000,
          color: '#f59e0b',
          weight: 1,
          fillColor: '#f59e0b',
          fillOpacity: 0.06,
        }).addTo(layer);
      }

      for (const t of tasks as TaskPoint[]) {
        const p = pointOf(t);
        if (!p) continue;
        pts.push([p.lat, p.lon]);

        // Όσο το σημείο είναι κατά προσέγγιση, ο κύκλος το λέει καθαρά.
        if (!t.exactPoint) {
          L.circle([p.lat, p.lon], {
            radius: APPROX_RADIUS_M,
            color: '#f59e0b',
            weight: 1,
            opacity: 0.35,
            fillColor: '#f59e0b',
            fillOpacity: 0.08,
          }).addTo(layer);
        }

        const on = selectedId === t.id;
        /* Το ποσό μπαίνει ΠΑΝΩ στην πινέζα: είναι το πρώτο πράγμα που θέλει να
           ξέρει όποιος κοιτάζει χάρτη, και γλιτώνει ένα κλικ ανά δουλειά. */
        const icon = L.divIcon({
          className: '',
          html:
            `<span style="display:inline-flex;align-items:center;gap:2px;` +
            `padding:2px 7px;border-radius:9999px;font:700 12px/1.4 Inter,system-ui,sans-serif;` +
            `white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,.25);` +
            (on
              ? 'background:#111827;color:#fff;'
              : t.isSample
                ? 'background:#fff;color:#6b7280;border:1px solid #d1d5db;'
                : 'background:#f59e0b;color:#fff;') +
            `">${t.budget}€</span>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

        L.marker([p.lat, p.lon], { icon, title: t.title })
          .on('click', () => selectRef.current(t))
          .addTo(layer);
      }

      // Ο χάρτης δείχνει ό,τι υπάρχει — αλλιώς ο χρήστης βλέπει άδεια περιοχή
      // και νομίζει ότι δεν υπάρχουν δουλειές. Αλλά μόνο όσο δεν έχει πάρει
      // εκείνος τα ηνία.
      if (!autoFit) {
        /* ο χρήστης κάδρο έχει διαλέξει — δεν το πειράζουμε */
      } else if (pts.length > 1) {
        map.fitBounds(L.latLngBounds(pts).pad(0.2), { animate: false });
      } else if (pts.length === 1) {
        map.setView(pts[0], 14, { animate: false });
      } else {
        map.setView([center.lat, center.lon], 13, { animate: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tasks, center.lat, center.lon, radiusKm, selectedId, autoFit]);

  const nearest = tasks.length
    ? Math.min(
        ...tasks
          .map((t) => {
            const p = pointOf(t as TaskPoint);
            return p ? distanceKm(center, p) : Infinity;
          })
          .filter((n) => Number.isFinite(n)),
      )
    : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div
        ref={holder}
        className="h-64 w-full sm:h-80"
        role="application"
        aria-label={`Χάρτης με ${tasks.length} μικροδουλειές γύρω από ${centerLabel}`}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-3 py-2">
        <p className="text-[11px] leading-snug text-gray-500">
          Οι θέσεις είναι κατά προσέγγιση — ο κύκλος δείχνει περιοχή, όχι διεύθυνση.
          {nearest !== null && Number.isFinite(nearest) && (
            <> Πιο κοντινή: {nearest < 1 ? `${Math.round(nearest * 1000)} μ.` : `${nearest.toFixed(1)} χλμ`}.</>
          )}
        </p>

        {onSearchHere && (
          <button
            type="button"
            onClick={() => {
              const map = mapRef.current;
              if (!map) return;
              const b = map.getBounds();
              onSearchHere({
                north: b.getNorth(),
                south: b.getSouth(),
                east: b.getEast(),
                west: b.getWest(),
              });
            }}
            className="shrink-0 rounded-full bg-gray-900 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-gray-700"
          >
            Ψάξε σε αυτή την περιοχή
          </button>
        )}
      </div>
    </div>
  );
}
