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
// 4. Το πραγματικό site (μόνο με --live)
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
