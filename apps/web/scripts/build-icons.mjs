/**
 * Παράγει ΟΛΑ τα εικονίδια από ΕΝΑ αρχείο: public/staffnow-logo.png — αυτό που
 * βλέπεις ήδη μέσα στην εφαρμογή (πάνω αριστερά και στον πίνακα ελέγχου).
 *
 *   node scripts/build-icons.mjs
 *
 * Γιατί υπάρχει: πριν, τα εικονίδια της καρτέλας του browser και της Google
 * ήταν φτιαγμένα χωριστά — τετράγωνο σχήμα και διαφορετικό τικ. Έτσι το ίδιο
 * λογότυπο φαινόταν αλλιώς σε κάθε σημείο. Τώρα βγαίνουν όλα από την ίδια πηγή.
 *
 * Δύο πράγματα που ΔΕΝ είναι λάθος και δεν πρέπει να «διορθωθούν»:
 *
 *   1. Στο staffnow-logo.png το τικ δεν είναι λευκό — είναι τρύπα. Φαίνεται
 *      λευκό μόνο επειδή από πίσω υπάρχει λευκή σελίδα. Σε εικονίδιο θα γινόταν
 *      μαύρο. Γι' αυτό εδώ γεμίζουμε πρώτα την τρύπα με λευκό.
 *
 *   2. Τα icon-maskable-* και το apple-touch-icon βγαίνουν ΤΕΤΡΑΓΩΝΑ, γεμάτα.
 *      Το Android και το iPhone κόβουν μόνα τους το σχήμα στην οθόνη· αν τους
 *      δίναμε κύκλο, θα τον ξανάκοβαν και θα έμεναν μαύρες γωνίες.
 */

import { createRequire } from 'node:module';
import { globSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(here, '..', 'public');

/**
 * Το sharp δεν είναι δικό μας πακέτο — έρχεται μαζί με άλλα εργαλεία. Δεν το
 * προσθέτουμε στις εξαρτήσεις για ένα εργαλείο που τρέχει σπάνια, οπότε το
 * βρίσκουμε όπου κι αν το έβαλε ο pnpm.
 */
function loadSharp() {
  try {
    return require('sharp');
  } catch {
    const root = path.join(here, '..', '..', '..');
    const found = globSync('node_modules/.pnpm/sharp@*/node_modules/sharp', { cwd: root }).sort();
    if (!found.length) {
      console.error('Δεν βρέθηκε το sharp. Τρέξε: pnpm add -D -w sharp');
      process.exit(1);
    }
    return require(path.join(root, found[found.length - 1]));
  }
}

const sharp = loadSharp();

const SRC = path.join(pub, 'staffnow-logo.png');
/** Το μπλε του λογοτύπου, μετρημένο από το ίδιο το αρχείο. */
const BLUE = { r: 37, g: 135, b: 242, alpha: 1 };

/**
 * Βήμα 1: γεμίζουμε την τρύπα του τικ με λευκό και κόβουμε ό,τι περισσεύει
 * γύρω από τον κύκλο. Βγάζει καθαρό στρογγυλό λογότυπο 1024×1024.
 */
async function roundMaster() {
  const { width: w, height: h } = await sharp(SRC).metadata();

  // Η λευκή γέμιση μπαίνει σαφώς ΜΕΣΑ από τον κύκλο. Αν την κάναμε ίση με τον
  // κύκλο, θα ξεπρόβαλλε λευκό δαχτυλίδι στο περίγραμμα (η άκρη του λογοτύπου
  // είναι μαλακή). Το τικ φτάνει το πολύ 177px από το κέντρο, οπότε 92% της
  // ακτίνας το καλύπτει άνετα.
  const white = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
      `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${(w / 2) * 0.92}" ry="${(h / 2) * 0.92}" fill="#ffffff"/>` +
      `</svg>`
  );

  const merged = await sharp(white)
    .composite([{ input: readFileSync(SRC) }])
    .png()
    .toBuffer();

  // ΔΕΝ μεγεθύνουμε: το αρχείο είναι 625×620 και κάθε μεγέθυνση θα το θόλωνε.
  // Απλώς κόβουμε το διάφανο περιθώριο και το κάνουμε τετράγωνο.
  const side = Math.max(w, h);
  return sharp(merged)
    .trim({ threshold: 1 })
    .resize(side, side, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

/** Στρογγυλό εικονίδιο με διάφανες γωνίες. */
async function round(master, size) {
  return sharp(master).resize(size, size).png({ compressionLevel: 9, palette: true }).toBuffer();
}

/**
 * Κρατάει ΜΟΝΟ το λευκό τικ, πετώντας τον μπλε κύκλο. Χρειάζεται για τα
 * τετράγωνα εικονίδια: αν βάζαμε ολόκληρο τον κύκλο πάνω σε μπλε φόντο, θα
 * φαινόταν ένα αχνό δαχτυλίδι εκεί που τελειώνει ο κύκλος.
 */
async function checkOnly(master) {
  const { data, info } = await sharp(master).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const light = Math.min(data[i], data[i + 1], data[i + 2]);
    // 130 → αρχίζει το λευκό, 235 → καθαρό λευκό. Ενδιάμεσα βγαίνει ημιδιάφανο,
    // ώστε η άκρη του τικ να μένει λεία.
    const t = Math.max(0, Math.min(1, (light - 130) / 105));
    out[i] = 255;
    out[i + 1] = 255;
    out[i + 2] = 255;
    out[i + 3] = Math.round(t * (data[i + 3] / 255) * 255);
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

/**
 * Τετράγωνο γεμάτο εικονίδιο: μπλε πλακίδιο + το λευκό τικ. Το `fill` λέει πόσο
 * μεγάλο μπαίνει το τικ — 1 = όσο στον κύκλο (iPhone), 0.8 = μικρότερο, με
 * περιθώριο ασφαλείας για το κόψιμο του Android.
 */
async function filled(check, size, fill) {
  const inner = Math.round(size * fill);
  const mark = await sharp(check).resize(inner, inner).png().toBuffer();
  const pad = Math.round((size - inner) / 2);
  return sharp({ create: { width: size, height: size, channels: 4, background: BLUE } })
    .composite([{ input: mark, left: pad, top: pad }])
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
}

const master = await roundMaster();
const check = await checkOnly(master);

/**
 * Το ΠΑΛΙΟ φορμά εικονιδίου (.ico) — και ο λόγος που η Google έδειχνε άλλο σήμα.
 *
 * Το /favicon.ico είναι το πρώτο πράγμα που ζητάει ο ανιχνευτής εικονιδίων της
 * Google, και το ζητούν ακόμη και browsers που έχουν διαβάσει τα <link> της
 * σελίδας. Στο staffnow.gr ΔΕΝ υπήρχε καθόλου: γύριζε 404. Οπότε η Google
 * κρατούσε ό,τι είχε αποθηκευμένο από παλιά και δεν το ανανέωνε ποτέ.
 *
 * Ένα .ico είναι απλώς ένας φάκελος με εικόνες μέσα. Από τα Windows Vista και
 * μετά δέχεται PNG αυτούσια, οπότε δεν χρειάζεται βιβλιοθήκη: γράφουμε την
 * κεφαλίδα με το χέρι και κολλάμε τα PNG που ήδη φτιάξαμε.
 */
function icoFromPngs(pngs) {
  const count = pngs.length;
  const dir = Buffer.alloc(6 + 16 * count);
  dir.writeUInt16LE(0, 0); // δεσμευμένο
  dir.writeUInt16LE(1, 2); // 1 = εικονίδιο
  dir.writeUInt16LE(count, 4);

  let offset = dir.length;
  for (let i = 0; i < count; i++) {
    const { size, buf } = pngs[i];
    const e = 6 + 16 * i;
    dir.writeUInt8(size >= 256 ? 0 : size, e);      // 0 σημαίνει 256
    dir.writeUInt8(size >= 256 ? 0 : size, e + 1);
    dir.writeUInt8(0, e + 2);                        // χρώματα παλέτας
    dir.writeUInt8(0, e + 3);                        // δεσμευμένο
    dir.writeUInt16LE(1, e + 4);                     // επίπεδα
    dir.writeUInt16LE(32, e + 6);                    // bit ανά pixel
    dir.writeUInt32LE(buf.length, e + 8);
    dir.writeUInt32LE(offset, e + 12);
    offset += buf.length;
  }
  return Buffer.concat([dir, ...pngs.map((p) => p.buf)]);
}

const outputs = [
  ['favicon-16.png', () => round(master, 16)],
  ['favicon-32.png', () => round(master, 32)],
  ['icon-192.png', () => round(master, 192)],
  ['icon-512.png', () => round(master, 512)],
  ['apple-touch-icon.png', () => filled(check, 180, 1)],
  ['icon-maskable-192.png', () => filled(check, 192, 0.8)],
  ['icon-maskable-512.png', () => filled(check, 512, 0.8)],
];

for (const [name, make] of outputs) {
  const buf = await make();
  writeFileSync(path.join(pub, name), buf);
  console.log(`${name.padEnd(24)} ${(buf.length / 1024).toFixed(1)} KB`);
}

// Το .ico θέλει PNG χωρίς παλέτα (κάποια εργαλεία δεν διαβάζουν παλέτα μέσα σε ico).
const icoSizes = [16, 32, 48];
const icoPngs = [];
for (const size of icoSizes) {
  icoPngs.push({
    size,
    buf: await sharp(master).resize(size, size).png({ compressionLevel: 9 }).toBuffer(),
  });
}
const ico = icoFromPngs(icoPngs);
writeFileSync(path.join(pub, 'favicon.ico'), ico);
console.log(`favicon.ico              ${(ico.length / 1024).toFixed(1)} KB  (${icoSizes.join('/')})`);

/**
 * Το icon.svg το ζητάει το layout.tsx, το manifest.webmanifest και το sw.js.
 * Το τικ του λογοτύπου έχει μεταβλητό πάχος (είναι σχεδιασμένο στο χέρι), οπότε
 * δεν αναπαράγεται πιστά με απλή γραμμή σε SVG. Για να μη φαίνεται ΞΑΝΑ
 * διαφορετικό, το SVG περιέχει την ίδια ακριβώς εικόνα.
 */
const embedded = (await round(master, 512)).toString('base64');
writeFileSync(
  path.join(pub, 'icon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">\n` +
    `  <!-- Παράγεται από το scripts/build-icons.mjs. Μην το αλλάζεις με το χέρι. -->\n` +
    `  <image href="data:image/png;base64,${embedded}" width="512" height="512"/>\n` +
    `</svg>\n`
);
console.log(`icon.svg                 ${(embedded.length / 1024).toFixed(1)} KB`);

/**
 * Το icon-maskable.svg δεν το ζητάει κανείς σήμερα, αλλά ήταν γραμμένο στο χέρι
 * με ΑΛΛΟ σχέδιο: τετράγωνο με λεπτό, γωνιακό τικ. Όποιος το έβρισκε και το
 * χρησιμοποιούσε, θα ξανάφερνε πίσω το λάθος σήμα. Ξαναγράφεται κι αυτό από την
 * ίδια πηγή, ώστε στον φάκελο να μην υπάρχει ούτε ένα αρχείο με άλλο λογότυπο.
 */
const maskableEmbedded = (await filled(check, 512, 0.8)).toString('base64');
writeFileSync(
  path.join(pub, 'icon-maskable.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">\n` +
    `  <!-- Παράγεται από το scripts/build-icons.mjs. Μην το αλλάζεις με το χέρι. -->\n` +
    `  <image href="data:image/png;base64,${maskableEmbedded}" width="512" height="512"/>\n` +
    `</svg>\n`
);
console.log(`icon-maskable.svg        ${(maskableEmbedded.length / 1024).toFixed(1)} KB`);

console.log('\nΈτοιμα — όλα από το staffnow-logo.png.');
