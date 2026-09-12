/**
 * Μετάφραση κειμένων που έγραψαν χρήστες (αγγελίες, βάρδιες, μικροδουλειές).
 *
 * ΤΙ ΛΥΝΕΙ: ο επισκέπτης διαλέγει αγγλικά, όλη η σελίδα αλλάζει, αλλά ο
 * τίτλος και η περιγραφή της αγγελίας μένουν ελληνικά — γιατί τα έγραψε η
 * επιχείρηση. Εδώ μεταφράζονται ΜΙΑ φορά με το Workers AI της Cloudflare και
 * αποθηκεύονται (πίνακας content_translations). Την επόμενη φορά έρχονται
 * έτοιμα από τη βάση, χωρίς κόστος και χωρίς καθυστέρηση.
 *
 * ΠΟΤΕ ΜΕΤΑΦΡΑΖΕΤΑΙ:
 *  · όταν ζητηθεί για πρώτη φορά στα αγγλικά (μία αγγελία → αμέσως, λίστα →
 *    στο παρασκήνιο, ώστε να μην περιμένει η λίστα),
 *  · όταν δημοσιεύεται ή αλλάζει μια αγγελία (στο παρασκήνιο),
 *  · κάθε ώρα από τον cron, για ό,τι έμεινε πίσω.
 *
 * ΠΟΤΕ ΔΕΝ ΠΑΡΟΥΣΙΑΖΕΤΑΙ ΨΕΥΤΙΚΑ: αν η μετάφραση δεν υπάρχει ακόμη, φεύγει
 * το ελληνικό πρωτότυπο. Ποτέ κενό, ποτέ μισό.
 */
import type { Env } from '../types';

/**
 * Ό,τι χρειαζόμαστε από ένα Hono context — δομικά, ώστε να δέχεται κάθε route
 * (με ή χωρίς Variables) χωρίς να παλεύουμε με τα generics του Hono.
 */
type Ctx = {
  env: Env;
  req: { query(name: string): string | undefined; header(name: string): string | undefined };
  executionCtx: { waitUntil(p: Promise<unknown>): void };
};

export type Locale = 'el' | 'en';
type Fields = readonly string[];
type Row = Record<string, unknown> & { id: string | number };

const DEFAULT_FIELDS: Fields = ['title', 'description'];
const MAX_CHARS = 4000;
/** Πόσες ελλείπουσες μεταφράσεις ξεκινούν στο παρασκήνιο από ΜΙΑ κλήση λίστας. */
const BACKGROUND_PER_REQUEST = 6;

/** Ποια γλώσσα ζήτησε ο επισκέπτης: ?lang=en ή κεφαλίδα X-Locale. */
export function requestLocale(c: Ctx): Locale {
  const q = (c.req.query('lang') || c.req.header('X-Locale') || '').toLowerCase();
  return q === 'en' ? 'en' : 'el';
}

/** FNV-1a: μικρό αποτύπωμα του πρωτότυπου, για να ξέρουμε αν άλλαξε. */
export function textHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0') + ':' + s.length;
}

function hasGreek(s: string): boolean {
  return /[\u0370-\u03FF\u1F00-\u1FFF]/.test(s);
}

async function translateSegment(ai: any, text: string): Promise<string | null> {
  const clean = text.trim();
  if (!clean) return '';
  // Χωρίς ελληνικά γράμματα (π.χ. «Bartender», ένα ποσό) δεν έχει τι να μεταφράσει.
  if (!hasGreek(clean)) return clean;
  try {
    const r = await ai.run('@cf/meta/m2m100-1.2b', {
      text: clean.slice(0, MAX_CHARS),
      source_lang: 'el',
      target_lang: 'en',
    });
    const out = r?.translated_text;
    if (typeof out === 'string' && out.trim() && !hasGreek(out)) return out.trim();
  } catch {
    /* πέφτουμε στο δεύτερο μοντέλο */
  }
  try {
    const r = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content:
            'You are a professional translator. Translate the user\'s text from Greek to natural, professional British English. Keep names, numbers, currencies and line breaks exactly. Output ONLY the translation — no notes, no quotes.',
        },
        { role: 'user', content: clean.slice(0, MAX_CHARS) },
      ],
      max_tokens: 1200,
    });
    const out = r?.response;
    if (typeof out === 'string' && out.trim() && !hasGreek(out)) return out.trim();
  } catch {
    /* ούτε αυτό — μένει το ελληνικό */
  }
  return null;
}

/**
 * Μεταφράζει ολόκληρο κείμενο παράγραφο-παράγραφο, ώστε οι αλλαγές γραμμής να
 * μένουν όπως τις έγραψε η επιχείρηση και το μοντέλο να μην κόβει μακριά
 * κείμενα στη μέση.
 */
export async function translateText(ai: any, text: string): Promise<string | null> {
  const parts = text.split(/\r?\n/);
  const out: string[] = [];
  for (const p of parts.slice(0, 60)) {
    if (!p.trim()) {
      out.push('');
      continue;
    }
    const t = await translateSegment(ai, p);
    if (t === null) return null;
    out.push(t);
  }
  return out.join('\n').trim();
}

type Stored = Record<string, { text: string; source_hash: string }>;

async function loadTranslations(
  db: D1Database,
  type: string,
  ids: string[],
  locale: Locale,
): Promise<Map<string, Stored>> {
  const map = new Map<string, Stored>();
  if (ids.length === 0) return map;
  // Το D1 δέχεται έως ~100 παραμέτρους ανά ερώτημα — δουλεύουμε σε δέσμες.
  for (let i = 0; i < ids.length; i += 80) {
    const chunk = ids.slice(i, i + 80);
    const rows = await db
      .prepare(
        `SELECT entity_id, field, text, source_hash FROM content_translations
          WHERE entity_type = ? AND locale = ? AND entity_id IN (${chunk.map(() => '?').join(',')})`,
      )
      .bind(type, locale, ...chunk)
      .all<{ entity_id: string; field: string; text: string; source_hash: string }>();
    for (const r of rows.results || []) {
      const s = map.get(r.entity_id) || {};
      s[r.field] = { text: r.text, source_hash: r.source_hash };
      map.set(r.entity_id, s);
    }
  }
  return map;
}

/**
 * Μεταφράζει και αποθηκεύει όσα πεδία λείπουν ή έχουν αλλάξει. Επιστρέφει τα
 * αγγλικά κείμενα που έχει τώρα η βάση για αυτή την εγγραφή.
 */
export async function ensureTranslated(
  env: Env,
  type: string,
  id: string,
  source: Record<string, string | null | undefined>,
  locale: Locale = 'en',
): Promise<Record<string, string>> {
  const existing = (await loadTranslations(env.DB, type, [id], locale)).get(id) || {};
  const result: Record<string, string> = {};
  for (const [field, raw] of Object.entries(source)) {
    const text = typeof raw === 'string' ? raw : '';
    if (!text.trim()) continue;
    const h = textHash(text);
    const have = existing[field];
    if (have && have.source_hash === h) {
      result[field] = have.text;
      continue;
    }
    const translated = await translateText(env.AI, text);
    if (translated === null || !translated) continue;
    await env.DB.prepare(
      `INSERT INTO content_translations (entity_type, entity_id, locale, field, text, source_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(entity_type, entity_id, locale, field)
         DO UPDATE SET text = excluded.text, source_hash = excluded.source_hash, created_at = excluded.created_at`,
    )
      .bind(type, id, locale, field, translated, h)
      .run();
    result[field] = translated;
  }
  return result;
}

function runInBackground(c: Ctx, p: Promise<unknown>) {
  try {
    c.executionCtx.waitUntil(p.catch((e) => console.error('[translate] background failed', e)));
  } catch {
    // Εκτός Workers (τεστ): απλώς μην μπλοκάρεις.
    void p.catch(() => {});
  }
}

/**
 * Αντικαθιστά τα πεδία των γραμμών με τη μετάφρασή τους, αν ο επισκέπτης
 * ζήτησε αγγλικά. Στα ελληνικά γυρίζει τις γραμμές ΑΚΡΙΒΩΣ όπως ήρθαν.
 *
 * Μία μόνη εγγραφή (σελίδα αγγελίας) μεταφράζεται επιτόπου αν λείπει — λίγα
 * δευτερόλεπτα την πρώτη φορά, μετά έρχεται έτοιμη. Λίστες δεν περιμένουν:
 * ό,τι λείπει ξεκινά στο παρασκήνιο και εμφανίζεται στην επόμενη φόρτωση.
 */
export async function localizeRows<T extends Row>(
  c: Ctx,
  type: string,
  rows: T[],
  fields: Fields = DEFAULT_FIELDS,
): Promise<T[]> {
  const locale = requestLocale(c);
  if (locale === 'el' || rows.length === 0) return rows;

  const ids = rows.map((r) => String(r.id));
  let stored: Map<string, Stored>;
  try {
    stored = await loadTranslations(c.env.DB, type, ids, locale);
  } catch (e) {
    console.error('[translate] load failed', e);
    return rows;
  }

  const missing: T[] = [];
  const out = rows.map((row) => {
    const s = stored.get(String(row.id)) || {};
    const copy: Record<string, unknown> = { ...row };
    let incomplete = false;
    for (const f of fields) {
      const src = row[f];
      if (typeof src !== 'string' || !src.trim()) continue;
      const have = s[f];
      if (have && have.source_hash === textHash(src)) copy[f] = have.text;
      else incomplete = true;
    }
    if (incomplete) missing.push(row);
    return copy as T;
  });

  if (missing.length === 0) return out;

  const sourceOf = (row: T) =>
    Object.fromEntries(fields.map((f) => [f, typeof row[f] === 'string' ? (row[f] as string) : '']));

  if (rows.length === 1) {
    // Μία αγγελία: αξίζει να περιμένει ο επισκέπτης λίγα δευτερόλεπτα.
    try {
      const tr = await ensureTranslated(c.env, type, String(rows[0]!.id), sourceOf(rows[0]!), locale);
      return [{ ...out[0]!, ...tr } as T];
    } catch (e) {
      console.error('[translate] sync failed', e);
      return out;
    }
  }

  runInBackground(
    c,
    (async () => {
      for (const row of missing.slice(0, BACKGROUND_PER_REQUEST)) {
        await ensureTranslated(c.env, type, String(row.id), sourceOf(row), locale);
      }
    })(),
  );
  return out;
}

/** Μετά από δημοσίευση/αλλαγή αγγελίας: μετάφραση στο παρασκήνιο. */
export function queueJobTranslation(c: Ctx, jobId: string) {
  runInBackground(
    c,
    (async () => {
      const row = await c.env.DB.prepare('SELECT id, title, description FROM job_listings WHERE id = ?')
        .bind(jobId)
        .first<{ id: string; title: string; description: string | null }>();
      if (!row) return;
      await ensureTranslated(c.env, 'job', row.id, { title: row.title, description: row.description });
    })(),
  );
}

/**
 * Ωριαίος cron: μεταφράζει όσες δημοσιευμένες αγγελίες και ανοιχτές μικροδουλειές
 * δεν έχουν ακόμη (σωστή) αγγλική μετάφραση. Λίγες κάθε φορά, ώστε να μην
 * φορτώνει — μέσα σε λίγες ώρες έχουν προλάβει όλες.
 */
export async function translateBacklog(env: Env, limit = 15): Promise<number> {
  let done = 0;
  const jobs = await env.DB.prepare(
    `SELECT j.id, j.title, j.description FROM job_listings j
      WHERE j.status = 'published'
        AND NOT EXISTS (
          SELECT 1 FROM content_translations t
           WHERE t.entity_type = 'job' AND t.entity_id = j.id AND t.locale = 'en' AND t.field = 'title')
      ORDER BY j.created_at DESC LIMIT ?`,
  )
    .bind(limit)
    .all<{ id: string; title: string; description: string | null }>();
  for (const j of jobs.results || []) {
    await ensureTranslated(env, 'job', j.id, { title: j.title, description: j.description });
    done++;
  }
  if (done >= limit) return done;
  const tasks = await env.DB.prepare(
    `SELECT k.id, k.title, k.description FROM tasknow_tasks k
      WHERE k.status = 'open' AND k.hidden = 0
        AND NOT EXISTS (
          SELECT 1 FROM content_translations t
           WHERE t.entity_type = 'task' AND t.entity_id = k.id AND t.locale = 'en' AND t.field = 'title')
      ORDER BY k.created_at DESC LIMIT ?`,
  )
    .bind(limit - done)
    .all<{ id: string; title: string; description: string | null }>();
  for (const k of tasks.results || []) {
    await ensureTranslated(env, 'task', k.id, { title: k.title, description: k.description });
    done++;
  }
  return done;
}
