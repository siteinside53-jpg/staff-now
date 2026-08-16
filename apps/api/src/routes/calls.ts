/**
 * Βιντεοκλήσεις — δικές μας, χωρίς ξένη υπηρεσία στη μέση.
 *
 * Η εικόνα και ο ήχος ΔΕΝ περνούν από εδώ. Οι δύο browsers συνδέονται απευθείας
 * μεταξύ τους (WebRTC)· αυτός ο server κάνει μόνο τον «γνωριμιστή»: κρατάει τα
 * κείμενα που ανταλλάσσουν για να βρεθούν, και ειδοποιεί τον παραλήπτη ότι
 * κάποιος τον καλεί.
 *
 * Ροή:
 *   1. Ο καλών στέλνει POST /calls          (μαζί με την «πρότασή» του)
 *   2. Ο παραλήπτης βλέπει GET /calls/pending → χτυπάει το τηλέφωνό του
 *   3. Απαντά με POST /calls/:id/answer     (ή /decline)
 *   4. Και οι δύο ανταλλάσσουν δρόμους σύνδεσης μέσω /candidates
 *   5. Όποιος κλείσει, κάνει POST /calls/:id/hangup
 *
 * Τα SDP/candidates είναι μεγάλα κείμενα αλλά βραχύβια: σβήνονται μόλις η
 * κλήση τελειώσει.
 */

import { Hono } from 'hono';
import type { Env, AuthUser } from '../types';
import { requireAuth } from '../middleware/auth';
import { success, error } from '../lib/response';
import { generateId } from '../lib/id';
import { notifyUser } from '../lib/notify';
import { getIceServers } from '../lib/turn';
import { displayInfoFor } from '../lib/display-name';

const calls = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

/**
 * Πόσο κρατάει το «χτύπημα» πριν θεωρηθεί αναπάντητη. Κρατιέται και στις δύο
 * πλευρές: ο καλών σταματάει μόνος του, αλλά αν κλείσει τον browser στη μέση,
 * αυτό εδώ εμποδίζει μια ξεχασμένη κλήση να χτυπάει στον άλλον για πάντα.
 */
const RING_TIMEOUT_MS = 45_000;

/** Πάνω από αυτό δεν είναι πρόταση σύνδεσης, είναι κατάχρηση. */
const MAX_SDP_BYTES = 60_000;
const MAX_CANDIDATE_BYTES = 4_000;

type ConvRow = { id: string; worker_id: string; business_id: string };
type CallRow = {
  id: string;
  conversation_id: string;
  caller_id: string;
  callee_id: string;
  status: string;
  end_reason: string | null;
  offer_sdp: string | null;
  answer_sdp: string | null;
  created_at: string;
  answered_at: string | null;
  ended_at: string | null;
};

/** Η συνομιλία, μόνο αν ο χρήστης ανήκει πραγματικά σε αυτήν. */
async function convForUser(
  db: D1Database,
  conversationId: string,
  userId: string
): Promise<ConvRow | null> {
  const conv = await db
    .prepare(
      `SELECT c.id, m.worker_id, m.business_id
         FROM conversations c JOIN matches m ON m.id = c.match_id
        WHERE c.id = ?`
    )
    .bind(conversationId)
    .first<ConvRow>();
  if (!conv) return null;
  if (conv.worker_id !== userId && conv.business_id !== userId) return null;
  return conv;
}

/** Η κλήση, μόνο αν ο χρήστης είναι μία από τις δύο πλευρές της. */
async function callForUser(
  db: D1Database,
  callId: string,
  userId: string
): Promise<CallRow | null> {
  const row = await db.prepare('SELECT * FROM calls WHERE id = ?').bind(callId).first<CallRow>();
  if (!row) return null;
  if (row.caller_id !== userId && row.callee_id !== userId) return null;
  return row;
}

/**
 * Κλείνει τις κλήσεις που ξέμειναν να «χτυπάνε». Τρέχει με το που κοιτάξει
 * κάποιος για κλήσεις — δεν χρειάζεται ξεχωριστό χρονόμετρο στον server.
 */
async function expireStaleCalls(db: D1Database, userId: string): Promise<void> {
  const cutoff = new Date(Date.now() - RING_TIMEOUT_MS).toISOString();
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE calls
          SET status = 'ended', end_reason = 'missed', ended_at = ?, updated_at = ?
        WHERE status = 'ringing' AND created_at < ?
          AND (caller_id = ? OR callee_id = ?)`
    )
    .bind(now, now, cutoff, userId, userId)
    .run();
}

/** Όνομα και φωτογραφία, για την οθόνη που χτυπάει. Κοινή πηγή με τις
 *  ειδοποιήσεις, ώστε ο ίδιος άνθρωπος να λέγεται παντού το ίδιο. */
async function displayCard(db: D1Database, userId: string) {
  return displayInfoFor(db, userId);
}

// ── GET /ice — τα στοιχεία του αναμεταδότη ────────────────────────────────
//
// Βραχύβια στοιχεία, φτιαγμένα τη στιγμή της κλήσης. Δεν φεύγει ποτέ το
// μόνιμο κλειδί προς τον browser.
calls.get('/ice', requireAuth, async (c) => {
  const iceServers = await getIceServers(c.env);
  return success(c, { iceServers });
});

// ── GET /ice/status — «δουλεύει ο αναμεταδότης;» ──────────────────────────
//
// ΧΩΡΙΣ σύνδεση, επίτηδες, και ΧΩΡΙΣ να επιστρέφει κανένα στοιχείο σύνδεσης:
// μόνο ένα ναι/όχι και ένα πλήθος. Υπάρχει για να μπορεί να επιβεβαιωθεί η
// ρύθμιση χωρίς τον λογαριασμό κανενός — σήμερα που μπήκαν τα κλειδιά, και
// αύριο αν λήξουν ή σβηστούν κατά λάθος. Χωρίς αυτό, το μόνο σύμπτωμα θα ήταν
// κλήσεις που δεν ενώνονται, και θα το μαθαίναμε από παράπονα.
//
// Η απάντηση κρατιέται 5 λεπτά, ώστε να μη χτυπάει την Cloudflare σε κάθε
// αίτημα. Η δημιουργία στοιχείων δεν κοστίζει — μόνο τα δεδομένα που όντως
// περνούν από τον αναμεταδότη χρεώνονται.
calls.get('/ice/status', async (c) => {
  const CACHE_KEY = 'turn:status';
  try {
    const cached = await c.env.KV.get(CACHE_KEY, 'json');
    if (cached) return success(c, cached as Record<string, unknown>);
  } catch {
    /* χωρίς κρυφή μνήμη, απλώς ρωτάμε κατευθείαν */
  }

  const iceServers = await getIceServers(c.env);
  const urls = iceServers.flatMap((s) => (Array.isArray(s.urls) ? s.urls : [s.urls]));
  const payload = {
    // «turn:» ή «turns:» = πραγματικός αναμεταδότης. Το «stun:» απλώς βρίσκει
    // τη δημόσια διεύθυνση και υπάρχει πάντα, οπότε δεν αποδεικνύει τίποτα.
    relay: urls.some((u) => u.startsWith('turn:') || u.startsWith('turns:')),
    servers: iceServers.length,
    urls: urls.length,
  };

  try {
    await c.env.KV.put(CACHE_KEY, JSON.stringify(payload), { expirationTtl: 300 });
  } catch {
    /* ignore */
  }
  return success(c, payload);
});

// ── POST / — ξεκίνα κλήση ─────────────────────────────────────────────────
calls.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  let body: { conversationId?: string; offer?: string } = {};
  try {
    body = await c.req.json();
  } catch {
    return error(c, 'Λάθος αίτημα', 400);
  }

  const conversationId = (body.conversationId || '').trim();
  const offer = body.offer || '';
  if (!conversationId || !offer) return error(c, 'Λείπουν στοιχεία', 400);
  if (offer.length > MAX_SDP_BYTES) return error(c, 'Πολύ μεγάλο αίτημα', 400);

  const conv = await convForUser(db, conversationId, user.id);
  if (!conv) return error(c, 'Δεν βρέθηκε', 404);

  const calleeId = conv.worker_id === user.id ? conv.business_id : conv.worker_id;

  // Αποκλεισμένος χρήστης δεν καλεί και δεν δέχεται κλήσεις — προς καμία
  // κατεύθυνση. Η σιωπή που έχει ζητήσει κάποιος πρέπει να ισχύει και εδώ.
  const blocked = await db
    .prepare(
      `SELECT id FROM blocks
        WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)`
    )
    .bind(user.id, calleeId, calleeId, user.id)
    .first();
  if (blocked) return error(c, 'Δεν είναι δυνατή η κλήση', 403);

  await expireStaleCalls(db, user.id);

  // Μία ζωντανή κλήση ανά χρήστη. Αν ο άλλος μιλάει ήδη, το λέμε καθαρά αντί
  // να χτυπήσουμε δεύτερη φορά από πάνω.
  const busy = await db
    .prepare(
      `SELECT id FROM calls
        WHERE status IN ('ringing','accepted')
          AND (caller_id = ? OR callee_id = ?)
        LIMIT 1`
    )
    .bind(calleeId, calleeId)
    .first();
  if (busy) return error(c, 'Ο παραλήπτης είναι ήδη σε κλήση', 409);

  // Δικές μου παλιές κλήσεις που ξέμειναν ανοιχτές: τις κλείνω πριν ανοίξω νέα.
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE calls SET status = 'ended', end_reason = 'hangup', ended_at = ?, updated_at = ?
        WHERE status IN ('ringing','accepted') AND (caller_id = ? OR callee_id = ?)`
    )
    .bind(now, now, user.id, user.id)
    .run();

  const callId = generateId();
  await db
    .prepare(
      `INSERT INTO calls (id, conversation_id, caller_id, callee_id, status, offer_sdp, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'ringing', ?, ?, ?)`
    )
    .bind(callId, conversationId, user.id, calleeId, offer, now, now)
    .run();

  // Ειδοποίηση στο κινητό/υπολογιστή του παραλήπτη, για την περίπτωση που δεν
  // έχει ανοιχτό το StaffNow. Best-effort: αν αποτύχει, η κλήση συνεχίζει.
  const caller = await displayCard(db, user.id);
  c.executionCtx.waitUntil(
    notifyUser(c.env, {
      userId: calleeId,
      title: `📞 Βιντεοκλήση από ${caller.name}`,
      body: 'Σε καλεί τώρα. Άνοιξε το StaffNow για να απαντήσεις.',
      url: `/dashboard/messages?conv=${conversationId}`,
      pushOnly: true,
    }).catch(() => {})
  );

  return success(c, { id: callId, status: 'ringing', calleeId, createdAt: now }, 201);
});

// ── GET /pending — «με καλεί κανείς;» ─────────────────────────────────────
//
// Αυτό ρωτάει η εφαρμογή συνέχεια, από όποια σελίδα κι αν βρίσκεται ο χρήστης.
// Γι' αυτό είναι όσο πιο φτηνό γίνεται: μία γραμμή, με ευρετήριο.
calls.get('/pending', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  await expireStaleCalls(db, user.id);

  const row = await db
    .prepare(
      `SELECT id, conversation_id, caller_id, created_at
         FROM calls
        WHERE callee_id = ? AND status = 'ringing'
        ORDER BY created_at DESC LIMIT 1`
    )
    .bind(user.id)
    .first<{ id: string; conversation_id: string; caller_id: string; created_at: string }>();

  if (!row) return success(c, { call: null });

  const caller = await displayCard(db, row.caller_id);
  return success(c, {
    call: {
      id: row.id,
      conversationId: row.conversation_id,
      callerId: row.caller_id,
      callerName: caller.name,
      callerAvatar: caller.avatar,
      createdAt: row.created_at,
    },
  });
});

// ── GET /:id — η κατάσταση της κλήσης + νέοι δρόμοι σύνδεσης ──────────────
calls.get('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const callId = c.req.param('id');

  const call = await callForUser(db, callId, user.id);
  if (!call) return error(c, 'Δεν βρέθηκε', 404);

  // Σελιδοδείκτης: στέλνουμε μόνο ό,τι δεν έχει ήδη δει αυτή η πλευρά.
  const since = parseInt(c.req.query('since') || '0', 10) || 0;
  const cands = await db
    .prepare(
      `SELECT id, candidate FROM call_candidates
        WHERE call_id = ? AND sender_id != ? AND id > ?
        ORDER BY id ASC LIMIT 60`
    )
    .bind(callId, user.id, since)
    .all<{ id: number; candidate: string }>();

  const rows = cands.results || [];
  const isCaller = call.caller_id === user.id;

  return success(c, {
    id: call.id,
    status: call.status,
    endReason: call.end_reason,
    // Ο καθένας παίρνει την πρόταση της ΑΛΛΗΣ πλευράς, ποτέ τη δική του.
    offer: isCaller ? null : call.offer_sdp,
    answer: isCaller ? call.answer_sdp : null,
    candidates: rows.map((r) => r.candidate),
    cursor: rows.length ? rows[rows.length - 1]!.id : since,
    answeredAt: call.answered_at,
  });
});

// ── POST /:id/answer — απάντηση ───────────────────────────────────────────
calls.post('/:id/answer', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const callId = c.req.param('id');

  let body: { answer?: string } = {};
  try {
    body = await c.req.json();
  } catch {
    return error(c, 'Λάθος αίτημα', 400);
  }
  const answer = body.answer || '';
  if (!answer) return error(c, 'Λείπουν στοιχεία', 400);
  if (answer.length > MAX_SDP_BYTES) return error(c, 'Πολύ μεγάλο αίτημα', 400);

  const call = await callForUser(db, callId, user.id);
  if (!call) return error(c, 'Δεν βρέθηκε', 404);
  // Απαντάει μόνο ο παραλήπτης, και μόνο όσο ακόμη χτυπάει.
  if (call.callee_id !== user.id) return error(c, 'Δεν επιτρέπεται', 403);
  if (call.status !== 'ringing') return error(c, 'Η κλήση δεν είναι πλέον ενεργή', 409);

  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE calls SET status = 'accepted', answer_sdp = ?, answered_at = ?, updated_at = ?
        WHERE id = ? AND status = 'ringing'`
    )
    .bind(answer, now, now, callId)
    .run();

  return success(c, { status: 'accepted' });
});

// ── POST /:id/candidates — δρόμοι σύνδεσης ────────────────────────────────
calls.post('/:id/candidates', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const callId = c.req.param('id');

  let body: { candidates?: string[] } = {};
  try {
    body = await c.req.json();
  } catch {
    return error(c, 'Λάθος αίτημα', 400);
  }

  const list = Array.isArray(body.candidates) ? body.candidates.slice(0, 30) : [];
  if (!list.length) return success(c, { added: 0 });

  const call = await callForUser(db, callId, user.id);
  if (!call) return error(c, 'Δεν βρέθηκε', 404);
  if (call.status === 'ended') return success(c, { added: 0 });

  const now = new Date().toISOString();
  const stmt = db.prepare(
    'INSERT INTO call_candidates (call_id, sender_id, candidate, created_at) VALUES (?, ?, ?, ?)'
  );
  const batch = list
    .filter((cand) => typeof cand === 'string' && cand.length > 0 && cand.length <= MAX_CANDIDATE_BYTES)
    .map((cand) => stmt.bind(callId, user.id, cand, now));

  if (batch.length) await db.batch(batch);
  return success(c, { added: batch.length });
});

// ── POST /:id/decline και /:id/hangup — τέλος ─────────────────────────────
async function endCall(
  db: D1Database,
  call: CallRow,
  reason: 'declined' | 'hangup'
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE calls SET status = 'ended', end_reason = ?, ended_at = ?, updated_at = ?
        WHERE id = ? AND status != 'ended'`
    )
    .bind(reason, now, now, call.id)
    .run();
  // Τα «χειραψίας» κείμενα δεν χρειάζονται πια. Δεν κρατάμε τίποτα από αυτά.
  await db.prepare('DELETE FROM call_candidates WHERE call_id = ?').bind(call.id).run();
}

calls.post('/:id/decline', requireAuth, async (c) => {
  const user = c.get('user');
  const call = await callForUser(c.env.DB, c.req.param('id'), user.id);
  if (!call) return error(c, 'Δεν βρέθηκε', 404);
  await endCall(c.env.DB, call, 'declined');
  return success(c, { status: 'ended', endReason: 'declined' });
});

calls.post('/:id/hangup', requireAuth, async (c) => {
  const user = c.get('user');
  const call = await callForUser(c.env.DB, c.req.param('id'), user.id);
  if (!call) return error(c, 'Δεν βρέθηκε', 404);
  await endCall(c.env.DB, call, 'hangup');
  return success(c, { status: 'ended', endReason: 'hangup' });
});

export default calls;
