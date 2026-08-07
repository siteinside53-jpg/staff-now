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
import type { Env, AuthUser } from '../types';
import { requireAuth, requireRole } from '../middleware/auth';
import { success, error } from '../lib/response';
import { generateId } from '../lib/id';
import { notifyUser } from '../lib/notify';

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

const HIRE_MSG_PREFIX = '🤝 Πρόσληψη:';

const hires = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

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
  confirmed_at: string | null;
  rating_opens_at: string | null;
  rating_reveal_at: string | null;
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
// Βήμα 1 — POST /hires : η επιχείρηση δηλώνει την πρόσληψη
// ---------------------------------------------------------------------------
hires.post('/', requireAuth, requireRole('business'), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const body = await c.req.json<{ conversationId?: string }>().catch(() => ({}) as any);
  const conversationId = body.conversationId;
  if (!conversationId) return error(c, 'BAD_REQUEST', 'Λείπει η συνομιλία', 400);

  // Η συνομιλία ξέρει ήδη ποιος είναι ο εργαζόμενος και σε ποια αγγελία ανήκει.
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
  if (conv.business_id !== user.id) return error(c, 'FORBIDDEN', 'Δεν έχεις πρόσβαση σε αυτή τη συνομιλία', 403);

  const workerId = conv.worker_id;
  const jobId = conv.job_id;

  // Το UNIQUE(worker_id,business_id,job_id) δεν αφήνει διπλή πρόσληψη, αλλά
  // δίνουμε καθαρό μήνυμα αντί για σφάλμα βάσης.
  const existing = await db
    .prepare(
      `SELECT id, status FROM hires
        WHERE worker_id = ? AND business_id = ? AND (job_id IS ? OR job_id = ?)
        ORDER BY declared_at DESC LIMIT 1`,
    )
    .bind(workerId, user.id, jobId, jobId)
    .first<{ id: string; status: string }>();

  if (existing && (existing.status === 'pending' || existing.status === 'confirmed')) {
    return error(
      c,
      'HIRE_EXISTS',
      existing.status === 'pending'
        ? 'Έχεις ήδη δηλώσει την πρόσληψη — περιμένουμε την επιβεβαίωσή του/της.'
        : 'Η πρόσληψη έχει ήδη επιβεβαιωθεί.',
      409,
    );
  }

  const now = new Date().toISOString();
  const hireId = generateId('hr');

  // Αν υπήρχε παλιά declined/cancelled για το ίδιο ζευγάρι+αγγελία, τη σβήνουμε
  // ώστε να μη σκοντάψει το UNIQUE — η επιχείρηση δικαιούται νέα προσπάθεια.
  if (existing) {
    await db.prepare('DELETE FROM hires WHERE id = ?').bind(existing.id).run();
  }

  await db
    .prepare(
      `INSERT INTO hires (id, worker_id, business_id, job_id, conversation_id, status, declared_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
    )
    .bind(hireId, workerId, user.id, jobId, conversationId, now)
    .run();

  // Το μήνυμα-κάρτα μέσα στη συνομιλία, με το ίδιο μοτίβο που ήδη χρησιμοποιεί
  // η βιντεοκλήση («📹 Video κλήση: …»): πρόθεμα που το αναγνωρίζει η οθόνη.
  await db
    .prepare('INSERT INTO messages (id, conversation_id, sender_id, content, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(generateId('msg'), conversationId, user.id, `${HIRE_MSG_PREFIX}${hireId}`, now)
    .run();
  await db.prepare('UPDATE conversations SET last_message_at = ? WHERE id = ?').bind(now, conversationId).run();

  const { businessName } = await partyNames(db, workerId, user.id);
  const url = `/dashboard/messages?c=${conversationId}`;
  const title = '🤝 Δήλωση πρόσληψης';
  const msg = `${businessName} δηλώνει ότι σε προσέλαβε. Επιβεβαίωσε για να μετρήσει.`;

  await inAppNotify(db, workerId, 'hire_pending', title, msg, url, { hireId });
  c.executionCtx.waitUntil(
    notifyUser(c.env, { userId: workerId, title, body: msg, url, ctaText: 'Επιβεβαίωση' }),
  );

  return success(c, { hire: { id: hireId, status: 'pending', worker_id: workerId, business_id: user.id, job_id: jobId } }, 201);
});

// ---------------------------------------------------------------------------
// Βήμα 2 — POST /hires/:id/confirm : ο εργαζόμενος επιβεβαιώνει
// ---------------------------------------------------------------------------
hires.post('/:id/confirm', requireAuth, requireRole('worker'), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const hire = await db.prepare('SELECT * FROM hires WHERE id = ?').bind(c.req.param('id')).first<HireRow>();

  if (!hire) return error(c, 'NOT_FOUND', 'Η πρόσληψη δεν βρέθηκε', 404);
  if (hire.worker_id !== user.id) return error(c, 'FORBIDDEN', 'Δεν είναι δική σου πρόσληψη', 403);
  if (hire.status === 'confirmed') return error(c, 'ALREADY_CONFIRMED', 'Έχει ήδη επιβεβαιωθεί', 409);
  if (hire.status !== 'pending') return error(c, 'NOT_PENDING', 'Η δήλωση δεν είναι πλέον ενεργή', 409);

  const now = new Date().toISOString();
  const opensAt = plusDays(now, RATING_OPENS_AFTER_DAYS);
  const revealAt = plusDays(opensAt, RATING_REVEAL_AFTER_DAYS);

  await db
    .prepare("UPDATE hires SET status = 'confirmed', confirmed_at = ?, rating_opens_at = ?, rating_reveal_at = ? WHERE id = ?")
    .bind(now, opensAt, revealAt, hire.id)
    .run();

  const { workerName } = await partyNames(db, hire.worker_id, hire.business_id);
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

  const title = '✅ Η πρόσληψη επιβεβαιώθηκε';
  const msg = !progress
    ? `${workerName} επιβεβαίωσε την πρόσληψη.`
    : autoClosed
      ? `${workerName} επιβεβαίωσε. Καλύφθηκαν και οι ${progress.target} θέσεις — η αγγελία έκλεισε.`
      : `${workerName} επιβεβαίωσε. Καλύφθηκαν ${progress.confirmed} από ${progress.target} θέσεις.`;

  await inAppNotify(db, hire.business_id, 'hire_confirmed', title, msg, url, { hireId: hire.id });
  c.executionCtx.waitUntil(
    notifyUser(c.env, { userId: hire.business_id, title, body: msg, url, ctaText: 'Άνοιγμα' }),
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
// POST /hires/:id/decline : «Όχι, δεν ξεκίνησα»
// ---------------------------------------------------------------------------
hires.post('/:id/decline', requireAuth, requireRole('worker'), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const hire = await db.prepare('SELECT * FROM hires WHERE id = ?').bind(c.req.param('id')).first<HireRow>();

  if (!hire) return error(c, 'NOT_FOUND', 'Η πρόσληψη δεν βρέθηκε', 404);
  if (hire.worker_id !== user.id) return error(c, 'FORBIDDEN', 'Δεν είναι δική σου πρόσληψη', 403);
  if (hire.status !== 'pending') return error(c, 'NOT_PENDING', 'Η δήλωση δεν είναι πλέον ενεργή', 409);

  await db.prepare("UPDATE hires SET status = 'declined' WHERE id = ?").bind(hire.id).run();

  const { workerName } = await partyNames(db, hire.worker_id, hire.business_id);
  const url = hire.conversation_id ? `/dashboard/messages?c=${hire.conversation_id}` : '/dashboard/messages';
  const title = 'Η πρόσληψη δεν επιβεβαιώθηκε';
  const msg = `${workerName} δήλωσε ότι δεν ξεκίνησε. Η αγγελία μένει ανοιχτή.`;

  await inAppNotify(db, hire.business_id, 'hire_declined', title, msg, url, { hireId: hire.id });
  c.executionCtx.waitUntil(notifyUser(c.env, { userId: hire.business_id, title, body: msg, url }));

  return success(c, { hire: { ...hire, status: 'declined' } });
});

// ---------------------------------------------------------------------------
// DELETE /hires/:id : ακύρωση από την επιχείρηση, μόνο όσο είναι pending
// ---------------------------------------------------------------------------
hires.delete('/:id', requireAuth, requireRole('business'), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const hire = await db.prepare('SELECT * FROM hires WHERE id = ?').bind(c.req.param('id')).first<HireRow>();

  if (!hire) return error(c, 'NOT_FOUND', 'Η πρόσληψη δεν βρέθηκε', 404);
  if (hire.business_id !== user.id) return error(c, 'FORBIDDEN', 'Δεν είναι δική σου πρόσληψη', 403);
  if (hire.status !== 'pending') {
    return error(c, 'NOT_PENDING', 'Ακυρώνεται μόνο όσο δεν έχει απαντήσει ο εργαζόμενος', 409);
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
              (SELECT COUNT(*) FROM hire_ratings r WHERE r.hire_id = h.id AND r.rater_id <> ?) as they_rated
         FROM hires h
         LEFT JOIN job_listings j ON j.id = h.job_id
         LEFT JOIN worker_profiles wp ON wp.user_id = h.worker_id
         LEFT JOIN business_profiles bp ON bp.user_id = h.business_id
        WHERE ${mineCol} = ?
          AND (? IS NULL OR h.conversation_id = ?)
        ORDER BY h.declared_at DESC
        LIMIT 200`,
    )
    .bind(user.id, user.id, user.id, convId ?? null, convId ?? null)
    .all();

  return success(c, { hires: rows.results || [] });
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
