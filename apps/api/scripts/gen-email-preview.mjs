/**
 * Φτιάχνει τη σελίδα «όλα τα email που φεύγουν στον πελάτη».
 *
 * ΓΙΑΤΙ ΕΤΣΙ: δεν ζωγραφίζει μακέτα. Διαβάζει τον ΑΛΗΘΙΝΟ `emailLayout()` από
 * το `src/lib/email.ts` και τον ΑΛΗΘΙΝΟ `heroFor()` από το `src/lib/notify.ts`,
 * και τα εκτελεί. Ό,τι βλέπεις στη σελίδα είναι byte-πρός-byte αυτό που
 * παραδίδει το Resend στο inbox. Αν αύριο αλλάξει το πρότυπο, ξανατρέχεις:
 *
 *   node scripts/gen-email-preview.mjs
 *
 * Τα ονόματα/ποσά στα δείγματα είναι ΦΑΝΤΑΣΤΙΚΑ και το λέει η σελίδα καθαρά.
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Το pnpm δεν αφήνει το esbuild στη ρίζα του node_modules, οπότε το βρίσκουμε
// μόνοι μας μέσα στο .pnpm — αλλιώς το script σπάει σε καθαρό checkout.
const esbuild = await (async () => {
  const store = join(HERE_ROOT(), 'node_modules', '.pnpm');
  const dir = readdirSync(store)
    .filter((d) => /^esbuild@/.test(d))
    .sort()
    .pop();
  if (!dir) throw new Error('Δεν βρέθηκε esbuild — τρέξε πρώτα pnpm install');
  return import(pathToFileURL(join(store, dir, 'node_modules', 'esbuild', 'lib', 'main.js')).href);
})();

function HERE_ROOT() {
  return join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
}

const HERE = dirname(fileURLToPath(import.meta.url));
const API_SRC = join(HERE, '..', 'src');
const OUT_DIR = join(HERE, '..', '..', 'web', 'public', 'emails');
const TMP = join(HERE, '.tmp-email-preview');

// --- 1. Ο αληθινός emailLayout, μεταγλωττισμένος από το ίδιο το αρχείο -------
mkdirSync(TMP, { recursive: true });
const layoutTs = readFileSync(join(API_SRC, 'lib', 'email.ts'), 'utf8');
const layoutJs = esbuild.transformSync(layoutTs, { loader: 'ts', format: 'esm' }).code;
writeFileSync(join(TMP, 'email.mjs'), layoutJs);
const { emailLayout } = await import(pathToFileURL(join(TMP, 'email.mjs')).href);

// --- 2. Ο αληθινός heroFor, κομμένος από το notify.ts -----------------------
// Δεν είναι exported, οπότε τον βγάζουμε με μέτρημα αγκυλών — έτσι αν κάποιος
// προσθέσει αύριο μια κατηγορία, η προεπισκόπηση την ακολουθεί μόνη της.
// Μεταγλωττίζουμε ΟΛΟ το notify.ts, πετάμε τα import (δεν λύνονται εκτός
// Workers) και εξάγουμε μόνο το heroFor. Οι υπόλοιπες συναρτήσεις μένουν εκεί
// αλλά δεν καλούνται ποτέ, οπότε δεν πειράζει που τους λείπουν εξαρτήσεις.
const notifyTs = readFileSync(join(API_SRC, 'lib', 'notify.ts'), 'utf8');
if (!notifyTs.includes('function heroFor')) {
  throw new Error('Δεν βρέθηκε το heroFor() στο notify.ts — άλλαξε ο κώδικας;');
}
const heroSrc =
  esbuild
    .transformSync(notifyTs, { loader: 'ts', format: 'esm' })
    .code.split('\n')
    .filter((l) => !/^\s*import\s/.test(l))
    .join('\n') + '\nexport { heroFor };\n';
writeFileSync(join(TMP, 'hero.mjs'), heroSrc);
const { heroFor } = await import(pathToFileURL(join(TMP, 'hero.mjs')).href);

const WEB = 'https://staffnow.gr';

/** Ό,τι περνάει από notifyUser() — δηλαδή σχεδόν όλα. */
function viaNotify({ title, body, ctaText, url, category }) {
  const { icon, tint } = heroFor(category || '', title);
  return {
    subject: title,
    html: emailLayout({
      title,
      body,
      ctaText: ctaText || 'Άνοιγμα StaffNow',
      ctaUrl: `${WEB}${url || '/dashboard'}`,
      icon,
      tint,
    }),
  };
}

const cd = (m) =>
  m >= 1440 ? `${m / 1440} ημέρες` : m >= 60 ? `${m / 60} ώρες` : `${m} λεπτά`;

// --- 3. Ο κατάλογος ---------------------------------------------------------
// Κάθε γραμμή δείχνει στο σημείο του κώδικα που το στέλνει, ώστε να μπορεί να
// επαληθευτεί χωρίς εμπιστοσύνη σε αυτό το αρχείο.
const CATALOG = [
  {
    group: 'Λογαριασμός — τα λαμβάνουν όλοι',
    items: [
      {
        name: 'Κωδικός επιβεβαίωσης email',
        when: 'Μόλις κάνει εγγραφή ή ζητήσει νέο κωδικό επιβεβαίωσης.',
        src: 'auth.ts:396',
        note: 'Το μόνο email που ΔΕΝ είναι best-effort: αν δεν φύγει, ο χρήστης βλέπει σφάλμα αντί για ψεύτικο «στάλθηκε».',
        subject: '483920 — ο κωδικός επιβεβαίωσης StaffNow',
        html: emailLayout({
          title: 'Επιβεβαίωση email',
          body: `Ο κωδικός επιβεβαίωσης του λογαριασμού σου είναι:<br><br><span style="display:inline-block;font-size:30px;font-weight:800;letter-spacing:8px;color:#0f172a;background:#f1f5f9;border-radius:12px;padding:12px 20px;">483920</span><br><br>Ισχύει για 15 λεπτά. Αν δεν το ζήτησες εσύ, αγνόησε αυτό το email.`,
          ctaText: 'Άνοιγμα StaffNow',
          ctaUrl: `${WEB}/dashboard/verification`,
          icon: '✉️',
          tint: '#dbeafe',
        }),
      },
      {
        name: 'Επαναφορά κωδικού («ξέχασα τον κωδικό»)',
        when: 'Όταν πατήσει «Ξέχασα τον κωδικό». Ο σύνδεσμος ισχύει 1 ώρα.',
        src: 'auth.ts:697',
        note: 'Στέλνεται πάντα η ίδια απάντηση στην οθόνη, ακόμη κι αν το email δεν υπάρχει — για να μη μαθαίνει κανείς ποιοι είναι γραμμένοι.',
        subject: 'Επαναφορά κωδικού StaffNow',
        html: emailLayout({
          title: 'Επαναφορά κωδικού',
          body: 'Ζητήθηκε επαναφορά του κωδικού σου στο StaffNow. Πάτησε το κουμπί για να ορίσεις νέο κωδικό. Ο σύνδεσμος ισχύει για 1 ώρα.<br><br>Αν δεν το ζήτησες εσύ, αγνόησε αυτό το email — ο κωδικός σου παραμένει ο ίδιος.',
          ctaText: 'Ορισμός νέου κωδικού',
          ctaUrl: `${WEB}/auth/reset-password?token=…`,
          icon: '🔑',
          tint: '#dbeafe',
        }),
      },
    ],
  },
  {
    group: 'Τα λαμβάνει ο ΕΡΓΑΖΟΜΕΝΟΣ',
    items: [
      {
        name: 'Νέα αγγελία που του ταιριάζει',
        when: 'Μόλις ανέβει αγγελία στην περιοχή και την ειδικότητά του.',
        src: 'jobs.ts:432',
        cooldown: 60,
        ...viaNotify({
          title: '💼 Νέα αγγελία: Σερβιτόρος/α σε all day café',
          body: 'Καφέ Ακρογιάλι · Θεσσαλονίκη, Λαδάδικα',
          ctaText: 'Δες την αγγελία',
          url: '/dashboard/swipe',
          category: 'new_job',
        }),
      },
      {
        name: 'Έκτακτη βάρδια',
        when: 'Όταν επιχείρηση ανεβάσει βάρδια-εκτάκτου ανάγκης.',
        src: 'jobs.ts:432',
        cooldown: 15,
        note: 'Πιο χαλαρό φρένο (15΄ αντί 60΄) γιατί η βάρδια είναι για αύριο.',
        ...viaNotify({
          title: '🚨 Έκτακτη βάρδια: Barista για Σάββατο βράδυ',
          body: 'Καφέ Ακρογιάλι · Θεσσαλονίκη, Λαδάδικα · 2026-08-15 18:00–02:00',
          ctaText: 'Δήλωσε διαθεσιμότητα',
          url: '/dashboard/swipe',
          category: 'urgent_shift',
        }),
      },
      {
        name: 'Επιχείρηση ενδιαφέρθηκε για το προφίλ του',
        when: 'Όταν επιχείρηση κάνει like στο προφίλ του.',
        src: 'workers.ts:848',
        cooldown: 30,
        ...viaNotify({
          title: '❤️ Η Καφέ Ακρογιάλι ενδιαφέρθηκε για το προφίλ σου',
          body: 'Δες την επιχείρηση και κάνε like πίσω για να ξεκινήσετε συνομιλία.',
          ctaText: 'Δες τα ενδιαφέροντα',
          url: '/dashboard/interests',
          category: 'interest',
        }),
      },
      {
        name: 'Νέο match',
        when: 'Μόλις ενδιαφερθούν και οι δύο πλευρές. Ανοίγει η συνομιλία.',
        src: 'workers.ts:962 · interests.ts:234',
        cooldown: 5,
        ...viaNotify({
          title: '🎉 Νέο match με Καφέ Ακρογιάλι',
          body: 'Έχετε νέο ταίριασμα! Μπορείτε να ξεκινήσετε συνομιλία.',
          ctaText: 'Άνοιγμα συνομιλίας',
          url: '/dashboard/messages?c=…',
          category: 'match',
        }),
      },
      {
        name: 'Νέο μήνυμα',
        when: 'Όταν του γράψει η επιχείρηση και δεν έχει ανοιχτό το StaffNow.',
        src: 'conversations.ts:350',
        cooldown: 10,
        note: 'Το φρένο είναι ανά συνομιλία (msg:<id>), όχι συνολικό — δέκα διαφορετικές συνομιλίες στέλνουν δέκα email.',
        ...viaNotify({
          title: '💬 Νέο μήνυμα από Καφέ Ακρογιάλι',
          body: 'Γεια σου Νίκο, μπορείς να περάσεις αύριο στις 5 για μια κουβέντα;',
          ctaText: 'Απάντηση',
          url: '/dashboard/messages?c=…',
          category: 'msg:cv_x',
        }),
      },
      {
        name: '🆕 «Έγινε η πρόσληψη;» — υπενθύμιση 2 ημερών',
        when: '2 μέρες μετά το τελευταίο μήνυμα, αν μίλησαν και οι δύο και δεν δηλώθηκε τίποτα. Στον εργαζόμενο πάει μόνο αν η επιχείρηση δεν αντιδράσει για άλλες 3 μέρες.',
        src: 'index.ts:823 (καθημερινό 03:15)',
        cooldown: 7 * 24 * 60,
        isNew: true,
        note: 'Ένα το πολύ ανά συνομιλία και ανά πλευρά. Το «Όχι ακόμη» μέσα στη σελίδα σταματάει και το email.',
        ...viaNotify({
          title: '🤝 Έγινε η πρόσληψη;',
          body: 'Μιλήσατε με Καφέ Ακρογιάλι και έκτοτε ησυχία. Αν σε προσέλαβαν, δήλωσέ το με ένα πάτημα — μετράει στο προφίλ σου.',
          ctaText: 'Δήλωσε την πρόσληψη',
          url: '/dashboard/messages?c=…',
          category: 'hire_prompt',
        }),
      },
      {
        name: 'Η άλλη πλευρά δήλωσε πρόσληψη',
        when: 'Μόλις η επιχείρηση πατήσει «Τον/την προσέλαβα». Ζητάει επιβεβαίωση.',
        src: 'hires.ts:272',
        ...viaNotify({
          title: '🤝 Δήλωση πρόσληψης',
          body: 'Καφέ Ακρογιάλι δηλώνει ότι σε προσέλαβε. Επιβεβαίωσε για να μετρήσει.',
          ctaText: 'Επιβεβαίωση',
          url: '/dashboard/messages?c=…',
        }),
      },
      {
        name: 'Η πρόσληψη επιβεβαιώθηκε',
        when: 'Μόλις απαντήσει «Ναι» η άλλη πλευρά. Πάει σε αυτόν που τη δήλωσε.',
        src: 'hires.ts:345',
        ...viaNotify({
          title: '✅ Η πρόσληψη επιβεβαιώθηκε',
          body: 'Νίκος Παπαδόπουλος επιβεβαίωσε την πρόσληψη.',
          ctaText: 'Άνοιγμα',
          url: '/dashboard/messages?c=…',
        }),
      },
      {
        name: 'Η πρόσληψη ΔΕΝ επιβεβαιώθηκε',
        when: 'Όταν η άλλη πλευρά απαντήσει «Όχι, δεν έγινε».',
        src: 'hires.ts:415',
        note: 'Ο μόνος τίτλος χωρίς emoji — γι’ αυτό το εικονίδιο πέφτει στο ουδέτερο 🔔.',
        ...viaNotify({
          title: 'Η πρόσληψη δεν επιβεβαιώθηκε',
          body: 'Νίκος Παπαδόπουλος δήλωσε ότι δεν έγινε πρόσληψη. Η αγγελία μένει ανοιχτή.',
          url: '/dashboard/messages?c=…',
        }),
      },
      {
        name: 'Υπενθύμιση αξιολόγησης (15 μέρες)',
        when: '15 μέρες μετά την επιβεβαιωμένη πρόσληψη, σε όποιον δεν έγραψε ακόμη.',
        src: 'index.ts:770 (καθημερινό 03:15)',
        ...viaNotify({
          title: '⭐ Πώς πήγε;',
          body: 'Πέρασαν 15 μέρες. Γράψε την αξιολόγησή σου — τη βλέπει μόνο αφού γράψει και ο άλλος.',
          ctaText: 'Αξιολόγηση',
          url: '/dashboard/hires',
        }),
      },
      {
        name: 'Έλαβε αξιολόγηση',
        when: 'Μόλις γράψει η άλλη πλευρά. Δεν αποκαλύπτει το περιεχόμενο.',
        src: 'hires.ts:760',
        ...viaNotify({
          title: '⭐ Έλαβες αξιολόγηση',
          body: 'Γράψε κι εσύ τη δική σου για να δεις τι πήρες.',
          ctaText: 'Αξιολόγηση',
          url: '/dashboard/hires',
        }),
      },
    ],
  },
  {
    group: 'Τα λαμβάνει η ΕΠΙΧΕΙΡΗΣΗ',
    items: [
      {
        name: 'Νέος υποψήφιος στην περιοχή της',
        when: 'Μόλις γραφτεί εργαζόμενος με ειδικότητα που ψάχνει.',
        src: 'workers.ts:357',
        cooldown: 60,
        ...viaNotify({
          title: '🧑‍💼 Νέος υποψήφιος: Νίκος Παπαδόπουλος',
          body: 'Σερβιτόρος · Θεσσαλονίκη',
          ctaText: 'Δες το προφίλ',
          url: '/dashboard/discover',
          category: 'new_worker',
        }),
      },
      {
        name: 'Εργαζόμενος ενδιαφέρθηκε για την αγγελία της',
        when: 'Όταν κάνει like σε συγκεκριμένη αγγελία.',
        src: 'jobs.ts:1100',
        cooldown: 30,
        ...viaNotify({
          title: '❤️ Νίκος Παπαδόπουλος ενδιαφέρθηκε για την αγγελία σου',
          body: 'Σερβιτόρος/α σε all day café — δες το προφίλ και κάνε like πίσω για να ξεκινήσετε συνομιλία.',
          ctaText: 'Δες τα ενδιαφέροντα',
          url: '/dashboard/interests',
          category: 'interest',
        }),
      },
      {
        name: 'Δήλωσε διαθεσιμότητα για έκτακτη βάρδια',
        when: 'Όταν εργαζόμενος δηλώσει ότι μπορεί να καλύψει τη βάρδια.',
        src: 'jobs.ts:1100',
        cooldown: 5,
        note: 'Το πιο επείγον από όλα — φρένο μόλις 5΄, γιατί η βάρδια πρέπει να καλυφθεί μέσα σε ώρες.',
        ...viaNotify({
          title: '🚨 Νίκος Παπαδόπουλος δήλωσε διαθεσιμότητα για τη βάρδια σου',
          body: 'Barista για Σάββατο βράδυ · 2026-08-15 18:00–02:00 — διάλεξε ποιον θα πάρεις.',
          ctaText: 'Διάλεξε άτομο',
          url: '/dashboard/interests',
          category: 'shift_availability',
        }),
      },
      {
        name: 'Εργαζόμενος ενδιαφέρθηκε για την επιχείρηση',
        when: 'Όταν κάνει like στην επιχείρηση, χωρίς συγκεκριμένη αγγελία.',
        src: 'businesses.ts:502',
        cooldown: 30,
        ...viaNotify({
          title: '❤️ Νίκος Παπαδόπουλος ενδιαφέρθηκε για την επιχείρησή σου',
          body: 'Δες το προφίλ του και κάνε like πίσω για να ξεκινήσετε συνομιλία.',
          ctaText: 'Δες τα ενδιαφέροντα',
          url: '/dashboard/interests',
          category: 'interest',
        }),
      },
      {
        name: 'Νέο match',
        when: 'Μόλις ενδιαφερθούν και οι δύο πλευρές.',
        src: 'workers.ts:971 · businesses.ts:592',
        cooldown: 5,
        ...viaNotify({
          title: '🎉 Νέο match με τον/την Νίκος Παπαδόπουλος',
          body: 'Έχετε νέο ταίριασμα! Μπορείτε να ξεκινήσετε συνομιλία.',
          ctaText: 'Άνοιγμα συνομιλίας',
          url: '/dashboard/messages?c=…',
          category: 'match',
        }),
      },
      {
        name: 'Νέο μήνυμα',
        when: 'Ίδιο πρότυπο με του εργαζομένου — αλλάζει μόνο το όνομα.',
        src: 'conversations.ts:350',
        cooldown: 10,
        ...viaNotify({
          title: '💬 Νέο μήνυμα από Νίκος Παπαδόπουλος',
          body: 'Καλησπέρα! Ναι, μπορώ να περάσω αύριο το απόγευμα.',
          ctaText: 'Απάντηση',
          url: '/dashboard/messages?c=…',
          category: 'msg:cv_x',
        }),
      },
      {
        name: '🆕 «Έγινε η πρόσληψη;» — υπενθύμιση 2 ημερών',
        when: '2 μέρες μετά το τελευταίο μήνυμα. Η επιχείρηση ρωτιέται ΠΡΩΤΗ.',
        src: 'index.ts:823 (καθημερινό 03:15)',
        cooldown: 7 * 24 * 60,
        isNew: true,
        ...viaNotify({
          title: '🤝 Έγινε η πρόσληψη;',
          body: 'Μιλήσατε με Νίκος Παπαδόπουλος και έκτοτε ησυχία. Αν τον/την προσέλαβες, δήλωσέ το με ένα πάτημα — κλείνει η θέση και ανοίγει η αξιολόγηση.',
          ctaText: 'Δήλωσε την πρόσληψη',
          url: '/dashboard/messages?c=…',
          category: 'hire_prompt',
        }),
      },
      {
        name: 'Ο εργαζόμενος δήλωσε ότι τον προσέλαβες',
        when: '🆕 Νέο: πλέον μπορεί να το δηλώσει πρώτος και ο εργαζόμενος.',
        src: 'hires.ts:272',
        isNew: true,
        ...viaNotify({
          title: '🤝 Δήλωση πρόσληψης',
          body: 'Νίκος Παπαδόπουλος δηλώνει ότι τον/την προσέλαβες. Επιβεβαίωσε για να μετρήσει.',
          ctaText: 'Επιβεβαίωση',
          url: '/dashboard/messages?c=…',
        }),
      },
      {
        name: 'Η πρόσληψη επιβεβαιώθηκε — με μέτρημα θέσεων',
        when: 'Μόνο η επιχείρηση βλέπει πόσες θέσεις καλύφθηκαν.',
        src: 'hires.ts:345',
        note: 'Αν καλυφθούν όλες οι θέσεις, η αγγελία κλείνει μόνη της και το λέει το ίδιο το email.',
        ...viaNotify({
          title: '✅ Η πρόσληψη επιβεβαιώθηκε',
          body: 'Νίκος Παπαδόπουλος επιβεβαίωσε. Καλύφθηκαν και οι 2 θέσεις — η αγγελία έκλεισε.',
          ctaText: 'Άνοιγμα',
          url: '/dashboard/messages?c=…',
        }),
      },
      {
        name: 'Συγκεντρωτικό «σε περιμένουν»',
        when: 'Χειροκίνητα, από τη διαχείριση. Μία φορά ανά χρήστη, ποτέ δεύτερη.',
        src: 'admin.ts:3748',
        note: 'Το μόνο email γραμμένο στον πληθυντικό ευγενείας. Μπαίνει «κλειδί» στη βάση ώστε να μη σταλεί ποτέ ξανά στο ίδιο άτομο.',
        ...viaNotify({
          title: 'Έχετε 3 νέα ενδιαφέροντα και 2 αδιάβαστα μηνύματα στο StaffNow',
          body: '3 νέα ενδιαφέροντα και 2 αδιάβαστα μηνύματα περιμένουν την απάντησή σας. Συνδεθείτε για να δείτε ποιος ενδιαφέρεται.',
          ctaText: 'Δες τα αιτήματα',
          url: '/dashboard/interests',
          category: 'backfill_digest_v1',
        }),
      },
    ],
  },
];

// --- 4. Γράψιμο ------------------------------------------------------------
rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Ελληνικά → λατινικά. Το παλιό `[^a-zα-ω0-9]` έκοβε ΜΟΝΟ τα άτονα γράμματα:
// τα τονισμένα (ά έ ή ί ό ύ ώ) είναι έξω από το εύρος α-ω και γίνονταν παύλες,
// οπότε το «Έκτακτη βάρδια» κατέληγε «κτακτη-β-ρδια». Τώρα βγαίνει καθαρό
// λατινικό όνομα, χωρίς κανέναν χαρακτήρα που να χρειάζεται κωδικοποίηση στο URL.
const GREEK = {
  α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: 'th', ι: 'i',
  κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x', ο: 'o', π: 'p', ρ: 'r', σ: 's',
  ς: 's', τ: 't', υ: 'y', φ: 'f', χ: 'ch', ψ: 'ps', ω: 'o',
  ά: 'a', έ: 'e', ή: 'i', ί: 'i', ό: 'o', ύ: 'y', ώ: 'o',
  ϊ: 'i', ϋ: 'y', ΐ: 'i', ΰ: 'y',
};

const slug = (s, i) =>
  String(i).padStart(2, '0') +
  '-' +
  s
    .toLowerCase()
    .replace(/[α-ωάέήίόύώϊϋΐΰς]/g, (c) => GREEK[c] ?? '')
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40)
    .replace(/^-|-$/g, '');

let n = 0;
let total = 0;
const sections = CATALOG.map((g) => {
  const cards = g.items
    .map((it) => {
      n++;
      total++;
      // Το preview μπαίνει με `srcdoc`, δηλαδή το email είναι γραμμένο μέσα
      // στη σελίδα. Πριν ήταν `src="./αρχείο.html"`: 23 ξεχωριστά αιτήματα, που
      // το Cloudflare Pages τα γύριζε πρώτα με 308 (κόβει την κατάληξη .html).
      // Αν έστω ένα από αυτά αστοχούσε, ο χρήστης έβλεπε «Η σελίδα δεν βρέθηκε»
      // μέσα στην κάρτα. Τώρα δεν υπάρχει αίτημα, άρα δεν υπάρχει και αστοχία.
      // Το αρχείο μένει μόνο για τον σύνδεσμο «Άνοιγμα σε δικό του παράθυρο».
      const file = `${slug(it.name, n)}.html`;
      writeFileSync(join(OUT_DIR, file), it.html);
      const meta = [
        it.cooldown ? `φρένο: ${cd(it.cooldown)}` : null,
        `κώδικας: ${it.src}`,
      ]
        .filter(Boolean)
        .map((t) => `<span class="tag">${esc(t)}</span>`)
        .join('');
      return `
      <article class="card">
        <header>
          <div class="num">${n}</div>
          <div>
            <h3>${esc(it.name)}${it.isNew ? ' <span class="new">ΝΕΟ</span>' : ''}</h3>
            <p class="when">${esc(it.when)}</p>
          </div>
        </header>
        <p class="subj"><b>Θέμα:</b> ${esc(it.subject)}</p>
        ${it.note ? `<p class="note">${esc(it.note)}</p>` : ''}
        <div class="meta">${meta}</div>
        <div class="frame"><iframe srcdoc="${esc(it.html)}" loading="lazy" title="${esc(it.name)}"></iframe></div>
        <p class="open"><a href="./${file}" target="_blank">Άνοιγμα σε δικό του παράθυρο ↗</a></p>
      </article>`;
    })
    .join('');
  return `<section><h2>${esc(g.group)}</h2><div class="grid">${cards}</div></section>`;
}).join('');

const index = `<!doctype html>
<html lang="el">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>StaffNow — όλα τα email που φεύγουν στον πελάτη</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#f1f5f9;color:#0f172a;font:15px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}
  .wrap{max-width:1180px;margin:0 auto;padding:28px 18px 70px}
  h1{font-size:27px;margin:0 0 6px;letter-spacing:-.5px}
  .lead{color:#475569;margin:0 0 18px;max-width:70ch}
  .warn{background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:13px 16px;margin:0 0 26px;color:#78350f;max-width:70ch}
  h2{font-size:19px;margin:34px 0 14px;padding-bottom:9px;border-bottom:2px solid #cbd5e1}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:18px}
  .card{background:#fff;border:1px solid #e2e8f0;border-radius:15px;padding:16px;display:flex;flex-direction:column}
  .card header{display:flex;gap:11px;align-items:flex-start;margin-bottom:9px}
  .num{flex:0 0 27px;height:27px;border-radius:8px;background:#2563eb;color:#fff;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center}
  h3{margin:0;font-size:15.5px;line-height:1.35}
  .new{background:#dcfce7;color:#166534;font-size:10.5px;font-weight:800;padding:2px 7px;border-radius:20px;vertical-align:middle}
  .when{margin:4px 0 0;font-size:13px;color:#64748b}
  .subj{margin:0 0 7px;font-size:13.5px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:9px;padding:8px 11px;word-break:break-word}
  .note{margin:0 0 8px;font-size:12.5px;color:#7c2d12;background:#fff7ed;border-left:3px solid #fdba74;padding:7px 11px;border-radius:0 8px 8px 0}
  .meta{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:11px}
  .tag{font-size:11.5px;background:#eef2ff;color:#3730a3;border-radius:20px;padding:3px 10px;font-family:ui-monospace,Menlo,monospace}
  .frame{border:1px solid #e2e8f0;border-radius:11px;overflow:hidden;background:#eef2f7;height:530px}
  iframe{width:100%;height:100%;border:0;display:block}
  .open{margin:9px 0 0;font-size:13px}
  .open a{color:#2563eb;text-decoration:none;font-weight:600}
  footer{margin-top:40px;color:#94a3b8;font-size:12.5px}
</style>
</head>
<body>
<div class="wrap">
  <h1>Όλα τα email που φεύγουν στον πελάτη</h1>
  <p class="lead"><b>${total} διαφορετικά email.</b> Δεν είναι μακέτες: η σελίδα τρέχει τον ίδιο κώδικα
  (<code>lib/email.ts</code> + <code>lib/notify.ts</code>) που στέλνει τα αληθινά. Ό,τι βλέπεις εδώ είναι
  ακριβώς αυτό που φτάνει στο inbox.</p>
  <div class="warn"><b>Τα ονόματα είναι φανταστικά.</b> «Νίκος Παπαδόπουλος», «Καφέ Ακρογιάλι» και οι
  ημερομηνίες μπαίνουν μόνο για να φαίνεται πώς δείχνει το email γεμάτο. Κανένα αληθινό στοιχείο πελάτη.</div>
  ${sections}
  <footer>Παράγεται από <code>apps/api/scripts/gen-email-preview.mjs</code> · Αποστολέας: StaffNow &lt;no-reply@staffnow.gr&gt; μέσω Resend ·
  «φρένο» = πόση ώρα πρέπει να περάσει πριν σταλεί δεύτερο email της ίδιας κατηγορίας στο ίδιο άτομο.</footer>
</div>
</body>
</html>`;

writeFileSync(join(OUT_DIR, 'index.html'), index);
rmSync(TMP, { recursive: true, force: true });
console.log(`✓ ${total} email → ${OUT_DIR}/index.html`);
