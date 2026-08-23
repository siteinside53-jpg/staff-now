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
// TaskNow (μικροδουλειές) — τρεις κανόνες που ΔΕΝ επιτρέπεται να χαλάσουν
//
// 1. Ό,τι κρύβει ο διαχειριστής δεν φαίνεται και δεν μετριέται δημόσια.
//    Βρέθηκε στη μακέτα: το μπάνερ της αρχικής μετρούσε και τις κρυμμένες,
//    οπότε μια αγγελία που κόπηκε για ερωτικό περιεχόμενο φούσκωνε δημόσιο
//    μετρητή και το άθροισμα αμοιβών.
// 2. Μια άδεια γίνεται «ελεγμένη» ΜΟΝΟ από το διαχειριστικό. Αν κάποιο άλλο
//    αρχείο βάλει `verified: true`, χάνεται η διαφορά «δηλωμένο»/«ελεγμένο»
//    — που είναι ακριβώς η γραμμή ανάμεσα στο «σου δίνουμε πληροφορία» και
//    στο «σου εγγυόμαστε».
// 3. Όσο η ενότητα είναι μακέτα, δεν μιλάει στον πραγματικό server.
// ───────────────────────────────────────────────────────────────────────────
function checkTaskNow() {
  const dir = 'apps/web/src/components/tasknow';
  let files;
  try {
    files = walk(dir);
  } catch {
    return;
  }
  if (!files.length) return; // η ενότητα δεν υπάρχει (ακόμη) — δεν ελέγχουμε

  // 1. Οι δημόσιες λίστες φιλτράρουν τις κρυμμένες
  const publicLists = [
    [join(dir, 'task-feed.tsx'), 'η δημόσια ροή'],
    [join(dir, 'home-banner.tsx'), 'το μπάνερ της αρχικής'],
  ];
  const leaks = [];
  for (const [file, label] of publicLists) {
    let src;
    try {
      src = stripComments(read(file));
    } catch {
      continue;
    }
    // Δεκτό είτε ρητό «!x.hidden», είτε το κοινό φίλτρο isPublic/isOpen που
    // κόβει μαζί κρυμμένες, ακυρωμένες και σε διαφωνία.
    if (!/!\w+\.hidden|\bisPublic\b|\bisOpen\b|\bpublicOpenTasks\b|\bpreviewTasks\b/.test(src))
      leaks.push(label);
  }
  if (leaks.length) {
    fail(
      'Κρυμμένες μικροδουλειές φαίνονται δημόσια',
      `Λείπει το φίλτρο «όχι οι κρυμμένες» από: ${leaks.join(', ')}. ` +
        'Ό,τι κόβει ο διαχειριστής πρέπει να εξαφανίζεται και από τις λίστες και από τα νούμερα.'
    );
  } else {
    ok('TaskNow: ό,τι κρύβει ο διαχειριστής δεν φαίνεται και δεν μετριέται');
  }

  // 2. «Ελεγμένη» άδεια μόνο από το διαχειριστικό
  const allowed = new Set([join(dir, 'mock-store.ts')]);
  const badVerified = [];
  for (const f of files) {
    if (allowed.has(f)) continue;
    const src = stripComments(read(f));
    if (/verified:\s*true/.test(src)) badVerified.push(f);
  }
  if (badVerified.length) {
    fail(
      'Άδεια δηλώνεται «ελεγμένη» έξω από τον έλεγχο ανθρώπου',
      `Βρέθηκε «verified: true» σε: ${badVerified.join(', ')}. ` +
        'Μόνο ο διαχειριστής εγκρίνει άδεια — αλλιώς δείχνουμε ως ελεγμένο κάτι που δεν είδε κανείς.'
    );
  } else {
    ok('TaskNow: άδεια γίνεται «ελεγμένη» μόνο από το διαχειριστικό');
  }

  // 3. Οι μικροδουλειές ΔΕΝ ξαναγίνονται μακέτα.
  //
  //    Μέχρι που απέκτησαν βάση, όλα ζούσαν μέσα στον browser: ό,τι ανέβαζες
  //    το έβλεπες μόνο εσύ, στη μία εκείνη συσκευή. Αν κάποιος ξαναβάλει
  //    χειρόγραφη λίστα δουλειών, η ενότητα γυρίζει σιωπηλά στη μακέτα και
  //    κανείς δεν θα το προσέξει μέχρι να παραπονεθεί χρήστης.
  const storeFile = 'apps/web/src/components/tasknow/mock-store.ts';
  const storeSrc = read(storeFile);
  if (!/tasknow\.(state|feed)\s*\(/.test(stripComments(storeSrc))) {
    fail(
      'Οι μικροδουλειές δεν διαβάζονται από τη βάση',
      'Η mock-store.ts πρέπει να καλεί api.tasknow.state() / .feed(). Χωρίς ' +
        'αυτό η ενότητα γυρίζει σε μακέτα: ό,τι ανεβάζει ο χρήστης δεν το ' +
        'βλέπει κανένας άλλος και καμία προσφορά δεν έρχεται ποτέ.'
    );
  } else {
    ok('TaskNow: οι μικροδουλειές έρχονται από τη βάση');
  }

  // 4. Καμία μικροδουλειά δεν αποθηκεύεται στον browser.
  //
  //    ΤΙ ΠΗΓΕ ΣΤΡΑΒΑ ΚΑΙ ΕΦΤΑΣΕ ΣΕ ΧΡΗΣΤΗ: παλιότερα η κατάσταση γραφόταν
  //    ολόκληρη στον browser. Όποιος είχε δει τη μακέτα κρατούσε 16 ψεύτικες
  //    μικροδουλειές αποθηκευμένες, και ξαναέβγαιναν στο staffnow.gr — μέσα
  //    στον λογαριασμό, δίπλα σε αληθινές αγγελίες.
  //
  //    Τώρα στον browser μένει ΜΟΝΟ η προτίμηση ειδοποιήσεων. Αν κάποιος
  //    ξαναγράψει εκεί δουλειές, το πρόβλημα επιστρέφει αυτούσιο.
  {
    const clean = stripComments(storeSrc);
    const persistBody = clean.slice(clean.indexOf('function persist()'), clean.indexOf('function persist()') + 400);
    const writesEverything = /setItem\([^)]*JSON\.stringify\(state\)/.test(persistBody);
    const readsTasks = /parsed[?.]*\.tasks/.test(clean);
    if (writesEverything || readsTasks) {
      fail(
        'Μικροδουλειές αποθηκεύονται ξανά στον browser',
        'Στη mock-store.ts επιτρέπεται να γράφεται/διαβάζεται ΜΟΝΟ το notify. ' +
          'Αν αποθηκευτούν δουλειές, όποιος είδε ψεύτικα θα συνεχίσει να τα ' +
          'βλέπει, και ό,τι ανεβάζει δεν θα φτάνει σε κανέναν.'
      );
    } else {
      ok('TaskNow: στον browser μένει μόνο η προτίμηση ειδοποιήσεων');
    }
  }

  // 5. Τα ΠΑΡΑΔΕΙΓΜΑΤΑ δεν προσποιούνται αληθινές δουλειές.
  //
  //    Το ταμπλό ξεκινάει με λίγα παραδείγματα, ώστε να μην ανοίγει άδειο. Αν
  //    όμως κάποιος στείλει προσφορά σε παράδειγμα, θα περιμένει απάντηση που
  //    δεν θα έρθει ποτέ — και αυτόν τον άνθρωπο τον χάνεις οριστικά. Είναι
  //    ακριβώς ο τύπος χρήστη που χρειάζεται η πλατφόρμα.
  //
  //    Δύο ασφάλειες, και οι δύο πρέπει να υπάρχουν: ο server αρνείται, και η
  //    οθόνη δεν δείχνει καν κουμπί.
  {
    const apiSrc = stripComments(read('apps/api/src/routes/tasknow.ts'));
    if (!/is_sample === 1[\s\S]{0,160}return error/.test(apiSrc)) {
      fail(
        'Ο server δέχεται προσφορά σε παράδειγμα',
        'Στο POST /tasknow/tasks/:id/offers πρέπει να απορρίπτεται η προσφορά ' +
          'όταν is_sample = 1. Αλλιώς κάποιος στέλνει προσφορά σε δουλειά που ' +
          'δεν υπάρχει και περιμένει απάντηση που δεν θα έρθει ποτέ.'
      );
    } else {
      ok('TaskNow: ο server δεν δέχεται προσφορά σε παράδειγμα');
    }

    const rowSrc = stripComments(read('apps/web/src/components/tasknow/task-row.tsx'));
    if (!/task\.isSample/.test(rowSrc)) {
      fail(
        'Η οθόνη δεν ξεχωρίζει τα παραδείγματα',
        'Η κάρτα της μικροδουλειάς πρέπει να ελέγχει το task.isSample: σήμα ' +
          'αντί για κουμπί προσφοράς. Ένα κουμπί που δεν οδηγεί πουθενά είναι ' +
          'χειρότερο από κανένα κουμπί.'
      );
    } else {
      ok('TaskNow: τα παραδείγματα φαίνονται ως παραδείγματα, χωρίς κουμπί προσφοράς');
    }

    // Και σβήνουν μόνα τους μόλις μαζευτούν αληθινές — αλλιώς μένουν για πάντα
    // επειδή δεν θα το θυμηθεί κανείς.
    if (!/HIDE_SAMPLES_AFTER/.test(apiSrc)) {
      fail(
        'Τα παραδείγματα δεν σβήνουν ποτέ μόνα τους',
        'Ο server πρέπει να σταματάει να τα στέλνει μόλις υπάρξουν αρκετές ' +
          'αληθινές μικροδουλειές.'
      );
    } else {
      ok('TaskNow: τα παραδείγματα εξαφανίζονται μόνα τους στις πρώτες αληθινές');
    }
  }
}

// ───────────────────────────────────────────────────────────────────────────
// 4β. Νέα αλλαγή βάσης = νέα γραμμή στο ανέβασμα του server
//
// ΤΙ ΘΑ ΠΑΘΑΙΝΕ ΧΩΡΙΣ ΑΥΤΟ: το ανέβασμα του server ΔΕΝ εφαρμόζει μόνο του τις
// αλλαγές της βάσης. Αν κάποιος προσθέσει πίνακα και ξεχάσει να τον γράψει στο
// βήμα του ανεβάσματος, ο νέος κώδικας φτάνει στην παραγωγή και ρωτάει πίνακα
// που δεν υπάρχει — δηλαδή η σελίδα που τον χρησιμοποιεί σπάει για όλους.
//
// Δεν μπορεί να τρέξουν «όλα τα αρχεία»: έξι από τα παλιά περιέχουν εντολές
// διαγραφής και θα ήταν καταστροφικό πάνω σε πραγματικά δεδομένα.
// ───────────────────────────────────────────────────────────────────────────
// ───────────────────────────────────────────────────────────────────────────
// 4γ. Το εικονίδιο της καρτέλας και της Google υπάρχει, και είναι ΕΝΑ
//
// ΤΙ ΕΓΙΝΕ: το /favicon.ico δεν υπήρχε καθόλου στο site — γύριζε 404. Είναι
// όμως το πρώτο πράγμα που ζητάει ο ανιχνευτής εικονιδίων της Google, οπότε
// εκείνη κρατούσε ένα παλιό, διαφορετικό σήμα στα αποτελέσματα και δεν το
// ανανέωνε ποτέ. Παράλληλα, ένα ορφανό αρχείο είχε μείνει με το παλιό σχέδιο
// (τετράγωνο με λεπτό τικ) και περίμενε να το χρησιμοποιήσει κάποιος.
// ───────────────────────────────────────────────────────────────────────────
// ───────────────────────────────────────────────────────────────────────────
// 4δ. Η ΒΙΝΤΕΟΚΛΗΣΗ — τα πέντε λάθη που την έκαναν να «χαλάει ξανά»
//
// Ο ιδιοκτήτης το ανέφερε ως «το φτιάχνουμε πολλές φορές και μετά πάλι
// χαλάει». Δεν ήταν καινούργιο λάθος κάθε φορά· ήταν ένα που ΚΟΛΛΑΕΙ ΜΟΝΙΜΑ:
// μια κλήση που κοβόταν άσχημα άφηνε γραμμή που δεν έληγε ποτέ, και οι δύο
// άνθρωποι κλειδώνονταν μεταξύ τους για πάντα με «είναι ήδη σε κλήση».
// ───────────────────────────────────────────────────────────────────────────
function checkVideoCalls() {
  const src = read('apps/api/src/routes/calls.ts');
  const clean = stripComments(src);

  // (1) Οι απαντημένες κλήσεις πρέπει να λήγουν. Χωρίς αυτό, μια κλήση που
  //     κόπηκε άσχημα μπλοκάρει τους δύο χρήστες οριστικά.
  const expireFn = clean.slice(clean.indexOf('function expireStaleCalls'));
  const expireBody = expireFn.slice(0, expireFn.indexOf('\n}') + 2);
  if (!/status\s*=\s*'accepted'/.test(expireBody)) {
    fail(
      'Οι απαντημένες κλήσεις δεν λήγουν ποτέ',
      'Η expireStaleCalls πρέπει να κλείνει ΚΑΙ γραμμές «accepted» που σώπασαν. ' +
        'Αλλιώς μια κλήση που κόπηκε άσχημα κλειδώνει τους δύο χρήστες για πάντα.'
    );
  } else {
    ok('Βιντεοκλήση: οι απαντημένες κλήσεις που σώπασαν κλείνουν μόνες τους');
  }

  // (2) Το καθάρισμα ΠΡΕΠΕΙ να τρέχει πριν τον έλεγχο «απασχολημένος». Ήταν
  //     τρεις γραμμές πιο κάτω, δηλαδή μετά το return — άρα δεν έτρεχε ποτέ
  //     για αυτόν που το χρειαζόταν.
  const postFn = clean.slice(clean.indexOf("calls.post('/', requireAuth"));
  const cleanupAt = postFn.indexOf("end_reason = 'hangup'");
  const busyAt = postFn.indexOf('είναι ήδη σε κλήση') >= 0
    ? postFn.indexOf('είναι ήδη σε κλήση')
    : postFn.indexOf('const busy');
  if (cleanupAt < 0 || busyAt < 0 || cleanupAt > busyAt) {
    fail(
      'Ο καλών μπορεί να μπλοκαριστεί από τη δική του παλιά κλήση',
      'Στο POST /calls, το κλείσιμο των δικών μου ξεχασμένων κλήσεων πρέπει να ' +
        'γίνεται ΠΡΙΝ τον έλεγχο «είναι απασχολημένος». Ήταν από κάτω, οπότε το ' +
        'αίτημα γύριζε 409 και δεν έφτανε ποτέ στο καθάρισμα.'
    );
  } else {
    ok('Βιντεοκλήση: το καθάρισμα τρέχει πριν τον έλεγχο «απασχολημένος»');
  }

  // (3) Ο έλεγχος «απασχολημένος» χρειάζεται ημερομηνία λήξης — αλλιώς μια
  //     ξεχασμένη γραμμή μπλοκάρει για πάντα.
  const busyBlock = postFn.slice(busyAt - 600, busyAt + 200);
  if (!/created_at\s*>|updated_at\s*>/.test(busyBlock)) {
    fail(
      'Ο έλεγχος «απασχολημένος» δεν έχει χρονικό όριο',
      'Πρέπει να μετράει μόνο κλήσεις που είναι ΟΝΤΩΣ ζωντανές (created_at / ' +
        'updated_at μέσα σε όριο). Χωρίς αυτό, μια ξεχασμένη γραμμή κλειδώνει ' +
        'δύο ανθρώπους οριστικά.'
    );
  } else {
    ok('Βιντεοκλήση: ο έλεγχος «απασχολημένος» δεν κλειδώνει για πάντα');
  }

  // (4) Οι κλήσεις δεν πρέπει να πέφτουν στο φρένο ΑΝΑ ΔΙΕΥΘΥΝΣΗ ΔΙΚΤΥΟΥ: δύο
  //     συσκευές στο ίδιο WiFi το ξεπερνούν μόνες τους και το «χτυπάει» χάνεται
  //     σιωπηλά.
  const idx = stripComments(read('apps/api/src/index.ts'));
  const rlBlock = idx.slice(idx.indexOf('const globalRl'), idx.indexOf('const globalRl') + 400);
  if (!rlBlock.includes("'/calls'")) {
    fail(
      'Οι κλήσεις κόβονται από το φρένο ανά δίκτυο',
      'Το /calls πρέπει να εξαιρείται από το globalRateLimiter (index.ts). Δύο ' +
        'συσκευές στο ίδιο WiFi μοιράζονται μία διεύθυνση και ξεπερνούν μόνες ' +
        'τους τα 120/λεπτό — τότε το «με καλεί κανείς;» απορρίπτεται σιωπηλά.'
    );
  } else {
    ok('Βιντεοκλήση: τα αιτήματα κλήσης δεν κόβονται από το φρένο ανά δίκτυο');
  }

  // (5) Το «έκλεισα» πρέπει να φεύγει ακόμη κι όταν κλείνει η σελίδα.
  const engine = stripComments(read('apps/web/src/lib/call-engine.ts'));
  if (!/keepalive:\s*true/.test(engine)) {
    fail(
      'Το «έκλεισα» χάνεται όταν κλείνει η σελίδα',
      'Στο call-engine.ts, ο τερματισμός κατά το κλείσιμο πρέπει να φεύγει με ' +
        'keepalive: true. Αλλιώς ο browser το ακυρώνει και η κλήση μένει ' +
        'ανοιχτή στον server.'
    );
  } else {
    ok('Βιντεοκλήση: το «έκλεισα» φεύγει ακόμη κι αν κλείσει η σελίδα');
  }

  /*
    (5β) Ο ΠΑΡΑΛΗΠΤΗΣ ΔΕΝ ΠΕΤΑΕΙ ΤΟΥΣ ΔΡΟΜΟΥΣ ΤΟΥ ΚΑΛΟΥΝΤΟΣ.

    Το πρώτο ρώτημα στο accept() φέρνει και την πρόταση σύνδεσης ΚΑΙ όλους τους
    δρόμους που έστειλε ο καλών όσο χτυπούσε. Ο κώδικας κρατούσε μόνο τον
    δείκτη — δηλαδή έλεγε στον server «τα είδα» και τα πετούσε, γιατί η σύνδεση
    δεν είχε φτιαχτεί ακόμη.

    Ο καλών μαζεύει τους δρόμους του μέσα στο πρώτο δευτερόλεπτο και τελειώνει.
    Άρα ο παραλήπτης έμενε συνήθως ΧΩΡΙΣ ΚΑΝΕΝΑΝ: η κλήση χτυπούσε, απαντιόταν,
    κολλούσε στο «σύνδεση» και πέθαινε. Είναι το λάθος που έκανε τη
    βιντεοκλήση να «μη δουλεύει» ακόμη κι όταν έφτανε στον άλλον.
  */
  {
    const acc = engine.slice(engine.indexOf('async accept('));
    const body = acc.slice(0, acc.indexOf('this.pc = await this.buildConnection()'));
    if (!/earlyCandidates\.push/.test(body)) {
      fail(
        'Ο παραλήπτης πετάει τους δρόμους σύνδεσης του καλούντος',
        'Στο accept() του call-engine.ts, οι candidates του πρώτου poll πρέπει ' +
          'να μπαίνουν στο earlyCandidates πριν στηθεί η σύνδεση. Αλλιώς η κλήση ' +
          'απαντιέται και μετά κολλάει για πάντα στο «σύνδεση».'
      );
    } else {
      ok('Βιντεοκλήση: ο παραλήπτης κρατάει τους δρόμους που ήρθαν πριν απαντήσει');
    }
  }

  /*
    (5γ) Η ΘΕΣΗ ΚΡΥΒΕΤΑΙ ΜΕ ΚΟΥΜΠΩΜΑ, ΠΟΤΕ ΜΕ ΜΕΤΑΤΟΠΙΣΗ.

    Η πρώτη εκδοχή μετατόπιζε το σημείο ~300 μ. προς κατεύθυνση που έβγαινε από
    το id της αγγελίας — που είναι ΔΗΜΟΣΙΟ. Όποιος ήξερε τον υπολογισμό αφαιρούσε
    το ίδιο διάνυσμα και έπαιρνε πίσω τη διεύθυνση: μετρήθηκε σφάλμα ανάκτησης
    0,12 μέτρα. Μηδενική προστασία, με την ψευδαίσθηση της προστασίας — που
    είναι χειρότερο από καθόλου, γιατί ο χρήστης δίνει τη διεύθυνσή του
    νομίζοντας ότι δίνει περιοχή.

    Το κούμπωμα σε πλέγμα είναι πράξη πολλά-προς-ένα: δεν υπάρχει τίποτα να
    αφαιρέσεις, και δέκα αγγελίες από το ίδιο σπίτι δίνουν το ΙΔΙΟ σημείο αντί
    για δέκα κύκλους που τέμνονται.
  */
  {
    const api = stripComments(read('apps/api/src/routes/tasknow.ts'));
    if (/fuzzPoint|Math\.(sin|cos)\([\s\S]{0,80}angle/.test(api)) {
      fail(
        'Η θέση κρύβεται με μετατόπιση — αντιστρέφεται',
        'Στο tasknow.ts η δημόσια θέση πρέπει να προκύπτει με ΚΟΥΜΠΩΜΑ σε πλέγμα ' +
          '(snapPoint), όχι με μετατόπιση από σπόρο. Η μετατόπιση αφαιρείται και ' +
          'αποκαλύπτει τη διεύθυνση με ακρίβεια εκατοστών.'
      );
    } else if (!/snapPoint/.test(api)) {
      fail(
        'Δεν υπάρχει προστασία της θέσης',
        'Το tasknow.ts πρέπει να κουμπώνει τη δημόσια θέση σε πλέγμα (snapPoint).'
      );
    } else {
      ok('TaskNow: η δημόσια θέση κουμπώνει σε πλέγμα — δεν αντιστρέφεται');
    }
  }

  // (6) Η οθόνη που χτυπάει πρέπει να φεύγει όταν δεν υπάρχει πια κλήση.
  const center = stripComments(read('apps/web/src/components/video/call-center.tsx'));
  if (!/if\s*\(!call\)\s*\{[\s\S]{0,120}setIncoming\(null\)/.test(center)) {
    fail(
      'Η οθόνη «Εισερχόμενη κλήση» δεν φεύγει μόνη της',
      'Στο checkPending, όταν ο server λέει ότι δεν υπάρχει κλήση πρέπει να ' +
        'γίνεται setIncoming(null). Αλλιώς η οθόνη κουδουνίζει σε κάτι που δεν ' +
        'υπάρχει, και σε δεύτερη καρτέλα το «Απόρριψη» σκοτώνει τη ζωντανή κλήση.'
    );
  } else {
    ok('Βιντεοκλήση: η οθόνη που χτυπάει φεύγει όταν τελειώσει η κλήση');
  }
}

function checkFavicons() {
  const need = [
    'favicon.ico',
    'favicon-16.png',
    'favicon-32.png',
    'icon-192.png',
    'icon-512.png',
    'apple-touch-icon.png',
  ];
  const missing = need.filter((f) => {
    try {
      readFileSync(join(ROOT, 'apps/web/public', f));
      return false;
    } catch {
      return true;
    }
  });
  if (missing.length) {
    fail(
      'Λείπουν εικονίδια του site',
      `${missing.join(', ')}. Τρέξε: node apps/web/scripts/build-icons.mjs — τα βγάζει όλα ` +
        'από το ΕΝΑ πραγματικό λογότυπο (public/staffnow-logo.png).'
    );
    return;
  }

  // Κανένα εικονίδιο δεν επιτρέπεται να είναι σχεδιασμένο στο χέρι: το παλιό
  // σχέδιο ζούσε ακριβώς έτσι, ως γραμμή σε SVG.
  const handDrawn = [];
  for (const f of ['icon.svg', 'icon-maskable.svg']) {
    let src;
    try {
      src = readFileSync(join(ROOT, 'apps/web/public', f), 'utf8');
    } catch {
      continue;
    }
    if (!src.includes('base64')) handDrawn.push(f);
  }
  if (handDrawn.length) {
    fail(
      'Εικονίδιο ζωγραφισμένο στο χέρι, άρα άλλο σήμα',
      `${handDrawn.join(', ')}. Πρέπει να παράγονται από το build-icons.mjs, ` +
        'ώστε να δείχνουν ΤΟ ΙΔΙΟ λογότυπο με το υπόλοιπο site.'
    );
  } else {
    ok('Το εικονίδιο της καρτέλας και της Google υπάρχει και βγαίνει από το ένα λογότυπο');
  }
}

function checkMigrationsWired() {
  let files;
  try {
    files = readdirSync(join(ROOT, 'apps/api/migrations')).filter((f) => f.endsWith('.sql')).sort();
  } catch {
    return; // δεν υπάρχει φάκελος — τίποτα να ελέγξουμε
  }
  if (!files.length) return;

  const newest = files[files.length - 1];
  let deploy;
  try {
    deploy = read('.github/workflows/deploy-api.yml');
  } catch {
    fail('Λείπει το αρχείο ανεβάσματος του server', '.github/workflows/deploy-api.yml');
    return;
  }

  if (!deploy.includes(newest)) {
    fail(
      'Η πιο πρόσφατη αλλαγή βάσης δεν εφαρμόζεται στο ανέβασμα',
      `Το «${newest}» δεν αναφέρεται στο .github/workflows/deploy-api.yml. ` +
        'Χωρίς αυτό, ο νέος κώδικας θα ζητήσει πίνακα που δεν υπάρχει στην παραγωγή ' +
        'και η σελίδα θα σπάσει για όλους. Πρόσθεσέ το στη λίστα του βήματος ' +
        '«Apply new database migrations».'
    );
  } else {
    ok(`Η αλλαγή βάσης «${newest}» εφαρμόζεται πριν ανέβει ο server`);
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
checkTaskNow();
checkMigrationsWired();
checkFavicons();
checkVideoCalls();
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
