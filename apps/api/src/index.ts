import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import type { Env } from './types';
import authRoutes from './routes/auth';
import workerRoutes from './routes/workers';
import businessRoutes from './routes/businesses';
import jobRoutes from './routes/jobs';
import matchRoutes from './routes/matches';
import conversationRoutes from './routes/conversations';
import notificationRoutes from './routes/notifications';
import billingRoutes from './routes/billing';
import uploadRoutes from './routes/uploads';
import adminRoutes from './routes/admin';
import blogRoutes from './routes/blog';
import branchRoutes from './routes/branches';
import interestRoutes from './routes/interests';
import aiRoutes from './routes/ai';
import creditRoutes from './routes/credits';
import pushRoutes from './routes/push';
import hireRoutes from './routes/hires';
import callRoutes from './routes/calls';
import tasknowRoutes from './routes/tasknow';
import { WORKER_JOB_ROLE_LABELS_EL } from '@staffnow/config';
import { errorHandler } from './middleware/error-handler';
import { globalRateLimiter } from './middleware/rate-limiter';
import { requireAuth } from './middleware/auth';

const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use('*', secureHeaders({
  strictTransportSecurity: 'max-age=63072000; includeSubDomains; preload',
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
  crossOriginOpenerPolicy: 'same-origin',
  crossOriginResourcePolicy: 'cross-origin',
}));
app.use('*', async (c, next) => {
  const origin = c.env.CORS_ORIGIN;
  return cors({
    origin: origin.includes(',') ? origin.split(',') : origin,
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })(c, next);
});
// The admin dashboard fires ~7 parallel requests per page plus 30s polling,
// which trips the 60 req/60s global IP limiter. Admin routes are already
// gated by requireAuth + requireRole('admin'), so exempt them here.
// NOTE: never `return next()` from a middleware — Hono's `next()` resolves to
// the Context, not a Response, and returning it makes Hono build a Response
// from it (status is a method → RangeError → 500). Always `await next()`.
// Οι φωτογραφίες σερβίρονται κι αυτές από εδώ (/uploads/f/...). Μία σελίδα
// «Εύρεση» ζητάει δεκάδες εικόνες μαζί, οπότε αν μετρούσαν στο όριο των 120
// ανά λεπτό ο χρήστης θα μπλόκαρε πριν καν δει τη λίστα. Είναι απλή ανάγνωση
// από τον αποθηκευτικό χώρο, με cache ενός έτους — δεν θέλει προστασία ρυθμού.
/*
  ΤΟ /calls ΒΓΑΙΝΕΙ ΑΠΟ ΤΟ ΦΡΕΝΟ ΑΝΑ IP — και αυτός είναι ένας από τους λόγους
  που «άλλοτε χτυπάει και άλλοτε όχι».

  Το όριο είναι 120 αιτήματα το λεπτό ΑΝΑ ΔΙΕΥΘΥΝΣΗ ΔΙΚΤΥΟΥ, όχι ανά χρήστη.
  Την ώρα μιας κλήσης, μόνο ο καλών κάνει ~60 τον χρόνο (ρωτάει κάθε
  δευτερόλεπτο αν συνδέθηκε), συν ~35 από τη σελίδα μηνυμάτων. Ο παραλήπτης
  άλλα ~55. Δύο συσκευές στο ΙΔΙΟ WiFi έχουν ΜΙΑ διεύθυνση προς τα έξω, άρα
  αθροίζονται: ~150 το λεπτό, πάνω από το όριο.

  Μόλις το ξεπεράσουν, ο server αρχίζει να απορρίπτει — και η απόρριψη πέφτει
  και πάνω στο «με καλεί κανείς;». Ο browser την κατάπινε αμίλητα: καμία
  οθόνη, κανένα κουδούνισμα, κανένα μήνυμα λάθους. Το τηλέφωνο απλώς δεν
  χτυπούσε. Το ίδιο παθαίνουν και δύο χρήστες στο ίδιο δίκτυο κινητής, που
  μοιράζονται διεύθυνση χωρίς να το ξέρουν.

  Όλα τα endpoints των κλήσεων είναι ήδη πίσω από σύνδεση, οπότε δεν
  εκτίθεται τίποτα δημόσια.
*/
const globalRl = globalRateLimiter();
app.use('*', async (c, next) => {
  if (
    c.req.path.startsWith('/admin/') ||
    c.req.path.startsWith('/uploads/f/') ||
    c.req.path.startsWith('/calls')
  ) {
    await next();
    return;
  }
  return globalRl(c, next);
});
app.onError(errorHandler);

// Health check
app.get('/health', (c) =>
  c.json({ status: 'ok', timestamp: new Date().toISOString(), environment: c.env.ENVIRONMENT }),
);

// Routes
app.route('/auth', authRoutes);
app.route('/workers', workerRoutes);
app.route('/businesses', businessRoutes);
app.route('/jobs', jobRoutes);
app.route('/matches', matchRoutes);
app.route('/conversations', conversationRoutes);
app.route('/notifications', notificationRoutes);
app.route('/billing', billingRoutes);
app.route('/uploads', uploadRoutes);
app.route('/admin', adminRoutes);
app.route('/blog', blogRoutes);
app.route('/branches', branchRoutes);
app.route('/interests', interestRoutes);
app.route('/ai', aiRoutes);
app.route('/credits', creditRoutes);
app.route('/push', pushRoutes);
app.route('/hires', hireRoutes);
app.route('/calls', callRoutes);
app.route('/tasknow', tasknowRoutes);

// POST /activity/track — page-view / action ping from logged-in clients
app.post('/activity/track', requireAuth, async (c) => {
  const user = (c.get as any)('user');
  let body: any = {};
  try { body = await c.req.json(); } catch {}
  const type = typeof body.type === 'string' ? body.type.slice(0, 40) : 'page_view';
  const path = typeof body.path === 'string' ? body.path.slice(0, 200) : null;
  const meta = body.meta && typeof body.meta === 'object' ? body.meta : null;

  const { recordActivity, getRequestIp, getGeoFromRequest } = await import('./lib/activity');
  c.executionCtx.waitUntil(
    (async () => {
      await recordActivity(c.env, {
        userId: user.id,
        type,
        entityType: type === 'page_view' ? 'page' : null,
        entityId: path,
        metadata: meta,
        ip: getRequestIp(c),
        userAgent: c.req.header('User-Agent') || null,
        geo: getGeoFromRequest(c),
      });
      // Surface the current page on the active session so admin presence
      // panel can show "now on /dashboard/swipe".
      if (path && type === 'page_view') {
        try {
          await c.env.DB.prepare(
            `UPDATE user_sessions
               SET current_path = ?
             WHERE user_id = ? AND is_active = 1`,
          )
            .bind(path, user.id)
            .run();
        } catch {}
      }
    })(),
  );
  return c.json({ success: true });
});

// POST /activity/visitor-track — anonymous visitor heartbeat (no auth)
app.post('/activity/visitor-track', async (c) => {
  let body: any = {};
  try { body = await c.req.json(); } catch {}
  const visitorId = typeof body.visitorId === 'string' ? body.visitorId.slice(0, 80) : null;
  if (!visitorId || visitorId.length < 8) {
    return c.json({ success: false, error: { code: 'BAD_VISITOR' } }, 400);
  }

  const type = typeof body.type === 'string' ? body.type.slice(0, 30) : 'page_view';
  const path = typeof body.path === 'string' ? body.path.slice(0, 200) : null;
  const referrer = typeof body.referrer === 'string' ? body.referrer.slice(0, 300) : null;

  const { getRequestIp, getGeoFromRequest } = await import('./lib/activity');
  const ip = getRequestIp(c);
  const ua = c.req.header('User-Agent') || null;
  const geo = getGeoFromRequest(c);
  const now = new Date().toISOString();
  const db = c.env.DB;

  c.executionCtx.waitUntil(
    (async () => {
      const id = `aav_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      try {
        await db
          .prepare(
            `INSERT INTO anonymous_activity_log
              (id, visitor_id, activity_type, entity_id, ip_address, user_agent,
               country, city, region, timezone, referrer, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            id,
            visitorId,
            type,
            path,
            ip,
            ua,
            geo.country,
            geo.city,
            geo.region,
            geo.timezone,
            referrer,
            now,
          )
          .run();
      } catch {}

      // Upsert session row
      try {
        const existing = await db
          .prepare('SELECT visitor_id FROM anonymous_sessions WHERE visitor_id = ?')
          .bind(visitorId)
          .first();
        if (existing) {
          await db
            .prepare(
              `UPDATE anonymous_sessions
                 SET last_seen_at = ?, current_path = COALESCE(?, current_path),
                     page_views = page_views + ?,
                     country = COALESCE(country, ?),
                     city = COALESCE(city, ?),
                     region = COALESCE(region, ?),
                     timezone = COALESCE(timezone, ?),
                     ip_address = COALESCE(ip_address, ?),
                     user_agent = COALESCE(user_agent, ?)
               WHERE visitor_id = ?`,
            )
            .bind(
              now,
              path,
              type === 'page_view' ? 1 : 0,
              geo.country,
              geo.city,
              geo.region,
              geo.timezone,
              ip,
              ua,
              visitorId,
            )
            .run();
        } else {
          await db
            .prepare(
              `INSERT INTO anonymous_sessions
                (visitor_id, first_seen_at, last_seen_at, current_path, ip_address, user_agent,
                 country, city, region, timezone, page_views)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .bind(
              visitorId,
              now,
              now,
              path,
              ip,
              ua,
              geo.country,
              geo.city,
              geo.region,
              geo.timezone,
              type === 'page_view' ? 1 : 0,
            )
            .run();
        }
      } catch {}
    })(),
  );

  return c.json({ success: true });
});

// POST /contact — public contact form submission
app.post('/contact', async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: { code: 'INVALID_JSON', message: 'Invalid body' } }, 400);
  }
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 200) : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 320) : '';
  const subject = typeof body.subject === 'string' ? body.subject.trim().slice(0, 300) : '';
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 5000) : '';
  if (name.length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || subject.length < 3 || message.length < 10) {
    return c.json({ success: false, error: { code: 'VALIDATION', message: 'Συμπλήρωσε σωστά τα πεδία' } }, 400);
  }
  const db = c.env.DB;
  const now = new Date().toISOString();
  const id = `ct_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    await db
      .prepare(
        `INSERT INTO contact_messages (id, name, email, subject, message, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(id, name, email, subject, message, now)
      .run();
  } catch (err) {
    // Table might not exist yet; log so it's not lost
    console.error('[contact] could not persist, logging instead:', { id, name, email, subject, message, err });
  }
  return c.json({ success: true, data: { id } }, 201);
});

// POST /video/create-room — generate a video call room name
app.post('/video/create-room', requireAuth, async (c) => {
  const body = await c.req.json<{ conversationId: string }>();
  const roomName = `staffnow-${(body.conversationId || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}-${Date.now().toString(36)}`;

  return c.json({
    success: true,
    data: { roomName },
  });
});

// GET /stats/dashboard — aggregated stats for dashboard home
app.get('/stats/dashboard', requireAuth, async (c) => {
  const user = (c.get as any)('user');
  const db = c.env.DB;
  const uid = user.id;

  try {
    if (user.role === 'worker') {
      const [matchesR, unreadR, viewsR, pendingR] = await Promise.all([
        db.prepare("SELECT COUNT(*) as c FROM matches WHERE worker_id = ? AND status = 'active'").bind(uid).first<{c:number}>(),
        db.prepare("SELECT COUNT(*) as c FROM messages WHERE read_at IS NULL AND sender_id != ? AND conversation_id IN (SELECT id FROM conversations WHERE worker_id = ? AND status = 'active')").bind(uid, uid).first<{c:number}>(),
        db.prepare("SELECT COUNT(DISTINCT viewer_id) as c FROM profile_views WHERE worker_id = ?").bind(uid).first<{c:number}>(),
        db.prepare("SELECT COUNT(*) as c FROM swipes s JOIN job_listings jl ON jl.id = s.target_id JOIN business_profiles bp ON bp.id = jl.business_id WHERE s.swiper_id = ? AND s.target_type = 'job' AND s.direction = 'like' AND bp.user_id NOT IN (SELECT business_id FROM matches WHERE worker_id = ? AND status = 'active')").bind(uid, uid).first<{c:number}>(),
      ]);
      return c.json({ success: true, data: {
        total_matches: matchesR?.c || 0,
        unread_messages: unreadR?.c || 0,
        profile_views: viewsR?.c || 0,
        pending_interests: pendingR?.c || 0,
      }});
    } else {
      const [matchesR, unreadR, viewsR, jobsR, pendingR] = await Promise.all([
        db.prepare("SELECT COUNT(*) as c FROM matches WHERE business_id = ? AND status = 'active'").bind(uid).first<{c:number}>(),
        db.prepare("SELECT COUNT(*) as c FROM messages WHERE read_at IS NULL AND sender_id != ? AND conversation_id IN (SELECT id FROM conversations WHERE business_id = ? AND status = 'active')").bind(uid, uid).first<{c:number}>(),
        db.prepare("SELECT COUNT(*) as c FROM swipes s JOIN job_listings jl ON jl.id = s.target_id JOIN business_profiles bp ON bp.id = jl.business_id WHERE bp.user_id = ? AND s.target_type = 'job' AND s.direction = 'like'").bind(uid).first<{c:number}>(),
        db.prepare("SELECT COUNT(*) as c FROM job_listings jl JOIN business_profiles bp ON bp.id = jl.business_id WHERE bp.user_id = ? AND jl.status = 'published'").bind(uid).first<{c:number}>(),
        db.prepare("SELECT COUNT(*) as c FROM swipes s JOIN job_listings jl ON jl.id = s.target_id JOIN business_profiles bp ON bp.id = jl.business_id WHERE bp.user_id = ? AND s.target_type = 'job' AND s.direction = 'like' AND s.swiper_id NOT IN (SELECT worker_id FROM matches WHERE business_id = ? AND status = 'active')").bind(uid, uid).first<{c:number}>(),
      ]);
      return c.json({ success: true, data: {
        total_matches: matchesR?.c || 0,
        unread_messages: unreadR?.c || 0,
        profile_views: viewsR?.c || 0,
        active_jobs: jobsR?.c || 0,
        pending_interests: pendingR?.c || 0,
      }});
    }
  } catch (err) {
    console.error('Stats error:', err);
    return c.json({ success: true, data: { total_matches: 0, unread_messages: 0, profile_views: 0, pending_interests: 0, active_jobs: 0 }});
  }
});

// =====================================================================
// PUBLIC endpoints (no auth) — for guest mode mobile app browsing
// =====================================================================

// GET /public/plans — admin-editable plan catalogue (defaults + DB overrides)
// Used by the marketing /pricing page so price changes take effect immediately
// without a full Pages rebuild.
app.get('/public/plans', async (c) => {
  const { resolveAllPlans } = await import('./lib/plans');
  const items = await resolveAllPlans(c.env);
  return c.json({ success: true, data: { items } });
});

// GET /public/workers — browse workers without auth (limited info).
// Το όριο φτάνει τα 500: η /find-staff δείχνει το πλήθος των προφίλ που παίρνει,
// οπότε ένα χαμηλό cap έκανε τη σελίδα να λέει ψέματα («50» ενώ υπάρχουν 103).
// Οι ρόλοι έρχονται με ένα GROUP_CONCAT αντί για ένα query ανά εργαζόμενο.
// Σειρά: πρώτα όσοι έχουν συμπληρώσει όνομα ΚΑΙ ειδικότητα. Με σκέτο
// updated_at DESC οι 6 από τις 12 πρώτες κάρτες έβγαιναν «Εργαζόμενος —»,
// δηλαδή μια επιχείρηση έβλεπε μισή άδεια λίστα. Κανείς δεν κρύβεται:
// και οι 104 επιστρέφονται, απλώς τα κενά προφίλ πάνε στο τέλος.
app.get('/public/workers', async (c) => {
  const db = c.env.DB;
  const limit = Math.min(parseInt(c.req.query('limit') || '30', 10), 500);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  const results = await db
    .prepare(
      `SELECT wp.user_id, wp.full_name, wp.photo_url, wp.city, wp.region,
         wp.years_of_experience, wp.availability, wp.employment_type,
         wp.profile_completeness, wp.verified, wp.bio, wp.created_at,
         (SELECT GROUP_CONCAT(role) FROM worker_profile_roles
           WHERE worker_profile_id = wp.id) as roles_csv
       FROM worker_profiles wp
       JOIN users u ON u.id = wp.user_id
       WHERE u.status = 'active' AND wp.is_visible = 1
       ORDER BY
         CASE WHEN wp.full_name IS NOT NULL AND TRIM(wp.full_name) <> ''
                   AND EXISTS (SELECT 1 FROM worker_profile_roles
                                WHERE worker_profile_id = wp.id)
              THEN 0 ELSE 1 END,
         wp.updated_at DESC
       LIMIT ? OFFSET ?`
    )
    .bind(limit, offset)
    .all();

  const workers = (results.results as any[]).map((w) => {
    // Anonymize: "Μαρία Κωνσταντίνου" -> "Μαρία Κ."
    const parts = (w.full_name || '').trim().split(/\s+/).filter(Boolean);
    const anonymizedName = parts.length > 1
      ? `${parts[0]} ${parts[1][0]}.`
      : (parts[0] || 'Εργαζόμενος');

    return {
      user_id: w.user_id,
      full_name: anonymizedName,
      photo_url: w.photo_url,
      city: w.city,
      region: w.region,
      years_of_experience: w.years_of_experience,
      availability: w.availability,
      employment_type: w.employment_type,
      verified: w.verified,
      bio: w.bio,
      roles: w.roles_csv ? String(w.roles_csv).split(',') : [],
    };
  });

  return c.json({ success: true, data: workers });
});

// GET /public/jobs — browse jobs without auth.
// Μόνο μόνιμες αγγελίες: αυτό το endpoint τροφοδοτεί το generateStaticParams()
// και το sitemap του static export. Οι βάρδιες λήγουν σε ώρες και θα παρήγαγαν
// νεκρές στατικές σελίδες. Για βάρδιες υπάρχει το /public/shifts.
app.get('/public/jobs', async (c) => {
  const db = c.env.DB;
  const limit = Math.min(parseInt(c.req.query('limit') || '30', 10), 500);

  const results = await db
    .prepare(
      // Οι πέντε παροχές στέλνονται όλες. Πριν έφευγαν μόνο διαμονή και γεύματα,
      // οπότε η εικόνα που βγαίνει στο Facebook δεν μπορούσε να δείξει μεταφορά,
      // bonus ή ασφάλιση — και στις 12 ζωντανές αγγελίες αυτά τα τρία υπάρχουν
      // (2, 5 και 7 αγγελίες αντίστοιχα).
      `SELECT j.id, j.title, j.description, j.city, j.region, j.employment_type,
         j.salary_min, j.salary_max, j.salary_type,
         j.housing_provided, j.meals_provided, j.transport_provided,
         j.bonus_provided, j.insurance_provided,
         j.created_at,
         bp.company_name, bp.user_id as business_user_id,
         COALESCE(br.logo_url, bp.logo_url) as company_logo,
         COALESCE(NULLIF(br.name, ''), bp.company_name) as display_company_name,
         br.cover_photo_url as company_cover_photo,
         (SELECT GROUP_CONCAT(role) FROM job_listing_roles
           WHERE job_listing_id = j.id) as roles_csv
       FROM job_listings j
       LEFT JOIN business_profiles bp ON bp.id = j.business_id
       LEFT JOIN business_branches br ON br.user_id = bp.user_id
       WHERE j.status = 'published' AND j.listing_kind = 'job'
       ORDER BY j.created_at DESC
       LIMIT ?`
    )
    .bind(limit)
    .all();

  const jobs = (results.results as any[]).map(({ roles_csv, ...j }) => ({
    ...j,
    roles: roles_csv ? String(roles_csv).split(',') : [],
  }));

  return c.json({ success: true, data: jobs });
});

// GET /public/shifts — έκτακτες βάρδιες που δεν έχουν ξεκινήσει ακόμα.
// Το shift_start_utc είναι σε μορφή D1 ('YYYY-MM-DD HH:MM:SS' σε UTC), οπότε
// συγκρίνεται απευθείας με datetime('now').
app.get('/public/shifts', async (c) => {
  const db = c.env.DB;
  const limit = Math.min(parseInt(c.req.query('limit') || '6', 10), 20);

  const results = await db
    .prepare(
      `SELECT j.id, j.title, j.city, j.region, j.hours_per_day,
         j.salary_min, j.salary_type,
         j.shift_date, j.shift_days, j.shift_start_time, j.shift_end_time,
         j.shift_positions, j.shift_start_utc,
         bp.company_name, bp.user_id as business_user_id,
         COALESCE(br.logo_url, bp.logo_url) as company_logo,
         COALESCE(NULLIF(br.name, ''), bp.company_name) as display_company_name,
         COALESCE(br.city, j.city) as display_city,
         (SELECT GROUP_CONCAT(role) FROM job_listing_roles WHERE job_listing_id = j.id) as roles_csv
       FROM job_listings j
       LEFT JOIN business_profiles bp ON bp.id = j.business_id
       LEFT JOIN business_branches br ON br.user_id = bp.user_id
       WHERE j.status = 'published' AND j.listing_kind = 'shift'
         AND j.shift_start_utc > datetime('now')
       ORDER BY j.shift_start_utc ASC
       LIMIT ?`
    )
    .bind(limit)
    .all();

  const shifts = (results.results as any[]).map(({ roles_csv, ...s }) => ({
    ...s,
    roles: roles_csv ? String(roles_csv).split(',') : [],
  }));

  return c.json({ success: true, data: shifts });
});

// GET /public/businesses — browse businesses without auth (for workers)
app.get('/public/businesses', async (c) => {
  const db = c.env.DB;
  const limit = Math.min(parseInt(c.req.query('limit') || '30', 10), 50);

  const results = await db
    .prepare(
      `SELECT bp.user_id, bp.company_name, bp.business_type, bp.region, bp.address,
         bp.description, bp.logo_url, bp.verified, bp.created_at,
         br.name as branch_name, br.logo_url as branch_logo, br.cover_photo_url,
         br.city, br.phone, br.website, br.description as branch_desc,
         br.business_type as branch_type, br.google_business_url,
         br.staff_housing, br.meals_provided, br.transportation_assistance,
         br.bonus_provided, br.insurance_provided, br.operating_hours,
         (SELECT COUNT(*) FROM job_listings j WHERE j.business_id = bp.id AND j.status = 'published') as open_jobs
       FROM business_profiles bp
       LEFT JOIN business_branches br ON br.user_id = bp.user_id
       JOIN users u ON u.id = bp.user_id
       WHERE u.status = 'active'
       ORDER BY bp.created_at DESC
       LIMIT ?`
    )
    .bind(limit)
    .all();

  // Enrich each business with the roles from their open job listings + job cities
  const businesses = [];
  for (const b of results.results as any[]) {
    // Get all roles from the business's published jobs
    const jobRoles = await db
      .prepare(
        `SELECT DISTINCT r.role FROM job_listing_roles r
         JOIN job_listings j ON j.id = r.job_listing_id
         WHERE j.business_id = (SELECT id FROM business_profiles WHERE user_id = ?)
         AND j.status = 'published'`
      )
      .bind(b.user_id)
      .all();

    // Get all cities from published jobs
    const jobCities = await db
      .prepare(
        `SELECT DISTINCT city FROM job_listings
         WHERE business_id = (SELECT id FROM business_profiles WHERE user_id = ?)
         AND status = 'published' AND city IS NOT NULL AND city != ''`
      )
      .bind(b.user_id)
      .all();

    businesses.push({
      userId: b.user_id,
      companyName: b.branch_name || b.company_name || 'Επιχείρηση',
      businessType: b.branch_type || b.business_type || 'other',
      city: b.city || b.region || '',
      region: b.region || '',
      address: b.address || '',
      description: b.branch_desc || b.description || '',
      logoUrl: b.branch_logo || b.logo_url || null,
      coverPhotoUrl: b.cover_photo_url || null,
      verified: b.verified === 1,
      openJobs: b.open_jobs || 0,
      website: b.website || null,
      googleBusinessUrl: b.google_business_url || null,
      phone: null, // hidden for guests
      staffHousing: b.staff_housing,
      mealsProvided: b.meals_provided,
      transportAssistance: b.transportation_assistance,
      bonusProvided: b.bonus_provided,
      insuranceProvided: b.insurance_provided,
      operatingHours: b.operating_hours,
      createdAt: b.created_at,
      // NEW: roles that this business is hiring for + cities of their jobs
      hiringRoles: jobRoles.results.map((r: any) => r.role),
      jobCities: jobCities.results.map((c: any) => c.city),
    });
  }

  return c.json({ success: true, data: businesses });
});

// GET /public/businesses/:id/jobs — get open jobs for a business
app.get('/public/businesses/:id/jobs', async (c) => {
  const bizUserId = c.req.param('id');
  const db = c.env.DB;

  const bp = await db
    .prepare('SELECT id FROM business_profiles WHERE user_id = ?')
    .bind(bizUserId)
    .first<{ id: string }>();

  if (!bp) return c.json({ success: true, data: [] });

  const jobs = await db
    .prepare(
      `SELECT j.id, j.title, j.city, j.region, j.employment_type,
         j.salary_min, j.salary_max, j.salary_type,
         j.housing_provided, j.meals_provided, j.transport_provided,
         j.bonus_provided, j.insurance_provided,
         j.created_at, j.status
       FROM job_listings j
       WHERE j.business_id = ? AND j.status = 'published' AND j.listing_kind = 'job'
       ORDER BY j.created_at DESC`
    )
    .bind(bp.id)
    .all();

  // Get roles for each job
  const jobsWithRoles = [];
  for (const j of jobs.results as any[]) {
    const roles = await db
      .prepare('SELECT role FROM job_listing_roles WHERE job_listing_id = ?')
      .bind(j.id)
      .all();
    jobsWithRoles.push({
      ...j,
      roles: roles.results.map((r: any) => r.role),
    });
  }

  return c.json({ success: true, data: jobsWithRoles });
});

// GET /public/activity — live activity feed (recent signups, matches, etc.)
app.get('/public/activity', async (c) => {
  const db = c.env.DB;

  const [recentWorkers, recentJobs, stats] = await Promise.all([
    db.prepare(
      `SELECT wp.full_name, wp.photo_url, wp.city, wp.created_at,
         (SELECT GROUP_CONCAT(role) FROM worker_profile_roles WHERE worker_profile_id = wp.id) as roles
       FROM worker_profiles wp
       JOIN users u ON u.id = wp.user_id
       WHERE u.status = 'active' AND wp.is_visible = 1
       ORDER BY wp.created_at DESC LIMIT 10`
    ).all(),
    db.prepare(
      `SELECT j.title, j.city, bp.company_name, j.created_at
       FROM job_listings j
       LEFT JOIN business_profiles bp ON bp.id = j.business_id
       WHERE j.status = 'published' AND j.listing_kind = 'job'
       ORDER BY j.created_at DESC LIMIT 10`
    ).all(),
    db.prepare(
      `SELECT
         (SELECT COUNT(*) FROM users WHERE status = 'active') as total_users,
         -- Ίδια κριτήρια με τη λίστα της /find-staff (is_visible = 1), αλλιώς ο
         -- μεγάλος αριθμός στην κορυφή έλεγε 104 ενώ από κάτω φαίνονταν 103.
         (SELECT COUNT(*) FROM worker_profiles wp JOIN users u ON u.id = wp.user_id
            WHERE u.status = 'active' AND wp.is_visible = 1) as total_workers,
         (SELECT COUNT(*) FROM business_profiles bp JOIN users u ON u.id = bp.user_id
            WHERE u.status = 'active') as total_businesses,
         -- Ίδια κριτήρια με τη λίστα της /find-job: οι έκτακτες βάρδιες δεν
         -- είναι αγγελίες και δεν εμφανίζονται εκεί, άρα δεν μετράνε ούτε εδώ.
         (SELECT COUNT(*) FROM job_listings
            WHERE status = 'published' AND listing_kind = 'job') as total_jobs,
         (SELECT COUNT(*) FROM matches) as total_matches,
         (
           (SELECT COUNT(*) FROM anonymous_sessions
             WHERE datetime(last_seen_at) > datetime('now','-40 seconds'))
           +
           (SELECT COUNT(*) FROM user_sessions
             WHERE is_active = 1 AND datetime(last_activity_at) > datetime('now','-40 seconds'))
         ) as online_now`
    ).first(),
  ]);

  // Build activity feed
  const activity: any[] = [];

  for (const w of recentWorkers.results as any[]) {
    const roleSlug = w.roles ? w.roles.split(',')[0] : '';
    const roleLabel = roleSlug ? (WORKER_JOB_ROLE_LABELS_EL[roleSlug] || '') : '';

    // ΧΩΡΙΣ ΟΝΟΜΑ ΚΑΙ ΧΩΡΙΣ ΦΩΤΟΓΡΑΦΙΑ.
    //
    // Αυτή η διαδρομή είναι ΔΗΜΟΣΙΑ — απαντά χωρίς σύνδεση, σε οποιονδήποτε στο
    // internet. Έβγαζε μικρό όνομα, ειδικότητα, πόλη ΚΑΙ τη διεύθυνση της
    // πραγματικής φωτογραφίας προφίλ: «Μαρία-Βαλασία εγγράφηκε ως Δάσκαλος /
    // Παιδαγωγός · Θεσσαλονίκη» μαζί με το πορτρέτο της.
    //
    // Κανείς δεν έδωσε τέτοια συγκατάθεση κάνοντας εγγραφή για να βρει δουλειά.
    // Ένας άνθρωπος που ψάχνει εργασία μπορεί να μη θέλει να ξέρει ο εργοδότης
    // του ότι ψάχνει — και εδώ το ανακοινώναμε δημόσια, με φωτογραφία.
    //
    // Η αίσθηση «ζωντανό» δεν χρειάζεται ταυτότητα: αρκεί το γεγονός, η
    // ειδικότητα και η πόλη.
    activity.push({
      id: `w_${w.created_at}`,
      type: 'signup',
      icon: '🆕',
      text: roleLabel ? `Νέος εργαζόμενος: ${roleLabel}` : 'Νέος εργαζόμενος εγγράφηκε',
      location: w.city || undefined,
      createdAt: w.created_at,
    });
  }

  for (const j of recentJobs.results as any[]) {
    activity.push({
      id: `j_${j.created_at}`,
      type: 'job',
      icon: '💼',
      text: `Νέα αγγελία: ${j.title}`,
      location: j.city || undefined,
      company: j.company_name || undefined,
      createdAt: j.created_at,
    });
  }

  // Sort by date desc
  activity.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return c.json({
    success: true,
    data: {
      activity: activity.slice(0, 20),
      stats: {
        totalUsers: (stats as any)?.total_users || 0,
        totalWorkers: (stats as any)?.total_workers || 0,
        totalBusinesses: (stats as any)?.total_businesses || 0,
        totalJobs: (stats as any)?.total_jobs || 0,
        totalMatches: (stats as any)?.total_matches || 0,
        onlineNow: (stats as any)?.online_now || 0,
      },
    },
  });
});

// 404 handler
app.notFound((c) =>
  c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } }, 404),
);

// =====================================================================
// Scheduled (cron) handler.
// Configured in wrangler.toml under [triggers] crons = ["15 3 * * *"].
// Runs daily and:
//   - downgrades subscriptions whose grace period expired,
//   - marks manual-bank-transfer orders past `expires_at` as expired.
// =====================================================================
/** Πρέπει να ταιριάζει με το πρώτο cron του wrangler.toml. */
const DAILY_CRON = '15 3 * * *';

async function scheduled(event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
  // Ωριαίο: αρχειοθέτηση βαρδιών που έχουν ήδη ξεκινήσει. Απαραίτητο — μια
  // ληγμένη βάρδια που μένει 'published' κρατάει για πάντα θέση στο όριο
  // αγγελιών του πλάνου και κλειδώνει μια δωρεάν επιχείρηση στη μία αγγελία.
  try {
    const res = await env.DB.prepare(
      `UPDATE job_listings
          SET status = 'archived', updated_at = datetime('now')
        WHERE listing_kind = 'shift' AND status = 'published'
          AND shift_start_utc IS NOT NULL AND shift_start_utc <= datetime('now')`,
    ).run();
    console.log('[cron] archived started shifts:', (res.meta as any)?.changes ?? 0);
  } catch (err) {
    console.error('[cron] shift archive failed', err);
  }

  /*
    Ωριαίο δίχτυ ασφαλείας για τις κλήσεις.

    Ο καθαρισμός γίνεται ήδη μέσα στα ίδια τα αιτήματα κλήσης, και εκεί είναι
    που μετράει. Αυτό εδώ πιάνει την περίπτωση που κανείς δεν ξανακάλεσε ποτέ:
    δύο άνθρωποι μίλησαν, η κλήση κόπηκε άσχημα, και δεν ξαναμπήκαν για μέρες.
    Χωρίς αυτό, η νεκρή γραμμή κάθεται στη βάση και το μόνο που την έσβηνε
    ήταν χειροκίνητη επέμβαση.

    Τα όρια είναι ΠΙΟ ΧΑΛΑΡΑ από αυτά των αιτημάτων επίτηδες: εδώ δεν θέλουμε
    να κόψουμε τίποτα ζωντανό, μόνο να μαζέψουμε τα σκουπίδια.
  */
  try {
    const res = await env.DB.prepare(
      `UPDATE calls
          SET status = 'ended', end_reason = 'failed',
              ended_at = datetime('now'), updated_at = datetime('now')
        WHERE (status = 'ringing'  AND created_at < datetime('now', '-5 minutes'))
           OR (status = 'accepted' AND updated_at < datetime('now', '-30 minutes'))`,
    ).run();
    const closed = (res.meta as any)?.changes ?? 0;
    if (closed) console.log('[cron] closed stuck calls:', closed);
    // Τα «χειραψίας» κείμενα τελειωμένων κλήσεων δεν χρειάζονται πια.
    await env.DB.prepare(
      `DELETE FROM call_candidates
        WHERE call_id IN (SELECT id FROM calls WHERE status = 'ended')`,
    ).run();
  } catch (err) {
    console.error('[cron] call cleanup failed', err);
  }

  // Τα υπόλοιπα (billing) τρέχουν μόνο μία φορά την ημέρα.
  if (event.cron && event.cron !== DAILY_CRON) return;

  try {
    const { downgradeExpiredSubscriptions } = await import('./lib/billing');
    const r = await downgradeExpiredSubscriptions(env);
    console.log('[cron] downgraded subscriptions:', r.downgraded);
  } catch (err) {
    console.error('[cron] downgrade failed', err);
  }
  try {
    const res = await env.DB.prepare(
      `UPDATE manual_bank_transfers
          SET status = 'expired', updated_at = datetime('now')
        WHERE status = 'pending' AND expires_at < datetime('now')`,
    ).run();
    console.log('[cron] expired manual transfers:', (res.meta as any)?.changes ?? 0);
  } catch (err) {
    console.error('[cron] manual-transfer expiry failed', err);
  }

  // Βήμα 4 της πρόσληψης: 15 μέρες μετά την επιβεβαίωση, θύμισε και στους δύο
  // να αξιολογήσουν. ΜΙΑ φορά ανά πρόσληψη (το `reminded_at` το κλειδώνει), και
  // μόνο σε όποιον δεν έχει ήδη γράψει.
  try {
    const { notifyUser } = await import('./lib/notify');
    const { generateId } = await import('./lib/id');
    const due = await env.DB.prepare(
      `SELECT h.id, h.worker_id, h.business_id, h.conversation_id
         FROM hires h
        WHERE h.status = 'confirmed'
          AND h.reminded_at IS NULL
          AND h.rating_opens_at IS NOT NULL
          AND h.rating_opens_at <= datetime('now')
        LIMIT 200`,
    ).all<{ id: string; worker_id: string; business_id: string; conversation_id: string | null }>();

    const now = new Date().toISOString();
    for (const h of due.results || []) {
      // Πάει στην αρχική του πίνακα ελέγχου: εκεί το κουτάκι «Χρειάζονται την
      // προσοχή σου» ανοίγει τη φόρμα με ένα πάτημα. Μέσα στη συνομιλία έπρεπε
      // να βρεις το σωστό μήνυμα-κάρτα για να τη δεις.
      const url = '/dashboard';
      const rated = await env.DB.prepare('SELECT rater_id FROM hire_ratings WHERE hire_id = ?')
        .bind(h.id)
        .all<{ rater_id: string }>();
      const done = new Set((rated.results || []).map((r) => r.rater_id));
      const title = '⭐ Πώς πήγε;';
      const body = 'Πέρασαν 15 μέρες. Γράψε την αξιολόγησή σου — τη βλέπει μόνο αφού γράψει και ο άλλος.';
      for (const userId of [h.worker_id, h.business_id]) {
        if (done.has(userId)) continue;
        await env.DB.prepare(
          "INSERT INTO notifications (id, user_id, type, title, body, data, created_at) VALUES (?, ?, 'system', ?, ?, ?, ?)",
        )
          .bind(generateId('nt'), userId, title, body, JSON.stringify({ subtype: 'rating_due', url, hireId: h.id }), now)
          .run();
        await notifyUser(env, { userId, title, body, url, ctaText: 'Αξιολόγηση' });
      }
      await env.DB.prepare('UPDATE hires SET reminded_at = ? WHERE id = ?').bind(now, h.id).run();
    }
    console.log('[cron] rating reminders:', (due.results || []).length);
  } catch (err) {
    console.error('[cron] rating reminders failed', err);
  }

  // «Έγινε πρόσληψη;» — 2 μέρες μετά το τελευταίο μήνυμα, μία φορά ανά πλευρά.
  //
  // Πρώτα ρωτάμε την επιχείρηση (αυτή ξέρει). Τον εργαζόμενο μόνο αν η
  // επιχείρηση δεν κάνει τίποτα για άλλες 3 μέρες — αν είχε κάνει κάτι, η
  // συνομιλία δεν θα ήταν πια υποψήφια και δεν θα εμφανιζόταν καν εδώ.
  //
  // ⚠️ Σημειώνουμε «στάλθηκε» ΠΡΙΝ στείλουμε, σε αντίθεση με την υπενθύμιση
  // αξιολόγησης από πάνω. Αν το cron σκάσει στη μέση της λίστας, το χειρότερο
  // σενάριο γίνεται «δεν στάλθηκε ένα email» αντί για «στάλθηκε ξανά αύριο».
  try {
    const { notifyUser } = await import('./lib/notify');
    const { generateId } = await import('./lib/id');
    const { promptsDueForEmail, markEmailed } = await import('./lib/hire-prompts');

    let sent = 0;
    for (const side of ['business', 'worker'] as const) {
      const rows = await promptsDueForEmail(env.DB, side);
      for (const p of rows) {
        const userId = side === 'business' ? p.business_id : p.worker_id;
        const otherName =
          (side === 'business' ? p.worker_name : p.business_name) || 'τον χρήστη';
        const url = `/dashboard/messages?c=${p.conversation_id}`;
        const title = '🤝 Έγινε η πρόσληψη;';
        const body =
          side === 'business'
            ? `Μιλήσατε με ${otherName} και έκτοτε ησυχία. Αν τον/την προσέλαβες, δήλωσέ το με ένα πάτημα — κλείνει η θέση και ανοίγει η αξιολόγηση.`
            : `Μιλήσατε με ${otherName} και έκτοτε ησυχία. Αν σε προσέλαβαν, δήλωσέ το με ένα πάτημα — μετράει στο προφίλ σου.`;

        // Πρώτα το σημειώνουμε, μετά στέλνουμε. Σκόπιμα με αυτή τη σειρά.
        await markEmailed(env.DB, p.conversation_id, side);

        await env.DB.prepare(
          "INSERT INTO notifications (id, user_id, type, title, body, data, created_at) VALUES (?, ?, 'system', ?, ?, ?, ?)",
        )
          .bind(
            generateId('nt'),
            userId,
            title,
            body,
            JSON.stringify({ subtype: 'hire_prompt', url, conversationId: p.conversation_id }),
            new Date().toISOString(),
          )
          .run();

        await notifyUser(env, {
          userId,
          title,
          body,
          url,
          ctaText: 'Δήλωσε την πρόσληψη',
          emailCategory: 'hire_prompt',
          // Φρένο μιας εβδομάδας: ακόμη κι αν κάτι πάει στραβά παραπάνω, ο ίδιος
          // χρήστης δεν παίρνει δεύτερο τέτοιο email μέσα στην ίδια εβδομάδα.
          emailCooldownMinutes: 7 * 24 * 60,
        });
        sent++;
      }
    }
    console.log('[cron] hire prompts emailed:', sent);
  } catch (err) {
    console.error('[cron] hire prompts failed', err);
  }
}

export default {
  fetch: app.fetch,
  scheduled,
};
