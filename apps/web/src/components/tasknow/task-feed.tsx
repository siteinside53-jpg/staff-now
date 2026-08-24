'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { OfferModal } from './offer-modal';
import { PostTaskButton } from './post-trigger';
import { TaskDetailModal } from './task-detail-modal';
import { TaskMap } from './task-map';
import { LocationGuide } from './location-guide';
import { TaskNowLogo } from './logo';
import { TaskRow } from './task-row';
import {
  FilteredListLayout,
  type FilterGroup,
} from '@/components/marketing/filtered-list-layout';
import {
  AREA_COORDS,
  CATEGORIES,
  CATEGORY_BY_KEY,
  DEFAULT_CENTER,
  type CenterSource,
  type Coords,
  distanceKm,
} from './data';
import {
  areaStats,
  boardStats,
  isOpen,
  isPublic,
  publicOpenTasks,
  useMockTasks,
  type MockTask,
} from './mock-store';

/**
 * ΜΑΚΕΤΑ TaskNow — το ταμπλό με τις μικροδουλειές.
 *
 * ΔΙΑΤΑΞΗ: ίδια με τις αγγελίες εργασίας — αναζήτηση πάνω, φίλτρα αριστερά,
 * αποτελέσματα δεξιά. Χρησιμοποιεί ΤΟ ΙΔΙΟ component (`FilteredListLayout`)
 * που ήδη σερβίρει τη σελίδα αγγελιών: μαζί με τη διάταξη έρχονται δωρεάν το
 * συρτάρι φίλτρων στο κινητό, ο μετρητής και ο «καθαρισμός». Δεύτερη υλοποίηση
 * θα σήμαινε δεύτερο σημείο να χαλάσει.
 *
 * ΑΡΧΗ ΣΧΕΔΙΑΣΗΣ (από τον ιδιοκτήτη): «ο κόσμος κοιτάει πρώτα τι του
 * προσφέρει κάτι». Το ποσό κάθε δουλειάς κάθεται σε δική του στήλη, δεξιά
 * στοιχισμένο, με στοιχισμένα ψηφία.
 *
 * ΤΟΠΟΘΕΣΙΑ: η αρχική ακτίνα είναι «όλη η πόλη». Ακτίνα γύρω από κέντρο που
 * ΔΕΝ διάλεξε ο χρήστης θα έκρυβε δουλειές. Μόλις διαλέξει γειτονιά ή δώσει
 * τοποθεσία, πέφτει στα 5 χλμ και η ταξινόμηση γίνεται «πιο κοντά».
 */

type Sort = 'new' | 'near' | 'budget';

const PREFS_KEY = 'tasknow_prefs_v2';

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

export function TaskFeed({ openTaskId }: { openTaskId?: string | null }) {
  const state = useMockTasks();
  const { tasks } = state;

  const [search, setSearch] = useState('');
  const [cats, setCats] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort>('new');
  const [showMap, setShowMap] = useState(false);
  /**
   * «Ψάξε σε αυτή την περιοχή» — τα όρια της οθόνης του χάρτη.
   *
   * Δουλεύει ΜΑΖΙ με τα υπόλοιπα φίλτρα, όχι αντί γι' αυτά: μπορείς να πεις
   * «καθαριότητα, σε αυτό το κομμάτι της πόλης». Καθαρίζεται με το κουμπί
   * καθαρισμού φίλτρων όπως όλα τα άλλα.
   */
  const [mapBounds, setMapBounds] = useState<
    { north: number; south: number; east: number; west: number } | null
  >(null);
  const [radius, setRadius] = useState<number | null>(null);

  const [center, setCenter] = useState<Coords>(DEFAULT_CENTER);
  const [centerLabel, setCenterLabel] = useState('το κέντρο');
  const [centerSource, setCenterSource] = useState<CenterSource>('default');
  const [locating, setLocating] = useState(false);
  /** Ποιος οδηγός τοποθεσίας είναι ανοιχτός, αν είναι. */
  const [guide, setGuide] = useState<'denied' | 'unavailable' | 'timeout' | null>(null);
  const [locError, setLocError] = useState<string | null>(null);

  /*
    «ΓΡΑΨΕ ΤΗ ΔΙΕΥΘΥΝΣΗ ΣΟΥ» — Η ΔΙΕΞΟΔΟΣ ΟΤΑΝ Ο BROWSER ΑΡΝΕΙΤΑΙ.

    Υπήρχε μόνο στο ανέβασμα δουλειάς. Εδώ, στην αναζήτηση, ο χρήστης είχε δύο
    επιλογές: «Κοντά μου» ή λίστα με γειτονιές. Αν ο browser του είχε αρνηθεί
    την τοποθεσία — και μια άρνηση ΔΕΝ ξαναρωτιέται ποτέ — έμενε κλειδωμένος
    στο «Όλη η Θεσσαλονίκη», ακόμη κι αν ήξερε ακριβώς τη διεύθυνσή του.
  */
  const [addr, setAddr] = useState('');
  const [addrBusy, setAddrBusy] = useState(false);
  const [addrHits, setAddrHits] = useState<{ label: string; lat: number; lon: number }[]>([]);
  const [addrErr, setAddrErr] = useState<string | null>(null);

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
        cats?: string[];
        map?: boolean;
      };
      if (p.sort) setSort(p.sort);
      if (typeof p.map === 'boolean') setShowMap(p.map);
      if (Array.isArray(p.cats)) setCats(p.cats);
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
          cats,
          map: showMap,
        }),
      );
    } catch {}
  }, [centerSource, centerLabel, radius, sort, cats, showMap]);

  // Αν ο χρήστης έχει ΗΔΗ δώσει άδεια τοποθεσίας, τον τοποθετούμε χωρίς να
  // πεταχτεί παράθυρο. Αν την έχει αρνηθεί, το κουμπί δεν εμφανίζεται καν.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions) return;
    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((status) => {
        if (status.state === 'granted') locate();
        /*
          ΤΟ ΚΟΥΜΠΙ ΜΕΝΕΙ. Πριν εξαφανιζόταν, και ο χρήστης δεν είχε κανέναν
          τρόπο να καταλάβει γιατί λείπει ούτε να ξαναδοκιμάσει αφού διορθώσει
          τις ρυθμίσεις. Τώρα φαίνεται, και το πάτημα εξηγεί τι πρέπει να αλλάξει.

          ΔΕΝ ΑΝΟΙΓΟΥΜΕ ΤΟΝ ΟΔΗΓΟ ΜΟΝΟΙ ΜΑΣ ΟΤΑΝ Η ΑΔΕΙΑ ΕΙΝΑΙ ΑΡΝΗΜΕΝΗ.

          Εδώ έμπαινε `setGuide('denied')` με το που φόρτωνε η σελίδα. Ο χρήστης
          άνοιγε τις μικροδουλειές και του πεταγόταν αμέσως παράθυρο «ο Chrome
          δεν μας δίνει την τοποθεσία» — χωρίς να έχει ζητήσει τίποτα. Έμοιαζε
          με βλάβη, έκρυβε τη λίστα, και το χειρότερο: έδινε την εντύπωση ότι
          το κουμπί δεν δουλεύει ενώ δεν το είχε πατήσει ποτέ.

          Ο οδηγός εμφανίζεται πλέον ΜΟΝΟ όταν ο χρήστης πατήσει «Κοντά μου»:
          τότε το getCurrentPosition αποτυγχάνει αμέσως με κωδικό 1 και τον
          ανοίγει από μόνο του, εκεί που έχει και νόημα.
        */
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
      (err) => {
        setLocating(false);
        /*
          ΤΡΕΙΣ ΕΝΤΕΛΩΣ ΔΙΑΦΟΡΕΤΙΚΕΣ ΑΙΤΙΕΣ, ΤΡΙΑ ΔΙΑΦΟΡΕΤΙΚΑ ΜΗΝΥΜΑΤΑ.

          Πριν έγραφε το ίδιο και για τις τρεις: «δεν πήραμε την τοποθεσία σου».
          Η πιο συχνή στην πράξη είναι η ΑΡΝΗΣΗ — και τότε ο browser ΔΕΝ
          ξαναρωτάει ποτέ, όσες φορές κι αν πατήσεις το κουμπί. Ο χρήστης
          νομίζει ότι χάλασε κάτι, ενώ το μόνο που χρειάζεται είναι δύο κλικ
          στις ρυθμίσεις του browser. Χωρίς να του το πούμε, δεν πρόκειται να
          το βρει.
        */
        // Ο οδηγός με τα βήματα, αντί για κόκκινο κειμενάκι που δεν διαβάζεται.
        setGuide(err?.code === 1 ? 'denied' : err?.code === 3 ? 'timeout' : 'unavailable');
        if (err?.code === 1) {
          setLocError(
            'Ο browser δεν μας δίνει την τοποθεσία σου. Στο Safari: Ρυθμίσεις → ' +
              'Ιστότοποι → Τοποθεσία → staffnow.gr → «Να επιτρέπεται». Στο Chrome: ' +
              'το εικονίδιο αριστερά από τη διεύθυνση → Τοποθεσία → Να επιτρέπεται.',
          );
        } else if (err?.code === 3) {
          setLocError('Άργησε πολύ. Δοκίμασε ξανά ή διάλεξε γειτονιά από τη λίστα.');
        } else {
          /*
            Στο Mac αυτό σημαίνει σχεδόν πάντα ότι η τοποθεσία είναι κλειστή σε
            επίπεδο ΣΥΣΤΗΜΑΤΟΣ, όχι browser. Τότε το Safari αποτυγχάνει αμέσως
            χωρίς να ρωτήσει τίποτα — και ο χρήστης ψάχνει στον browser, όπου
            δεν υπάρχει τίποτα να αλλάξει.
          */
          setLocError(
            'Η συσκευή δεν έδωσε τοποθεσία. Σε Mac: Ρυθμίσεις Συστήματος → ' +
              'Απόρρητο και ασφάλεια → Υπηρεσίες τοποθεσίας → ενεργοποίησέ τες και ' +
              'βάλε ✓ στο Safari. Αλλιώς διάλεξε γειτονιά από τη λίστα.',
          );
        }
      },
      {
        // 20 δευτ.: το χρονόμετρο τρέχει ΚΑΙ όσο ο χρήστης διαβάζει την ερώτηση
        // άδειας. Με 8 δευτ. προλάβαινε να λήξει πριν προλάβει εκείνος να πει ναι.
        timeout: 20_000,
        // Δεκτή και θέση των τελευταίων 5 λεπτών: είναι ακαριαία, και για
        // «τι υπάρχει κοντά μου» δεν αλλάζει τίποτα αν κουνήθηκες 100 μέτρα.
        maximumAge: 300_000,
        // Δεν χρειαζόμαστε GPS ακριβείας — μας αρκεί η γειτονιά, και το WiFi
        // απαντάει πολύ πιο γρήγορα και χωρίς να ανάβει ο δέκτης του κινητού.
        enableHighAccuracy: false,
      },
    );
  }

  /** Ψάχνει τη γραμμένη διεύθυνση και δείχνει τα σημεία που ταιριάζουν. */
  async function findAddress() {
    const q = addr.trim();
    if (q.length < 3) {
      setAddrErr('Γράψε λίγο περισσότερο — π.χ. «Τσιμισκή 50, Θεσσαλονίκη».');
      return;
    }
    setAddrErr(null);
    setAddrBusy(true);
    try {
      const res: any = await (api as any).tasknow.geocode(q);
      const hits = res?.data?.results ?? [];
      setAddrHits(hits);
      if (!hits.length) setAddrErr('Δεν βρέθηκε. Δοκίμασε με πόλη, π.χ. «Τσιμισκή 50, Θεσσαλονίκη».');
    } catch {
      setAddrErr('Δεν μπόρεσε να γίνει η αναζήτηση. Δοκίμασε ξανά.');
    } finally {
      setAddrBusy(false);
    }
  }

  /*
    Προτάσεις καθώς γράφεις, ίδια συμπεριφορά με το ανέβασμα δουλειάς. Χωρίς
    αυτό ο χρήστης γράφει και περιμένει λίστα που δεν έρχεται ποτέ, γιατί δεν
    ξέρει ότι πρέπει να πατήσει «Ψάξε».
  */
  const addrTyped = useRef('');
  useEffect(() => {
    const q = addr.trim();
    addrTyped.current = q;
    if (q.length < 3) {
      setAddrHits([]);
      setAddrErr(null);
      return;
    }
    const t = setTimeout(() => {
      if (addrTyped.current === q) void findAddress();
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addr]);

  /** Κεντράρει την αναζήτηση στο σημείο που διάλεξε ο χρήστης. */
  function applyAddress(hit: { label: string; lat: number; lon: number }) {
    setCenter({ lat: hit.lat, lon: hit.lon });
    // Κρατάμε μόνο το πρώτο κομμάτι: το πλήρες κείμενο του χάρτη είναι σεντόνι.
    setCenterLabel(hit.label.split(',')[0]?.trim() || 'τη διεύθυνσή σου');
    setCenterSource('geo');
    setRadius(5);
    setSort('near');
    setAddrHits([]);
    setAddrErr(null);
    setGuide(null);
    setLocError(null);
  }

  function pickArea(area: string) {
    if (!area) {
      setCenter(DEFAULT_CENTER);
      setCenterLabel('το κέντρο');
      setCenterSource('default');
      setRadius(null);
      setSort('new');
      return;
    }
    const c = AREA_COORDS[area];
    if (!c) return;
    setCenter(c);
    setCenterLabel(area);
    setCenterSource('area');
    setRadius(5);
    setSort('near');
    setLocError(null);
  }

  // ── Δεδομένα ─────────────────────────────────────────────────────────────
  const openTasks = publicOpenTasks(state);
  const stats = boardStats(openTasks);
  const areas = areaStats(openTasks);

  const listed = useMemo(() => {
    // Στη ροή μπαίνει ό,τι δέχεται ακόμη προσφορές. Οι δικές σου μένουν
    // ορατές σε κάθε κατάσταση — αλλά δεν μετράνε σε δημόσιο αριθμό.
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
    const q = search.trim().toLowerCase();
    let list = cats.length
      ? withinRadius.filter((x) => cats.includes(x.task.category))
      : withinRadius;

    // Ό,τι φαίνεται στον χάρτη τώρα. Το σημείο έρχεται από τον server· όποια
    // δουλειά δεν έχει, κρίνεται από τη γειτονιά της.
    if (mapBounds) {
      list = list.filter((x) => {
        const t = x.task as any;
        const p =
          typeof t.lat === 'number' && typeof t.lon === 'number'
            ? { lat: t.lat, lon: t.lon }
            : AREA_COORDS[t.area];
        if (!p) return false;
        return (
          p.lat <= mapBounds.north &&
          p.lat >= mapBounds.south &&
          p.lon <= mapBounds.east &&
          p.lon >= mapBounds.west
        );
      });
    }

    if (q) {
      // Η αναζήτηση πιάνει τίτλο, περιγραφή, περιοχή και κατηγορία — ό,τι
      // θα σκεφτόταν κάποιος να πληκτρολογήσει.
      list = list.filter((x) => {
        const t = x.task;
        const hay = [
          t.title,
          t.description ?? '',
          t.area,
          CATEGORY_BY_KEY[t.category]?.label ?? '',
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }

    const sorted = [...list];
    if (sort === 'budget') sorted.sort((a, b) => b.task.budget - a.task.budget);
    else if (sort === 'near') sorted.sort((a, b) => (a.km ?? 1e9) - (b.km ?? 1e9));
    else sorted.sort((a, b) => a.task.postedMinutesAgo - b.task.postedMinutesAgo);
    // Το «Επείγον» κρατάει την κορυφή μέσα σε όποια ταξινόμηση.
    sorted.sort((a, b) => Number(b.task.urgent === true) - Number(a.task.urgent === true));
    return sorted;
  }, [withinRadius, cats, sort, search, mapBounds]);

  const visibleOpen = visible.filter((x) => isOpen(x.task));
  const cutByRadius = openTasks.length - withinRadius.filter((x) => isOpen(x.task)).length;

  /* Στον χάρτη μπαίνει ό,τι έχει θέση: δικό του σημείο ή, αλλιώς, γειτονιά. */
  const mapTasks = useMemo(
    () =>
      visible
        .map((x) => x.task)
        .filter((t) => typeof (t as any).lat === 'number' || AREA_COORDS[t.area]),
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

  // ── Τα φίλτρα ────────────────────────────────────────────────────────────
  // Οι αδειοδοτούμενες κατηγορίες ΔΕΝ κρύβονται ποτέ, ακόμη κι αν είναι άδειες:
  // δεν επιτρέπεται αυτόματος κανόνας να εξαφανίζει τη νομικά ευαίσθητη
  // ταξινομία.
  const groups: FilterGroup[] = [
    {
      key: 'category',
      title: 'Κατηγορία',
      options: CATEGORIES.filter(
        (c) => (categoryCounts.get(c.key) ?? 0) > 0 || c.licensed || cats.includes(c.key),
      ).map((c) => ({
        value: c.key,
        label: `${c.icon} ${c.label}${c.licensed ? ' (άδεια)' : ''}`,
        count: categoryCounts.get(c.key) ?? 0,
      })),
    },
  ];

  const sidebar = (
    <div className="space-y-4">
      {/* Τοποθεσία */}
      <div>
        <p className="mb-2 text-sm font-bold text-gray-900">Περιοχή</p>

        {/* Το κουμπί μένει ΠΑΝΤΑ. Αν λείπει, ο χρήστης δεν έχει τρόπο να
            καταλάβει γιατί, ούτε να ξαναδοκιμάσει αφού φτιάξει τις ρυθμίσεις. */}
        <button
          type="button"
          onClick={locate}
          disabled={locating}
          className="mb-2 w-full rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60"
        >
          <span aria-hidden="true">📍</span> {locating ? 'Ψάχνω…' : 'Κοντά μου'}
        </button>

        {/* Η διέξοδος όταν ο browser αρνείται: γράφεις εσύ πού είσαι. */}
        <div className="mb-2">
          <div className="flex gap-1.5">
            <input
              type="text"
              value={addr}
              onChange={(e) => {
                setAddr(e.target.value);
                setAddrErr(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void findAddress();
                }
              }}
              placeholder="ή γράψε τη διεύθυνσή σου"
              aria-label="Γράψε τη διεύθυνσή σου"
              className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
            />
            <button
              type="button"
              onClick={() => void findAddress()}
              disabled={addrBusy}
              className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 disabled:opacity-60"
            >
              {addrBusy ? '…' : 'Ψάξε'}
            </button>
          </div>

          {addrErr && <p className="mt-1.5 text-xs font-medium text-red-600">{addrErr}</p>}

          {addrHits.length > 0 && (
            <ul className="mt-1.5 space-y-1 rounded-lg border border-gray-200 bg-white p-1">
              {addrHits.map((h) => (
                <li key={`${h.lat},${h.lon}`}>
                  <button
                    type="button"
                    onClick={() => applyAddress(h)}
                    className="w-full rounded-md px-2 py-1.5 text-left text-xs leading-snug text-gray-700 transition hover:bg-amber-50"
                  >
                    {h.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <select
          value={centerSource === 'area' ? centerLabel : ''}
          onChange={(e) => pickArea(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
        >
          <option value="">Όλη η Θεσσαλονίκη</option>
          {areas.map((a) => (
            <option key={a.area} value={a.area}>
              {a.area} ({a.count}) · έως {a.max}€
            </option>
          ))}
        </select>

        {centerSource !== 'default' && (
          <div className="mt-2 flex gap-1.5">
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => setRadius(r.km)}
                aria-pressed={radius === r.km}
                className={
                  'flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition ' +
                  (radius === r.km
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
                }
              >
                {r.label}
              </button>
            ))}
          </div>
        )}

        {locError && <p className="mt-2 text-xs font-medium text-red-600">{locError}</p>}
      </div>

      {/* Σειρά */}
      <div>
        <p className="mb-2 text-sm font-bold text-gray-900">Σειρά</p>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
        >
          {(Object.keys(SORT_LABEL) as Sort[]).map((k) => (
            <option key={k} value={k}>
              {SORT_LABEL[k]}
            </option>
          ))}
        </select>
      </div>

      {/* Χάρτης */}
      <button
        type="button"
        onClick={() => setShowMap((v) => !v)}
        aria-pressed={showMap}
        className={
          'w-full rounded-lg border px-3 py-2 text-sm font-semibold transition ' +
          (showMap
            ? 'border-amber-400 bg-amber-50 text-amber-800'
            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300')
        }
      >
        🗺 {showMap ? 'Κλείσε τον χάρτη' : 'Άνοιξε τον χάρτη'}
      </button>
    </div>
  );

  return (
    <div>
      {/* Μπάρα ταμπλό: ποιοι είμαστε και το ανέβασμα */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
        <TaskNowLogo className="text-base" markClassName="h-5 w-5" />
        <span className="hidden text-sm text-gray-500 sm:inline">
          {stats.count} ανοιχτές
          {stats.min !== null && stats.max !== null && (
            <> · {stats.min}€–{stats.max}€ ανά δουλειά</>
          )}
        </span>
        <PostTaskButton
          ariaLabel="Ανέβασε δουλειά"
          className="ml-auto h-10 shrink-0 rounded-xl bg-amber-500 px-4 text-sm font-semibold text-white transition hover:bg-amber-600"
        >
          <span className="hidden sm:inline">Ανέβασε δουλειά — δωρεάν</span>
          <span className="sm:hidden">Ανέβασε</span>
        </PostTaskButton>
      </div>

      <FilteredListLayout
        accent="amber"
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Αναζήτηση: τι θέλεις να κάνεις, σε ποια περιοχή…"
        groups={groups}
        selected={{ category: cats }}
        onToggle={(_g, value) =>
          setCats((prev) =>
            prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
          )
        }
        onClear={() => {
          setCats([]);
          setSearch('');
          pickArea('');
          setMapBounds(null);
        }}
        resultCount={visibleOpen.length}
        resultNoun={['μικροδουλειά', 'μικροδουλειές']}
        sidebarHeader={sidebar}
      >
        {guide && (
          <LocationGuide
            reason={guide}
            onRetry={() => locate()}
            onClose={() => setGuide(null)}
          />
        )}

        {showMap && (
          <div className="mb-4">
            <TaskMap
              tasks={mapTasks}
              center={center}
              centerLabel={centerLabel}
              radiusKm={radius}
              selectedId={detail?.id ?? null}
              onSelect={(t) => setDetail(t)}
              onSearchHere={setMapBounds}
              autoFit={!mapBounds}
              youAreHere={centerSource !== 'default'}
            />
            <p className="mt-2 text-center text-xs text-gray-400">
              Πάτησε πάνω σε ένα ποσό για να δεις τη μικροδουλειά.
              {mapBounds && (
                <>
                  {' · '}
                  <button
                    type="button"
                    onClick={() => setMapBounds(null)}
                    className="font-medium text-amber-600 underline hover:text-amber-700"
                  >
                    δες ξανά όλη την πόλη
                  </button>
                </>
              )}
            </p>
          </div>
        )}

        {visible.length === 0 ? (
          /*
            ΔΥΟ ΔΙΑΦΟΡΕΤΙΚΑ ΑΔΕΙΑ, ΔΥΟ ΔΙΑΦΟΡΕΤΙΚΑ ΜΗΝΥΜΑΤΑ.

            «Δεν υπάρχει τίποτα με αυτά τα φίλτρα» και «δεν υπάρχει τίποτα
            καθόλου» είναι εντελώς άλλο πράγμα. Στο πρώτο ο χρήστης πρέπει να
            χαλαρώσει τα φίλτρα. Στο δεύτερο δεν φταίνε τα φίλτρα — και ένα
            «καθάρισε τα φίλτρα» εκεί μοιάζει με χαλασμένη σελίδα.

            Όταν το ταμπλό είναι όντως άδειο, η μόνη χρήσιμη κίνηση είναι να
            ανεβάσει ο ίδιος την πρώτη. Αυτό του λέμε.
          */
          openTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/40 px-6 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-2xl">
                👋
              </div>
              <p className="mt-3 text-base font-bold text-gray-900">
                Κανείς δεν έχει ανεβάσει μικροδουλειά ακόμη.
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-600">
                Ανέβασε την πρώτη και δες ποιος τη θέλει. Γράφεις τι θες να γίνει, λες πόσα
                δίνεις, και περιμένεις προσφορές — δύο λεπτά όλο κι όλο.
              </p>
              <p className="mt-2 text-sm font-semibold text-emerald-700">
                Δεν κοστίζει τίποτα. Ούτε τώρα, ούτε μετά.
              </p>
              <div className="mt-5 flex justify-center">
                <PostTaskButton
                  className="rounded-xl bg-amber-500 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition hover:bg-amber-600"
                  ariaLabel="Ανέβασε την πρώτη μικροδουλειά"
                >
                  Ανέβασε την πρώτη μικροδουλειά
                </PostTaskButton>
              </div>
            </div>
          ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
            <p className="text-sm font-medium text-gray-900">Δεν υπάρχει τίποτα εδώ.</p>
            <p className="mt-1 text-sm text-gray-500">
              Δοκίμασε άλλη αναζήτηση, μεγαλύτερη ακτίνα ή άλλη κατηγορία.
            </p>
            <button
              type="button"
              onClick={() => {
                setCats([]);
                setSearch('');
                pickArea('');
              }}
              className="mt-3 text-sm font-semibold text-amber-600 hover:text-amber-700"
            >
              Καθάρισε τα φίλτρα
            </button>
          </div>
          )
        ) : (
          <ul className="space-y-3">
            {visible.slice(0, 6).map(({ task, km }) => (
              <TaskRow
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
            <li className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-center">
              <p className="text-sm font-bold text-gray-900">Χρειάζεσαι εσύ χέρια;</p>
              <p className="mt-0.5 text-xs text-gray-600">
                Ανέβασε δουλειά δωρεάν και δέξου προσφορές.
              </p>
              <PostTaskButton className="mt-3 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600">
                Ανέβασε δουλειά
              </PostTaskButton>
            </li>

            {visible.slice(6).map(({ task, km }) => (
              <TaskRow
                key={task.id}
                task={task}
                km={km}
                source={centerSource}
                centerLabel={centerLabel}
                onOpen={() => setDetail(task)}
                onOffer={() => setOfferFor(task)}
              />
            ))}
          </ul>
        )}

        {cutByRadius > 0 && (
          <p className="mt-3 text-center text-xs text-gray-400">
            <button
              type="button"
              onClick={() => setRadius(null)}
              className="font-medium text-amber-600 underline hover:text-amber-700"
            >
              {cutByRadius} ακόμη πιο μακριά — άνοιξε την ακτίνα
            </button>
          </p>
        )}

      </FilteredListLayout>

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
