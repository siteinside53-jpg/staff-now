/**
 * Πρόσληψη σε 4 βήματα + αμοιβαίες αξιολογήσεις.
 *
 *   Βήμα 1  POST /hires                — η επιχείρηση δηλώνει «Τον/την προσέλαβα»
 *   Βήμα 2  POST /hires/:id/confirm    — ο εργαζόμενος λέει «Ναι, ξεκίνησα»
 *   Βήμα 3  (στην απάντηση του confirm) — πόσες θέσεις καλύφθηκαν, να κλείσει;
 *   Βήμα 4  POST /hires/:id/rating     — αξιολόγηση, 15 μέρες μετά, διπλά τυφλή
 *
 * Τίποτα δεν μετράει χωρίς την επιβεβαίωση του εργαζομένου (Βήμα 2). Αυτό είναι
 * που κάνει το σήμα «Προσλήφθηκε X φορές μέσω StaffNow» μη πλαστογραφήσιμο.
 *
 * Η πρόσληψη ζει σε δικό της πίνακα και ΔΕΝ αγγίζει τον `matches` — ο CHECK του
 * `matches.status` δεν χωράει νέα κατάσταση και η SQLite δεν αλλάζει CHECK χωρίς
 * ξαναχτίσιμο του πίνακα πάνω σε ζωντανά δεδομένα.
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { Env, AuthUser } from '../types';
import { requireAuth } from '../middleware/auth';
import { success, error } from '../lib/response';
import { generateId } from '../lib/id';
import { notifyUser } from '../lib/notify';
import {
  HIRE_MSG_PREFIX,
  MAX_SNOOZES,
  PROMPT_AFTER_DAYS,
  SNOOZE_DAYS,
  pendingPromptsFor,
  markPromptsShown,
  snoozePrompt,
} from '../lib/hire-prompts';

/**
 * Δωρεάν credits που παίρνει η επιχείρηση σε κάθε επιβεβαιωμένη πρόσληψη.
 * Σκόπιμα 0: είναι πραγματική αξία και το νούμερο το αποφασίζει ο ιδιοκτήτης.
 * Βάλε π.χ. 5 και το κίνητρο ενεργοποιείται — δεν χρειάζεται τίποτα άλλο.
 */
const HIRE_BONUS_CREDITS = 0;

/** Πόσες μέρες μετά την επιβεβαίωση ανοίγει η αξιολόγηση. */
const RATING_OPENS_AFTER_DAYS = 15;
/** Πόσες μέρες μετά το άνοιγμα αποκαλύπτεται ούτως ή άλλως η άλλη αξιολόγηση. */
const RATING_REVEAL_AFTER_DAYS = 14;

const hires = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

type HireCtx = Context<{ Bindings: Env; Variables: { user: AuthUser } }>;

function plusDays(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * 86_400_000).toISOString();
}

interface HireRow {
  id: string;
  worker_id: string;
  business_id: string;
  job_id: string | null;
  conversation_id: string | null;
  status: string;
  declared_at: string;
  declared_by: string | null;
  confirmed_at: string | null;
  rating_opens_at: string | null;
  rating_reveal_at: string | null;
}

/**
 * Ποιος δήλωσε την πρόσληψη και ποιος πρέπει να την επιβεβαιώσει.
 *
 * Μέχρι το 0051 τη δήλωνε πάντα η επιχείρηση, οπότε το `declared_by` λείπει από
 * τις παλιές γραμμές. Το fallback στο `business_id` κρατάει τη σωστή συμπεριφορά
 * ακόμη κι αν ο server ανέβει πριν τρέξει η μετανάστευση — έτσι τα δύο βήματα
 * του ανεβάσματος δεν χρειάζεται να γίνουν την ίδια στιγμή.
 */
function sides(hire: Pick<HireRow, 'worker_id' | 'business_id' | 'declared_by'>) {
  const declarer = hire.declared_by || hire.business_id;
  const confirmer = declarer === hire.worker_id ? hire.business_id : hire.worker_id;
  return { declarer, confirmer };
}

/**
 * Τι απαντάμε όταν η πρόσληψη υπάρχει ήδη.
 *
 * Αν τη δήλωσε ο ΑΛΛΟΣ (π.χ. πατήσαμε και οι δύο ταυτόχρονα), δεν είναι σφάλμα:
 * επιστρέφουμε 200 με τη γραμμή, ώστε η οθόνη να δείξει την κάρτα επιβεβαίωσης
 * αντί για κόκκινο μήνυμα. Αν τη δήλωσα εγώ, το 409 μένει όπως ήταν.
 */
function hireExistsResponse(
  c: HireCtx,
  existing: { id: string; status: string; declared_by: string | null; business_id: string; worker_id: string },
  userId: string,
) {
  const { declarer } = sides(existing);
  if (declarer !== userId && existing.status === 'pending') {
    return success(c, { hire: existing, alreadyExisted: true });
  }
  return error(
    c,
    'HIRE_EXISTS',
    existing.status === 'pending'
      ? 'Έχεις ήδη δηλώσει την πρόσληψη — περιμένουμε την επιβεβαίωσή του/της.'
      : 'Η πρόσληψη έχει ήδη επιβεβαιωθεί.',
    409,
  );
}

/** Ονόματα και των δύο πλευρών, για ειδοποιήσεις και λίστες. */
async function partyNames(db: D1Database, workerId: string, businessId: string) {
  const [w, b] = await Promise.all([
    db.prepare('SELECT full_name FROM worker_profiles WHERE user_id = ?').bind(workerId).first<{ full_name: string }>(),
    db.prepare('SELECT company_name FROM business_profiles WHERE user_id = ?').bind(businessId).first<{ company_name: string }>(),
  ]);
  // Τα ονόματα μπαίνουν πάντα στην αρχή της πρότασης, χωρίς άρθρο μπροστά τους —
  // αλλιώς όταν λείπει το όνομα βγαίνει «Ο/Η τον/την εργαζόμενο» και «Η η επιχείρηση».
  return {
    workerName: w?.full_name || 'Ο εργαζόμενος',
    businessName: b?.company_name || 'Η επιχείρηση',
  };
}

/**
 * Βήμα 3: πόσα άτομα ζητούσε η αγγελία και πόσα καλύφθηκαν.
 * Στόχος = `shift_positions` για τις έκτακτες βάρδιες, αλλιώς `positions`.
 */
async function jobProgress(db: D1Database, jobId: string | null) {
  if (!jobId) return null;
  const job = await db
    .prepare('SELECT id, title, status, listing_kind, positions, shift_positions FROM job_listings WHERE id = ?')
    .bind(jobId)
    .first<{ id: string; title: string; status: string; listing_kind: string; positions: number; shift_positions: number | null }>();
  if (!job) return null;

  const target = Math.max(
    1,
    (job.listing_kind === 'shift' ? job.shift_positions : job.positions) ?? 1,
  );
  const row = await db
    .prepare("SELECT COUNT(*) as n FROM hires WHERE job_id = ? AND status = 'confirmed'")
    .bind(jobId)
    .first<{ n: number }>();
  const confirmed = row?.n ?? 0;

  return { jobId: job.id, jobTitle: job.title, jobStatus: job.status, target, confirmed, isFull: confirmed >= target };
}

/** Γράφει την in-app ειδοποίηση. Χρησιμοποιεί το υπάρχον type='system' — ο
 *  CHECK του πίνακα δεν χωράει νέο τύπο και δεν τον πειράζουμε. Το πραγματικό
 *  είδος και ο προορισμός μπαίνουν στο `data`, που το διαβάζει το καμπανάκι. */
async function inAppNotify(
  db: D1Database,
  userId: string,
  subtype: string,
  title: string,
  body: string,
  url: string,
  extra: Record<string, unknown> = {},
) {
  await db
    .prepare("INSERT INTO notifications (id, user_id, type, title, body, data, created_at) VALUES (?, ?, 'system', ?, ?, ?, ?)")
    .bind(generateId('nt'), userId, title, body, JSON.stringify({ subtype, url, ...extra }), new Date().toISOString())
    .run();
}

// ---------------------------------------------------------------------------
// Βήμα 1 — POST /hires : δήλωση πρόσληψης
//
// Τη δηλώνουν ΚΑΙ ΟΙ ΔΥΟ πλευρές: όποιος το πατήσει πρώτος, ο άλλος επιβεβαιώνει.
// Μέχρι το 0051 το δικαιούταν μόνο η επιχείρηση, αλλά στην πράξη τη δουλειά την
// ξεκινάει ο εργαζόμενος και συχνά είναι αυτός που θυμάται να το δηλώσει.
// Ο κανόνας «τίποτα δεν μετράει χωρίς επιβεβαίωση της άλλης πλευράς» μένει —
// απλώς πλέον είναι συμμετρικός.
// ---------------------------------------------------------------------------
hires.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const body = await c.req.json<{ conversationId?: string }>().catch(() => ({}) as any);
  const conversationId = body.conversationId;
  if (!conversationId) return error(c, 'BAD_REQUEST', 'Λείπει η συνομιλία', 400);

  // Η συνομιλία ξέρει ήδη και τις δύο πλευρές και σε ποια αγγελία ανήκει.
  const conv = await db
    .prepare(
      `SELECT c.id, c.worker_id, c.business_id, m.job_id
         FROM conversations c
         JOIN matches m ON m.id = c.match_id
        WHERE c.id = ?`,
    )
    .bind(conversationId)
    .first<{ id: string; worker_id: string; business_id: string; job_id: string | null }>();

  if (!conv) return error(c, 'NOT_FOUND', 'Η συνομιλία δεν βρέθηκε', 404);
  if (conv.worker_id !== user.id && conv.business_id !== user.id) {
    return error(c, 'FORBIDDEN', 'Δεν έχεις πρόσβαση σε αυτή τη συνομιλία', 403);
  }

  const workerId = conv.worker_id;
  const businessId = conv.business_id;
  const jobId = conv.job_id;
  // Ο παραλήπτης της ειδοποίησης είναι πάντα «ο άλλος».
  const otherId = user.id === workerId ? businessId : workerId;

  // Καθαρό μήνυμα αντί για σφάλμα βάσης, όταν υπάρχει ήδη ζωντανή πρόσληψη.
  // Ψάχνουμε και ανά συνομιλία: το UNIQUE(worker_id,business_id,job_id) του 0047
  // δεν πιάνει όταν η αγγελία λείπει (η SQLite θεωρεί κάθε NULL διαφορετικό) —
  // γι' αυτό το 0051 πρόσθεσε και το ux_hires_live_conversation.
  const existing = await db
    .prepare(
      `SELECT id, status, declared_by, business_id, worker_id FROM hires
        WHERE (worker_id = ? AND business_id = ? AND (job_id IS ? OR job_id = ?))
           OR conversation_id = ?
        ORDER BY CASE status WHEN 'confirmed' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,
                 declared_at DESC
        LIMIT 1`,
    )
    .bind(workerId, businessId, jobId, jobId, conversationId)
    .first<{ id: string; status: string; declared_by: string | null; business_id: string; worker_id: string }>();

  if (existing && (existing.status === 'pending' || existing.status === 'confirmed')) {
    return hireExistsResponse(c, existing, user.id);
  }

  const now = new Date().toISOString();
  const hireId = generateId('hr');

  // Αν υπήρχε παλιά declined/cancelled για το ίδιο ζευγάρι+αγγελία, τη σβήνουμε
  // ώστε να μη σκοντάψει το UNIQUE — δικαιούνται νέα προσπάθεια.
  if (existing) {
    await db.prepare('DELETE FROM hires WHERE id = ?').bind(existing.id).run();
  }

  try {
    await db
      .prepare(
        `INSERT INTO hires (id, worker_id, business_id, job_id, conversation_id, status, declared_at, declared_by)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
      )
      .bind(hireId, workerId, businessId, jobId, conversationId, now, user.id)
      .run();
  } catch (e) {
    // Οι δύο πλευρές πάτησαν ταυτόχρονα. Η βάση κράτησε μία — δείχνουμε εκείνη
    // αντί για οθόνη σφάλματος. Ο έλεγχος από πάνω δεν αρκεί: ανάμεσα στο SELECT
    // και στο INSERT χωράει το αίτημα του άλλου.
    const winner = await db
      .prepare(
        `SELECT id, status, declared_by, business_id, worker_id FROM hires
          WHERE conversation_id = ? AND status IN ('pending','confirmed') LIMIT 1`,
      )
      .bind(conversationId)
      .first<{ id: string; status: string; declared_by: string | null; business_id: string; worker_id: string }>();
    if (winner) return hireExistsResponse(c, winner, user.id);
    throw e;
  }

  // Το μήνυμα-κάρτα μέσα στη συνομιλία, με το ίδιο μοτίβο που ήδη χρησιμοποιεί
  // η βιντεοκλήση («📹 Video κλήση: …»): πρόθεμα που το αναγνωρίζει η οθόνη.
  await db
    .prepare('INSERT INTO messages (id, conversation_id, sender_id, content, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(generateId('msg'), conversationId, user.id, `${HIRE_MSG_PREFIX}${hireId}`, now)
    .run();
  await db.prepare('UPDATE conversations SET last_message_at = ? WHERE id = ?').bind(now, conversationId).run();

  const { workerName, businessName } = await partyNames(db, workerId, businessId);
  const url = `/dashboard/messages?c=${conversationId}`;
  const title = '🤝 Δήλωση πρόσληψης';
  const msg =
    user.id === businessId
      ? `${businessName} δηλώνει ότι σε προσέλαβε. Επιβεβαίωσε για να μετρήσει.`
      : `${workerName} δηλώνει ότι τον/την προσέλαβες. Επιβεβαίωσε για να μετρήσει.`;

  await inAppNotify(db, otherId, 'hire_pending', title, msg, url, { hireId });
  c.executionCtx.waitUntil(
    notifyUser(c.env, { userId: otherId, title, body: msg, url, ctaText: 'Επιβεβαίωση' }),
  );

  return success(
    c,
    { hire: { id: hireId, status: 'pending', worker_id: workerId, business_id: businessId, job_id: jobId, declared_by: user.id } },
    201,
  );
});

// ---------------------------------------------------------------------------
// Βήμα 2 — POST /hires/:id/confirm : επιβεβαιώνει η ΑΛΛΗ πλευρά
//
// «Άλλη» και όχι «ο εργαζόμενος»: από το 0051 τη δήλωση την ξεκινάει όποιος
// θυμηθεί πρώτος. Αυτός που τη δήλωσε δεν μπορεί να επιβεβαιώσει τον εαυτό του —
// αυτό ακριβώς κρατάει το σήμα «Προσλήφθηκε X φορές» μη πλαστογραφήσιμο.
// ---------------------------------------------------------------------------
hires.post('/:id/confirm', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const hire = await db.prepare('SELECT * FROM hires WHERE id = ?').bind(c.req.param('id')).first<HireRow>();

  if (!hire) return error(c, 'NOT_FOUND', 'Η πρόσληψη δεν βρέθηκε', 404);
  const { declarer, confirmer } = sides(hire);
  if (hire.worker_id !== user.id && hire.business_id !== user.id) {
    return error(c, 'FORBIDDEN', 'Δεν είναι δική σου πρόσληψη', 403);
  }
  if (user.id !== confirmer) {
    return error(c, 'FORBIDDEN', 'Την πρόσληψη τη δήλωσες εσύ — την επιβεβαιώνει η άλλη πλευρά.', 403);
  }
  if (hire.status === 'confirmed') return error(c, 'ALREADY_CONFIRMED', 'Έχει ήδη επιβεβαιωθεί', 409);
  if (hire.status !== 'pending') return error(c, 'NOT_PENDING', 'Η δήλωση δεν είναι πλέον ενεργή', 409);

  const now = new Date().toISOString();
  const opensAt = plusDays(now, RATING_OPENS_AFTER_DAYS);
  const revealAt = plusDays(opensAt, RATING_REVEAL_AFTER_DAYS);

  await db
    .prepare("UPDATE hires SET status = 'confirmed', confirmed_at = ?, rating_opens_at = ?, rating_reveal_at = ? WHERE id = ?")
    .bind(now, opensAt, revealAt, hire.id)
    .run();

  const { workerName, businessName } = await partyNames(db, hire.worker_id, hire.business_id);
  // Ποιος πάτησε «επιβεβαιώνω» — αυτόν ονομάζει το μήνυμα προς τον δηλώσαντα.
  const confirmerName = confirmer === hire.worker_id ? workerName : businessName;
  const progress = await jobProgress(db, hire.job_id);
  const url = hire.conversation_id ? `/dashboard/messages?c=${hire.conversation_id}` : '/dashboard/jobs';

  // Βήμα 3 — η αγγελία κλείνει μόνη της μόλις καλυφθούν ΟΛΕΣ οι θέσεις που
  // δήλωσε η ίδια η επιχείρηση. Ποτέ πιο νωρίς. Και πάντα αντιστρέψιμο: με το
  // «↩ Άνοιγμα» ξαναγίνεται ενεργή.
  let autoClosed = false;
  if (progress?.isFull && (progress.jobStatus === 'published' || progress.jobStatus === 'paused')) {
    await db
      .prepare("UPDATE job_listings SET status = 'filled', updated_at = ? WHERE id = ?")
      .bind(now, progress.jobId)
      .run();
    progress.jobStatus = 'filled';
    autoClosed = true;
  }

  // Η ειδοποίηση πάει σε αυτόν που ΔΗΛΩΣΕ — αυτός περιμένει απάντηση. Τα νούμερα
  // των θέσεων τα βλέπει μόνο η επιχείρηση: στον εργαζόμενο δεν λένε τίποτα.
  const title = '✅ Η πρόσληψη επιβεβαιώθηκε';
  const msg =
    !progress || declarer !== hire.business_id
      ? `${confirmerName} επιβεβαίωσε την πρόσληψη.`
      : autoClosed
        ? `${confirmerName} επιβεβαίωσε. Καλύφθηκαν και οι ${progress.target} θέσεις — η αγγελία έκλεισε.`
        : `${confirmerName} επιβεβαίωσε. Καλύφθηκαν ${progress.confirmed} από ${progress.target} θέσεις.`;

  await inAppNotify(db, declarer, 'hire_confirmed', title, msg, url, { hireId: hire.id });
  c.executionCtx.waitUntil(
    notifyUser(c.env, { userId: declarer, title, body: msg, url, ctaText: 'Άνοιγμα' }),
  );

  // Δωρεάν credits — κλειστά από προεπιλογή (HIRE_BONUS_CREDITS = 0).
  if (HIRE_BONUS_CREDITS > 0) {
    c.executionCtx.waitUntil(
      (async () => {
        try {
          // Ο `credits` δεν έχει UNIQUE στο user_id, οπότε ίδιο μοτίβο με το
          // credits.ts: πρώτα δημιουργία γραμμής αν λείπει, μετά ενημέρωση.
          const row = await db.prepare('SELECT id FROM credits WHERE user_id = ?').bind(hire.business_id).first();
          if (!row) {
            await db
              .prepare('INSERT INTO credits (id, user_id, balance, total_purchased, total_spent, created_at, updated_at) VALUES (?, ?, 0, 0, 0, ?, ?)')
              .bind(generateId('crd'), hire.business_id, now, now)
              .run();
          }
          await db
            .prepare('UPDATE credits SET balance = balance + ?, updated_at = ? WHERE user_id = ?')
            .bind(HIRE_BONUS_CREDITS, now, hire.business_id)
            .run();
          await db
            .prepare(
              `INSERT INTO credit_transactions (id, user_id, amount, type, description, reference_id, reference_type, created_at)
               VALUES (?, ?, ?, 'bonus', 'Δώρο για επιβεβαιωμένη πρόσληψη', ?, 'hire', ?)`,
            )
            .bind(generateId('ct'), hire.business_id, HIRE_BONUS_CREDITS, hire.id, now)
            .run();
        } catch {
          /* το δώρο δεν πρέπει ποτέ να χαλάσει την πρόσληψη */
        }
      })(),
    );
  }

  return success(c, {
    hire: { ...hire, status: 'confirmed', confirmed_at: now, rating_opens_at: opensAt },
    progress: progress ? { ...progress, autoClosed } : null,
  });
});

// ---------------------------------------------------------------------------
// POST /hires/:id/decline : «Όχι, δεν έγινε»
//
// Το πατάει η πλευρά που ΔΕΝ δήλωσε — ό,τι ισχύει και για το confirm.
// ---------------------------------------------------------------------------
hires.post('/:id/decline', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const hire = await db.prepare('SELECT * FROM hires WHERE id = ?').bind(c.req.param('id')).first<HireRow>();

  if (!hire) return error(c, 'NOT_FOUND', 'Η πρόσληψη δεν βρέθηκε', 404);
  const { declarer, confirmer } = sides(hire);
  if (hire.worker_id !== user.id && hire.business_id !== user.id) {
    return error(c, 'FORBIDDEN', 'Δεν είναι δική σου πρόσληψη', 403);
  }
  if (user.id !== confirmer) {
    return error(c, 'FORBIDDEN', 'Τη δήλωση την έκανες εσύ — ακύρωσέ την αντί να την απορρίψεις.', 403);
  }
  if (hire.status !== 'pending') return error(c, 'NOT_PENDING', 'Η δήλωση δεν είναι πλέον ενεργή', 409);

  await db.prepare("UPDATE hires SET status = 'declined' WHERE id = ?").bind(hire.id).run();

  const { workerName, businessName } = await partyNames(db, hire.worker_id, hire.business_id);
  const declinerName = confirmer === hire.worker_id ? workerName : businessName;
  const url = hire.conversation_id ? `/dashboard/messages?c=${hire.conversation_id}` : '/dashboard/messages';
  const title = 'Η πρόσληψη δεν επιβεβαιώθηκε';
  const msg = `${declinerName} δήλωσε ότι δεν έγινε πρόσληψη. Η αγγελία μένει ανοιχτή.`;

  await inAppNotify(db, declarer, 'hire_declined', title, msg, url, { hireId: hire.id });
  c.executionCtx.waitUntil(notifyUser(c.env, { userId: declarer, title, body: msg, url }));

  return success(c, { hire: { ...hire, status: 'declined' } });
});

// ---------------------------------------------------------------------------
// DELETE /hires/:id : ακύρωση από ΑΥΤΟΝ ΠΟΥ ΤΗ ΔΗΛΩΣΕ, μόνο όσο είναι pending
// ---------------------------------------------------------------------------
hires.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const hire = await db.prepare('SELECT * FROM hires WHERE id = ?').bind(c.req.param('id')).first<HireRow>();

  if (!hire) return error(c, 'NOT_FOUND', 'Η πρόσληψη δεν βρέθηκε', 404);
  const { declarer } = sides(hire);
  if (user.id !== declarer) {
    return error(c, 'FORBIDDEN', 'Την ακυρώνει μόνο αυτός που τη δήλωσε', 403);
  }
  if (hire.status !== 'pending') {
    return error(c, 'NOT_PENDING', 'Ακυρώνεται μόνο όσο δεν έχει απαντήσει η άλλη πλευρά', 409);
  }

  await db.prepare("UPDATE hires SET status = 'cancelled' WHERE id = ?").bind(hire.id).run();
  return success(c, { hire: { ...hire, status: 'cancelled' } });
});

// ---------------------------------------------------------------------------
// GET /hires : οι προσλήψεις μου (και οι δύο ρόλοι)
//   ?conversation_id=…  φιλτράρει σε μία συνομιλία (το χρησιμοποιεί το chat)
// ---------------------------------------------------------------------------
hires.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const convId = c.req.query('conversation_id');
  const mineCol = user.role === 'worker' ? 'h.worker_id' : 'h.business_id';

  const rows = await db
    .prepare(
      `SELECT h.*,
              j.title as job_title, j.status as job_status,
              wp.full_name as worker_name, wp.photo_url as worker_avatar,
              bp.company_name as business_name, bp.logo_url as business_logo,
              -- Βήμα 3: πόσες θέσεις ζητούσε η αγγελία και πόσες καλύφθηκαν ήδη.
              MAX(1, COALESCE(CASE WHEN j.listing_kind = 'shift' THEN j.shift_positions ELSE j.positions END, 1)) as job_target,
              (SELECT COUNT(*) FROM hires h2 WHERE h2.job_id = h.job_id AND h2.status = 'confirmed') as job_confirmed,
              (SELECT COUNT(*) FROM hire_ratings r WHERE r.hire_id = h.id AND r.rater_id = ?) as i_rated,
              (SELECT COUNT(*) FROM hire_ratings r WHERE r.hire_id = h.id AND r.rater_id <> ?) as they_rated,
              -- Ποιος τη δήλωσε; Πλέον μπορεί ΟΠΟΙΑΔΗΠΟΤΕ πλευρά, οπότε η οθόνη
              -- δεν επιτρέπεται να το μαντεύει από τον ρόλο. Το COALESCE καλύπτει
              -- παλιές γραμμές που γράφτηκαν πριν μπει η στήλη.
              (COALESCE(h.declared_by, h.business_id) = ?) as i_declared
         FROM hires h
         LEFT JOIN job_listings j ON j.id = h.job_id
         LEFT JOIN worker_profiles wp ON wp.user_id = h.worker_id
         LEFT JOIN business_profiles bp ON bp.user_id = h.business_id
        WHERE ${mineCol} = ?
          AND (? IS NULL OR h.conversation_id = ?)
        ORDER BY h.declared_at DESC
        LIMIT 200`,
    )
    .bind(user.id, user.id, user.id, user.id, convId ?? null, convId ?? null)
    .all();

  return success(c, { hires: rows.results || [] });
});

// ---------------------------------------------------------------------------
// GET /hires/prompts : «ποιες συνομιλίες μου περιμένουν απάντηση»
//
// Το τρώει η κάρτα της αρχικής και η πράσινη λωρίδα της συνομιλίας. Ο κανόνας
// ζει στο lib/hire-prompts.ts — εδώ μόνο ρωτάμε.
//
// Δηλώνεται ΠΡΙΝ από οτιδήποτε μοιάζει με `/:id`, για να μην υπάρχει αμφιβολία
// ποια διαδρομή ταιριάζει πρώτη.
// ---------------------------------------------------------------------------
hires.get('/prompts', requireAuth, async (c) => {
  const user = c.get('user');
  // Ο διαχειριστής δεν έχει συνομιλίες ως πλευρά — του γυρνάμε άδειο, όχι σφάλμα.
  if (user.role !== 'worker' && user.role !== 'business') {
    return success(c, { prompts: [], afterDays: PROMPT_AFTER_DAYS });
  }

  const rows = await pendingPromptsFor(c.env.DB, user.id, user.role);
  const isWorker = user.role === 'worker';

  // Κλειδώνουμε την ερώτηση ως «ανοιχτή». Από δω και πέρα μένει μέχρι να
  // απαντηθεί — δεν εξαφανίζεται επειδή ξαναμίλησαν στο μεταξύ. Best-effort:
  // αν αποτύχει, το χειρότερο είναι να ξαναϋπολογιστεί την επόμενη φορά.
  if (rows.length) {
    c.executionCtx.waitUntil(
      markPromptsShown(c.env.DB, rows.map((r) => r.conversation_id)).catch(() => {}),
    );
  }

  return success(c, {
    prompts: rows.map((r) => ({
      conversationId: r.conversation_id,
      // «Ο άλλος» — αυτόν ονομάζει η ερώτηση, όχι τον εαυτό σου.
      otherId: isWorker ? r.business_id : r.worker_id,
      // Εφεδρικό όνομα όταν λείπει το προφίλ — λέει τουλάχιστον ΤΙ είναι.
      otherName:
        (isWorker ? r.business_name : r.worker_name) ||
        (isWorker ? 'Επιχείρηση χωρίς όνομα' : 'Εργαζόμενος χωρίς όνομα'),
      otherAvatar: isWorker ? r.business_logo : r.worker_avatar,
      jobId: r.job_id,
      jobTitle: r.job_title,
      lastMessageAt: r.last_message_at,
      snoozeCount: isWorker ? r.worker_snooze_count : r.business_snooze_count,
    })),
    afterDays: PROMPT_AFTER_DAYS,
  });
});

// ---------------------------------------------------------------------------
// POST /hires/prompts/:conversationId/snooze : το «Όχι ακόμη»
//
// +7 μέρες σιωπή. Στη 2η φορά σταματάμε οριστικά (MAX_SNOOZES) — δεν θέλουμε να
// γίνει το StaffNow η εφαρμογή που γκρινιάζει.
// ---------------------------------------------------------------------------
hires.post('/prompts/:conversationId/snooze', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const conversationId = c.req.param('conversationId');

  const conv = await db
    .prepare('SELECT worker_id, business_id FROM conversations WHERE id = ?')
    .bind(conversationId)
    .first<{ worker_id: string; business_id: string }>();

  if (!conv) return error(c, 'NOT_FOUND', 'Η συνομιλία δεν βρέθηκε', 404);
  if (conv.worker_id !== user.id && conv.business_id !== user.id) {
    return error(c, 'FORBIDDEN', 'Δεν έχεις πρόσβαση σε αυτή τη συνομιλία', 403);
  }

  const side = conv.worker_id === user.id ? 'worker' : 'business';
  const { count, until, stopped } = await snoozePrompt(db, conversationId, side);

  return success(c, {
    snoozedUntil: until,
    count,
    maxCount: MAX_SNOOZES,
    stopped,
    days: SNOOZE_DAYS,
  });
});

// ---------------------------------------------------------------------------
// Βήμα 4 — αξιολογήσεις, διπλά τυφλές
// ---------------------------------------------------------------------------

/** Φέρνει την πρόσληψη και επιβεβαιώνει ότι ο χρήστης είναι μία από τις 2 πλευρές. */
async function loadMyHire(db: D1Database, hireId: string, userId: string) {
  const hire = await db.prepare('SELECT * FROM hires WHERE id = ?').bind(hireId).first<HireRow>();
  if (!hire) return { hire: null as HireRow | null, mine: false };
  return { hire, mine: hire.worker_id === userId || hire.business_id === userId };
}

/**
 * GET /hires/ratings/mine — όλο το ιστορικό αξιολογήσεων του χρήστη.
 *
 * Υπάρχει για τη σελίδα «Αξιολογήσεις». Χωρίς αυτό η σελίδα θα έπρεπε να καλέσει
 * το `/hires/:id/rating` μία φορά ανά πρόσληψη — δεκάδες αιτήματα που θα έτρωγαν
 * το φρένο του server.
 *
 * Δηλώνεται ΠΡΙΝ το `/:id/rating` ώστε να μην υπάρχει καμία αμφιβολία για το ποια
 * διαδρομή ταιριάζει πρώτη.
 *
 * Ο κανόνας της διπλής τυφλότητας είναι ΑΚΡΙΒΩΣ ο ίδιος με το `/:id/rating`:
 * βλέπω τι μου έγραψαν μόνο αφού γράψω τη δική μου (ή αφού περάσει η προθεσμία).
 * Η απόφαση παίρνεται εδώ, στον server· ό,τι δεν επιτρέπεται δεν φεύγει καν από
 * το μηχάνημα.
 */
hires.get('/ratings/mine', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const isWorker = user.role === 'worker';
  const mineCol = isWorker ? 'h.worker_id' : 'h.business_id';

  // Ένα JOIN αντί για `WHERE hire_id IN (…)`: το D1 έχει όριο στα δεσμευμένα
  // ορίσματα ανά ερώτημα, και μια λίστα 200 προσλήψεων θα το ξεπερνούσε.
  // Επιστρέφει έως 2 γραμμές ανά πρόσληψη (μία ανά πλευρά) και τις ενώνουμε εδώ.
  const rows = await db
    .prepare(
      `SELECT h.id AS hire_id, h.status AS hire_status, h.declared_at, h.confirmed_at,
              h.rating_opens_at, h.rating_reveal_at,
              j.title AS job_title,
              wp.full_name AS worker_name, wp.photo_url AS worker_avatar,
              bp.company_name AS business_name, bp.logo_url AS business_logo,
              r.id AS rating_id, r.rater_id, r.rater_role, r.overall,
              r.score_a, r.score_b, r.score_c, r.comment, r.created_at AS rated_at
         FROM hires h
         LEFT JOIN job_listings j ON j.id = h.job_id
         LEFT JOIN worker_profiles wp ON wp.user_id = h.worker_id
         LEFT JOIN business_profiles bp ON bp.user_id = h.business_id
         LEFT JOIN hire_ratings r ON r.hire_id = h.id
        WHERE ${mineCol} = ? AND h.status = 'confirmed'
        ORDER BY h.declared_at DESC
        LIMIT 400`,
    )
    .bind(user.id)
    .all<Record<string, unknown>>();

  const now = Date.now();
  const byHire = new Map<string, any>();

  for (const row of rows.results || []) {
    const id = String(row.hire_id);
    let item = byHire.get(id);
    if (!item) {
      const opensAt = row.rating_opens_at ? Date.parse(String(row.rating_opens_at)) : null;
      const revealAt = row.rating_reveal_at ? Date.parse(String(row.rating_reveal_at)) : null;
      item = {
        hire_id: id,
        job_title: row.job_title ?? null,
        declared_at: row.declared_at ?? null,
        confirmed_at: row.confirmed_at ?? null,
        rating_opens_at: row.rating_opens_at ?? null,
        other_name: (isWorker ? row.business_name : row.worker_name) ?? null,
        other_avatar: (isWorker ? row.business_logo : row.worker_avatar) ?? null,
        open: opensAt !== null && now >= opensAt,
        _revealAt: revealAt,
        mine: null as Record<string, unknown> | null,
        theirs: null as Record<string, unknown> | null,
      };
      byHire.set(id, item);
    }
    if (!row.rating_id) continue;
    const rating = {
      id: row.rating_id,
      rater_role: row.rater_role,
      overall: row.overall,
      score_a: row.score_a,
      score_b: row.score_b,
      score_c: row.score_c,
      comment: row.comment,
      created_at: row.rated_at,
    };
    if (row.rater_id === user.id) item.mine = rating;
    else item.theirs = rating;
  }

  const items = [...byHire.values()].map((it) => {
    const revealed = Boolean(it.mine) || (it._revealAt !== null && now >= it._revealAt);
    const { _revealAt, ...rest } = it;
    return {
      ...rest,
      canRate: it.open && !it.mine,
      theyRated: Boolean(it.theirs),
      revealed,
      // Η αξιολόγηση του άλλου φεύγει από τον server ΜΟΝΟ όταν επιτρέπεται.
      theirs: revealed ? it.theirs : null,
    };
  });

  return success(c, { items });
});

hires.get('/:id/rating', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const { hire, mine } = await loadMyHire(db, c.req.param('id'), user.id);
  if (!hire) return error(c, 'NOT_FOUND', 'Η πρόσληψη δεν βρέθηκε', 404);
  if (!mine) return error(c, 'FORBIDDEN', 'Δεν είναι δική σου πρόσληψη', 403);

  const rows = await db
    .prepare('SELECT * FROM hire_ratings WHERE hire_id = ?')
    .bind(hire.id)
    .all<Record<string, unknown>>();
  const all = rows.results || [];
  const mineRating = all.find((r) => r.rater_id === user.id) || null;
  const theirsRating = all.find((r) => r.rater_id !== user.id) || null;

  const now = Date.now();
  const opensAt = hire.rating_opens_at ? Date.parse(hire.rating_opens_at) : null;
  const revealAt = hire.rating_reveal_at ? Date.parse(hire.rating_reveal_at) : null;
  const canRate = hire.status === 'confirmed' && opensAt !== null && now >= opensAt && !mineRating;
  // Διπλή τυφλότητα: βλέπω τη δική του ΜΟΝΟ αν έγραψα τη δική μου ή πέρασε η
  // προθεσμία. Ο έλεγχος γίνεται εδώ, στον server — αν γινόταν στην οθόνη θα
  // φαινόταν στο δίκτυο.
  const revealed = Boolean(mineRating) || (revealAt !== null && now >= revealAt);

  return success(c, {
    hire: {
      id: hire.id,
      status: hire.status,
      rating_opens_at: hire.rating_opens_at,
      rating_reveal_at: hire.rating_reveal_at,
    },
    canRate,
    opensAt: hire.rating_opens_at,
    mine: mineRating,
    theirs: revealed ? theirsRating : null,
    theyRated: Boolean(theirsRating),
    revealed,
  });
});

hires.post('/:id/rating', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const { hire, mine } = await loadMyHire(db, c.req.param('id'), user.id);
  if (!hire) return error(c, 'NOT_FOUND', 'Η πρόσληψη δεν βρέθηκε', 404);
  if (!mine) return error(c, 'FORBIDDEN', 'Δεν είναι δική σου πρόσληψη', 403);
  if (hire.status !== 'confirmed') return error(c, 'NOT_CONFIRMED', 'Η πρόσληψη δεν έχει επιβεβαιωθεί', 409);

  if (!hire.rating_opens_at || Date.now() < Date.parse(hire.rating_opens_at)) {
    return error(c, 'TOO_EARLY', `Η αξιολόγηση ανοίγει ${RATING_OPENS_AFTER_DAYS} μέρες μετά την έναρξη.`, 409);
  }

  const body = await c.req.json<{
    overall?: number; score_a?: number; score_b?: number; score_c?: number; comment?: string;
  }>().catch(() => ({}) as any);

  const overall = Number(body.overall);
  if (!Number.isInteger(overall) || overall < 1 || overall > 5) {
    return error(c, 'BAD_REQUEST', 'Δώσε βαθμολογία από 1 έως 5 αστέρια', 400);
  }
  const sub = (v: unknown) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
  };

  const already = await db
    .prepare('SELECT id FROM hire_ratings WHERE hire_id = ? AND rater_id = ?')
    .bind(hire.id, user.id)
    .first();
  if (already) return error(c, 'ALREADY_RATED', 'Έχεις ήδη αξιολογήσει', 409);

  const isWorker = hire.worker_id === user.id;
  const rateeId = isWorker ? hire.business_id : hire.worker_id;

  await db
    .prepare(
      `INSERT INTO hire_ratings (id, hire_id, rater_id, ratee_id, rater_role, overall, score_a, score_b, score_c, comment, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      generateId('rt'), hire.id, user.id, rateeId, isWorker ? 'worker' : 'business',
      overall, sub(body.score_a), sub(body.score_b), sub(body.score_c),
      (body.comment || '').trim().slice(0, 1000) || null,
      new Date().toISOString(),
    )
    .run();

  // Ο άλλος μαθαίνει ΟΤΙ αξιολογήθηκε, όχι ΤΙ πήρε — αυτό είναι το νόημα.
  // Πάει στην αρχική και όχι στη συνομιλία: εκεί είναι το κουτάκι «Χρειάζονται
  // την προσοχή σου», που ανοίγει κατευθείαν τη φόρμα. Μέσα στη συνομιλία
  // έπρεπε να ψάξεις το μήνυμα-κάρτα για να τη βρεις.
  const url = '/dashboard';
  await inAppNotify(
    db, rateeId, 'rating_received', '⭐ Έλαβες αξιολόγηση',
    'Γράψε κι εσύ τη δική σου για να δεις τι πήρες.', url, { hireId: hire.id },
  );
  c.executionCtx.waitUntil(
    notifyUser(c.env, {
      userId: rateeId,
      title: '⭐ Έλαβες αξιολόγηση',
      body: 'Γράψε κι εσύ τη δική σου για να δεις τι πήρες.',
      url,
      ctaText: 'Αξιολόγηση',
    }),
  );

  const theirs = await db
    .prepare('SELECT * FROM hire_ratings WHERE hire_id = ? AND rater_id <> ?')
    .bind(hire.id, user.id)
    .first();

  return success(c, { saved: true, theirs: theirs || null }, 201);
});

export default hires;
export { HIRE_MSG_PREFIX, RATING_OPENS_AFTER_DAYS };
