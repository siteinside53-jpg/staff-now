/**
 * Διαχειριστικό — «τι γίνεται στο site»: όλες οι κινήσεις (χρήστες + ανώνυμοι),
 * επισκεψιμότητα, εισερχόμενα (επικοινωνία, αξιολογήσεις πλατφόρμας),
 * ειδοποιήσεις ομάδας και ρυθμίσεις τους, ιστορικό social.
 *
 * Ξεχωριστό αρχείο από το admin.ts (4.000+ γραμμές) — ίδιος φρουρός (auth +
 * ρόλος admin), ίδιες συμβάσεις απάντησης.
 */

import { Hono } from 'hono';
import type { Env, AuthUser } from '../types';
import { requireAuth, requireRole } from '../middleware/auth';
import { success, error } from '../lib/response';
import { generateId } from '../lib/id';
import { sourceLabel } from '../lib/traffic';
import { DEFAULT_ALERT_SETTINGS, loadAlertSettings, type AdminAlertSettings } from '../lib/admin-events';

const insights = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

insights.use('*', async (c, next) => {
  return requireAuth(c, async () => {
    const res = await requireRole('admin')(c, async () => {
      const { loadAdminRole, adminDenial } = await import('../lib/admin-permissions');
      const denial = adminDenial(await loadAdminRole(c.env, c.get('user').id), c.req.method, c.req.path);
      if (denial) {
        c.res = c.json({ success: false, error: { code: 'ADMIN_ROLE_FORBIDDEN', message: denial } }, 403);
        return;
      }
      await next();
    });
    if (res) c.res = res;
  });
});

const clampInt = (raw: string | undefined, def: number, min: number, max: number) => {
  const n = parseInt(raw || '', 10);
  if (Number.isNaN(n)) return def;
  return Math.max(min, Math.min(max, n));
};

function maskIp(ip?: string | null): string | null {
  if (!ip) return null;
  if (ip.includes(':')) return `${ip.split(':').slice(0, 2).join(':')}::xxxx`;
  const p = ip.split('.');
  return p.length === 4 ? `${p[0]}.${p[1]}.${p[2]}.xxx` : ip;
}

const sinceIso = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

// ═══════════════════════════════════════════════════════════════════════════
// ΟΛΕΣ ΟΙ ΚΙΝΗΣΕΙΣ — χρήστες και ανώνυμοι μαζί, με αναζήτηση και φίλτρα
// ═══════════════════════════════════════════════════════════════════════════
//
// Πριν, το «Δες όλα» της επισκόπησης πήγαινε στο Audit Log (μόνο ενέργειες
// διαχειριστών). Δεν υπήρχε σελίδα που να δείχνει τι έκαναν οι χρήστες και
// οι επισκέπτες. Εδώ ενώνονται τα δύο ημερολόγια σε μία λίστα.
insights.get('/activity', async (c) => {
  const db = c.env.DB;
  const q = (c.req.query('q') || '').trim().slice(0, 100);
  const kind = c.req.query('kind') || 'all'; // all | users | anonymous
  const type = (c.req.query('type') || '').trim().slice(0, 40);
  const days = clampInt(c.req.query('days'), 7, 1, 365);
  const country = (c.req.query('country') || '').trim().slice(0, 2).toUpperCase();
  const limit = clampInt(c.req.query('limit'), 50, 1, 200);
  const page = clampInt(c.req.query('page'), 1, 1, 10_000);
  const withHeartbeats = c.req.query('heartbeats') === '1';
  const since = sinceIso(days);

  const like = `%${q}%`;
  const userWhere: string[] = ['a.created_at >= ?'];
  const userBind: unknown[] = [since];
  const anonWhere: string[] = ['a.created_at >= ?'];
  const anonBind: unknown[] = [since];
  if (!withHeartbeats) {
    userWhere.push("a.activity_type <> 'heartbeat'");
    anonWhere.push("a.activity_type <> 'heartbeat'");
  }
  if (type) {
    userWhere.push('a.activity_type = ?');
    userBind.push(type);
    anonWhere.push('a.activity_type = ?');
    anonBind.push(type);
  }
  if (country) {
    userWhere.push('a.country = ?');
    userBind.push(country);
    anonWhere.push('a.country = ?');
    anonBind.push(country);
  }
  if (q) {
    userWhere.push(
      "(u.email LIKE ? OR COALESCE(wp.full_name, '') LIKE ? OR COALESCE(bp.company_name, '') LIKE ? OR COALESCE(a.entity_id, '') LIKE ? OR a.activity_type LIKE ? OR COALESCE(a.city, '') LIKE ?)",
    );
    userBind.push(like, like, like, like, like, like);
    anonWhere.push(
      "(a.visitor_id LIKE ? OR COALESCE(a.entity_id, '') LIKE ? OR a.activity_type LIKE ? OR COALESCE(a.referrer, '') LIKE ? OR COALESCE(a.city, '') LIKE ?)",
    );
    anonBind.push(like, like, like, like, like);
  }

  const userSql = `
    SELECT 'user' AS kind, a.id, a.user_id AS actor_id, u.email AS actor_email,
           COALESCE(NULLIF(wp.full_name, ''), NULLIF(bp.company_name, ''), u.display_name) AS actor_name,
           u.role AS actor_role, a.activity_type, a.entity_type, a.entity_id, a.metadata,
           a.ip_address, a.user_agent, a.country, a.city, a.region, NULL AS referrer, a.created_at
      FROM user_activity_log a
      JOIN users u ON u.id = a.user_id
      LEFT JOIN worker_profiles wp ON wp.user_id = a.user_id
      LEFT JOIN business_profiles bp ON bp.user_id = a.user_id
     WHERE ${userWhere.join(' AND ')}`;
  const anonSql = `
    SELECT 'anonymous' AS kind, a.id, a.visitor_id AS actor_id, NULL AS actor_email, NULL AS actor_name,
           NULL AS actor_role, a.activity_type, 'path' AS entity_type, a.entity_id, a.metadata,
           a.ip_address, a.user_agent, a.country, a.city, a.region, a.referrer, a.created_at
      FROM anonymous_activity_log a
     WHERE ${anonWhere.join(' AND ')}`;

  let sql: string;
  let bind: unknown[];
  if (kind === 'users') {
    sql = userSql;
    bind = userBind;
  } else if (kind === 'anonymous') {
    sql = anonSql;
    bind = anonBind;
  } else {
    sql = `${userSql} UNION ALL ${anonSql}`;
    bind = [...userBind, ...anonBind];
  }
  // limit+1: μαθαίνουμε αν υπάρχει επόμενη σελίδα χωρίς δεύτερο COUNT
  const rows = await db
    .prepare(`SELECT * FROM (${sql}) ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .bind(...bind, limit + 1, (page - 1) * limit)
    .all<Record<string, unknown>>();
  const all = rows.results || [];
  const items = all.slice(0, limit).map((r) => ({
    ...r,
    ip_address: maskIp(r.ip_address as string | null),
    metadata: typeof r.metadata === 'string' ? safeJson(r.metadata as string) : r.metadata ?? null,
  }));
  return success(c, { items, page, limit, hasMore: all.length > limit });
});

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

/** Τα είδη κινήσεων που υπάρχουν στα ημερολόγια — για το φίλτρο. */
insights.get('/activity/types', async (c) => {
  const db = c.env.DB;
  const since = sinceIso(90);
  const [u, a] = await Promise.all([
    db.prepare('SELECT activity_type AS t, COUNT(*) AS n FROM user_activity_log WHERE created_at >= ? GROUP BY activity_type').bind(since).all<{ t: string; n: number }>(),
    db.prepare('SELECT activity_type AS t, COUNT(*) AS n FROM anonymous_activity_log WHERE created_at >= ? GROUP BY activity_type').bind(since).all<{ t: string; n: number }>(),
  ]);
  const merged = new Map<string, number>();
  for (const r of [...(u.results || []), ...(a.results || [])]) merged.set(r.t, (merged.get(r.t) || 0) + Number(r.n));
  const types = [...merged.entries()].filter(([t]) => t !== 'heartbeat').sort((x, y) => y[1] - x[1]).map(([type, count]) => ({ type, count }));
  return success(c, { types });
});

// ═══════════════════════════════════════════════════════════════════════════
// ΕΠΙΣΚΕΨΙΜΟΤΗΤΑ — ανώνυμοι επισκέπτες: από πού, τι είδαν, πόσο έμειναν

/**
 * Πραγματικός χρόνος παραμονής ανά επισκέπτη.
 *
 * Ο πίνακας anonymous_sessions έχει ΜΙΑ γραμμή ανά επισκέπτη για πάντα, οπότε
 * «τελευταία − πρώτη εμφάνιση» έβγαζε «596 ώρες» για κάποιον που ήρθε δύο
 * φορές με 25 μέρες διαφορά. Εδώ μετράμε μόνο τα κενά ανάμεσα σε διαδοχικές
 * κινήσεις που είναι έως 30 λεπτά· μεγαλύτερο κενό = τέλος επίσκεψης και
 * αρχή καινούριας (visits).
 */
const VISIT_GAP_SECONDS = 30 * 60;

async function activeTimeByVisitor(
  db: D1Database,
  opts: { visitorIds?: string[]; since?: string },
): Promise<Map<string, { seconds: number; visits: number }>> {
  const out = new Map<string, { seconds: number; visits: number }>();
  const where: string[] = [];
  const bind: unknown[] = [];
  if (opts.visitorIds) {
    if (opts.visitorIds.length === 0) return out;
    where.push(`visitor_id IN (${opts.visitorIds.map(() => '?').join(',')})`);
    bind.push(...opts.visitorIds);
  }
  if (opts.since) {
    where.push('created_at >= ?');
    bind.push(opts.since);
  }
  const rows = await db
    .prepare(
      `SELECT visitor_id,
              COALESCE(SUM(CASE WHEN gap IS NOT NULL AND gap <= ${VISIT_GAP_SECONDS} THEN gap ELSE 0 END), 0) AS seconds,
              SUM(CASE WHEN gap IS NULL OR gap > ${VISIT_GAP_SECONDS} THEN 1 ELSE 0 END) AS visits
         FROM (
           SELECT visitor_id,
                  (julianday(created_at) - julianday(LAG(created_at) OVER (PARTITION BY visitor_id ORDER BY created_at))) * 86400 AS gap
             FROM anonymous_activity_log
            ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
         )
        GROUP BY visitor_id`,
    )
    .bind(...bind)
    .all<{ visitor_id: string; seconds: number; visits: number }>();
  for (const r of rows.results || []) {
    out.set(r.visitor_id, { seconds: Math.round(Number(r.seconds || 0)), visits: Number(r.visits || 0) });
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
insights.get('/traffic/stats', async (c) => {
  const db = c.env.DB;
  const days = clampInt(c.req.query('days'), 30, 1, 365);
  const since = sinceIso(days);
  const prevSince = sinceIso(days * 2);

  const [totals, prevTotals, bySource, topPages, topLanding, byCountry, byCity, byDevice, daily, signups, conversions] =
    await Promise.all([
      db.prepare(
        `SELECT COUNT(*) AS sessions, COALESCE(SUM(page_views), 0) AS page_views,
                COALESCE(AVG((julianday(last_seen_at) - julianday(first_seen_at)) * 86400), 0) AS avg_seconds,
                SUM(CASE WHEN page_views <= 1 THEN 1 ELSE 0 END) AS bounces
           FROM anonymous_sessions WHERE first_seen_at >= ?`,
      ).bind(since).first<{ sessions: number; page_views: number; avg_seconds: number; bounces: number }>(),
      db.prepare('SELECT COUNT(*) AS sessions FROM anonymous_sessions WHERE first_seen_at >= ? AND first_seen_at < ?')
        .bind(prevSince, since).first<{ sessions: number }>(),
      db.prepare(
        `SELECT COALESCE(m.source, 'direct') AS source, COUNT(*) AS n
           FROM anonymous_sessions s LEFT JOIN visitor_meta m ON m.visitor_id = s.visitor_id
          WHERE s.first_seen_at >= ? GROUP BY COALESCE(m.source, 'direct') ORDER BY n DESC LIMIT 20`,
      ).bind(since).all<{ source: string; n: number }>(),
      db.prepare(
        `SELECT entity_id AS path, COUNT(*) AS n, COUNT(DISTINCT visitor_id) AS visitors
           FROM anonymous_activity_log WHERE activity_type = 'page_view' AND created_at >= ? AND entity_id IS NOT NULL
          GROUP BY entity_id ORDER BY n DESC LIMIT 15`,
      ).bind(since).all<{ path: string; n: number; visitors: number }>(),
      db.prepare(
        `SELECT landing_path AS path, COUNT(*) AS n FROM visitor_meta
          WHERE first_seen_at >= ? AND landing_path IS NOT NULL GROUP BY landing_path ORDER BY n DESC LIMIT 10`,
      ).bind(since).all<{ path: string; n: number }>(),
      db.prepare(
        `SELECT COALESCE(country, '?') AS country, COUNT(*) AS n FROM anonymous_sessions
          WHERE first_seen_at >= ? GROUP BY country ORDER BY n DESC LIMIT 10`,
      ).bind(since).all<{ country: string; n: number }>(),
      db.prepare(
        `SELECT COALESCE(city, '?') AS city, COALESCE(country, '') AS country, COUNT(*) AS n FROM anonymous_sessions
          WHERE first_seen_at >= ? GROUP BY city, country ORDER BY n DESC LIMIT 12`,
      ).bind(since).all<{ city: string; country: string; n: number }>(),
      db.prepare(
        `SELECT COALESCE(m.device, 'unknown') AS device, COUNT(*) AS n
           FROM anonymous_sessions s LEFT JOIN visitor_meta m ON m.visitor_id = s.visitor_id
          WHERE s.first_seen_at >= ? GROUP BY COALESCE(m.device, 'unknown')`,
      ).bind(since).all<{ device: string; n: number }>(),
      db.prepare(
        `SELECT substr(first_seen_at, 1, 10) AS day, COUNT(*) AS sessions, COALESCE(SUM(page_views), 0) AS page_views
           FROM anonymous_sessions WHERE first_seen_at >= ? GROUP BY day ORDER BY day`,
      ).bind(since).all<{ day: string; sessions: number; page_views: number }>(),
      db.prepare('SELECT COUNT(*) AS n FROM users WHERE created_at >= ?').bind(since).first<{ n: number }>(),
      db.prepare('SELECT COUNT(*) AS n FROM visitor_meta WHERE first_seen_at >= ? AND registered_user_id IS NOT NULL')
        .bind(since).first<{ n: number }>(),
    ]);

  // Μέση διάρκεια από τον πραγματικό χρόνο παραμονής (όχι πρώτη−τελευταία εμφάνιση).
  const active = await activeTimeByVisitor(db, { since });
  const activeVals = [...active.values()].map((v) => v.seconds);
  const avgActive = activeVals.length ? activeVals.reduce((x, y) => x + y, 0) / activeVals.length : 0;

  return success(c, {
    days,
    sessions: Number(totals?.sessions || 0),
    previousSessions: Number(prevTotals?.sessions || 0),
    pageViews: Number(totals?.page_views || 0),
    avgSeconds: Math.round(avgActive),
    bounceRate: totals?.sessions ? Math.round((Number(totals.bounces || 0) / Number(totals.sessions)) * 100) : 0,
    signups: Number(signups?.n || 0),
    conversions: Number(conversions?.n || 0),
    bySource: (bySource.results || []).map((r) => ({ source: r.source, label: sourceLabel(r.source), sessions: Number(r.n) })),
    topPages: (topPages.results || []).map((r) => ({ path: r.path, views: Number(r.n), visitors: Number(r.visitors) })),
    topLanding: (topLanding.results || []).map((r) => ({ path: r.path, sessions: Number(r.n) })),
    byCountry: (byCountry.results || []).map((r) => ({ country: r.country, sessions: Number(r.n) })),
    byCity: (byCity.results || []).map((r) => ({ city: r.city, country: r.country, sessions: Number(r.n) })),
    byDevice: (byDevice.results || []).map((r) => ({ device: r.device, sessions: Number(r.n) })),
    daily: (daily.results || []).map((r) => ({ day: r.day, sessions: Number(r.sessions), pageViews: Number(r.page_views) })),
  });
});

insights.get('/traffic/visitors', async (c) => {
  const db = c.env.DB;
  const days = clampInt(c.req.query('days'), 7, 1, 365);
  const source = (c.req.query('source') || '').trim().slice(0, 60);
  const q = (c.req.query('q') || '').trim().slice(0, 80);
  const limit = clampInt(c.req.query('limit'), 50, 1, 200);
  const page = clampInt(c.req.query('page'), 1, 1, 10_000);
  const where: string[] = ['s.first_seen_at >= ?'];
  const bind: unknown[] = [sinceIso(days)];
  if (source) {
    where.push("COALESCE(m.source, 'direct') = ?");
    bind.push(source);
  }
  if (q) {
    where.push("(s.visitor_id LIKE ? OR COALESCE(s.city, '') LIKE ? OR COALESCE(m.landing_path, '') LIKE ? OR COALESCE(s.current_path, '') LIKE ?)");
    const like = `%${q}%`;
    bind.push(like, like, like, like);
  }
  const rows = await db
    .prepare(
      `SELECT s.visitor_id, s.first_seen_at, s.last_seen_at, s.current_path, s.page_views, s.country, s.city, s.region, s.user_agent,
              COALESCE(m.source, 'direct') AS source, m.landing_path, m.device, m.utm_campaign, m.referrer,
              m.registered_user_id, u.email AS registered_email,
              CAST((julianday(s.last_seen_at) - julianday(s.first_seen_at)) * 86400 AS INTEGER) AS seconds
         FROM anonymous_sessions s
         LEFT JOIN visitor_meta m ON m.visitor_id = s.visitor_id
         LEFT JOIN users u ON u.id = m.registered_user_id
        WHERE ${where.join(' AND ')}
        ORDER BY s.last_seen_at DESC
        LIMIT ? OFFSET ?`,
    )
    .bind(...bind, limit + 1, (page - 1) * limit)
    .all<Record<string, unknown>>();
  const all = rows.results || [];
  const pageRows = all.slice(0, limit);
  const active = await activeTimeByVisitor(db, { visitorIds: pageRows.map((r) => String(r.visitor_id)) });
  const items = pageRows.map((r) => {
    const t = active.get(String(r.visitor_id));
    return { ...r, seconds: t ? t.seconds : 0, visits: t ? t.visits : 1, sourceLabel: sourceLabel(String(r.source)) };
  });
  return success(c, { items, page, limit, hasMore: all.length > limit });
});

/** Η διαδρομή ενός επισκέπτη: σελίδες, κλικ, σφάλματα, με ώρες. */
insights.get('/traffic/visitors/:visitorId', async (c) => {
  const db = c.env.DB;
  const visitorId = c.req.param('visitorId');
  const session = await db
    .prepare(
      `SELECT s.*, COALESCE(m.source, 'direct') AS source, m.landing_path, m.device, m.referrer, m.utm_source, m.utm_medium, m.utm_campaign,
              m.registered_user_id, u.email AS registered_email
         FROM anonymous_sessions s
         LEFT JOIN visitor_meta m ON m.visitor_id = s.visitor_id
         LEFT JOIN users u ON u.id = m.registered_user_id
        WHERE s.visitor_id = ?`,
    )
    .bind(visitorId)
    .first<Record<string, unknown>>();
  if (!session) return error(c, 'NOT_FOUND', 'Ο επισκέπτης δεν βρέθηκε', 404);
  const events = await db
    .prepare(
      `SELECT id, activity_type, entity_id AS path, metadata, referrer, created_at
         FROM anonymous_activity_log WHERE visitor_id = ? AND activity_type <> 'heartbeat'
        ORDER BY created_at ASC LIMIT 500`,
    )
    .bind(visitorId)
    .all<Record<string, unknown>>();
  // Πόσο έμεινε σε κάθε σελίδα: από την προβολή της μέχρι την επόμενη προβολή
  // (ή το τελευταίο σημάδι ζωής της συνεδρίας).
  const list: Array<Record<string, unknown>> = (events.results || [])
    .map((e): Record<string, unknown> => ({
      ...e,
      metadata: typeof e.metadata === 'string' ? safeJson(e.metadata as string) : e.metadata ?? null,
    }))
    // Παλιές εγγραφές «Δεν είστε συνδεδεμένος» από ανώνυμους: δεν ήταν σφάλμα
    // (ο ανώνυμος απλώς δεν έχει λογαριασμό) — δεν εμφανίζονται πια. Για τους
    // ανώνυμους το μήνυμα ζει μέσα στο path («/ — Δεν είστε συνδεδεμένος.»).
    .filter((e) => {
      if (!String(e.activity_type || '').startsWith('error')) return true;
      return !/Δεν είστε συνδεδεμένος/.test(String(e.path || ''));
    });
  const lastSeen = Date.parse(String(session.last_seen_at));
  for (let i = 0; i < list.length; i++) {
    const cur = list[i]!;
    if (cur.activity_type !== 'page_view') continue;
    let next: number | null = null;
    for (let j = i + 1; j < list.length; j++) {
      if (list[j]!.activity_type === 'page_view') {
        next = Date.parse(String(list[j]!.created_at));
        break;
      }
    }
    const start = Date.parse(String(cur.created_at));
    const end = next ?? (Number.isNaN(lastSeen) ? start : lastSeen);
    const secs = Math.max(0, Math.round((end - start) / 1000));
    // Κενό πάνω από 30 λεπτά = έφυγε και ξαναήρθε· δεν «έμεινε» τόσο στη σελίδα.
    (cur as Record<string, unknown>).seconds_on_page = secs <= VISIT_GAP_SECONDS ? secs : null;
  }
  const active = (await activeTimeByVisitor(db, { visitorIds: [visitorId] })).get(visitorId);
  return success(c, {
    session: {
      ...session,
      ip_address: maskIp(session.ip_address as string | null),
      sourceLabel: sourceLabel(String(session.source)),
      seconds: active ? active.seconds : 0,
      visits: active ? active.visits : 1,
    },
    events: list,
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SOCIAL — τι ανέβηκε πού (το γράφει η ομάδα)
// ═══════════════════════════════════════════════════════════════════════════
insights.get('/social-posts', async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT p.*, u.email AS created_by_email FROM social_posts p LEFT JOIN users u ON u.id = p.created_by
      ORDER BY p.posted_at DESC LIMIT 300`,
  ).all<Record<string, unknown>>();
  return success(c, { items: rows.results || [] });
});

insights.post('/social-posts', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}) as Record<string, unknown>);
  const platform = String(body.platform || '').trim().toLowerCase().slice(0, 30);
  const kind = String(body.kind || 'post').trim().toLowerCase().slice(0, 30);
  const title = String(body.title || '').trim().slice(0, 200);
  const url = typeof body.url === 'string' ? body.url.trim().slice(0, 500) : null;
  const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 2000) : null;
  const postedAt = typeof body.postedAt === 'string' && !Number.isNaN(Date.parse(body.postedAt)) ? new Date(body.postedAt).toISOString() : new Date().toISOString();
  if (!platform || !title) return error(c, 'VALIDATION', 'Χρειάζεται πλατφόρμα και τίτλος.', 400);
  const id = generateId('sp');
  await c.env.DB.prepare(
    'INSERT INTO social_posts (id, platform, kind, title, url, notes, posted_at, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(id, platform, kind, title, url, notes, postedAt, user.id, new Date().toISOString())
    .run();
  return success(c, { id }, 201);
});

insights.delete('/social-posts/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM social_posts WHERE id = ?').bind(c.req.param('id')).run();
  return success(c, { deleted: true });
});

// ═══════════════════════════════════════════════════════════════════════════
// ΕΙΣΕΡΧΟΜΕΝΑ — φόρμα επικοινωνίας, newsletter, αξιολογήσεις πλατφόρμας
// ═══════════════════════════════════════════════════════════════════════════
insights.get('/inbox/contact', async (c) => {
  const kind = c.req.query('kind') || '';
  const handled = c.req.query('handled') || '';
  const limit = clampInt(c.req.query('limit'), 50, 1, 200);
  const page = clampInt(c.req.query('page'), 1, 1, 10_000);
  const where: string[] = ['1=1'];
  const bind: unknown[] = [];
  if (kind === 'contact' || kind === 'newsletter') {
    where.push('kind = ?');
    bind.push(kind);
  }
  if (handled === '0') where.push('handled_at IS NULL');
  if (handled === '1') where.push('handled_at IS NOT NULL');
  const rows = await c.env.DB.prepare(
    `SELECT * FROM contact_messages WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
  )
    .bind(...bind, limit + 1, (page - 1) * limit)
    .all<Record<string, unknown>>();
  const all = rows.results || [];
  const pending = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM contact_messages WHERE handled_at IS NULL').first<{ n: number }>();
  return success(c, { items: all.slice(0, limit), page, limit, hasMore: all.length > limit, pending: Number(pending?.n || 0) });
});

insights.post('/inbox/contact/:id/handled', async (c) => {
  const body = await c.req.json<{ handled?: boolean }>().catch(() => ({ handled: true }));
  await c.env.DB.prepare('UPDATE contact_messages SET handled_at = ? WHERE id = ?')
    .bind(body.handled === false ? null : new Date().toISOString(), c.req.param('id'))
    .run();
  return success(c, { ok: true });
});

insights.get('/inbox/feedback', async (c) => {
  const handled = c.req.query('handled') || '';
  const limit = clampInt(c.req.query('limit'), 50, 1, 200);
  const page = clampInt(c.req.query('page'), 1, 1, 10_000);
  const where: string[] = ['1=1'];
  if (handled === '0') where.push('f.handled_at IS NULL');
  if (handled === '1') where.push('f.handled_at IS NOT NULL');
  const rows = await c.env.DB.prepare(
    `SELECT f.*, u.email AS user_email,
            COALESCE(NULLIF(wp.full_name, ''), NULLIF(bp.company_name, ''), u.display_name) AS user_name
       FROM site_feedback f
       LEFT JOIN users u ON u.id = f.user_id
       LEFT JOIN worker_profiles wp ON wp.user_id = f.user_id
       LEFT JOIN business_profiles bp ON bp.user_id = f.user_id
      WHERE ${where.join(' AND ')} ORDER BY f.created_at DESC LIMIT ? OFFSET ?`,
  )
    .bind(limit + 1, (page - 1) * limit)
    .all<Record<string, unknown>>();
  const all = rows.results || [];
  const stats = await c.env.DB.prepare(
    'SELECT COUNT(*) AS n, AVG(rating) AS avg, SUM(CASE WHEN handled_at IS NULL THEN 1 ELSE 0 END) AS pending FROM site_feedback',
  ).first<{ n: number; avg: number | null; pending: number }>();
  return success(c, {
    items: all.slice(0, limit),
    page,
    limit,
    hasMore: all.length > limit,
    total: Number(stats?.n || 0),
    avgRating: stats?.avg != null ? Math.round(Number(stats.avg) * 10) / 10 : null,
    pending: Number(stats?.pending || 0),
  });
});

insights.post('/inbox/feedback/:id/handled', async (c) => {
  const body = await c.req.json<{ handled?: boolean }>().catch(() => ({ handled: true }));
  await c.env.DB.prepare('UPDATE site_feedback SET handled_at = ? WHERE id = ?')
    .bind(body.handled === false ? null : new Date().toISOString(), c.req.param('id'))
    .run();
  return success(c, { ok: true });
});

// ═══════════════════════════════════════════════════════════════════════════
// ΕΙΔΟΠΟΙΗΣΕΙΣ ΟΜΑΔΑΣ — από τον πίνακα admin_events (βλ. lib/admin-events.ts)
// ═══════════════════════════════════════════════════════════════════════════
insights.get('/events', async (c) => {
  const db = c.env.DB;
  const limit = clampInt(c.req.query('limit'), 50, 1, 200);
  const page = clampInt(c.req.query('page'), 1, 1, 10_000);
  const type = (c.req.query('type') || '').trim().slice(0, 30);
  const unreadOnly = c.req.query('unread') === '1';
  const q = (c.req.query('q') || '').trim().slice(0, 80);
  const where: string[] = ['1=1'];
  const bind: unknown[] = [];
  if (type) {
    where.push('type = ?');
    bind.push(type);
  }
  if (unreadOnly) where.push('read_at IS NULL');
  if (q) {
    where.push('(title LIKE ? OR body LIKE ? OR data LIKE ?)');
    const like = `%${q}%`;
    bind.push(like, like, like);
  }
  const [rows, unread] = await Promise.all([
    db.prepare(`SELECT * FROM admin_events WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .bind(...bind, limit + 1, (page - 1) * limit)
      .all<Record<string, unknown>>(),
    db.prepare('SELECT COUNT(*) AS n FROM admin_events WHERE read_at IS NULL').first<{ n: number }>(),
  ]);
  const all = rows.results || [];
  const items = all.slice(0, limit).map((r) => {
    const data = typeof r.data === 'string' ? safeJson(r.data as string) : r.data;
    return {
      id: r.id,
      type: r.type,
      severity: r.severity,
      title: r.title,
      body: r.body,
      data,
      url: (data as Record<string, unknown> | null)?.url || null,
      read: !!r.read_at,
      createdAt: r.created_at,
    };
  });
  return success(c, { items, page, limit, hasMore: all.length > limit, unread: Number(unread?.n || 0) });
});

insights.post('/events/:id/read', async (c) => {
  await c.env.DB.prepare('UPDATE admin_events SET read_at = COALESCE(read_at, ?) WHERE id = ?')
    .bind(new Date().toISOString(), c.req.param('id'))
    .run();
  return success(c, { acked: true });
});

insights.post('/events/read-all', async (c) => {
  const res = await c.env.DB.prepare('UPDATE admin_events SET read_at = ? WHERE read_at IS NULL')
    .bind(new Date().toISOString())
    .run();
  return success(c, { acked: (res.meta as { changes?: number } | undefined)?.changes ?? 0 });
});

// Ρυθμίσεις: τι θέλει ο ΚΑΘΕ διαχειριστής στο κινητό του.
insights.get('/alert-settings', async (c) => {
  const user = c.get('user');
  const settings = await loadAlertSettings(c.env, user.id);
  const subs = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM push_subscriptions WHERE user_id = ?')
    .bind(user.id)
    .first<{ n: number }>();
  return success(c, { settings, pushDevices: Number(subs?.n || 0), defaults: DEFAULT_ALERT_SETTINGS });
});

insights.put('/alert-settings', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<Partial<AdminAlertSettings>>().catch(() => ({}) as Partial<AdminAlertSettings>);
  const current = await loadAlertSettings(c.env, user.id);
  const next: AdminAlertSettings = { ...current };
  for (const key of Object.keys(DEFAULT_ALERT_SETTINGS) as Array<keyof AdminAlertSettings>) {
    if (key in body) next[key] = body[key] ? 1 : 0;
  }
  await c.env.DB.prepare(
    `INSERT INTO admin_alert_settings (user_id, registrations, deletions, contact, feedback, visitors, visitor_left, payments, reports, errors, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       registrations = excluded.registrations, deletions = excluded.deletions, contact = excluded.contact,
       feedback = excluded.feedback, visitors = excluded.visitors, visitor_left = excluded.visitor_left,
       payments = excluded.payments, reports = excluded.reports, errors = excluded.errors, updated_at = excluded.updated_at`,
  )
    .bind(user.id, next.registrations, next.deletions, next.contact, next.feedback, next.visitors, next.visitor_left, next.payments, next.reports, next.errors, new Date().toISOString())
    .run();
  return success(c, { settings: next });
});

/** Δοκιμαστική ειδοποίηση στο κινητό του διαχειριστή που το πατάει. */
insights.post('/alert-settings/test', async (c) => {
  const user = c.get('user');
  const { notifyUser } = await import('../lib/notify');
  await notifyUser(c.env, {
    userId: user.id,
    title: '🔔 Δοκιμή StaffNow',
    body: 'Οι ειδοποιήσεις διαχειριστή φτάνουν σε αυτή τη συσκευή.',
    url: '/admin/notifications',
    pushOnly: true,
  });
  return success(c, { sent: true });
});

export default insights;
