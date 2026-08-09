/**
 * Τα **επίσημα διανύσματα δοκιμής του RFC 6238** (Appendix B).
 *
 * Γιατί αυτό το αρχείο είναι το πιο σημαντικό κομμάτι της δουλειάς: αν ο
 * αλγόριθμος έχει έστω και ένα λάθος, η εφαρμογή στο κινητό θα βγάζει άλλον
 * αριθμό από τον server — και ο ιδιοκτήτης θα κλειδωθεί έξω από τη δική του
 * πλατφόρμα. Κανένα κλικ σε browser δεν το αποδεικνύει αυτό. Ένα γνωστό
 * κλειδί σε γνωστή ώρα με γνωστό αποτέλεσμα, το αποδεικνύει.
 *
 * Το πρότυπο δημοσιεύει τα διανύσματα με **8 ψηφία**, ενώ εμείς βγάζουμε 6.
 * Δεν είναι αντίφαση: ο κωδικός των 6 ψηφίων είναι εξ ορισμού `αριθμός % 10^6`
 * και ο κωδικός των 8 είναι `αριθμός % 10^8`, άρα ο 6ψήφιος είναι **ακριβώς**
 * τα 6 τελευταία ψηφία του 8ψήφιου. Γι' αυτό συγκρίνω με το `slice(-6)`.
 */

import { describe, it, expect } from 'vitest';
import {
  base32Decode,
  base32Encode,
  currentStep,
  generateSecret,
  otpauthUri,
  totpCode,
  totpCodeForStep,
  verifyTotp,
} from '../totp';

/** Το κλειδί του RFC: το κείμενο "12345678901234567890" σε base32. */
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

/** [δευτερόλεπτα από το 1970, ο 8ψήφιος κωδικός όπως τον δίνει το πρότυπο] */
const RFC_VECTORS: Array<[number, string]> = [
  [59, '94287082'],
  [1111111109, '07081804'],
  [1111111111, '14050471'],
  [1234567890, '89005924'],
  [2000000000, '69279037'],
  [20000000000, '65353130'],
];

describe('RFC 6238 — τα επίσημα διανύσματα', () => {
  it.each(RFC_VECTORS)('στα %i δευτερόλεπτα βγάζει %s', async (seconds, expected8) => {
    const code = await totpCode(RFC_SECRET, seconds * 1000);
    expect(code).toBe(expected8.slice(-6));
  });
});

describe('base32', () => {
  it('κωδικοποιεί το κλειδί του RFC όπως το περιμένει κάθε εφαρμογή', () => {
    const bytes = new TextEncoder().encode('12345678901234567890');
    expect(base32Encode(bytes)).toBe(RFC_SECRET);
  });

  it('πάει και γυρίζει χωρίς απώλεια', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255]);
    expect(Array.from(base32Decode(base32Encode(bytes))!)).toEqual(Array.from(bytes));
  });

  it('αγνοεί κενά, παύλες και τη συμπλήρωση — έτσι το αντιγράφουν οι χρήστες', () => {
    const spaced = RFC_SECRET.replace(/(.{4})/g, '$1 ').trim();
    expect(base32Decode(spaced)).toEqual(base32Decode(RFC_SECRET));
  });

  it('επιστρέφει null σε σκουπίδια αντί για λάθος αποτέλεσμα', () => {
    expect(base32Decode('!!!!')).toBeNull();
    expect(base32Decode('ABC1')).toBeNull(); // το 1 δεν ανήκει στο αλφάβητο
    expect(base32Decode('')).toBeNull();
  });
});

describe('generateSecret', () => {
  it('δίνει 32 χαρακτήρες base32 (= 20 bytes) και ποτέ τον ίδιο δύο φορές', () => {
    const a = generateSecret();
    const b = generateSecret();
    expect(a).toHaveLength(32);
    expect(base32Decode(a)).toHaveLength(20);
    expect(a).not.toBe(b);
  });
});

describe('verifyTotp', () => {
  const NOW = 1_700_000_000_000; // σταθερή στιγμή, ώστε η δοκιμή να μην εξαρτάται από το ρολόι

  it('δέχεται τον τρέχοντα κωδικό και επιστρέφει το βήμα του', async () => {
    const code = (await totpCode(RFC_SECRET, NOW))!;
    const res = await verifyTotp(RFC_SECRET, code, NOW);
    expect(res.ok).toBe(true);
    expect(res.step).toBe(currentStep(NOW));
  });

  it('δέχεται τον κωδικό των προηγούμενων 30 δευτερολέπτων (απόκλιση ρολογιού)', async () => {
    const code = (await totpCode(RFC_SECRET, NOW - 30_000))!;
    const res = await verifyTotp(RFC_SECRET, code, NOW);
    expect(res.ok).toBe(true);
    expect(res.step).toBe(currentStep(NOW) - 1);
  });

  it('ΔΕΝ δέχεται κωδικό 60 δευτερολέπτων πριν', async () => {
    const code = (await totpCode(RFC_SECRET, NOW - 60_000))!;
    expect((await verifyTotp(RFC_SECRET, code, NOW)).ok).toBe(false);
  });

  it('ΔΕΝ δέχεται κωδικό του μέλλοντος', async () => {
    const code = (await totpCode(RFC_SECRET, NOW + 30_000))!;
    expect((await verifyTotp(RFC_SECRET, code, NOW)).ok).toBe(false);
  });

  it('ΔΕΝ δέχεται κωδικό άλλου μυστικού', async () => {
    const code = (await totpCode(generateSecret(), NOW))!;
    expect((await verifyTotp(RFC_SECRET, code, NOW)).ok).toBe(false);
  });

  it('απορρίπτει ό,τι δεν είναι 6 ψηφία, χωρίς να σκάει', async () => {
    for (const bad of ['', '12345', '1234567', 'abcdef', '12 34 5', '<script>']) {
      expect((await verifyTotp(RFC_SECRET, bad, NOW)).ok).toBe(false);
    }
  });

  it('δεν σκάει αν το μυστικό στη βάση είναι αλλοιωμένο', async () => {
    expect((await verifyTotp('!!!!', '123456', NOW)).ok).toBe(false);
    expect(await totpCodeForStep('!!!!', 1)).toBeNull();
  });
});

describe('otpauthUri', () => {
  it('γράφει τον σύνδεσμο που καταλαβαίνει κάθε εφαρμογή', () => {
    const uri = otpauthUri('admin@staffnow.gr', RFC_SECRET);
    expect(uri).toBe(
      'otpauth://totp/StaffNow%3Aadmin%40staffnow.gr' +
        `?secret=${RFC_SECRET}&issuer=StaffNow&algorithm=SHA1&digits=6&period=30`,
    );
  });
});
