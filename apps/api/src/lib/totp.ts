/**
 * Ο 6ψήφιος κωδικός που αλλάζει κάθε 30 δευτερόλεπτα (πρότυπο RFC 6238).
 *
 * Τι είναι: το κινητό και ο server μοιράζονται ένα μυστικό. Κανένας από τους
 * δύο δεν στέλνει τίποτα στον άλλον — απλώς κάνουν και οι δύο τον ίδιο
 * υπολογισμό πάνω στην τρέχουσα ώρα και βγάζουν τον ίδιο αριθμό. Γι' αυτό
 * δουλεύει χωρίς σήμα και δεν κοστίζει τίποτα σε SMS.
 *
 * Γιατί γραμμένο με το χέρι: οι έτοιμες βιβλιοθήκες (`speakeasy`, `otplib`)
 * χρειάζονται το Node, και το StaffNow τρέχει σε Cloudflare Workers όπου δεν
 * υπάρχει. Χρησιμοποιώ σκέτο `crypto.subtle`, ακριβώς όπως το `lib/signed-url.ts`
 * και το `lib/webpush.ts` που ήδη δουλεύουν στην παραγωγή.
 *
 * Η ορθότητα του αλγορίθμου αποδεικνύεται από τα **επίσημα διανύσματα δοκιμής
 * του RFC 6238** στο `__tests__/totp.test.ts` — γνωστό κλειδί, γνωστή ώρα,
 * γνωστό αποτέλεσμα.
 */

import { equalsConstantTime } from './signed-url';

/** Βήμα 30 δευτερολέπτων: ό,τι περιμένει κάθε εφαρμογή κινητού. */
const STEP_SECONDS = 30;

/** 6 ψηφία: ό,τι περιμένει κάθε εφαρμογή κινητού. */
const DIGITS = 6;

/** 20 bytes = το μέγεθος που ορίζει το RFC 4226 για HMAC-SHA1. */
const SECRET_BYTES = 20;

/** Το αλφάβητο του RFC 4648. Δεν έχει 0/1/8/9 ώστε να μη μπερδεύονται με O/I/B/g. */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  // Τα τελευταία bits που δεν έφτασαν να γίνουν πεντάδα, συμπληρωμένα με μηδενικά.
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

/**
 * Επιστρέφει `null` σε οτιδήποτε δεν είναι έγκυρο base32 — ώστε ένα
 * αλλοιωμένο μυστικό στη βάση να γίνεται «καμία επαλήθευση δεν περνάει»
 * αντί για σιωπηλά λάθος αποτελέσματα.
 *
 * Τα κενά και τα `=` της συμπλήρωσης αγνοούνται: οι εφαρμογές δείχνουν το
 * κλειδί σε ομάδες των 4 και ο χρήστης συχνά το αντιγράφει έτσι.
 */
export function base32Decode(input: string): Uint8Array | null {
  const clean = input.replace(/[\s-]/g, '').replace(/=+$/, '').toUpperCase();
  if (clean.length === 0) return null;

  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = ALPHABET.indexOf(ch);
    if (idx === -1) return null;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

/** Καινούριο μυστικό, από τη γεννήτρια τυχαιότητας του συστήματος. */
export function generateSecret(): string {
  const bytes = new Uint8Array(SECRET_BYTES);
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

/** Ο αριθμός του τρέχοντος «βήματος 30 δευτερολέπτων». */
export function currentStep(atMs: number = Date.now()): number {
  return Math.floor(atMs / 1000 / STEP_SECONDS);
}

/** Ο μετρητής ταξιδεύει ως 8 bytes, με το πιο σημαντικό πρώτο (big-endian). */
function counterBytes(step: number): Uint8Array {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setUint32(0, Math.floor(step / 2 ** 32));
  view.setUint32(4, step >>> 0);
  return new Uint8Array(buf);
}

async function hmacSha1(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, data);
  return new Uint8Array(sig);
}

/**
 * Ο κωδικός για ένα συγκεκριμένο βήμα.
 *
 * Η «δυναμική περικοπή» του RFC 4226: το τελευταίο byte του HMAC δείχνει από
 * πού θα κόψουμε 4 bytes, και από αυτά κρατάμε τα 6 τελευταία ψηφία. Το
 * `& 0x7f` σβήνει το πρόσημο, ώστε το αποτέλεσμα να είναι το ίδιο σε κάθε
 * γλώσσα προγραμματισμού.
 */
export async function totpCodeForStep(secret: string, step: number): Promise<string | null> {
  const key = base32Decode(secret);
  if (!key) return null;

  const hash = await hmacSha1(key, counterBytes(step));
  const offset = hash[hash.length - 1]! & 0x0f;
  const binary =
    ((hash[offset]! & 0x7f) << 24) |
    (hash[offset + 1]! << 16) |
    (hash[offset + 2]! << 8) |
    hash[offset + 3]!;
  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
}

/** Ο κωδικός που δείχνει αυτή τη στιγμή το κινητό. */
export function totpCode(secret: string, atMs: number = Date.now()): Promise<string | null> {
  return totpCodeForStep(secret, currentStep(atMs));
}

/**
 * Ταιριάζει ο κωδικός που πληκτρολόγησε ο χρήστης;
 *
 * Δέχομαι **και το προηγούμενο βήμα** (±30 δευτερόλεπτα), γιατί τα ρολόγια των
 * κινητών έχουν πάντα μικρή απόκλιση και γιατί ο χρήστης μπορεί να πατήσει
 * «Επαλήθευση» τη στιγμή που ο κωδικός αλλάζει. Δεν πάω σε ±2 βήματα: κάθε
 * επιπλέον βήμα διπλασιάζει τους δεκτούς κωδικούς χωρίς πραγματικό όφελος.
 *
 * Επιστρέφω και το βήμα που ταίριαξε: ο καλών το γράφει στο `totp_last_step`
 * και αρνείται οτιδήποτε ≤ αυτού, ώστε ένας κωδικός που τον είδε κάποιος πάνω
 * από τον ώμο σου να μην ξαναδουλεύει μέσα στα 30 δευτερόλεπτά του.
 */
export async function verifyTotp(
  secret: string,
  code: string,
  atMs: number = Date.now(),
): Promise<{ ok: boolean; step: number }> {
  const clean = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(clean)) return { ok: false, step: 0 };

  const now = currentStep(atMs);
  for (const step of [now, now - 1]) {
    const expected = await totpCodeForStep(secret, step);
    if (expected && equalsConstantTime(expected, clean)) return { ok: true, step };
  }
  return { ok: false, step: 0 };
}

/**
 * Ο σύνδεσμος που καταλαβαίνει κάθε εφαρμογή. Αν ανοίξεις τη σελίδα από το
 * κινητό και τον πατήσεις, το κλειδί περνάει μόνο του, χωρίς πληκτρολόγηση.
 */
export function otpauthUri(email: string, secret: string): string {
  const label = encodeURIComponent(`StaffNow:${email}`);
  const issuer = encodeURIComponent('StaffNow');
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}
