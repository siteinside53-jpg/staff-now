/**
 * Κοινή κανονικοποίηση τοποθεσίας για ΟΛΑ τα φίλτρα (δημόσιες λίστες + Εύρεση).
 *
 * Οι χρήστες γράφουν την πόλη τους ελεύθερα, οπότε στη βάση συνυπάρχουν
 * «Θεσσαλονίκη», «Θεσσαλονίκη » (με κενό), «Θεσσαλονικη», «θεσσαλονικη»,
 * «Thessaloniki» — και σκουπίδια όπως «Greece» ή ολόκληρες διευθύνσεις με
 * αριθμό. Χωρίς αυτό το αρχείο, το καθένα γινόταν ξεχωριστή επιλογή στα φίλτρα.
 *
 * Η λογική ήταν ήδη γραμμένη μέσα στο dashboard/discover/page.tsx· εδώ
 * μεταφέρεται αυτούσια ώστε να τη μοιράζονται και οι δημόσιες λίστες.
 */
import { GREEK_CITIES, GREEK_CITY_AREAS } from './greek-cities';

/** Πεζά + χωρίς τόνους, για συγκρίσεις. */
export function normText(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

/** Λέξεις-χώρα που δεν είναι ποτέ πόλη. */
export const LOC_COUNTRY_TOKENS = new Set(['greece', 'ελλαδα', 'ελλας', 'hellas', 'gr', 'grecia']);

/**
 * Ψευδώνυμα → «Πόλη» ή «Πόλη|Περιοχή».
 * Καλύπτουν greeklish/αγγλικά και τιμές που όντως υπάρχουν στη βάση
 * (π.χ. νομός αντί για πόλη).
 */
const CITY_ALIASES: Record<string, string> = {
  athens: 'Αθήνα', athina: 'Αθήνα', atene: 'Αθήνα',
  thessaloniki: 'Θεσσαλονίκη', salonika: 'Θεσσαλονίκη', saloniki: 'Θεσσαλονίκη', thessalonica: 'Θεσσαλονίκη',
  patra: 'Πάτρα', patras: 'Πάτρα',
  heraklion: 'Ηράκλειο', iraklio: 'Ηράκλειο', iraklion: 'Ηράκλειο',
  larisa: 'Λάρισα', larissa: 'Λάρισα',
  volos: 'Βόλος',
  ioannina: 'Ιωάννινα', giannena: 'Ιωάννινα', giannina: 'Ιωάννινα',
  chania: 'Χανιά', hania: 'Χανιά',
  rethymno: 'Ρέθυμνο', rethimno: 'Ρέθυμνο',
  rhodes: 'Ρόδος', rodos: 'Ρόδος',
  corfu: 'Κέρκυρα', kerkyra: 'Κέρκυρα',
  santorini: 'Σαντορίνη', thira: 'Σαντορίνη', fira: 'Σαντορίνη',
  mykonos: 'Μύκονος',
  kavala: 'Καβάλα',
  trikala: 'Τρίκαλα',
  chalkida: 'Χαλκίδα', halkida: 'Χαλκίδα',
  kalamata: 'Καλαμάτα',
  serres: 'Σέρρες',
  piraeus: 'Αθήνα|Πειραιάς',
  glyfada: 'Αθήνα|Γλυφάδα',
  // Νομοί/περιφέρειες που γράφτηκαν στη θέση της πόλης
  αττικη: 'Αθήνα',
  'νομος αττικης': 'Αθήνα',
  'νομος θεσσαλονικης': 'Θεσσαλονίκη',
  μακεδονια: 'Θεσσαλονίκη',
  βασιλικη: 'Λευκάδα|Βασιλική',
};

const CANON_CITY_BY_NORM = new Map(GREEK_CITIES.map((c) => [normText(c), c] as const));

/**
 * Περιοχή → πόλη. Χτίζεται από το GREEK_CITY_AREAS ώστε π.χ. ο «Πειραιάς»
 * (περιοχή της Αθήνας) να μη φτιάχνει δική του πόλη στα φίλτρα.
 * Καταχωρούμε και το κομμάτι μέσα/έξω από παρένθεση: «Αχαρνές (Μενίδι)»
 * βρίσκεται και ως «Αχαρνές» και ως «Μενίδι».
 */
type CityArea = { city: string; area: string };
const CITY_BY_AREA_NORM = new Map<string, CityArea>();
for (const [city, areas] of Object.entries(GREEK_CITY_AREAS)) {
  for (const area of areas) {
    const keys = [area];
    const paren = area.match(/^(.+?)\s*\((.+?)\)$/);
    if (paren) keys.push(paren[1]!, paren[2]!);
    for (const k of keys) {
      const n = normText(k);
      if (n && !CITY_BY_AREA_NORM.has(n)) CITY_BY_AREA_NORM.set(n, { city, area });
    }
  }
}

/**
 * Διεύθυνση ή ΤΚ; Καμία ελληνική πόλη δεν έχει ψηφίο στο όνομά της, οπότε
 * οτιδήποτε περιέχει αριθμό («Κασσάνδρου 123», «54622») δεν γίνεται ποτέ πόλη.
 */
export function looksLikeAddress(part: string): boolean {
  return /\d/.test(part || '');
}

/** Αναγνωρίζει ένα κομμάτι ως πόλη ή ως περιοχή γνωστής πόλης. */
function lookupCity(raw: string): CityArea | null {
  const n = normText(raw);
  if (!n) return null;
  const alias = CITY_ALIASES[n];
  if (alias) {
    const [city, area = ''] = alias.split('|');
    return { city: city!, area };
  }
  const canon = CANON_CITY_BY_NORM.get(n);
  if (canon) return { city: canon, area: '' };
  return CITY_BY_AREA_NORM.get(n) ?? null;
}

/** Το κανονικό όνομα πόλης — ή το κείμενο του χρήστη αν δεν το ξέρουμε. */
export function resolveCityName(raw: string): string {
  return lookupCity(raw)?.city ?? (raw || '').trim();
}

/** Το κανονικό όνομα περιοχής μέσα σε συγκεκριμένη πόλη. */
function resolveAreaName(raw: string, city: string): string {
  const hit = CITY_BY_AREA_NORM.get(normText(raw));
  return hit && hit.city === city ? hit.area : (raw || '').trim();
}

/**
 * «Πόλη, Περιοχή» → { city, area }.
 * Πετάει χώρες και διευθύνσεις, δέχεται και «/» ως διαχωριστικό
 * (υπάρχει «ΠΕΡΑΙΑ / ΘΕΣΣΑΛΟΝΙΚΗ» στη βάση) και βρίσκει την πόλη σε
 * οποιαδήποτε θέση — όχι μόνο στην πρώτη.
 */
export function splitLocation(loc: string): { city: string; area: string } {
  const parts = (loc || '')
    .split(/[,/]/)
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !LOC_COUNTRY_TOKENS.has(normText(p)))
    .filter((p) => !looksLikeAddress(p));
  if (!parts.length) return { city: '', area: '' };

  for (let i = 0; i < parts.length; i++) {
    const hit = lookupCity(parts[i]!);
    if (!hit) continue;
    if (hit.area) return { city: hit.city, area: hit.area };
    const rest = parts.filter((_, j) => j !== i);
    return { city: hit.city, area: rest.map((p) => resolveAreaName(p, hit.city)).join(', ') };
  }
  // Άγνωστη πόλη: μένει όπως τη γράφει ο χρήστης, δεν εξαφανίζεται.
  return { city: parts[0]!, area: parts.slice(1).join(', ') };
}

export type FilterCategoryShape = {
  id: string;
  label: string;
  count: number;
  options: { value: string; label: string; count: number }[];
};

/**
 * Χτίζει το ιεραρχικό φίλτρο «πόλη → περιοχές» από μια λίστα εγγραφών.
 * Κάθε πόλη εμφανίζεται ΜΙΑ φορά. Οι περιοχές είναι οι στατικές
 * (GREEK_CITY_AREAS, με 0) συν όσες εμφανίζονται στα δεδομένα.
 */
export function buildCityCategories(
  entries: { location: string; region?: string }[],
): FilterCategoryShape[] {
  type Agg = { label: string; count: number; areas: Map<string, { label: string; count: number }> };
  const byCity = new Map<string, Agg>();
  for (const c of GREEK_CITIES) {
    const n = normText(c);
    if (!byCity.has(n)) byCity.set(n, { label: c, count: 0, areas: new Map() });
  }
  const addArea = (agg: Agg, label: string) => {
    const raw = (label || '').trim();
    const n = normText(raw);
    if (!n) return;
    const ex = agg.areas.get(n);
    if (ex) ex.count += 1;
    else agg.areas.set(n, { label: raw, count: 1 });
  };

  for (const entry of entries) {
    const { city, area } = splitLocation(entry.location || '');
    if (!city) continue;
    const cn = normText(city);
    if (!byCity.has(cn)) byCity.set(cn, { label: city, count: 0, areas: new Map() });
    const agg = byCity.get(cn)!;
    agg.count += 1;

    // Η περιοχή μπορεί να έρθει και από το `location` και από το `region`
    // («ΑΤΤΙΚΗ, ΜΕΝΙΔΙ» + region «ΜΕΝΙΔΙ»). Και τα δύο καταλήγουν στο ίδιο
    // κανονικό όνομα, οπότε μαζεύονται πρώτα και μετράνε μία φορά ανά εγγραφή.
    // Το `region` έρχεται και σύνθετο («ΠΕΡΑΙΑ / ΘΕΣΣΑΛΟΝΙΚΗ»), οπότε κόβεται
    // στα ίδια σημεία με το `location` — αλλιώς έμπαινε ολόκληρο σαν δεύτερη,
    // διπλή περιοχή δίπλα στην «Περαία».
    const areaNames = new Set<string>();
    if (area) areaNames.add(area);
    for (const part of (entry.region || '').split(/[,/]/)) {
      const p = part.trim();
      if (!p || looksLikeAddress(p) || LOC_COUNTRY_TOKENS.has(normText(p))) continue;
      areaNames.add(resolveAreaName(p, city));
    }
    for (const name of areaNames) {
      // Περιοχή που στην πραγματικότητα είναι η ίδια η πόλη («Αθήνα, Αττική»)
      // δεν γίνεται υποκατηγορία του εαυτού της.
      const asCity = lookupCity(name);
      if (asCity && !asCity.area && normText(asCity.city) === cn) continue;
      addArea(agg, name);
    }
  }

  return Array.from(byCity.values())
    .map((agg) => {
      const areaByNorm = new Map<string, { label: string; count: number }>();
      for (const a of GREEK_CITY_AREAS[agg.label] ?? []) {
        const n = normText(a);
        if (!areaByNorm.has(n)) areaByNorm.set(n, { label: a, count: 0 });
      }
      for (const [n, a] of agg.areas) {
        const ex = areaByNorm.get(n);
        if (ex) ex.count += a.count;
        else areaByNorm.set(n, a);
      }
      // Περιοχή με το ίδιο όνομα με την πόλη («Αθήνα, Αθήνα») δεν γίνεται
      // ξεχωριστή επιλογή: θα είχε την ίδια τιμή με το «Όλη η πόλη» και θα
      // τσεκάρονταν και τα δύο μαζί.
      const cityNorm = normText(agg.label);
      const areaOptions = Array.from(areaByNorm.values())
        .filter((a) => normText(a.label) !== cityNorm)
        .map((a) => ({ value: a.label, label: a.label, count: a.count }))
        .sort((x, y) => y.count - x.count || x.label.localeCompare(y.label, 'el'));

      return {
        id: agg.label,
        label: agg.label,
        count: agg.count,
        options: [{ value: agg.label, label: 'Όλη η πόλη', count: agg.count }, ...areaOptions],
      };
    })
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'el'));
}

/**
 * Ταιριάζει μια εγγραφή με τις επιλεγμένες τιμές του φίλτρου πόλης
 * (μπορεί να είναι πόλη «Όλη η πόλη» ή συγκεκριμένη περιοχή).
 */
export function matchesCitySelection(
  entry: { location: string; region?: string },
  selectedValues: string[],
): boolean {
  if (!selectedValues.length) return true;
  const { city, area } = splitLocation(entry.location || '');
  const cityN = normText(city);
  const areaN = normText(area);
  const regionN = normText(entry.region || '');
  return selectedValues
    .map(normText)
    .filter(Boolean)
    .some(
      (nv) =>
        // Η πόλη ταιριάζει μόνο ακριβώς — αλλιώς η «Νέα Μηχανιώνα» θα έπιανε
        // και τη «Μηχανιώνα». Η περιοχή είναι συχνά σύνθετη («Κέντρο, Λαδάδικα»),
        // οπότε εκεί δεχόμαστε και μερικό ταίριασμα.
        (cityN && cityN === nv) ||
        (areaN && (areaN === nv || areaN.includes(nv) || nv.includes(areaN))) ||
        (regionN && (regionN === nv || regionN.includes(nv) || nv.includes(regionN))),
    );
}
