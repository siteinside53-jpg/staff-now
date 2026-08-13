/**
 * «Τι έκανε ο χρήστης» — χωρισμένο σε ΕΠΙΣΚΕΨΕΙΣ, όχι σε ωμές γραμμές.
 *
 * ΤΟ ΠΡΟΒΛΗΜΑ ΠΟΥ ΛΥΝΕΙ
 * ---------------------
 * Ο πίνακας user_activity_log είναι κατά 98,4% θόρυβος: μετρημένα στη ζωντανή
 * βάση, 40.215 heartbeat (70,8%) + 15.682 page_view (27,6%) από 56.801 γραμμές.
 * Η παλιά οθόνη έφερνε τις 200 τελευταίες χωρίς συνέχεια, οπότε σε χρήστη με
 * 25.515 γραμμές έδειχνε αποκλειστικά heartbeat της τελευταίας ώρας.
 *
 * Εδώ οι γραμμές γίνονται επισκέψεις, και μέσα στην επίσκεψη τα heartbeat
 * γίνονται «πόση ώρα έμεινε σε αυτή τη σελίδα».
 *
 * ⚠️ ΓΙΑΤΙ Η ΣΥΜΠΤΥΞΗ ΓΙΝΕΤΑΙ ΑΝΑ ΣΕΛΙΔΑ ΚΑΙ ΟΧΙ ΣΕ ΣΥΝΕΧΟΜΕΝΕΣ ΓΡΑΜΜΕΣ
 * Ο προφανής τρόπος —«ένωσε τις διαδοχικές γραμμές με την ίδια διαδρομή»—
 * ΔΟΚΙΜΑΣΤΗΚΕ ΚΑΙ ΑΠΕΤΥΧΕ στα αληθινά δεδομένα: 4.579 γεγονότα έγιναν 4.551.
 * Αιτία: ο χρήστης είχε 23 καρτέλες ανοιχτές ταυτόχρονα (92 heartbeat/λεπτό σε
 * 23 διαφορετικές διαδρομές), οπότε δύο διαδοχικές γραμμές δεν έχουν σχεδόν
 * ποτέ την ίδια διαδρομή. Με ομαδοποίηση ΑΝΑ ΔΙΑΔΡΟΜΗ (PARTITION BY target) οι
 * ίδιες 4.579 γραμμές έγιναν 43. Μην το «απλοποιήσεις» πίσω στο πρώτο.
 *
 * ⚠️ ΩΡΕΣ: παντού julianday(), ποτέ σύγκριση κειμένου. Το user_activity_log
 * μετρήθηκε 100% σε μορφή ISO, αλλά άλλοι πίνακες γράφουν `datetime('now')`
 * («2026-08-04 15:26:24») και το «T» (0x54) είναι μεγαλύτερο από το κενό (0x20)
 * — σύγκριση κειμένου θα έβγαζε τα κενά λάθος μέχρι και μία ολόκληρη μέρα.
 */

/** Κενό ησυχίας που ξεκινάει νέα επίσκεψη. */
export const VISIT_GAP_MINUTES = 30;

/** Κενό στην ΙΔΙΑ σελίδα που μετράει ως «ξαναμπήκε», όχι ως συνεχής παραμονή. */
export const PAGE_GAP_MINUTES = 2;

/** Από πόση ώρα ακίνητος σε μία σελίδα θεωρούμε ότι μπορεί να κόλλησε. */
export const STUCK_MINUTES = 2;

/** Πόσες φορές στην ίδια επίσκεψη πρέπει να δει μια σελίδα για «ξαναγύρισε». */
export const REVISIT_TIMES = 3;

/** Ταβάνι ασφαλείας στις γραμμές που επιστρέφει μία επίσκεψη. */
const MAX_EVENTS_PER_VISIT = 400;

/** Τύποι που είναι «είμαι σε αυτή τη σελίδα» και όχι πραγματική ενέργεια. */
const PAGE_TYPES = "('page_view','heartbeat')";

export interface VisitSummary {
  started_at: string;
  ended_at: string;
  /** Διάρκεια σε δευτερόλεπτα. */
  duration_sec: number;
  events: number;
  errors: number;
  city: string | null;
  country: string | null;
  user_agent: string | null;
  /** Η τελευταία σελίδα της επίσκεψης — εκεί μας άφησε. */
  exit_path: string | null;
  /** Είδε σφάλμα μέσα στο τελευταίο λεπτό πριν φύγει. */
  left_after_error: boolean;
}

export interface VisitEvent {
  at: string;
  /** 'page' = παραμονή σε σελίδα · 'error' = σφάλμα · αλλιώς η ενέργεια. */
  kind: string;
  type: string;
  target: string | null;
  metadata: string | null;
  /** Μόνο για kind='page': πόσο έμεινε, σε δευτερόλεπτα. */
  duration_sec?: number;
  /** Σημάνσεις που απαντούν στο «πού κόλλησε / πού έφυγε». */
  stuck?: boolean;
  revisit?: boolean;
  exit?: boolean;
}

/**
 * Το κοινό «ρεύμα γεγονότων» ενός χρήστη: τα δύο ιστορικά ενωμένα.
 *
 * Το data_changes είναι ο δεύτερος, μέχρι τώρα αόρατος πίνακας — κρατάει
 * ανεβάσματα αρχείων, αλλαγές προφίλ, αγγελίες και υποκαταστήματα. Δένεται με
 * τον χρήστη μέσω entity_owner_id (μετρήθηκε: ποτέ κενό στη ζωντανή βάση).
 */
const EVENTS_CTE = `
  events AS (
    SELECT created_at, activity_type AS type, entity_id AS target,
           metadata, ip_address, user_agent, country, city
      FROM user_activity_log
     WHERE user_id = ?1
    UNION ALL
    SELECT created_at, action, entity_id,
           field_changes, ip_address, user_agent, country, city
      FROM data_changes
     WHERE entity_owner_id = ?1
  )
`;

/**
 * Οι επισκέψεις ενός χρήστη, νεότερη πρώτα.
 *
 * Κόστος στον βαρύτερο πραγματικό χρήστη (25.515 γραμμές, 221 επισκέψεις):
 * ~91ms, 204k rows_read. Το μέτρησα πριν το γράψω. Επειδή αποφασίσαμε να μη
 * σβήνουμε ποτέ γραμμές, αυτό θα μεγαλώνει — αν κάποτε αργήσει, η λύση είναι
 * χρονικό παράθυρο στο EVENTS_CTE, όχι αλλαγή του αλγορίθμου.
 */
export async function listVisits(
  db: D1Database,
  userId: string,
  opts: { before?: string | null; limit?: number } = {},
): Promise<VisitSummary[]> {
  const limit = Math.min(Math.max(opts.limit ?? 10, 1), 50);
  const before = opts.before || null;

  const rows = await db
    .prepare(
      `WITH ${EVENTS_CTE},
       ordered AS (
         SELECT *, LAG(created_at) OVER (ORDER BY created_at) AS prev_at
           FROM events
          WHERE ?2 IS NULL OR julianday(created_at) < julianday(?2)
       ),
       marked AS (
         SELECT *, CASE WHEN prev_at IS NULL
                          OR (julianday(created_at) - julianday(prev_at)) * 1440.0 > ${VISIT_GAP_MINUTES}
                        THEN 1 ELSE 0 END AS is_new
           FROM ordered
       ),
       grouped AS (
         SELECT *, SUM(is_new) OVER (ORDER BY created_at ROWS UNBOUNDED PRECEDING) AS visit_no
           FROM marked
       )
       SELECT MIN(created_at) AS started_at,
              MAX(created_at) AS ended_at,
              CAST((julianday(MAX(created_at)) - julianday(MIN(created_at))) * 86400 AS INTEGER) AS duration_sec,
              COUNT(*) AS events,
              SUM(CASE WHEN type LIKE 'error%' THEN 1 ELSE 0 END) AS errors,
              MAX(city) AS city,
              MAX(country) AS country,
              MAX(user_agent) AS user_agent,
              -- «Τελευταία σελίδα»: κολλάμε ώρα+διαδρομή σε ένα κείμενο ώστε το
              -- MAX() να διαλέξει τη νεότερη, και ξεκολλάμε στο JS.
              MAX(CASE WHEN type IN ${PAGE_TYPES} AND target IS NOT NULL
                       THEN created_at || '|' || target END) AS exit_pair,
              MAX(CASE WHEN type LIKE 'error%' THEN created_at END) AS last_error_at
         FROM grouped
        GROUP BY visit_no
        ORDER BY started_at DESC
        LIMIT ${limit}`,
    )
    .bind(userId, before)
    .all<any>();

  return (rows.results || []).map((r) => {
    const exitPath = r.exit_pair ? String(r.exit_pair).split('|').slice(1).join('|') : null;
    return {
      started_at: r.started_at,
      ended_at: r.ended_at,
      duration_sec: r.duration_sec || 0,
      events: r.events || 0,
      errors: r.errors || 0,
      city: r.city || null,
      country: r.country || null,
      user_agent: r.user_agent || null,
      exit_path: decodePath(exitPath),
      left_after_error: leftAfterError(r.last_error_at, r.ended_at),
    };
  });
}

/** Έφυγε μέσα σε ένα λεπτό από το σφάλμα → πολύ πιθανά εξαιτίας του. */
function leftAfterError(lastErrorAt: string | null, endedAt: string): boolean {
  if (!lastErrorAt) return false;
  const gap = new Date(endedAt).getTime() - new Date(lastErrorAt).getTime();
  return gap >= 0 && gap <= 60_000;
}

/**
 * Τα γεγονότα ΜΙΑΣ επίσκεψης, με τα heartbeat συμπτυγμένα σε διάρκειες.
 *
 * Δύο ερωτήματα αντί για ένα, επίτηδες: οι σελίδες θέλουν ομαδοποίηση ανά
 * διαδρομή (βλ. σχόλιο στην κορυφή), οι πραγματικές ενέργειες θέλουν να μείνουν
 * μία-μία. Το να τα στριμώξω σε ένα ερώτημα τα έκανε και τα δύο χειρότερα.
 */
export async function getVisitEvents(
  db: D1Database,
  userId: string,
  startedAt: string,
  endedAt: string,
): Promise<VisitEvent[]> {
  const [pages, actions] = await db.batch<any>([
    // 1) Παραμονές σε σελίδες — ένα «νησί» ανά διαδρομή, με κενό PAGE_GAP_MINUTES.
    db
      .prepare(
        `WITH pv AS (
           SELECT created_at, entity_id AS target
             FROM user_activity_log
            WHERE user_id = ?1
              AND julianday(created_at) >= julianday(?2)
              AND julianday(created_at) <= julianday(?3)
              AND activity_type IN ${PAGE_TYPES}
              AND entity_id IS NOT NULL
         ),
         lagged AS (
           SELECT *, LAG(created_at) OVER (PARTITION BY target ORDER BY created_at) AS prev_at
             FROM pv
         ),
         marked AS (
           SELECT *, CASE WHEN prev_at IS NULL
                            OR (julianday(created_at) - julianday(prev_at)) * 1440.0 > ${PAGE_GAP_MINUTES}
                          THEN 1 ELSE 0 END AS is_new
             FROM lagged
         ),
         grouped AS (
           SELECT *, SUM(is_new) OVER (PARTITION BY target ORDER BY created_at ROWS UNBOUNDED PRECEDING) AS run_no
             FROM marked
         )
         SELECT target,
                MIN(created_at) AS started_at,
                MAX(created_at) AS ended_at,
                CAST((julianday(MAX(created_at)) - julianday(MIN(created_at))) * 86400 AS INTEGER) AS duration_sec
           FROM grouped
          GROUP BY target, run_no
          ORDER BY started_at
          LIMIT ${MAX_EVENTS_PER_VISIT}`,
      )
      .bind(userId, startedAt, endedAt),

    // 2) Πραγματικές ενέργειες + το δεύτερο ιστορικό, μία-μία.
    db
      .prepare(
        `SELECT created_at, activity_type AS type, entity_id AS target, metadata
           FROM user_activity_log
          WHERE user_id = ?1
            AND julianday(created_at) >= julianday(?2)
            AND julianday(created_at) <= julianday(?3)
            AND activity_type NOT IN ${PAGE_TYPES}
         UNION ALL
         SELECT created_at, action, entity_id, field_changes
           FROM data_changes
          WHERE entity_owner_id = ?1
            AND julianday(created_at) >= julianday(?2)
            AND julianday(created_at) <= julianday(?3)
          ORDER BY created_at
          LIMIT ${MAX_EVENTS_PER_VISIT}`,
      )
      .bind(userId, startedAt, endedAt),
  ]);

  const events: VisitEvent[] = [];

  for (const p of pages?.results || []) {
    events.push({
      at: p.started_at,
      kind: 'page',
      type: 'page_view',
      target: decodePath(p.target),
      metadata: null,
      duration_sec: p.duration_sec || 0,
    });
  }

  for (const a of actions?.results || []) {
    events.push({
      at: a.created_at,
      kind: String(a.type).startsWith('error') ? 'error' : 'action',
      type: a.type,
      target: a.target ? decodePath(a.target) : null,
      metadata: a.metadata || null,
    });
  }

  events.sort((x, y) => x.at.localeCompare(y.at));
  return annotate(events);
}

/**
 * Οι σημάνσεις που απαντούν στο «πού κόλλησε, πού έφυγε».
 * Υπολογίζονται εδώ και όχι στην οθόνη, ώστε ο κανόνας να είναι ένας.
 */
function annotate(events: VisitEvent[]): VisitEvent[] {
  const seen = new Map<string, number>();
  for (const e of events) {
    if (e.kind !== 'page' || !e.target) continue;
    seen.set(e.target, (seen.get(e.target) || 0) + 1);
  }

  for (const e of events) {
    if (e.kind !== 'page') continue;

    // «Ξαναγύρισε»: την ίδια σελίδα την είδε πολλές φορές μέσα στην ίδια επίσκεψη.
    if (e.target && (seen.get(e.target) || 0) >= REVISIT_TIMES) e.revisit = true;

    // «Κόλλησε;»: έμεινε πολλή ώρα και δεν έκανε καμία πραγματική ενέργεια όσο
    // ήταν εκεί. Σκέτη παραμονή δεν φτάνει — μπορεί απλώς να διάβαζε.
    //
    // ⚠️ Το σφάλμα ΔΕΝ μετράει ως «έκανε κάτι». Το είχα γράψει λάθος και το
    // έπιασα στον έλεγχο: ο χρήστης καθόταν 10 λεπτά στην Επαλήθευση και πήρε
    // 404 — δηλαδή το χειρότερο δυνατό κόλλημα — και ακριβώς επειδή υπήρχε το
    // σφάλμα μέσα στο διάστημα, η σήμανση δεν έμπαινε. Το σφάλμα είναι ένδειξη
    // ότι κόλλησε, όχι απόδειξη ότι προχώρησε.
    if ((e.duration_sec || 0) >= STUCK_MINUTES * 60) {
      const from = new Date(e.at).getTime();
      const until = from + (e.duration_sec || 0) * 1000;
      const didSomething = events.some((o) => {
        if (o.kind === 'page' || o.kind === 'error') return false;
        const t = new Date(o.at).getTime();
        return t > from && t <= until;
      });
      if (!didSomething) e.stuck = true;
    }
  }

  // «Έφυγε από εδώ»: η τελευταία σελίδα της επίσκεψης.
  for (let i = events.length - 1; i >= 0; i--) {
    const last = events[i];
    if (last && last.kind === 'page') {
      last.exit = true;
      break;
    }
  }

  return events;
}

/**
 * Οι διαδρομές αποθηκεύονται όπως τις στέλνει ο browser, δηλαδή τα ελληνικά
 * είναι κωδικοποιημένα (`/emails/01-%C3%8E%C2%BA…`) και μερικές φορές διπλά.
 * Χωρίς αυτό η οθόνη δείχνει χυλό. Αν αποτύχει, γυρνάει το αρχικό — δεν χάνουμε
 * ποτέ την πληροφορία.
 */
export function decodePath(path: string | null): string | null {
  if (!path) return path;
  let out = path;
  for (let i = 0; i < 2; i++) {
    if (!out.includes('%')) break;
    try {
      const next = decodeURIComponent(out);
      if (next === out) break;
      out = next;
    } catch {
      break;
    }
  }
  return out;
}

/**
 * Η σύνοψη που απαντάει χωρίς κλικ: πού μας αφήνει ο κόσμος και πόσα σφάλματα
 * είδε. Ένα ερώτημα, πάνω στο ίδιο ρεύμα γεγονότων.
 */
export async function visitsOverview(
  db: D1Database,
  userId: string,
): Promise<{
  visits: number;
  total_sec: number;
  errors: number;
  exits: Array<{ path: string; count: number }>;
}> {
  const rows = await db
    .prepare(
      `WITH ${EVENTS_CTE},
       ordered AS (
         SELECT *, LAG(created_at) OVER (ORDER BY created_at) AS prev_at FROM events
       ),
       marked AS (
         SELECT *, CASE WHEN prev_at IS NULL
                          OR (julianday(created_at) - julianday(prev_at)) * 1440.0 > ${VISIT_GAP_MINUTES}
                        THEN 1 ELSE 0 END AS is_new
           FROM ordered
       ),
       grouped AS (
         SELECT *, SUM(is_new) OVER (ORDER BY created_at ROWS UNBOUNDED PRECEDING) AS visit_no
           FROM marked
       ),
       per_visit AS (
         SELECT visit_no,
                CAST((julianday(MAX(created_at)) - julianday(MIN(created_at))) * 86400 AS INTEGER) AS dur,
                SUM(CASE WHEN type LIKE 'error%' THEN 1 ELSE 0 END) AS errs,
                MAX(CASE WHEN type IN ${PAGE_TYPES} AND target IS NOT NULL
                         THEN created_at || '|' || target END) AS exit_pair
           FROM grouped
          GROUP BY visit_no
       )
       SELECT COUNT(*) AS visits, SUM(dur) AS total_sec, SUM(errs) AS errors,
              GROUP_CONCAT(exit_pair, char(10)) AS exit_pairs
         FROM per_visit`,
    )
    // ΠΡΟΣΟΧΗ: μόνο ένα δέσιμο. Το ερώτημα έχει ?1 και τίποτα άλλο — αν βάλεις
    // δεύτερο (π.χ. null για συμμετρία με το listVisits) η D1 πετάει
    // «Wrong number of parameter bindings». Μου συνέβη.
    .bind(userId)
    .first<any>();

  const tally = new Map<string, number>();
  for (const pair of String(rows?.exit_pairs || '').split('\n')) {
    if (!pair) continue;
    const path = decodePath(pair.split('|').slice(1).join('|'));
    if (!path) continue;
    tally.set(path, (tally.get(path) || 0) + 1);
  }

  return {
    visits: rows?.visits || 0,
    total_sec: rows?.total_sec || 0,
    errors: rows?.errors || 0,
    exits: [...tally.entries()]
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
  };
}
