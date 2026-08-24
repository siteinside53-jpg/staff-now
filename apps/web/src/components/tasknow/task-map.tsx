'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
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

/**
 * Ο πάροχος του υποβάθρου. Άλλαξε ΜΟΝΟ αυτές τις δύο γραμμές για άλλον.
 *
 * ΓΙΑΤΙ CARTO ΚΑΙ ΟΧΙ ΣΚΕΤΟ OPENSTREETMAP: το βασικό σχέδιο του OSM είναι
 * φτιαγμένο για να διαβάζεις τον χάρτη — έντονα χρώματα, πολλές λεπτομέρειες,
 * κόκκινοι δρόμοι. Όταν από πάνω μπαίνουν δεκάδες πινέζες με ποσά, γίνεται
 * φασαρία και δεν ξεχωρίζει τίποτα. Το σχέδιο της CARTO είναι ξεπλυμένο
 * επίτηδες, ώστε να ξεχωρίζει ό,τι βάζεις εσύ από πάνω. Τα δεδομένα είναι τα
 * ίδια του OpenStreetMap, γι' αυτό αναφέρονται και οι δύο — υποχρεωτικά.
 */
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>';

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
  youAreHere = false,
}: {
  tasks: MockTask[];
  center: Coords;
  centerLabel: string;
  radiusKm: number | null;
  selectedId?: string | null;
  onSelect: (task: MockTask) => void;
  /** «Ψάξε σε αυτή την περιοχή» — δίνει τα όρια της οθόνης του χάρτη. */
  onSearchHere?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  /** Να μπει μπλε κουκκίδα στο σημείο του χρήστη (όταν το έχει δηλώσει). */
  youAreHere?: boolean;
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
  const ringRef = useRef<any>(null);
  /** Η μπλε κουκκίδα «εδώ είσαι» — ζει έξω από την ομαδοποίηση. */
  const meRef = useRef<any>(null);
  /*
    ΓΙΑΤΙ ΧΡΕΙΑΖΕΤΑΙ ΣΗΜΑΙΑ ΚΑΙ ΔΕΝ ΑΡΚΕΙ Η ΑΝΑΦΟΡΑ.

    Ο χάρτης στήνεται ασύγχρονα (κατεβαίνει πρώτα η βιβλιοθήκη). Το πέρασμα που
    βάζει τις πινέζες έτρεχε πριν προλάβει να φτιαχτεί η ομάδα, έβρισκε άδειο
    και σταματούσε — και δεν ξανάτρεχε ποτέ, γιατί τίποτα από όσα παρακολουθεί
    δεν άλλαζε. Αποτέλεσμα: χάρτης με δρόμους και ΚΑΜΙΑ πινέζα.

    Η σημαία αλλάζει κατάσταση μόλις ο χάρτης είναι έτοιμος, οπότε το πέρασμα
    ξανατρέχει από μόνο του.
  */
  const [ready, setReady] = useState(false);
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

      L.tileLayer(TILE_URL, {
        attribution: TILE_ATTRIBUTION,
        maxZoom: 20,
        subdomains: 'abcd',
      }).addTo(map);

      /*
        ΟΜΑΔΟΠΟΙΗΣΗ: όταν δύο πινέζες πέφτουν η μία πάνω στην άλλη, δεν διαβάζεις
        καμία από τις δύο. Και με πενήντα, ο χάρτης γίνεται τοίχος από ποσά.

        Οι πινέζες που είναι κοντά γίνονται ΕΝΑΣ κύκλος με τον αριθμό τους. Το
        πάτημα ανοίγει την περιοχή. Έτσι από μακριά βλέπεις «πού υπάρχει
        κίνηση» και πλησιάζοντας βλέπεις τι ακριβώς.
      */
      await import('leaflet.markercluster');
      layerRef.current = (L as any)
        .markerClusterGroup({
          showCoverageOnHover: false,
          spiderfyOnMaxZoom: true,
          maxClusterRadius: 45,
          iconCreateFunction: (cluster: any) => {
            const n = cluster.getChildCount();
            const size = n < 10 ? 34 : n < 50 ? 40 : 46;
            return L.divIcon({
              className: '',
              html:
                `<span style="display:flex;align-items:center;justify-content:center;` +
                `width:${size}px;height:${size}px;margin:${-size / 2}px 0 0 ${-size / 2}px;` +
                `border-radius:9999px;background:#f59e0b;color:#fff;border:3px solid #fff;` +
                `font:800 ${n < 100 ? 14 : 12}px/1 Inter,system-ui,sans-serif;` +
                `box-shadow:0 2px 8px rgba(0,0,0,.28)">${n}</span>`,
              iconSize: [0, 0],
              iconAnchor: [0, 0],
            });
          },
        })
        .addTo(map);
      mapRef.current = map;
      setReady(true);
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
        ringRef.current = null;
        meRef.current = null;
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

      // Ο κύκλος της ακτίνας δεν μπαίνει στην ομάδα — δεν είναι πινέζα και δεν
      // πρέπει να μετριέται μαζί με τις δουλειές.
      if (ringRef.current) {
        map.removeLayer(ringRef.current);
        ringRef.current = null;
      }
      if (radiusKm) {
        ringRef.current = L.circle([center.lat, center.lon], {
          radius: radiusKm * 1000,
          color: '#f59e0b',
          weight: 1,
          fillColor: '#f59e0b',
          fillOpacity: 0.05,
        }).addTo(map);
      }

      /*
        ΠΟΥ ΕΙΣΑΙ ΕΣΥ.

        Ο χάρτης έδειχνε μόνο τις δουλειές. Πατούσες «Κοντά μου», η λίστα
        φιλτραριζόταν σωστά, αλλά πάνω στον χάρτη δεν φαινόταν πουθενά το δικό
        σου σημείο — οπότε δεν είχες τρόπο να κρίνεις αν το «3 χλμ» είναι κοντά
        ή μακριά, ούτε καν αν σε βρήκε σωστά.
      */
      if (meRef.current) {
        map.removeLayer(meRef.current);
        meRef.current = null;
      }
      if (youAreHere) {
        const meIcon = L.divIcon({
          className: '',
          html:
            '<span style="display:block;width:16px;height:16px;margin:-8px 0 0 -8px;' +
            'border-radius:9999px;background:#2563eb;border:3px solid #fff;' +
            'box-shadow:0 0 0 3px rgba(37,99,235,.25),0 1px 4px rgba(0,0,0,.35)"></span>',
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });
        /* ΑΠΕΥΘΕΙΑΣ ΣΤΟΝ ΧΑΡΤΗ, ΟΧΙ ΣΤΗΝ ΟΜΑΔΟΠΟΙΗΣΗ. Μέσα στην ομάδα η κουκκίδα
           καταπίνεται από το σύμπλεγμα και μετριέται σαν δουλειά — δηλαδή
           εξαφανίζεται ακριβώς εκεί που έχει σημασία, στο κέντρο της πόλης. */
        meRef.current = L.marker([center.lat, center.lon], {
          icon: meIcon,
          title: `Εδώ είσαι — ${centerLabel}`,
          zIndexOffset: 1000,
          interactive: false,
        }).addTo(map);
      }

      for (const t of tasks as TaskPoint[]) {
        const p = pointOf(t);
        if (!p) continue;
        pts.push([p.lat, p.lon]);


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
      } else if (radiusKm && ringRef.current) {
        /*
          ΟΤΑΝ Ο ΧΡΗΣΤΗΣ ΕΧΕΙ ΠΕΙ ΠΟΥ ΕΙΝΑΙ, Ο ΧΑΡΤΗΣ ΚΕΝΤΡΑΡΕΙ ΠΑΝΩ ΤΟΥ.

          Πριν, ο χάρτης χώραγε όλες τις πινέζες. Το αποτέλεσμα ήταν ότι μετά
          το «Κοντά μου» έβλεπες μια εικόνα κεντραρισμένη κάπου ανάμεσα στις
          δουλειές — όχι πάνω σου. Τώρα δείχνει ακριβώς τον κύκλο της ακτίνας
          που διάλεξες, με εσένα στη μέση.
        */
        map.fitBounds(ringRef.current.getBounds(), { animate: false });
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
  }, [ready, tasks, center.lat, center.lon, centerLabel, radiusKm, selectedId, autoFit, youAreHere]);

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
      {/* Ο μετρητής πάνω από τον χάρτη: το πρώτο που θέλει να ξέρει κάποιος
          που ανοίγει χάρτη είναι «έχει πράγματα εδώ;». */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
        <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-bold text-white">
          {tasks.length} {tasks.length === 1 ? 'μικροδουλειά' : 'μικροδουλειές'} στον χάρτη
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: '#f59e0b' }}
          />
          ζητάνε χέρια
        </span>
      </div>

      <div
        ref={holder}
        className="h-80 w-full sm:h-[28rem]"
        role="application"
        aria-label={`Χάρτης με ${tasks.length} μικροδουλειές γύρω από ${centerLabel}`}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-3 py-2">
        <p className="text-[11px] leading-snug text-gray-500">
          Οι θέσεις είναι κατά προσέγγιση — ο κύκλος δείχνει τετράγωνο ~500 μ., όχι διεύθυνση.
          {nearest !== null && Number.isFinite(nearest) && (
            <>
              {' '}
              Πιο κοντινή:{' '}
              {/* «0 μ.» διαβάζεται σαν χαλασμένος υπολογισμός. Κάτω από 100 μέτρα
                  η ακρίβεια δεν έχει νόημα ούτως ή άλλως — το σημείο είναι
                  κουμπωμένο σε τετράγωνο 500 μέτρων. */}
              {nearest < 0.1
                ? 'εδώ δίπλα'
                : nearest < 1
                  ? `${Math.round(nearest * 1000)} μ.`
                  : `${nearest.toFixed(1)} χλμ`}
              .
            </>
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
