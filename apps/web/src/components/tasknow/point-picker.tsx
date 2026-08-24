'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { api } from '@/lib/api';
import { AREA_COORDS, distanceKm, shortPlaceLabel, type Coords } from './data';

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
  const iconRef = useRef<any>(null);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;

  /*
    ΓΡΑΨΕ ΤΗ ΔΙΕΥΘΥΝΣΗ — δεν είναι όλοι διατεθειμένοι να ψάξουν σε χάρτη.

    Στο κινητό, το να βρεις τη σωστή γωνία δρόμου με το δάχτυλο είναι δουλειά.
    Ο περισσότερος κόσμος ξέρει τη διεύθυνσή του και θέλει απλώς να τη γράψει.
    Ο χάρτης μένει για διόρθωση: γράφεις «Τσιμισκή 50», πέφτει η πινέζα, και
    μετά την κουνάς λίγο αν χρειάζεται.
  */
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<{ label: string; lat: number; lon: number }[]>([]);
  const [searching, setSearching] = useState(false);
  const [noHits, setNoHits] = useState(false);

  function place(p: Coords) {
    const map = mapRef.current;
    const icon = iconRef.current;
    if (!map || !icon) return;
    if (markerRef.current) markerRef.current.setLatLng([p.lat, p.lon]);
    else {
      void import('leaflet').then((mod) => {
        if (!markerRef.current) {
          markerRef.current = mod.default.marker([p.lat, p.lon], { icon }).addTo(map);
        }
      });
    }
    map.setView([p.lat, p.lon], 16, { animate: false });
    changeRef.current(p);
  }

  async function search() {
    const text = q.trim();
    if (text.length < 3) return;
    setSearching(true);
    setNoHits(false);
    try {
      /* Πού κοιτάει ήδη ο χάρτης — το στέλνουμε ΠΡΙΝ ρωτήσουμε, ώστε η υπηρεσία
         να προτιμήσει αυτή την περιοχή, και ταξινομούμε ξανά από κοντά. */
      const here = mapRef.current
        ? { lat: mapRef.current.getCenter().lat, lon: mapRef.current.getCenter().lng }
        : (AREA_COORDS[area] ?? AREA_COORDS['Κέντρο']!);
      const res: any = await (api as any).tasknow.geocode(text, here);
      const list: { label: string; lat: number; lon: number }[] = res?.data?.results ?? [];
      list.sort((a, b) => distanceKm(here, a) - distanceKm(here, b));
      setHits(list);
      setNoHits(list.length === 0);
    } catch {
      setNoHits(true);
    } finally {
      setSearching(false);
    }
  }

  /*
    ΠΡΟΤΑΣΕΙΣ ΚΑΘΩΣ ΓΡΑΦΕΙΣ.

    Πριν, έπρεπε να πατήσεις «Βρες το» ή Enter. Ο κόσμος γράφει «Κασσάνδρου
    123, Θεσσαλονίκη», περιμένει να πέσει λίστα από κάτω όπως παντού αλλού, δεν
    πέφτει τίποτα, και συμπεραίνει ότι ο χάρτης δεν βρίσκει διευθύνσεις. Η
    διεύθυνση βρισκόταν κανονικά — απλώς κανείς δεν είχε πατήσει το κουμπί.

    Μισό δευτερόλεπτο καθυστέρηση: ούτε ένα αίτημα ανά πλήκτρο, ούτε αναμονή
    που να γίνεται αισθητή. Η υπηρεσία του χάρτη ΔΕΝ ψάχνει μισοτελειωμένες
    λέξεις, οπότε όσο γράφεις μπορεί να μη βρίσκει — και δεν φωνάζουμε
    «δεν βρέθηκε» παρά μόνο όταν σταματήσεις να γράφεις.
  */
  const lastTyped = useRef('');
  useEffect(() => {
    const text = q.trim();
    lastTyped.current = text;
    if (text.length < 3) {
      setHits([]);
      setNoHits(false);
      return;
    }
    const t = setTimeout(() => {
      // Αν στο μεταξύ άλλαξε το κείμενο, το παλιό αίτημα δεν μας ενδιαφέρει.
      if (lastTyped.current === text) void search();
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  /** «Η τοποθεσία μου» — ρίχνει την πινέζα εκεί που είσαι. */
  const [locating, setLocating] = useState(false);
  const [locErr, setLocErr] = useState<string | null>(null);
  function pickMyLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocErr('Ο browser δεν υποστηρίζει τοποθεσία.');
      return;
    }
    setLocating(true);
    setLocErr(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        place({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setHits([]);
        setNoHits(false);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setLocErr(
          err?.code === 1
            ? 'Ο browser δεν δίνει την τοποθεσία. Επίτρεψέ την από το εικονίδιο αριστερά της διεύθυνσης, ή γράψε τη διεύθυνση εδώ πάνω.'
            : 'Δεν βρέθηκε η τοποθεσία. Γράψε τη διεύθυνση ή δείξε το σημείο στον χάρτη.',
        );
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
    );
  }

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
      iconRef.current = icon;

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
      {/* Πρώτα το κείμενο, μετά ο χάρτης: αυτή είναι η σειρά που σκέφτεται ο
          κόσμος — ξέρει τη διεύθυνση, δεν ξέρει το σημείο. */}
      <div className="mb-2 flex gap-2">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setNoHits(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void search();
            }
          }}
          placeholder="π.χ. Τσιμισκή 50, Θεσσαλονίκη"
          className="min-w-0 flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
        />
        <button
          type="button"
          onClick={() => void search()}
          disabled={searching || q.trim().length < 3}
          className="shrink-0 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:opacity-40"
        >
          {searching ? '…' : 'Βρες το'}
        </button>
      </div>

      {/* Η γρήγορη οδός: είσαι ήδη εκεί που θα γίνει η δουλειά. */}
      <button
        type="button"
        onClick={pickMyLocation}
        disabled={locating}
        className="mb-2 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
      >
        <span aria-hidden="true">📍</span> {locating ? 'Ψάχνω…' : 'Η τοποθεσία μου'}
      </button>

      {locErr && <p className="mb-2 text-[11px] leading-snug text-red-600">{locErr}</p>}

      {hits.length > 0 && (
        <ul className="mb-2 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200">
          {hits.map((h, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => {
                  place({ lat: h.lat, lon: h.lon });
                  setHits([]);
                  setQ(h.label.split(',').slice(0, 2).join(',').trim());
                }}
                className="block w-full px-3 py-2 text-left text-xs leading-snug text-gray-700 transition hover:bg-amber-50"
              >
                {(() => {
                  const { main, sub } = shortPlaceLabel(h.label);
                  return (
                    <>
                      <span className="block font-medium text-gray-900">{main}</span>
                      {sub && <span className="block text-[11px] text-gray-500">{sub}</span>}
                    </>
                  );
                })()}
              </button>
            </li>
          ))}
        </ul>
      )}

      {noHits && (
        <p className="mb-2 text-[11px] text-gray-500">
          Δεν βρέθηκε. Δοκίμασε πιο απλά (π.χ. «Τσιμισκή, Θεσσαλονίκη») ή δείξε το στον
          χάρτη.
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200">
        <div ref={holder} className="h-44 w-full" role="application" aria-label="Διάλεξε σημείο" />
      </div>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] leading-snug text-gray-500">
          {value ? (
            <>
              ✓ Σημείο ορίστηκε. Δημόσια φαίνεται{' '}
              <strong className="font-semibold">μόνο το τετράγωνο ~500 μ.</strong> μέσα στο οποίο
              πέφτει — ποτέ η διεύθυνση. Την ακριβή τη μαθαίνει μόνο όποιον διαλέξεις.
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
