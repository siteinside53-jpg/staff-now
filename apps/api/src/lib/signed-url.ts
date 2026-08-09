/**
 * Σύνδεσμοι με ημερομηνία λήξης, για τα ευαίσθητα αρχεία.
 *
 * Το πρόβλημα: οι φωτογραφίες ταυτοτήτων/διαβατηρίων/διπλωμάτων σερβίρονταν από
 * το `GET /uploads/f/<κλειδί>` χωρίς κανέναν έλεγχο. Όποιος έβλεπε μια φορά το
 * URL (ο ίδιος ο χρήστης, ένα screenshot, το ιστορικό ενός browser, ένα log
 * ενδιάμεσου δικτύου) μπορούσε να το ξαναδεί για πάντα — και η απάντηση ήταν
 * κιόλας cacheable για έναν χρόνο.
 *
 * Η λύση: για τα αρχεία της επαλήθευσης, το URL δεν αρκεί. Πρέπει να συνοδεύεται
 * από μια υπογραφή που φτιάχνει ο server με το μυστικό του και που **λήγει**.
 * Χωρίς έγκυρη υπογραφή, η απάντηση είναι 403.
 *
 * Γιατί υπογραφή και όχι σκέτος έλεγχος σύνδεσης: οι εικόνες φορτώνονται μέσα σε
 * `<img src=…>`. Ο browser ΔΕΝ στέλνει εκεί ούτε το `Authorization` ούτε cookie
 * (το site και το API είναι σε διαφορετικά domain, οπότε το SameSite=Lax κόβει
 * το cookie). Άρα ο μόνος τρόπος να ταξιδέψει η άδεια είναι μέσα στο ίδιο το URL.
 *
 * Τα άλλα αρχεία (φωτογραφίες προφίλ, λογότυπα, εικόνες αγγελιών) μένουν
 * δημόσια: εμφανίζονται ούτως ή άλλως στις δημόσιες σελίδες και στη Google.
 */

const encoder = new TextEncoder();

/** Το μόνο «κλειδωμένο» πρόθεμα. Ό,τι αρχείο ανεβαίνει με category=verification. */
const PROTECTED_PREFIX = 'verification/';

export function isProtectedKey(key: string): boolean {
  return key.startsWith(PROTECTED_PREFIX);
}

async function hmacHex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Σύγκριση σταθερού χρόνου: δεν προδίδει πόσοι χαρακτήρες ταίριαξαν. */
export function equalsConstantTime(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Βγάζει το κλειδί R2 από ένα URL της μορφής `…/uploads/f/<κλειδί>`. */
export function keyFromFileUrl(rawUrl: string): string | null {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }
  const marker = '/uploads/f/';
  const i = u.pathname.indexOf(marker);
  if (i === -1) return null;
  return decodeURIComponent(u.pathname.slice(i + marker.length));
}

/**
 * Επιστρέφει το URL υπογεγραμμένο. Αν δεν είναι προστατευμένο αρχείο (ή δεν
 * είναι καν δικό μας URL) το γυρίζει αυτούσιο — έτσι μπορεί να περαστεί με
 * ασφάλεια πάνω σε οτιδήποτε, χωρίς ελέγχους στο σημείο κλήσης.
 *
 * Τυχόν παλιά `exp`/`sig` αγνοούνται και ξαναγράφονται, ώστε ένα αποθηκευμένο
 * ληγμένο URL να ξαναζωντανεύει κάθε φορά που το ζητάει κάποιος με δικαίωμα.
 */
export async function signFileUrl(
  rawUrl: string | null | undefined,
  secret: string,
  ttlSeconds: number,
): Promise<string | null> {
  if (!rawUrl) return rawUrl ?? null;
  const key = keyFromFileUrl(rawUrl);
  if (!key || !isProtectedKey(key)) return rawUrl;

  const u = new URL(rawUrl);
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = await hmacHex(secret, `${key}:${exp}`);
  return `${u.origin}${u.pathname}?exp=${exp}&sig=${sig}`;
}

/** Ισχύει η υπογραφή για αυτό το κλειδί και δεν έχει λήξει; */
export async function verifyFileSignature(
  key: string,
  exp: string | undefined,
  sig: string | undefined,
  secret: string,
): Promise<boolean> {
  if (!exp || !sig) return false;
  const expSeconds = Number(exp);
  if (!Number.isFinite(expSeconds)) return false;
  if (expSeconds < Math.floor(Date.now() / 1000)) return false;
  const expected = await hmacHex(secret, `${key}:${exp}`);
  return equalsConstantTime(expected, sig);
}
