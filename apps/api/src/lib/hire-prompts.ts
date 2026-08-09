/**
 * «Έγινε πρόσληψη;» — ποιες συνομιλίες αξίζει να ρωτήσουμε.
 *
 * Ο κανόνας ζει ΜΟΝΟΣ ΤΟΥ σε αυτό το αρχείο ώστε, αν αργότερα θέλουμε 3 μέρες
 * αντί για 2, να αλλάζει ένας αριθμός σε ένα σημείο — και όχι σε τρία (οθόνη,
 * διαδρομή, cron).
 *
 * ⚠️ Οι ώρες στη βάση είναι σε ΔΥΟ μορφές: `2026-08-06T18:25:32.536Z` (ό,τι
 * γράφει ο κώδικας με `toISOString()`) και `2026-08-04 15:26:24` (ό,τι γράφει η
 * ίδια η SQLite με `datetime('now')`). Σύγκριση σαν κείμενο θα έβγαζε το «2
 * μέρες» λάθος μέχρι και μία ολόκληρη μέρα, γιατί το `T` (0x54) είναι μεγαλύτερο
 * από το κενό (0x20). Γι' αυτό ΠΑΝΤΟΥ `julianday()`, που καταλαβαίνει και τις δύο.
 */

/** Πόσες μέρες σιωπής μετά το τελευταίο μήνυμα πριν ρωτήσουμε. */
export const PROMPT_AFTER_DAYS = 2;

/** Πόσες μέρες αναβολή όταν πατήσει «Όχι ακόμη». */
export const SNOOZE_DAYS = 7;

/**
 * Πόσες φορές το πολύ ρωτάμε. Στη 2η αναβολή σταματάμε οριστικά — δεν θέλουμε
 * να γίνει το StaffNow η εφαρμογή που γκρινιάζει.
 */
export const MAX_SNOOZES = 2;

/**
 * Μετά από πόσες μέρες χωρίς αντίδραση της επιχείρησης ρωτάμε τον εργαζόμενο.
 * Η σειρά είναι σκόπιμη: την πρόσληψη την ξέρει πρώτη η επιχείρηση.
 */
export const WORKER_EMAIL_AFTER_DAYS = 3;

/** Το πρόθεμα των μηνυμάτων-καρτών πρόσληψης μέσα στη συνομιλία. */
export const HIRE_MSG_PREFIX = '🤝 Πρόσληψη:';

export interface PromptRow {
  conversation_id: string;
  worker_id: string;
  business_id: string;
  job_id: string | null;
  last_message_at: string;
  worker_name: string | null;
  worker_avatar: string | null;
  business_name: string | null;
  business_logo: string | null;
  job_title: string | null;
  business_snoozed_until: string | null;
  business_snooze_count: number;
  worker_snoozed_until: string | null;
  worker_snooze_count: number;
  business_emailed_at: string | null;
  worker_emailed_at: string | null;
}

/**
 * Το κοινό κομμάτι: συνομιλίες που «μυρίζουν πρόσληψη».
 *
 * Τα κριτήρια είναι σκόπιμα αυστηρά. Αν πεταγόταν σε κάθε συζήτηση θα γινόταν
 * θόρυβος και ο κόσμος θα το αγνοούσε — οπότε θα έχανε το νόημά του.
 *
 *   • 2+ μέρες σιωπής (η συζήτηση «τελείωσε», με τον ένα ή τον άλλο τρόπο)
 *   • μίλησαν ΚΑΙ ΟΙ ΔΥΟ — ένα μονόπλευρο «Γεια» χωρίς απάντηση δεν είναι
 *     υποψήφια πρόσληψη
 *   • δεν υπάρχει ήδη ζωντανή πρόσληψη (pending ή confirmed)
 *   • η συνομιλία δεν είναι αρχειοθετημένη ούτε κρυμμένη
 *   • δεν έχει μπλοκάρει καμία πλευρά την άλλη
 *   • το match δεν είναι archived/expired
 */
const BASE_SQL = `
  FROM conversations c
  JOIN matches m ON m.id = c.match_id
  LEFT JOIN worker_profiles wp ON wp.user_id = c.worker_id
  LEFT JOIN business_profiles bp ON bp.user_id = c.business_id
  LEFT JOIN job_listings j ON j.id = m.job_id
  LEFT JOIN hire_prompts hp ON hp.conversation_id = c.id
 WHERE c.last_message_at IS NOT NULL
   AND c.status = 'active'
   AND m.status = 'active'
   -- 2+ μέρες σιωπής. julianday() γιατί οι ώρες είναι σε δύο μορφές.
   AND julianday('now') - julianday(c.last_message_at) >= ?
   -- Μίλησαν και οι δύο. Τα μηνύματα-κάρτες πρόσληψης δεν μετράνε ως συνομιλία.
   AND EXISTS (SELECT 1 FROM messages x WHERE x.conversation_id = c.id
                 AND x.sender_id = c.worker_id AND x.content NOT LIKE ?)
   AND EXISTS (SELECT 1 FROM messages x WHERE x.conversation_id = c.id
                 AND x.sender_id = c.business_id AND x.content NOT LIKE ?)
   -- Δεν υπάρχει ήδη ζωντανή πρόσληψη σε αυτή τη συνομιλία…
   AND NOT EXISTS (SELECT 1 FROM hires h WHERE h.conversation_id = c.id
                     AND h.status IN ('pending','confirmed'))
   -- …ούτε για το ίδιο ζευγάρι σε άλλη συνομιλία της ίδιας αγγελίας.
   AND NOT EXISTS (SELECT 1 FROM hires h WHERE h.worker_id = c.worker_id
                     AND h.business_id = c.business_id
                     AND h.status IN ('pending','confirmed'))
   AND NOT EXISTS (SELECT 1 FROM blocks b
                    WHERE (b.blocker_id = c.worker_id AND b.blocked_id = c.business_id)
                       OR (b.blocker_id = c.business_id AND b.blocked_id = c.worker_id))
`;

const SELECT_COLS = `
  SELECT c.id AS conversation_id, c.worker_id, c.business_id, m.job_id,
         c.last_message_at, c.hidden_by,
         wp.full_name AS worker_name, wp.photo_url AS worker_avatar,
         bp.company_name AS business_name, bp.logo_url AS business_logo,
         j.title AS job_title,
         COALESCE(hp.business_snoozed_until, NULL) AS business_snoozed_until,
         COALESCE(hp.business_snooze_count, 0)     AS business_snooze_count,
         COALESCE(hp.worker_snoozed_until, NULL)   AS worker_snoozed_until,
         COALESCE(hp.worker_snooze_count, 0)       AS worker_snooze_count,
         hp.business_emailed_at, hp.worker_emailed_at
`;

/**
 * Οι συνομιλίες ΕΝΟΣ χρήστη που περιμένουν απάντηση — αυτό δείχνει η οθόνη.
 *
 * Το `hidden_by` είναι JSON λίστα με ids, οπότε δεν φιλτράρεται καθαρά σε SQL·
 * το κόβουμε εδώ, σε λίγες δεκάδες γραμμές το πολύ.
 */
export async function pendingPromptsFor(
  db: D1Database,
  userId: string,
  role: 'worker' | 'business',
): Promise<PromptRow[]> {
  const mineCol = role === 'worker' ? 'c.worker_id' : 'c.business_id';
  const snoozeCol = role === 'worker' ? 'hp.worker_snoozed_until' : 'hp.business_snoozed_until';
  const countCol = role === 'worker' ? 'hp.worker_snooze_count' : 'hp.business_snooze_count';

  const rows = await db
    .prepare(
      `${SELECT_COLS} ${BASE_SQL}
         AND ${mineCol} = ?
         -- Η αναβολή έχει λήξει (ή δεν πάτησε ποτέ «Όχι ακόμη»)…
         AND (${snoozeCol} IS NULL OR julianday('now') >= julianday(${snoozeCol}))
         -- …και δεν έχει εξαντλήσει τις φορές που ρωτάμε.
         AND COALESCE(${countCol}, 0) < ?
       ORDER BY c.last_message_at DESC
       LIMIT 20`,
    )
    .bind(PROMPT_AFTER_DAYS, `${HIRE_MSG_PREFIX}%`, `${HIRE_MSG_PREFIX}%`, userId, MAX_SNOOZES)
    .all<PromptRow & { hidden_by: string | null }>();

  return (rows.results || []).filter((r) => !hiddenFor(r.hidden_by, userId));
}

/** Το `conversations.hidden_by` είναι JSON λίστα ids — «το αρχειοθέτησα εγώ». */
function hiddenFor(hiddenBy: string | null, userId: string): boolean {
  if (!hiddenBy) return false;
  try {
    const list = JSON.parse(hiddenBy);
    return Array.isArray(list) && list.includes(userId);
  } catch {
    return false;
  }
}

/**
 * Οι συνομιλίες που πρέπει να λάβουν email — για το καθημερινό cron.
 *
 * `side='business'`: δεν έχει σταλεί ακόμη email στην επιχείρηση.
 * `side='worker'`  : στάλθηκε στην επιχείρηση πριν από N μέρες, δεν έκανε τίποτα
 *                    (αν είχε κάνει, η συνομιλία δεν θα ήταν πια υποψήφια),
 *                    και ο εργαζόμενος δεν έχει λάβει ακόμη.
 *
 * Η αναβολή («Όχι ακόμη») σταματάει και το email — αν σου είπε «όχι τώρα» μέσα
 * στη σελίδα, δεν έχει νόημα να του το στείλεις και στο inbox.
 */
export async function promptsDueForEmail(
  db: D1Database,
  side: 'business' | 'worker',
  limit = 200,
): Promise<PromptRow[]> {
  const snoozeCol = side === 'worker' ? 'hp.worker_snoozed_until' : 'hp.business_snoozed_until';
  const countCol = side === 'worker' ? 'hp.worker_snooze_count' : 'hp.business_snooze_count';

  const extra =
    side === 'business'
      ? 'AND hp.business_emailed_at IS NULL'
      : `AND hp.worker_emailed_at IS NULL
         AND hp.business_emailed_at IS NOT NULL
         AND julianday('now') - julianday(hp.business_emailed_at) >= ${WORKER_EMAIL_AFTER_DAYS}`;

  const rows = await db
    .prepare(
      `${SELECT_COLS} ${BASE_SQL}
         AND (${snoozeCol} IS NULL OR julianday('now') >= julianday(${snoozeCol}))
         AND COALESCE(${countCol}, 0) < ?
         ${extra}
       ORDER BY c.last_message_at ASC
       LIMIT ${limit}`,
    )
    .bind(PROMPT_AFTER_DAYS, `${HIRE_MSG_PREFIX}%`, `${HIRE_MSG_PREFIX}%`, MAX_SNOOZES)
    .all<PromptRow>();

  return rows.results || [];
}

/** Δημιουργεί τη γραμμή αν λείπει, ώστε τα UPDATE από κάτω να έχουν τι να πιάσουν. */
export async function ensurePromptRow(db: D1Database, conversationId: string): Promise<void> {
  await db
    .prepare('INSERT OR IGNORE INTO hire_prompts (conversation_id) VALUES (?)')
    .bind(conversationId)
    .run();
}

/**
 * Σημειώνει ότι στάλθηκε email — ΠΡΙΝ σταλεί, όχι μετά.
 *
 * Η υπάρχουσα υπενθύμιση αξιολόγησης το κάνει ανάποδα (index.ts) και έτσι, αν το
 * cron σκάσει στη μέση της λίστας, ξαναστέλνει τα ίδια την επόμενη μέρα. Εδώ το
 * χειρότερο σενάριο είναι «δεν στάλθηκε ένα email» — προτιμότερο από «στάλθηκε
 * πέντε φορές».
 */
export async function markEmailed(
  db: D1Database,
  conversationId: string,
  side: 'business' | 'worker',
): Promise<void> {
  const col = side === 'worker' ? 'worker_emailed_at' : 'business_emailed_at';
  await ensurePromptRow(db, conversationId);
  await db
    .prepare(`UPDATE hire_prompts SET ${col} = ?, updated_at = ? WHERE conversation_id = ?`)
    .bind(new Date().toISOString(), new Date().toISOString(), conversationId)
    .run();
}

/**
 * Το «Όχι ακόμη»: +7 μέρες σιωπή και ο μετρητής +1. Στη 2η φορά ο μετρητής
 * φτάνει το MAX_SNOOZES και η συνομιλία δεν ξαναεμφανίζεται ποτέ.
 */
export async function snoozePrompt(
  db: D1Database,
  conversationId: string,
  side: 'business' | 'worker',
): Promise<{ count: number; until: string; stopped: boolean }> {
  const untilCol = side === 'worker' ? 'worker_snoozed_until' : 'business_snoozed_until';
  const countCol = side === 'worker' ? 'worker_snooze_count' : 'business_snooze_count';
  const until = new Date(Date.now() + SNOOZE_DAYS * 86_400_000).toISOString();
  const now = new Date().toISOString();

  await ensurePromptRow(db, conversationId);
  await db
    .prepare(
      `UPDATE hire_prompts
          SET ${untilCol} = ?, ${countCol} = ${countCol} + 1, updated_at = ?
        WHERE conversation_id = ?`,
    )
    .bind(until, now, conversationId)
    .run();

  const row = await db
    .prepare(`SELECT ${countCol} AS n FROM hire_prompts WHERE conversation_id = ?`)
    .bind(conversationId)
    .first<{ n: number }>();

  const count = row?.n ?? 1;
  return { count, until, stopped: count >= MAX_SNOOZES };
}
