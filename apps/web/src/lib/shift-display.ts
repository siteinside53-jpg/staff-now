/**
 * Κοινοί helpers για την εμφάνιση έκτακτης βάρδιας.
 *
 * Χρησιμοποιούνται και από το discover (εργαζόμενος) και από το marketing
 * section, ώστε τα δύο σημεία να μη ξεφύγουν μεταξύ τους.
 */

/** Εισφορές εργαζομένου ΕΦΚΑ (13,87%). Χωρίς παρακράτηση φόρου — γι' αυτό «ενδεικτικά». */
export const NET_RATIO = 0.8613;

/** Το `shift_start_utc` έρχεται σε μορφή D1 ('YYYY-MM-DD HH:MM:SS', χωρίς 'Z'). */
export function parseShiftStart(shiftStartUtc?: string | null): Date | null {
  if (!shiftStartUtc) return null;
  const d = new Date(`${shiftStartUtc.replace(' ', 'T')}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Η σημερινή ημερομηνία σε ώρα Ελλάδας, ως 'YYYY-MM-DD'. */
function athensToday(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Athens',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** 'YYYY-MM-DD' → 'ΣΗΜΕΡΑ' | 'ΑΥΡΙΟ' | 'Δευ 5 Αυγ'. */
export function whenLabel(shiftDate?: string | null, now: Date = new Date()): string {
  if (!shiftDate) return '';
  const today = athensToday(now);
  if (shiftDate === today) return 'ΣΗΜΕΡΑ';
  const tomorrow = athensToday(new Date(now.getTime() + 86_400_000));
  if (shiftDate === tomorrow) return 'ΑΥΡΙΟ';
  const d = new Date(`${shiftDate}T12:00:00Z`);
  return new Intl.DateTimeFormat('el-GR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/Athens',
  }).format(d);
}

/**
 * Πόσο μένει μέχρι να ξεκινήσει η βάρδια, π.χ. 'σε 3ω 20λ' / 'σε 45λ'.
 * Επιστρέφει null αν έχει ήδη ξεκινήσει — ο caller τη φιλτράρει.
 */
export function expiresLabel(shiftStartUtc?: string | null, now: Date = new Date()): string | null {
  const start = parseShiftStart(shiftStartUtc);
  if (!start) return null;
  const mins = Math.floor((start.getTime() - now.getTime()) / 60_000);
  if (mins <= 0) return null;
  if (mins < 60) return `σε ${mins}λ`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24) return m > 0 ? `σε ${h}ω ${m}λ` : `σε ${h}ω`;
  return `σε ${Math.floor(h / 24)} ημ.`;
}

/** Έχει ήδη ξεκινήσει η βάρδια; */
export function hasStarted(shiftStartUtc?: string | null, now: Date = new Date()): boolean {
  const start = parseShiftStart(shiftStartUtc);
  return !start || start.getTime() <= now.getTime();
}

/** Ενδεικτικά καθαρά, στρογγυλοποιημένα στο ευρώ. */
export function netOf(gross?: number | null): number | null {
  if (!gross || gross <= 0) return null;
  return Math.round(gross * NET_RATIO);
}

/** Ώρες μεταξύ 'HH:MM' και 'HH:MM', wrap-aware (18:00→02:00 = 8). */
export function shiftHours(start?: string | null, end?: string | null): number | null {
  if (!start || !end) return null;
  const toMin = (t: string) => {
    const [h = 0, m = 0] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const diff = (toMin(end) - toMin(start) + 1440) % 1440;
  if (diff === 0) return null;
  return Math.round((diff / 60) * 100) / 100;
}

/** 'Μία βάρδια' / '2 ημέρες', + θέσεις. Π.χ. '8 ώρες · μία βάρδια · 2 θέσεις'. */
export function durationLabel(shift: {
  shift_start_time?: string | null;
  shift_end_time?: string | null;
  shift_days?: number | null;
  shift_positions?: number | null;
}): string {
  const parts: string[] = [];
  const hours = shiftHours(shift.shift_start_time, shift.shift_end_time);
  if (hours) parts.push(`${hours} ${hours === 1 ? 'ώρα' : 'ώρες'}`);
  const days = shift.shift_days ?? 1;
  parts.push(days > 1 ? `${days} ημέρες` : 'μία βάρδια');
  const positions = shift.shift_positions ?? 1;
  if (positions > 1) parts.push(`${positions} θέσεις`);
  return parts.join(' · ');
}
