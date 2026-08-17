#!/usr/bin/env node
/**
 * ΦΥΛΑΚΑΣ — «μη χαλάσει πάλι αυτό που ήδη δούλευε»
 *
 * Κάθε φορά που κάτι έσπασε ΑΦΟΥ είχε ήδη δουλέψει, γράφουμε εδώ έναν έλεγχο
 * που το πιάνει. Τρέχει πριν κάθε ανέβασμα και στο GitHub.
 *
 *   node scripts/guard.mjs           έλεγχος του κώδικα
 *   node scripts/guard.mjs --live    + έλεγχος του πραγματικού site
 *
 * Γιατί υπάρχει: ο έλεγχος τύπων ΔΕΝ πιάνει αυτά τα λάθη (ο κώδικας της
 * σύνδεσης με τον server είναι «χαλαρός», οπότε μια λειτουργία μπορεί να
 * σβηστεί χωρίς να παραπονεθεί κανείς μέχρι να την πατήσει χρήστης).
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LIVE = process.argv.includes('--live');

const problems = [];
const passed = [];
const fail = (title, detail) => problems.push({ title, detail });
const ok = (title) => passed.push(title);

const read = (p) => readFileSync(join(ROOT, p), 'utf8');

/** Βγάζει σχόλια, ώστε ένα «μην ξανακαλέσεις το api.x.y()» μέσα σε σχόλιο να
 *  μη μετράει σαν πραγματική χρήση. */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(join(ROOT, dir));
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e === 'node_modules' || e === '.next' || e === 'out' || e === 'dist' || e === 'app2') continue;
    const rel = join(dir, e);
    if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, out);
    else if (['.ts', '.tsx', '.js', '.jsx'].includes(extname(e))) out.push(rel);
  }
  return out;
}

// ───────────────────────────────────────────────────────────────────────────
// 1. Καμία λειτουργία του server δεν λείπει από τον πελάτη
//
// Αυτό ακριβώς έσπασε τη βιντεοκλήση στις 16/08: ένα αντίγραφο-επικόλληση
// έσβησε ολόκληρη την ομάδα «calls» και ο έλεγχος τύπων δεν είπε τίποτα.
// ───────────────────────────────────────────────────────────────────────────
function apiClientSurface() {
  const src = read('packages/api-client/src/endpoints.ts');
  const groups = new Map();
  const lines = src.split('\n');
  let current = null;
  let depth = 0;
  for (const line of lines) {
    if (!current) {
      const m = line.match(/^ {2}(?:readonly )?([a-zA-Z][a-zA-Z0-9]*)\s*=\s*\{/);
      if (m) {
        current = m[1];
        groups.set(current, new Set());
        depth = 1;
      }
      continue;
    }
    // μέθοδοι της ομάδας: «όνομα:» ή «όνομα(» στο δεύτερο επίπεδο
    if (depth === 1) {
      const m = line.match(/^ {4}([a-zA-Z][a-zA-Z0-9]*)\s*[:(]/);
      if (m) groups.get(current).add(m[1]);
    }
    depth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
    if (depth <= 0) current = null;
  }
  return groups;
}

function checkApiSurface() {
  const groups = apiClientSurface();
  if (groups.size < 5) {
    fail('Ο πελάτης του server φαίνεται άδειος', `βρέθηκαν μόνο ${groups.size} ομάδες — κάτι σβήστηκε μαζικά`);
    return;
  }

  const used = new Map(); // "group.method" -> [αρχεία]
  for (const dir of ['apps/web/src', 'apps/mobile/src']) {
    for (const file of walk(dir)) {
      const src = stripComments(read(file));
      for (const m of src.matchAll(/\bapi\.([a-zA-Z][a-zA-Z0-9]*)\.([a-zA-Z][a-zA-Z0-9]*)\s*\(/g)) {
        const key = `${m[1]}.${m[2]}`;
        if (!used.has(key)) used.set(key, new Set());
        used.get(key).add(file);
      }
    }
  }

  const missing = [];
  for (const [key, files] of used) {
    const [group, method] = key.split('.');
    if (!groups.has(group)) {
      missing.push(`api.${key}  → λείπει ΟΛΗ η ομάδα «${group}»  (${[...files][0]})`);
    } else if (!groups.get(group).has(method)) {
      missing.push(`api.${key}  → λείπει η λειτουργία  (${[...files][0]})`);
    }
  }

  if (missing.length) {
    fail(
      `${missing.length} λειτουργίες χρησιμοποιούνται αλλά ΔΕΝ υπάρχουν πια`,
      missing.join('\n      ')
    );
  } else {
    ok(`Και οι ${used.size} λειτουργίες που χρησιμοποιεί η εφαρμογή υπάρχουν`);
  }

  // Οι ομάδες που ΠΡΕΠΕΙ πάντα να υπάρχουν, ακόμη κι αν προσωρινά δεν τις
  // καλεί κανείς — έχουν σπάσει στο παρελθόν και δεν το καταλάβαμε.
  const REQUIRED = {
    calls: ['iceServers', 'start', 'pending', 'poll', 'answer', 'addCandidates', 'decline', 'hangup'],
    conversations: ['list', 'getMessages', 'sendMessage', 'markRead'],
    auth: ['login', 'register', 'me'],
    notifications: ['list'],
  };
  const gone = [];
  for (const [group, methods] of Object.entries(REQUIRED)) {
    for (const m of methods) {
      if (!groups.get(group)?.has(m)) gone.push(`api.${group}.${m}`);
    }
  }
  if (gone.length) fail('Λείπουν βασικές λειτουργίες που δεν επιτρέπεται να χαθούν', gone.join(', '));
  else ok('Κλήσεις, συνομιλίες, σύνδεση και ειδοποιήσεις: όλες στη θέση τους');
}

// ───────────────────────────────────────────────────────────────────────────
// 2. Κάμερα και μικρόφωνο επιτρέπονται στο ίδιο μας το site
//
// Αυτό μας κόστισε μια ολόκληρη μέρα: η γραμμή αυτή ΔΕΝ στέλνεται τοπικά,
// οπότε όλα δούλευαν στη δοκιμή και μόνο το live αρνιόταν την κάμερα.
// ───────────────────────────────────────────────────────────────────────────
function checkPermissionsPolicy() {
  const src = read('apps/web/public/_headers');
  const line = src.split('\n').find((l) => /Permissions-Policy/i.test(l));
  if (!line) {
    fail('Χάθηκε η γραμμή αδειών του browser', 'δεν βρέθηκε Permissions-Policy στο apps/web/public/_headers');
    return;
  }
  const blocked = [];
  for (const feature of ['camera', 'microphone', 'geolocation']) {
    const m = line.match(new RegExp(`${feature}\\s*=\\s*\\(([^)]*)\\)`));
    if (!m) continue; // δεν αναφέρεται καθόλου = επιτρεπτό
    if (!m[1].trim()) blocked.push(feature);
  }
  if (blocked.length) {
    fail(
      'Το ίδιο μας το site απαγορεύει: ' + blocked.join(', '),
      'στο apps/web/public/_headers γράψε π.χ. camera=(self) — το άδειο () σημαίνει «απαγορεύεται σε όλους, και σε εμάς»'
    );
  } else {
    ok('Κάμερα, μικρόφωνο και τοποθεσία επιτρέπονται στο site μας');
  }
}

// ───────────────────────────────────────────────────────────────────────────
// 3. Οι διαδρομές του server που στηρίζουν την κλήση είναι δηλωμένες
// ───────────────────────────────────────────────────────────────────────────
function checkApiRoutes() {
  const src = read('apps/api/src/index.ts');
  const missing = ['/calls', '/conversations', '/notifications'].filter(
    (r) => !src.includes(`'${r}'`) && !src.includes(`"${r}"`)
  );
  if (missing.length) fail('Ο server δεν δηλώνει πια', missing.join(', '));
  else ok('Ο server δηλώνει κλήσεις, συνομιλίες και ειδοποιήσεις');
}

// ───────────────────────────────────────────────────────────────────────────
// 3β. Το καμπανάκι δεν αυτοκαταστρέφεται, και κανείς δεν χτυπάει καρφωτά την
//     παραγωγή
//
// Δύο λάθη που έφτασαν σε χρήστες:
//   • Το καμπανάκι στο κινητό σημείωνε ΟΛΕΣ τις ειδοποιήσεις ως διαβασμένες
//     μόλις το πατούσες. Η λίστα δείχνει μόνο τις αδιάβαστες, άρα άνοιγε και
//     άδειαζε μπροστά σου: «δεν υπάρχουν ειδοποιήσεις».
//   • Δύο σημεία καλούσαν καρφωτά τη διεύθυνση της παραγωγής, οπότε δοκιμές
//     από το τοπικό πείραζαν πραγματικά δεδομένα.
// ───────────────────────────────────────────────────────────────────────────
function checkNotificationBell() {
  const src = read('apps/web/src/app/dashboard/layout.tsx');
  const clean = stripComments(src);

  // Άνοιγμα καμπανακιού ΚΑΙ «διάβασέ τα όλα» στην ίδια χειρονομία.
  const suicidal = clean
    .split('\n')
    .some((l) => l.includes('setNotifOpen(') && l.includes('markAllNotificationsRead('));
  if (suicidal) {
    fail(
      'Το καμπανάκι σβήνει τις ειδοποιήσεις μόλις το ανοίξεις',
      'στο apps/web/src/app/dashboard/layout.tsx το κουμπί καλεί markAllNotificationsRead() πάνω στο άνοιγμα· διαβασμένες τις κάνει ο χρήστης'
    );
  } else {
    ok('Το καμπανάκι δεν σβήνει μόνο του τις ειδοποιήσεις');
  }

  // Ο προορισμός της ειδοποίησης υπολογίζεται ΜΙΑ φορά.
  //
  // Το καμπανάκι υπάρχει δύο φορές (υπολογιστής + κινητό). Τρεις φορές
  // διορθώσαμε μόνο το ένα αντίγραφο και ο χρήστης συνέχιζε να βλέπει το
  // λάθος στο άλλο: πατούσε «νέο μήνυμα» και έβγαινε στα γενικά μηνύματα
  // αντί για τη συγκεκριμένη συνομιλία.
  if (!clean.includes('function notificationLink(')) {
    fail(
      'Χάθηκε ο κοινός υπολογισμός προορισμού των ειδοποιήσεων',
      'στο apps/web/src/app/dashboard/layout.tsx πρέπει να υπάρχει η notificationLink() και να τη χρησιμοποιούν ΚΑΙ ΤΑ ΔΥΟ καμπανάκια'
    );
  } else {
    const inline = (clean.match(/'\/dashboard\/messages'\s*:/g) || []).length;
    if (inline > 0) {
      fail(
        'Κάποιο καμπανάκι ξαναχτίζει μόνο του τον προορισμό',
        `βρέθηκαν ${inline} σημεία που αποφασίζουν μόνα τους πού να πάνε· χρησιμοποίησε τη notificationLink()`
      );
    } else {
      ok('Οι ειδοποιήσεις πάνε στην πηγή τους — ένας κοινός υπολογισμός για κινητό και υπολογιστή');
    }
  }

  // Κουμπιά που κλειδώνουν για πάντα επειδή «τίποτα === τίποτα».
  //
  // Το «Ναι, ξεκίνησα» ήταν μόνιμα ξεθωριασμένο: ο έλεγχος ήταν
  // `busy === hire.job_id`, και όταν δεν έτρεχε τίποτα (busy = null) και η
  // πρόσληψη δεν είχε αγγελία (job_id = null), το null === null έβγαινε αληθές.
  // Ο εργαζόμενος δεν μπορούσε να επιβεβαιώσει ποτέ.
  const risky = [];
  for (const dir of ['apps/web/src']) {
    for (const file of walk(dir)) {
      for (const line of stripComments(read(file)).split('\n')) {
        if (/\bbusy\s*===\s*[a-zA-Z]+\.(job_id|jobId|conversation_id|match_id)/.test(line) && !/busy\s*!==\s*null/.test(line)) {
          risky.push(`${file}: ${line.trim().slice(0, 80)}`);
        }
      }
    }
  }
  if (risky.length) {
    fail(
      'Κουμπί που μπορεί να κλειδώσει για πάντα',
      `σύγκριση «τι τρέχει» με πεδίο που μπορεί να είναι κενό — βάλε πρώτα έλεγχο ότι όντως τρέχει κάτι.\n      ${risky.join('\n      ')}`
    );
  } else {
    ok('Κανένα κουμπί δεν κλειδώνει από σύγκριση με κενή τιμή');
  }

  // Καμία καρδιά. Το StaffNow είναι επαγγελματική πλατφόρμα, όχι γνωριμιών —
  // η καρδιά διαβάζεται σαν ερωτικό ενδιαφέρον και μπερδεύει τον κόσμο για το
  // τι κάνει η εφαρμογή. Ισχύει και για τα email.
  const hearts = [];
  for (const dir of ['apps/web/src', 'apps/api/src', 'apps/mobile/src']) {
    for (const file of walk(dir)) {
      if (file.includes('email-previews.generated')) continue;
      const src = stripComments(read(file));
      for (const line of src.split('\n')) {
        // Η μία επιτρεπτή χρήση: η μετάφραση παλιών ειδοποιήσεων στο νέο εικονίδιο.
        // Και οι ΣΧΕΔΙΑΣΜΕΝΕΣ καρδιές, όχι μόνο τα emoji: η καρδιά του
        // εικονιδίου έμενε αόρατη στον έλεγχο και επέζησε στα «Αιτήματα».
        // Εξαίρεση: η ασφάλεια υγείας στις θέσεις εργασίας μας — εκεί η καρδιά
        // σημαίνει υγεία, όχι ενδιαφέρον.
        const drawnHeart = line.includes('M21 8.25c0-2.485') && !file.includes('careers');
        if ((/[\u2665\u2764]/.test(line) || drawnHeart) && !line.includes("=== '\u2764\ufe0f'")) {
          hearts.push(`${file}: ${line.trim().slice(0, 70)}`);
        }
      }
    }
  }
  if (hearts.length) {
    fail(
      `${hearts.length} καρδιές έχουν ξαναμπεί στην εφαρμογή`,
      `Επαγγελματική πλατφόρμα — χρησιμοποίησε \u2713 για «ενδιαφέρομαι» και \ud83d\udc4b για τα εισερχόμενα.\n      ${hearts.join('\n      ')}`
    );
  } else {
    ok('Καμία καρδιά — το ενδιαφέρον διαβάζεται ως επαγγελματικό');
  }

  const hardcoded = [];
  for (const dir of ['apps/web/src', 'apps/mobile/src']) {
    for (const file of walk(dir)) {
      if (/config\.ts|\.test\./.test(file)) continue;
      if (stripComments(read(file)).includes('staffnow-api-production.siteinside53.workers.dev')) {
        hardcoded.push(file);
      }
    }
  }
  // Γραμμή βάσης: αυτά τα αρχεία το έκαναν ΗΔΗ πριν μπει ο έλεγχος. Δουλεύουν
  // στην παραγωγή, οπότε δεν μπλοκάρουν το ανέβασμα — αλλά ούτε προστίθενται
  // καινούργια. Όποτε καθαρίζεται ένα, βγάζεις τη γραμμή του από εδώ και δεν
  // μπορεί να ξαναγυρίσει.
  const KNOWN_HARDCODED = new Set([
  'apps/web/src/app/(marketing)/contact/page.tsx',
  'apps/web/src/app/(marketing)/pricing/page.tsx',
  'apps/web/src/app/admin/admin-users/page.tsx',
  'apps/web/src/app/admin/payments/page.tsx',
  'apps/web/src/app/admin/settings/page.tsx',
  'apps/web/src/app/admin/users/page.tsx',
  'apps/web/src/app/app/browse/page.tsx',
  'apps/web/src/app/auth/google-callback/page.tsx',
  'apps/web/src/app/dashboard/discover/page.tsx',
  'apps/web/src/app/dashboard/interests/page.tsx',
  'apps/web/src/app/dashboard/matches/page.tsx',
  'apps/web/src/app/dashboard/page.tsx',
  'apps/web/src/app/dashboard/profile/page.tsx',
  'apps/web/src/app/dashboard/settings/page.tsx',
  'apps/web/src/app/dashboard/view-profile/page.tsx',
  'apps/web/src/components/admin/lib/admin-api.ts',
  'apps/web/src/components/auth/login-modal.tsx',
  'apps/web/src/components/billing/founding-members-card.tsx',
  'apps/web/src/components/billing/subscription-section.tsx',
  'apps/web/src/components/billing/upgrade-modal.tsx',
  'apps/web/src/components/billing/worker-billing-section.tsx',
  'apps/web/src/components/credits/credits-context.tsx',
  'apps/web/src/components/dashboard/ai-hiring-chat.tsx',
  'apps/web/src/components/dashboard/business-profile.tsx',
  'apps/web/src/components/marketing/activity-marquee.tsx',
  'apps/web/src/components/marketing/blog-list.tsx',
  'apps/web/src/components/marketing/live-activity-toasts.tsx',
  'apps/web/src/components/marketing/live-badge.tsx',
  'apps/web/src/components/marketing/live-counters.tsx',
  'apps/web/src/components/marketing/live-workers.tsx',
  'apps/web/src/components/marketing/newsletter-form.tsx',
  'apps/web/src/components/marketing/swipe-teaser.tsx',
  'apps/web/src/lib/track-activity.ts',
  ]);
  const fresh = hardcoded.filter((f) => !KNOWN_HARDCODED.has(f));
  const left = hardcoded.filter((f) => KNOWN_HARDCODED.has(f)).length;

  if (fresh.length) {
    fail(
      `${fresh.length} ΝΕΑ αρχεία χτυπούν καρφωτά τον server της παραγωγής`,
      `Δοκιμές από το τοπικό θα πειράξουν αληθινά δεδομένα. Χρησιμοποίησε το API_URL.\n      ${fresh.join('\n      ')}`
    );
  } else if (left) {
    ok(`Καμία νέα καρφωτή διεύθυνση (μένουν ${left} παλιές προς καθαρισμό)`);
  } else {
    ok('Κανένα αρχείο δεν χτυπάει καρφωτά την παραγωγή');
  }
}

// ───────────────────────────────────────────────────────────────────────────
// 4. Οι εικόνες του φόντου δεν καθυστερούν την αρχική
//
// Κάθονται πάνω ακριβώς στην πρώτη οθόνη. Μισό κοινό μας είναι σε φθηνό
// Android με μέτριο σήμα: 3 MB φόντο σημαίνει δευτερόλεπτα λευκή οθόνη πριν
// διαβάσει την πρώτη λέξη.
// ───────────────────────────────────────────────────────────────────────────
const HERO_BUDGET_BYTES = 1_200_000;

function checkHeroPhotos() {
  let files;
  try {
    files = readdirSync(join(ROOT, 'apps/web/public/hero')).filter((f) =>
      /\.(jpe?g|png|webp|avif)$/i.test(f)
    );
  } catch {
    return; // δεν υπάρχει φάκελος — μια χαρά
  }
  if (!files.length) return; // άδειος — τρέχουν τα σχέδια

  let total = 0;
  const heavy = [];
  for (const f of files) {
    const { size } = statSync(join(ROOT, 'apps/web/public/hero', f));
    total += size;
    if (size > 200_000) heavy.push(`${f} (${Math.round(size / 1024)} KB)`);
  }

  if (total > HERO_BUDGET_BYTES) {
    fail(
      `Οι εικόνες του φόντου είναι ${Math.round(total / 1024)} KB — πολύ βαριές`,
      `Θα αργεί η αρχική σε κινητό. Μίκρυνέ τες στα ~400x400 (όριο ${Math.round(HERO_BUDGET_BYTES / 1024)} KB συνολικά).` +
        (heavy.length ? `\n      Οι πιο βαριές: ${heavy.join(', ')}` : '')
    );
  } else {
    ok(`Φόντο αρχικής: ${files.length} εικόνες, ${Math.round(total / 1024)} KB συνολικά`);
  }
}

// ───────────────────────────────────────────────────────────────────────────
// 5. Το πραγματικό site (μόνο με --live)
// ───────────────────────────────────────────────────────────────────────────
async function checkLive() {
  try {
    const res = await fetch('https://staffnow.gr/', { method: 'HEAD' });
    const pp = res.headers.get('permissions-policy') || '';
    if (/camera=\(\)/.test(pp) || /microphone=\(\)/.test(pp)) {
      fail('ΤΟ LIVE απαγορεύει κάμερα/μικρόφωνο', pp);
    } else {
      ok('Το live επιτρέπει κάμερα και μικρόφωνο');
    }
  } catch (e) {
    fail('Δεν απάντησε το staffnow.gr', String(e.message || e));
  }

  try {
    const res = await fetch('https://staffnow-api-production.siteinside53.workers.dev/health');
    if (res.ok) ok('Ο server απαντάει');
    else fail('Ο server δεν απαντάει σωστά', 'κωδικός ' + res.status);
  } catch (e) {
    fail('Δεν απάντησε ο server', String(e.message || e));
  }

  try {
    const res = await fetch('https://staffnow-api-production.siteinside53.workers.dev/calls/ice/status');
    const body = await res.json().catch(() => ({}));
    const relay = body?.relay ?? body?.data?.relay;
    if (relay === true) ok('Ο αναμεταδότης της βιντεοκλήσης είναι ενεργός');
    else fail('Ο αναμεταδότης της βιντεοκλήσης ΔΕΝ είναι ενεργός', 'οι κλήσεις πίσω από αυστηρά δίκτυα θα κολλάνε');
  } catch (e) {
    fail('Δεν μπόρεσα να ελέγξω τον αναμεταδότη', String(e.message || e));
  }
}

// ───────────────────────────────────────────────────────────────────────────
checkApiSurface();
checkPermissionsPolicy();
checkApiRoutes();
checkNotificationBell();
checkHeroPhotos();
if (LIVE) await checkLive();

console.log('');
for (const p of passed) console.log('  [32m✓[0m ' + p);
for (const p of problems) {
  console.log('  [31m✗ ' + p.title + '[0m');
  console.log('      ' + p.detail);
}
console.log('');

if (problems.length) {
  console.log(`[31mΣΤΑΜΑΤΑ: ${problems.length} πρόβλημα(τα). Κάτι που δούλευε έχει χαλάσει — μην ανεβάσεις.[0m\n`);
  process.exit(1);
}
console.log(`[32mΌλα καλά (${passed.length} έλεγχοι).[0m\n`);
