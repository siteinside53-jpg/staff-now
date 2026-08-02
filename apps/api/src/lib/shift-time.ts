/**
 * Μετατροπή τοπικής ώρας Ελλάδας → UTC, σε μορφή D1.
 *
 * Γιατί χρειάζεται:
 * - Η D1 (SQLite) δεν ξέρει από ζώνες ώρας. Το `datetime('now')` είναι UTC, και
 *   το `datetime('now','localtime')` είναι *επίσης* UTC μέσα σε Worker (το
 *   container τρέχει σε UTC). Η Ελλάδα είναι UTC+2 τον χειμώνα, UTC+3 το
 *   καλοκαίρι — άρα δεν μπορούμε να συγκρίνουμε τοπική ώρα με `datetime('now')`.
 * - Το `toISOString()` δίνει '2026-08-02T15:00:00.000Z' ενώ η D1 δίνει
 *   '2026-08-02 15:00:00'. Σε ASCII 'T' (0x54) > ' ' (0x20), οπότε ένα ISO
 *   string συγκρίνεται *πάντα* ως μεταγενέστερο και κάθε βάρδια θα φαινόταν
 *   μελλοντική για πάντα. Γι' αυτό αποθηκεύουμε πάντα σε μορφή D1.
 */

const ATHENS = 'Europe/Athens';

const OFFSET_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: ATHENS,
  timeZoneName: 'longOffset',
});

/** Το offset της Αθήνας σε λεπτά για μια δεδομένη στιγμή (π.χ. +180 το καλοκαίρι). */
function athensOffsetMinutes(at: Date): number {
  const part = OFFSET_FORMATTER.formatToParts(at).find((p) => p.type === 'timeZoneName');
  // 'GMT+3', 'GMT+03:00' ή σκέτο 'GMT'
  const match = part?.value.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  return sign * (parseInt(match[2] ?? '0', 10) * 60 + parseInt(match[3] ?? '0', 10));
}

/**
 * 'YYYY-MM-DD' + 'HH:MM' σε ώρα Ελλάδας → Date (στιγμή σε UTC).
 * Επιστρέφει null αν η είσοδος δεν είναι έγκυρη.
 */
export function athensWallClockToDate(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return null;
  }
  const asUtc = Date.parse(`${date}T${time}:00Z`);
  if (Number.isNaN(asUtc)) return null;

  // Δύο περάσματα: το offset εξαρτάται από τη στιγμή, και η στιγμή από το
  // offset. Το πρώτο πέρασμα δίνει σχεδόν πάντα το σωστό offset· το δεύτερο
  // διορθώνει τις λίγες ώρες γύρω από την αλλαγή θερινής/χειμερινής ώρας.
  let offset = athensOffsetMinutes(new Date(asUtc));
  let result = new Date(asUtc - offset * 60_000);
  const refined = athensOffsetMinutes(result);
  if (refined !== offset) {
    offset = refined;
    result = new Date(asUtc - offset * 60_000);
  }
  return result;
}

/** Date → 'YYYY-MM-DD HH:MM:SS' σε UTC (η μορφή που παράγει το datetime('now') της D1). */
export function toD1Utc(d: Date): string {
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

/** Τώρα, σε μορφή D1 UTC. */
export function nowD1Utc(): string {
  return toD1Utc(new Date());
}

/**
 * Το βολικό shortcut: ώρα Ελλάδας → string έτοιμο για αποθήκευση/σύγκριση.
 * Επιστρέφει null αν η είσοδος δεν είναι έγκυρη.
 */
export function athensWallClockToD1Utc(date: string, time: string): string | null {
  const d = athensWallClockToDate(date, time);
  return d ? toD1Utc(d) : null;
}

/** Ώρες μεταξύ 'HH:MM' και 'HH:MM', με σωστό χειρισμό μεσάνυχτων (18:00→02:00 = 8). */
export function shiftHours(start: string, end: string): number {
  const toMin = (t: string) => {
    const [h = 0, m = 0] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const diff = (toMin(end) - toMin(start) + 1440) % 1440;
  return Math.round((diff / 60) * 100) / 100;
}
