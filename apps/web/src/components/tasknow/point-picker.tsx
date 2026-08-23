'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import { AREA_COORDS, type Coords } from './data';

/**
 * «Δείξε πού» — η πινέζα την ώρα του ανεβάσματος.
 *
 * ΓΙΑΤΙ ΧΡΕΙΑΖΕΤΑΙ: η γειτονιά από λίστα δεν φτάνει. Έντεκα γειτονιές σημαίνει
 * ότι κάθε δουλειά της Καλαμαριάς κάθεται στο ίδιο σημείο, και ο χάρτης δεν
 * λέει τίποτα σε αυτόν που ψάχνει «τι υπάρχει κοντά μου».
 *
 * ΕΙΝΑΙ ΠΡΟΑΙΡΕΤΙΚΗ, ΕΠΙΤΗΔΕΣ. Δεν κλειδώνουμε το ανέβασμα πίσω από πινέζα:
 * κάποιος ανεβάζει από υπολογιστή χωρίς να ξέρει ακριβώς, ή η δουλειά είναι εξ
 * αποστάσεως. Ένα υποχρεωτικό βήμα εδώ κόβει ανεβάσματα — και το ζητούμενο
 * είναι να ανεβαίνουν δουλειές.
 *
 * ΤΙ ΒΛΕΠΕΙ Ο ΚΟΣΜΟΣ: όχι αυτό το σημείο. Ο server το μετατοπίζει κατά ~300
 * μέτρα πριν το στείλει σε οποιονδήποτε άλλον. Την ακριβή θέση τη μαθαίνει
 * μόνο αυτός που θα επιλεγεί. Γι' αυτό το γράφουμε και εδώ, κάτω από τον
 * χάρτη: ο χρήστης πρέπει να ξέρει τι δίνει και τι όχι.
 */
export function PointPicker({
  area,
  value,
  onChange,
}: {
  area: string;
  value: Coords | null;
  onChange: (p: Coords | null) => void;
}) {
  const holder = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !holder.current || mapRef.current) return;

      const start = AREA_COORDS[area] ?? AREA_COORDS['Κέντρο']!;
      const map = L.map(holder.current, { zoomControl: true, scrollWheelZoom: false }).setView(
        [value?.lat ?? start.lat, value?.lon ?? start.lon],
        15,
      );
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({
        className: '',
        html:
          '<span style="display:block;width:18px;height:18px;margin:-9px 0 0 -9px;' +
          'border-radius:9999px;background:#f59e0b;border:3px solid #fff;' +
          'box-shadow:0 1px 4px rgba(0,0,0,.35)"></span>',
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      map.on('click', (e: any) => {
        const p = { lat: +e.latlng.lat.toFixed(6), lon: +e.latlng.lng.toFixed(6) };
        if (markerRef.current) markerRef.current.setLatLng([p.lat, p.lon]);
        else markerRef.current = L.marker([p.lat, p.lon], { icon }).addTo(map);
        changeRef.current(p);
      });
      map.on('click', () => map.scrollWheelZoom.enable());
      map.on('mouseout', () => map.scrollWheelZoom.disable());

      if (value) markerRef.current = L.marker([value.lat, value.lon], { icon }).addTo(map);
      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Αλλάζοντας γειτονιά, ο χάρτης πάει εκεί — αλλά η πινέζα που έβαλε ο χρήστης
  // ΔΕΝ σβήνεται: μπορεί να διάλεξε γειτονιά αφού είχε ήδη δείξει το σημείο.
  useEffect(() => {
    const map = mapRef.current;
    const c = AREA_COORDS[area];
    if (map && c && !markerRef.current) map.setView([c.lat, c.lon], 15, { animate: false });
  }, [area]);

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <div ref={holder} className="h-44 w-full" role="application" aria-label="Διάλεξε σημείο" />
      </div>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] leading-snug text-gray-500">
          {value ? (
            <>
              ✓ Σημείο ορίστηκε. Δημόσια φαίνεται{' '}
              <strong className="font-semibold">περιοχή ~300 μ.</strong>, όχι η διεύθυνση — την
              ακριβή τη μαθαίνει μόνο όποιον διαλέξεις.
            </>
          ) : (
            <>Πάτησε στον χάρτη για να δείξεις πού. Προαιρετικό, αλλά σε βρίσκουν πιο εύκολα.</>
          )}
        </p>
        {value && (
          <button
            type="button"
            onClick={() => {
              if (markerRef.current && mapRef.current) {
                mapRef.current.removeLayer(markerRef.current);
                markerRef.current = null;
              }
              onChange(null);
            }}
            className="shrink-0 text-[11px] font-medium text-gray-400 underline hover:text-gray-600"
          >
            καθάρισε
          </button>
        )}
      </div>
    </div>
  );
}
