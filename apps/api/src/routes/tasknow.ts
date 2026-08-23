/**
 * TaskNow — μικροδουλειές, αληθινές.
 *
 * Μέχρι τώρα όλα ζούσαν μέσα στον browser του καθενός: ό,τι ανέβαζες το έβλεπες
 * μόνο εσύ, στη μία εκείνη συσκευή, και χανόταν με το καθάρισμα του browser.
 * Κανείς δεν έβλεπε τη δουλειά σου, άρα καμία προσφορά δεν ερχόταν ποτέ.
 *
 * ΤΙ ΔΕΝ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ, ΕΠΙΤΗΔΕΣ:
 *
 *   • Δεν αγγίζει χρήματα. Το StaffNow δεν κρατάει, δεν μεταφέρει και δεν
 *     εγγυάται πληρωμή — οι δύο πλευρές πληρώνονται μεταξύ τους. Το «πληρώθηκε»
 *     είναι δήλωση, και χρειάζονται ΚΑΙ ΟΙ ΔΥΟ για να μετρήσει.
 *   • Δεν αναθέτει και δεν διαλέγει. Ο ιδιοκτήτης της δουλειάς επιλέγει μόνος
 *     του, με δική του ευθύνη, και αυτό γράφεται στην οθόνη τη στιγμή της
 *     επιλογής.
 *   • Δεν βαφτίζει τίποτα «ελεγμένο». Ό,τι ανεβάζει ο χρήστης είναι «δηλωμένο»
 *     μέχρι να το κοιτάξει άνθρωπος από το διαχειριστικό.
 *
 * ΟΛΟΙ ΕΙΝΑΙ ΚΑΙ ΤΑ ΔΥΟ: δεν υπάρχει «αυτός που ζητά» και «αυτός που κάνει».
 * Ο ίδιος λογαριασμός ανεβάζει όταν του χρειάζονται χέρια και αναλαμβάνει όταν
 * του χρειάζονται χρήματα — για εργαζόμενους και επιχειρήσεις το ίδιο.
 */

import { Hono } from 'hono';
import type { Env, AuthUser } from '../types';
import { requireAuth, requireRole } from '../middleware/auth';
import { success, error } from '../lib/response';
import { generateId } from '../lib/id';
import { displayInfoFor } from '../lib/display-name';
import { notifyUser } from '../lib/notify';

const tasknow = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

/** Όσο μεγάλα κείμενα δέχεται. Πάνω από αυτά δεν είναι αγγελία, είναι κατάχρηση. */
const MAX_TITLE = 120;
const MAX_DESCRIPTION = 2_000;
const MAX_MESSAGE = 2_000;
const MAX_OFFER_MESSAGE = 600;

/** Το ποσό σε ακέραια ευρώ. Κάτω από 1 δεν είναι δουλειά, πάνω από αυτό δεν
 *  είναι μικροδουλειά — και τα δύο άκρα είναι σημάδι λάθους ή κατάχρησης. */
const MIN_BUDGET = 1;
const MAX_BUDGET = 5_000;

/**
 * Οι κατηγορίες που θέλουν επαγγελματική άδεια.
 *
 * Πρέπει να μείνουν ΙΔΙΕΣ με το `components/tasknow/data.ts`. Ο έλεγχος γίνεται
 * και εδώ γιατί ο browser μπορεί να παρακαμφθεί — ο κανόνας «δεν γίνεται
 * προσφορά χωρίς άδεια» δεν επιτρέπεται να στηρίζεται στην καλή πίστη.
 */
const LICENSED_CATEGORIES = new Set(['electrical', 'plumbing', 'gas', 'hvac']);

/**
 * Απαγορευμένο περιεχόμενο.
 *
 * Ρητή απαίτηση: κανένα παράνομο, και κανένα ερωτικό ή συνοδευτικό. Ο έλεγχος
 * είναι χοντρός επίτηδες — κόβει το προφανές και τα υπόλοιπα τα βλέπει άνθρωπος
 * από το διαχειριστικό.
 */
const BLOCKED_WORDS = [
  'escort', 'συνοδ', 'ερωτικ', 'sex', 'σεξ', 'μασάζ με', 'happy ending',
  'ναρκωτ', 'χόρτο', 'κοκα', 'όπλο', 'πιστόλι', 'πλαστ', 'παράνομ',
];

function containsBlocked(text: string): string | null {
  const low = (text || '').toLowerCase();
  for (const w of BLOCKED_WORDS) if (low.includes(w)) return w;
  return null;
}

type TaskRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  category: string;
  area: string;
  budget: number;
  budget_note: string | null;
  when_text: string;
  urgent: number;
  remote: number;
  status: string;
  hidden: number;
  flag_reason: string | null;
  chosen_offer_id: string | null;
  paid_by_owner: number;
  paid_by_worker: number;
  cancel_reason: string | null;
  dispute_reason: string | null;
  dispute_by: string | null;
  is_sample: number;
  created_at: string;
  updated_at: string;
};

type OfferRow = {
  id: string;
  task_id: string;
  worker_id: string;
  amount: number;
  message: string | null;
  status: string;
  licence_label: string | null;
  licence_file_name: string | null;
  licence_verified: number;
  created_at: string;
};

const nowIso = () => new Date().toISOString();

/** Πόσα λεπτά πριν ανέβηκε — το χρειάζεται η οθόνη για το «πριν 12 λεπτά». */
function minutesAgo(iso: string): number {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 60_000));
}

/** Ανοιχτή σημαίνει: δέχεται προσφορές τώρα. */
function isOpenRow(t: TaskRow): boolean {
  return t.status === 'open' && t.hidden === 0;
}

/**
 * Η μικροδουλειά όπως τη θέλει η οθόνη.
 *
 * Τα ονόματα των πεδίων ακολουθούν ΤΗΝ ΟΘΟΝΗ και όχι τη βάση, ώστε να μη
 * χρειαστεί μεταφραστής σε δεκατρία σημεία του site.
 */
async function shapeTask(
  db: D1Database,
  t: TaskRow,
  opts: { viewerId: string | null; offers: OfferRow[]; messages: { id: string; sender_id: string; body: string; created_at: string }[] },
) {
  const owner = await displayInfoFor(db, t.owner_id);
  const isOwner = opts.viewerId === t.owner_id;

  /*
    ΠΟΙΟΣ ΒΛΕΠΕΙ ΤΙΣ ΠΡΟΣΦΟΡΕΣ.

    Ο ιδιοκτήτης τις βλέπει όλες — είναι η απόφασή του. Ο καθένας άλλος βλέπει
    ΜΟΝΟ τη δική του. Δεν δείχνουμε σε κανέναν τι ποσό έδωσε ο ανταγωνιστής
    του: θα γινόταν πλειστηριασμός προς τα κάτω και θα έριχνε τις αμοιβές.
  */
  const visible = isOwner
    ? opts.offers
    : opts.offers.filter((o) => o.worker_id === opts.viewerId);

  const offersList = await Promise.all(
    visible.map(async (o) => {
      const who = await displayInfoFor(db, o.worker_id);
      return {
        id: o.id,
        name: who.name,
        avatar: who.avatar,
        amount: o.amount,
        message: o.message || '',
        rating: null as number | null,
        completed: 0,
        verifiedPhone: false,
        verifiedId: false,
        credentials: [] as { label: string; verified: boolean }[],
        invoice: false,
        createdAgo: o.created_at,
        mine: o.worker_id === opts.viewerId,
        status: o.status,
        ...(o.licence_label
          ? {
              licence: {
                label: o.licence_label,
                fileName: o.licence_file_name || '',
                // ΠΟΤΕ αδήλωτο ως ελεγμένο: μόνο ο διαχειριστής το ανάβει.
                verified: o.licence_verified === 1,
              },
            }
          : {}),
      };
    }),
  );

  return {
    id: t.id,
    title: t.title,
    description: t.description || undefined,
    category: t.category,
    area: t.area,
    budget: t.budget,
    budgetNote: t.budget_note || undefined,
    when: t.when_text,
    postedMinutesAgo: minutesAgo(t.created_at),
    offers: opts.offers.length,
    urgent: t.urgent === 1,
    remote: t.remote === 1,
    flagReason: t.flag_reason || undefined,
    hidden: t.hidden === 1,
    postedByName: owner.name,
    postedByPhoto: owner.avatar || undefined,
    postedByRole: owner.role === 'business' ? 'business' : 'worker',
    isSample: t.is_sample === 1,

    status: t.status,
    mine: isOwner,
    offersList,
    chosenOfferId: t.chosen_offer_id,
    paidByOwner: t.paid_by_owner === 1,
    paidByWorker: t.paid_by_worker === 1,
    cancelReason: t.cancel_reason || undefined,
    disputeReason: t.dispute_reason || undefined,
    disputeBy: (t.dispute_by as 'owner' | 'worker' | null) || undefined,

    // Η συνομιλία ανοίγει μόνο μετά την επιλογή, και τη βλέπουν μόνο οι δύο.
    messages: opts.messages.map((m) => ({
      id: m.id,
      from: m.sender_id === t.owner_id ? 'owner' : 'worker',
      text: m.body,
      at: m.created_at,
    })),
  };
}

/** Οι προσφορές και τα μηνύματα για ένα σύνολο δουλειών, με δύο ερωτήματα. */
async function loadChildren(db: D1Database, taskIds: string[]) {
  const offers = new Map<string, OfferRow[]>();
  const messages = new Map<string, { id: string; sender_id: string; body: string; created_at: string }[]>();
  if (!taskIds.length) return { offers, messages };

  const marks = taskIds.map(() => '?').join(',');
  const o = await db
    .prepare(`SELECT * FROM tasknow_offers WHERE task_id IN (${marks}) ORDER BY created_at ASC`)
    .bind(...taskIds)
    .all<OfferRow>();
  for (const row of o.results || []) {
    if (!offers.has(row.task_id)) offers.set(row.task_id, []);
    offers.get(row.task_id)!.push(row);
  }

  const m = await db
    .prepare(
      `SELECT id, task_id, sender_id, body, created_at FROM tasknow_messages
        WHERE task_id IN (${marks}) ORDER BY created_at ASC`,
    )
    .bind(...taskIds)
    .all<{ id: string; task_id: string; sender_id: string; body: string; created_at: string }>();
  for (const row of m.results || []) {
    if (!messages.has(row.task_id)) messages.set(row.task_id, []);
    messages.get(row.task_id)!.push(row);
  }

  return { offers, messages };
}

// ── GET /feed — η δημόσια ροή, χωρίς σύνδεση ──────────────────────────────
//
// Τη βλέπει οποιοσδήποτε, όπως ζητήθηκε: «δημόσια ροή που τη βλέπει ο καθένας,
// προσφορές μόνο από επαληθευμένους». Δεν φεύγει καμία προσφορά από εδώ.
tasknow.get('/feed', async (c) => {
  const db = c.env.DB;
  const limit = Math.min(parseInt(c.req.query('limit') || '100', 10) || 100, 200);

  const rows = await db
    .prepare(
      `SELECT * FROM tasknow_tasks
        WHERE status = 'open' AND hidden = 0
        ORDER BY created_at DESC LIMIT ?`,
    )
    .bind(limit)
    .all<TaskRow>();

  const list = rows.results || [];
  const { offers, messages } = await loadChildren(db, list.map((t) => t.id));
  const tasks = await Promise.all(
    list.map((t) =>
      shapeTask(db, t, { viewerId: null, offers: offers.get(t.id) || [], messages: [] }),
    ),
  );
  void messages;
  return success(c, { tasks });
});

// ── GET /state — ό,τι χρειάζεται ο συνδεδεμένος χρήστης, με μία κλήση ──────
//
// Μία κλήση αντί για πέντε: η οθόνη δείχνει ταυτόχρονα τη ροή, τις δικές μου
// δουλειές και τις δικές μου προσφορές. Πέντε ξεχωριστά ερωτήματα θα έκαναν τη
// σελίδα να «χτίζεται» μπροστά στα μάτια του χρήστη.
tasknow.get('/state', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const rows = await db
    .prepare(
      `SELECT * FROM tasknow_tasks
        WHERE (status = 'open' AND hidden = 0)
           OR owner_id = ?
           OR id IN (SELECT task_id FROM tasknow_offers WHERE worker_id = ?)
        ORDER BY created_at DESC LIMIT 300`,
    )
    .bind(user.id, user.id)
    .all<TaskRow>();

  const list = rows.results || [];
  const { offers, messages } = await loadChildren(db, list.map((t) => t.id));

  const tasks = await Promise.all(
    list.map((t) => {
      const mine = t.owner_id === user.id;
      const iOffered = (offers.get(t.id) || []).some((o) => o.worker_id === user.id);
      // Η συνομιλία είναι ΜΟΝΟ των δύο. Κανείς τρίτος δεν τη διαβάζει.
      const canSeeChat = mine || iOffered;
      return shapeTask(db, t, {
        viewerId: user.id,
        offers: offers.get(t.id) || [],
        messages: canSeeChat ? messages.get(t.id) || [] : [],
      });
    }),
  );

  const consent = await db
    .prepare('SELECT accepted_at FROM tasknow_consents WHERE user_id = ?')
    .bind(user.id)
    .first<{ accepted_at: string }>();

  return success(c, { tasks, acceptedTermsAt: consent?.accepted_at || null });
});

// ── POST /consent — η δήλωση νομιμότητας, μία φορά ────────────────────────
tasknow.post('/consent', requireAuth, async (c) => {
  const user = c.get('user');
  await c.env.DB.prepare(
    `INSERT OR IGNORE INTO tasknow_consents (id, user_id, accepted_at, ip, user_agent)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(
      generateId(),
      user.id,
      nowIso(),
      c.req.header('CF-Connecting-IP') || null,
      (c.req.header('User-Agent') || '').slice(0, 300) || null,
    )
    .run();
  return success(c, { accepted: true });
});

/** Η δουλειά, μόνο αν υπάρχει. */
async function taskById(db: D1Database, id: string): Promise<TaskRow | null> {
  return db.prepare('SELECT * FROM tasknow_tasks WHERE id = ?').bind(id).first<TaskRow>();
}

/** Η δουλειά, μόνο αν είναι δική μου. */
async function myTask(db: D1Database, id: string, userId: string): Promise<TaskRow | null> {
  const t = await taskById(db, id);
  return t && t.owner_id === userId ? t : null;
}

// ── POST /tasks — ανέβασμα ────────────────────────────────────────────────
tasknow.post('/tasks', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  let body: Record<string, unknown> = {};
  try {
    body = await c.req.json();
  } catch {
    return error(c, 'Λάθος αίτημα', 400);
  }

  const title = String(body.title || '').trim();
  const description = String(body.description || '').trim();
  const category = String(body.category || '').trim();
  const area = String(body.area || '').trim();
  const whenText = String(body.when || '').trim();
  const budget = Math.round(Number(body.budget));

  if (!title || title.length > MAX_TITLE) return error(c, 'Ο τίτλος λείπει ή είναι πολύ μεγάλος', 400);
  if (description.length > MAX_DESCRIPTION) return error(c, 'Η περιγραφή είναι πολύ μεγάλη', 400);
  if (!category || !area || !whenText) return error(c, 'Λείπουν στοιχεία', 400);
  if (!Number.isFinite(budget) || budget < MIN_BUDGET || budget > MAX_BUDGET) {
    return error(c, 'Το ποσό δεν είναι σωστό', 400);
  }

  const bad = containsBlocked(`${title} ${description}`);
  if (bad) {
    return error(c, 'Η αγγελία δεν επιτρέπεται. Δεν δεχόμαστε παράνομες ή συνοδευτικές υπηρεσίες.', 400);
  }

  const id = generateId();
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO tasknow_tasks
        (id, owner_id, title, description, category, area, budget, budget_note,
         when_text, urgent, remote, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)`,
    )
    .bind(
      id,
      user.id,
      title,
      description || null,
      category,
      area,
      budget,
      String(body.budgetNote || '').trim() || null,
      whenText,
      body.urgent ? 1 : 0,
      body.remote ? 1 : 0,
      now,
      now,
    )
    .run();

  return success(c, { id }, 201);
});

// ── POST /tasks/:id/offers — προσφορά ─────────────────────────────────────
tasknow.post('/tasks/:id/offers', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const task = await taskById(db, c.req.param('id'));
  if (!task) return error(c, 'Δεν βρέθηκε', 404);

  // Στα δείγματα δεν γίνεται προσφορά: κανείς δεν πρέπει να περιμένει απάντηση
  // που δεν θα έρθει ποτέ.
  if (task.is_sample === 1) return error(c, 'Αυτή είναι μια αγγελία-παράδειγμα', 400);
  if (!isOpenRow(task)) return error(c, 'Η μικροδουλειά δεν δέχεται προσφορές', 409);
  if (task.owner_id === user.id) return error(c, 'Δεν κάνεις προσφορά στη δική σου δουλειά', 400);

  let body: Record<string, unknown> = {};
  try {
    body = await c.req.json();
  } catch {
    return error(c, 'Λάθος αίτημα', 400);
  }

  const amount = Math.round(Number(body.amount));
  if (!Number.isFinite(amount) || amount < MIN_BUDGET || amount > MAX_BUDGET) {
    return error(c, 'Το ποσό δεν είναι σωστό', 400);
  }
  const message = String(body.message || '').trim().slice(0, MAX_OFFER_MESSAGE);

  /*
    ΑΔΕΙΟΔΟΤΟΥΜΕΝΗ ΚΑΤΗΓΟΡΙΑ: ΧΩΡΙΣ ΑΔΕΙΑ ΔΕΝ ΠΕΡΝΑΕΙ.

    Ελέγχεται ΕΔΩ και όχι μόνο στην οθόνη. Ο browser παρακάμπτεται· ο κανόνας
    δεν επιτρέπεται να στηρίζεται στην καλή πίστη αυτού που κάνει την προσφορά.
  */
  const licenceLabel = String(body.licenceLabel || '').trim();
  const licenceFile = String(body.licenceFileName || '').trim();
  if (LICENSED_CATEGORIES.has(task.category) && (!licenceLabel || !licenceFile)) {
    return error(c, 'Αυτή η κατηγορία θέλει ανέβασμα άδειας πριν την προσφορά', 400);
  }

  try {
    await db
      .prepare(
        `INSERT INTO tasknow_offers
          (id, task_id, worker_id, amount, message, status,
           licence_label, licence_file_name, licence_verified, created_at)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, 0, ?)`,
      )
      .bind(
        generateId(),
        task.id,
        user.id,
        amount,
        message || null,
        licenceLabel || null,
        licenceFile || null,
        nowIso(),
      )
      .run();
  } catch {
    // Το UNIQUE(task_id, worker_id) φρουρεί από διπλή προσφορά.
    return error(c, 'Έχεις ήδη κάνει προσφορά σε αυτή τη δουλειά', 409);
  }

  const who = await displayInfoFor(db, user.id);
  c.executionCtx.waitUntil(
    notifyUser(c.env, {
      userId: task.owner_id,
      title: 'Νέα προσφορά στη μικροδουλειά σου',
      body: `${who.name}: ${amount}€ — «${task.title}»`,
      url: `/dashboard/tasknow?task=${task.id}`,
    }).catch(() => {}),
  );

  return success(c, { sent: true }, 201);
});

// ── POST /offers/:id/accept — «σε διαλέγω» ────────────────────────────────
tasknow.post('/offers/:id/accept', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const offer = await db
    .prepare('SELECT * FROM tasknow_offers WHERE id = ?')
    .bind(c.req.param('id'))
    .first<OfferRow>();
  if (!offer) return error(c, 'Δεν βρέθηκε', 404);

  const task = await myTask(db, offer.task_id, user.id);
  if (!task) return error(c, 'Δεν έχεις δικαίωμα', 403);
  if (task.chosen_offer_id) return error(c, 'Έχεις ήδη διαλέξει', 409);

  const now = nowIso();
  await db
    .prepare(`UPDATE tasknow_offers SET status = 'accepted' WHERE id = ?`)
    .bind(offer.id)
    .run();
  await db
    .prepare(`UPDATE tasknow_offers SET status = 'rejected' WHERE task_id = ? AND id != ?`)
    .bind(task.id, offer.id)
    .run();
  await db
    .prepare(
      `UPDATE tasknow_tasks SET status = 'assigned', chosen_offer_id = ?, updated_at = ?
        WHERE id = ?`,
    )
    .bind(offer.id, now, task.id)
    .run();

  c.executionCtx.waitUntil(
    notifyUser(c.env, {
      userId: offer.worker_id,
      title: 'Σε διάλεξαν!',
      body: `«${task.title}» — μπορείτε να συνεννοηθείτε τώρα.`,
      url: `/dashboard/tasknow?task=${task.id}`,
    }).catch(() => {}),
  );

  return success(c, { accepted: true });
});

// ── POST /tasks/:id/messages — η συνομιλία των δύο ────────────────────────
tasknow.post('/tasks/:id/messages', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const task = await taskById(db, c.req.param('id'));
  if (!task) return error(c, 'Δεν βρέθηκε', 404);
  if (!task.chosen_offer_id) return error(c, 'Η συνομιλία ανοίγει μετά την επιλογή', 409);

  const chosen = await db
    .prepare('SELECT worker_id FROM tasknow_offers WHERE id = ?')
    .bind(task.chosen_offer_id)
    .first<{ worker_id: string }>();

  const isOwner = task.owner_id === user.id;
  const isWorker = chosen?.worker_id === user.id;
  if (!isOwner && !isWorker) return error(c, 'Δεν έχεις δικαίωμα', 403);

  let body: Record<string, unknown> = {};
  try {
    body = await c.req.json();
  } catch {
    return error(c, 'Λάθος αίτημα', 400);
  }
  const text = String(body.text || '').trim().slice(0, MAX_MESSAGE);
  if (!text) return error(c, 'Κενό μήνυμα', 400);

  await db
    .prepare(
      `INSERT INTO tasknow_messages (id, task_id, sender_id, body, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(generateId(), task.id, user.id, text, nowIso())
    .run();

  const other = isOwner ? chosen?.worker_id : task.owner_id;
  if (other) {
    c.executionCtx.waitUntil(
      notifyUser(c.env, {
        userId: other,
        title: 'Νέο μήνυμα για τη μικροδουλειά',
        body: text.slice(0, 120),
        url: `/dashboard/tasknow?task=${task.id}`,
      }).catch(() => {}),
    );
  }

  return success(c, { sent: true }, 201);
});

/** Μικρή βοήθεια: αλλαγή κατάστασης μόνο από τον ιδιοκτήτη. */
async function ownerSetStatus(
  c: any,
  next: string,
  extra?: { column: string; value: string | null },
) {
  const user = c.get('user');
  const db = c.env.DB as D1Database;
  const task = await myTask(db, c.req.param('id'), user.id);
  if (!task) return error(c, 'Δεν βρέθηκε', 404);

  const now = nowIso();
  if (extra) {
    await db
      .prepare(
        `UPDATE tasknow_tasks SET status = ?, ${extra.column} = ?, updated_at = ? WHERE id = ?`,
      )
      .bind(next, extra.value, now, task.id)
      .run();
  } else {
    await db
      .prepare('UPDATE tasknow_tasks SET status = ?, updated_at = ? WHERE id = ?')
      .bind(next, now, task.id)
      .run();
  }
  return success(c, { status: next });
}

// Παύση: δεν φαίνεται δημόσια, αλλά ΚΡΑΤΑΕΙ τις προσφορές της.
tasknow.post('/tasks/:id/pause', requireAuth, (c) => ownerSetStatus(c, 'paused'));
tasknow.post('/tasks/:id/resume', requireAuth, (c) => ownerSetStatus(c, 'open'));
tasknow.post('/tasks/:id/complete', requireAuth, (c) => ownerSetStatus(c, 'done'));

tasknow.post('/tasks/:id/cancel', requireAuth, async (c) => {
  let reason = '';
  try {
    reason = String(((await c.req.json()) as any)?.reason || '').trim().slice(0, 300);
  } catch {
    /* χωρίς λόγο — επιτρεπτό */
  }
  return ownerSetStatus(c, 'cancelled', { column: 'cancel_reason', value: reason || null });
});

// ── POST /tasks/:id/paid — «πληρώθηκε», από τη μία πλευρά ─────────────────
//
// Χρειάζονται ΚΑΙ ΟΙ ΔΥΟ δηλώσεις. Το StaffNow δεν βλέπει χρήματα και δεν
// επιβεβαιώνει τίποτα — απλώς κρατάει τι είπε ο καθένας.
tasknow.post('/tasks/:id/paid', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const task = await taskById(db, c.req.param('id'));
  if (!task) return error(c, 'Δεν βρέθηκε', 404);

  const chosen = task.chosen_offer_id
    ? await db
        .prepare('SELECT worker_id FROM tasknow_offers WHERE id = ?')
        .bind(task.chosen_offer_id)
        .first<{ worker_id: string }>()
    : null;

  const column =
    task.owner_id === user.id
      ? 'paid_by_owner'
      : chosen?.worker_id === user.id
        ? 'paid_by_worker'
        : null;
  if (!column) return error(c, 'Δεν έχεις δικαίωμα', 403);

  await db
    .prepare(`UPDATE tasknow_tasks SET ${column} = 1, updated_at = ? WHERE id = ?`)
    .bind(nowIso(), task.id)
    .run();
  return success(c, { declared: true });
});

// ── DELETE /tasks/:id — διαγραφή δικής μου ────────────────────────────────
tasknow.delete('/tasks/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const task = await myTask(db, c.req.param('id'), user.id);
  if (!task) return error(c, 'Δεν βρέθηκε', 404);

  await db.prepare('DELETE FROM tasknow_messages WHERE task_id = ?').bind(task.id).run();
  await db.prepare('DELETE FROM tasknow_offers WHERE task_id = ?').bind(task.id).run();
  await db.prepare('DELETE FROM tasknow_tasks WHERE id = ?').bind(task.id).run();
  return success(c, { deleted: true });
});

// ── Διαχειριστικό ─────────────────────────────────────────────────────────
//
// «Κρυμμένη» σημαίνει ΚΑΙ αόρατη ΚΑΙ να μη μετριέται πουθενά — αλλιώς τα
// δημόσια νούμερα θα έλεγαν ψέματα.
tasknow.post('/admin/tasks/:id/hide', requireAuth, requireRole('admin'), async (c) => {
  const db = c.env.DB;
  let hidden = true;
  let reason: string | null = null;
  try {
    const b = (await c.req.json()) as any;
    hidden = b?.hidden !== false;
    reason = String(b?.reason || '').trim().slice(0, 300) || null;
  } catch {
    /* προεπιλογή: απόκρυψη */
  }
  await db
    .prepare('UPDATE tasknow_tasks SET hidden = ?, flag_reason = ?, updated_at = ? WHERE id = ?')
    .bind(hidden ? 1 : 0, reason, nowIso(), c.req.param('id'))
    .run();
  return success(c, { hidden });
});

// Η άδεια γίνεται «ελεγμένη» ΜΟΝΟ από εδώ — ποτέ αυτόματα.
tasknow.post('/admin/offers/:id/licence', requireAuth, requireRole('admin'), async (c) => {
  let verified = true;
  try {
    verified = ((await c.req.json()) as any)?.verified !== false;
  } catch {
    /* προεπιλογή: έγκριση */
  }
  await c.env.DB.prepare('UPDATE tasknow_offers SET licence_verified = ? WHERE id = ?')
    .bind(verified ? 1 : 0, c.req.param('id'))
    .run();
  return success(c, { verified });
});

export default tasknow;
