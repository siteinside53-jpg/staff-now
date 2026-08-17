/**
 * Φτιάχνει τον κατάλογο «όλα τα email που φεύγουν στον πελάτη».
 *
 * ΓΙΑΤΙ ΕΤΣΙ: δεν ζωγραφίζει μακέτα. Διαβάζει τον ΑΛΗΘΙΝΟ `emailLayout()` από
 * το `src/lib/email.ts` και τον ΑΛΗΘΙΝΟ `heroFor()` από το `src/lib/notify.ts`,
 * και τα εκτελεί. Ό,τι βλέπεις είναι byte-πρός-byte αυτό που παραδίδει το
 * Resend στο inbox. Αν αύριο αλλάξει το πρότυπο, ξανατρέχεις:
 *
 *   node scripts/gen-email-preview.mjs
 *
 * ΠΟΥ ΚΑΤΑΛΗΓΕΙ: σε αρχείο κώδικα ΜΕΣΑ στον server (`src/lib/email-previews.
 * generated.ts`), όχι σε δημόσιο φάκελο της ιστοσελίδας. Παλιά έβγαινε στο
 * `apps/web/public/emails/`, δηλαδή σε διεύθυνση που άνοιγε ο οποιοσδήποτε
 * χωρίς κωδικό. Τώρα ο κατάλογος δίνεται μόνο από το `GET /admin/email-previews`,
 * που ζητάει λογαριασμό διαχειριστή.
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
const OUT_FILE = join(API_SRC, 'lib', 'email-previews.generated.ts');
/** Ο παλιός δημόσιος φάκελος. Τον σβήνουμε αν έχει μείνει από προηγούμενο τρέξιμο. */
const OLD_PUBLIC_DIR = join(HERE, '..', '..', 'web', 'public', 'emails');
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
function viaNotify({ title, body, ctaText, url, category, formal }) {
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
      formal,
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
          title: '👋 Η Καφέ Ακρογιάλι ενδιαφέρθηκε για το προφίλ σου',
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
          title: '👋 Νίκος Παπαδόπουλος ενδιαφέρθηκε για την αγγελία σου',
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
          title: '👋 Νίκος Παπαδόπουλος ενδιαφέρθηκε για την επιχείρησή σου',
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
          ctaText: 'Δείτε τα αιτήματα',
          url: '/dashboard/interests',
          category: 'backfill_digest_v1',
          formal: true,
        }),
      },
    ],
  },
];

// --- 4. Γράψιμο -------------------------------------------------------------
// Βγαίνει ΕΝΑ αρχείο κώδικα μέσα στον server. Δεν γράφουμε πια ούτε σελίδα
// ούτε ξεχωριστά .html — η εμφάνιση γίνεται πλέον από τη σελίδα
// `/admin/emails`, που ζητάει λογαριασμό διαχειριστή για να πάρει τα δεδομένα.
rmSync(OLD_PUBLIC_DIR, { recursive: true, force: true });

/** Πόσο συχνά επιτρέπεται δεύτερο email της ίδιας κατηγορίας, σε ανθρώπινα λόγια. */
const cooldownLabel = (m) =>
  m == null ? null : m >= 1440 ? `${m / 1440} ημέρες` : m >= 60 ? `${m / 60} ώρες` : `${m} λεπτά`;

let n = 0;
const groups = CATALOG.map((g) => ({
  group: g.group,
  items: g.items.map((it) => ({
    n: ++n,
    name: it.name,
    when: it.when,
    src: it.src,
    note: it.note ?? null,
    isNew: it.isNew === true,
    cooldown: cooldownLabel(it.cooldown),
    subject: it.subject,
    html: it.html,
  })),
}));
const total = n;

const file = `/**
 * ΠΑΡΑΓΕΤΑΙ ΑΥΤΟΜΑΤΑ — μην το πειράζεις με το χέρι.
 * Πηγή: apps/api/scripts/gen-email-preview.mjs  ·  ξανατρέξ' το με:
 *   node scripts/gen-email-preview.mjs
 *
 * Περιέχει ${total} δείγματα email, φτιαγμένα από τον ίδιο τον κώδικα που
 * στέλνει τα αληθινά. Τα ονόματα και τα ποσά μέσα τους είναι φανταστικά.
 * Δίνεται μόνο από το GET /admin/email-previews, πίσω από έλεγχο διαχειριστή.
 */

export interface EmailPreviewItem {
  /** Αύξων αριθμός σε ΟΛΟΝ τον κατάλογο, όχι μέσα στην ομάδα. */
  n: number;
  name: string;
  /** Πότε φεύγει αυτό το email. */
  when: string;
  /** Σε ποιο σημείο του κώδικα στέλνεται — για επαλήθευση. */
  src: string;
  note: string | null;
  isNew: boolean;
  /** Πόσο πρέπει να περάσει πριν σταλεί δεύτερο ίδιο. null = χωρίς φρένο. */
  cooldown: string | null;
  subject: string;
  html: string;
}

export interface EmailPreviewGroup {
  group: string;
  items: EmailPreviewItem[];
}

export const EMAIL_PREVIEW_TOTAL = ${total};

export const EMAIL_PREVIEW_GROUPS: EmailPreviewGroup[] = ${JSON.stringify(groups, null, 2)};
`;

writeFileSync(OUT_FILE, file);
rmSync(TMP, { recursive: true, force: true });
console.log(`✓ ${total} email → ${OUT_FILE}`);
