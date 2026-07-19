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
import { errorHandler } from './middleware/error-handler';
import { rateLimiter } from './middleware/rate-limiter';
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
app.use('*', rateLimiter());
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
        db.prepare("SELECT COUNT(*) as c FROM swipes WHERE target_id = ? AND target_type = 'worker' AND direction = 'like'").bind(uid).first<{c:number}>(),
        db.prepare("SELECT COUNT(*) as c FROM swipes WHERE swiper_id = ? AND direction = 'like'").bind(uid).first<{c:number}>(),
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

// GET /public/workers — browse workers without auth (limited info)
app.get('/public/workers', async (c) => {
  const db = c.env.DB;
  const limit = Math.min(parseInt(c.req.query('limit') || '30', 10), 50);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  const results = await db
    .prepare(
      `SELECT wp.user_id, wp.full_name, wp.photo_url, wp.city, wp.region,
         wp.years_of_experience, wp.availability, wp.employment_type,
         wp.profile_completeness, wp.verified, wp.bio, wp.created_at
       FROM worker_profiles wp
       JOIN users u ON u.id = wp.user_id
       WHERE u.status = 'active' AND wp.is_visible = 1
       ORDER BY wp.updated_at DESC
       LIMIT ? OFFSET ?`
    )
    .bind(limit, offset)
    .all();

  // Get roles for each worker — anonymize full name for privacy
  const workers = [];
  for (const w of results.results as any[]) {
    const roles = await db
      .prepare('SELECT role FROM worker_profile_roles WHERE worker_profile_id = (SELECT id FROM worker_profiles WHERE user_id = ?)')
      .bind(w.user_id)
      .all();

    // Anonymize: "Μαρία Κωνσταντίνου" -> "Μαρία Κ."
    const fullName = (w.full_name || '').trim();
    const parts = fullName.split(/\s+/);
    const anonymizedName = parts.length > 1
      ? `${parts[0]} ${parts[1][0]}.`
      : (parts[0] || 'Εργαζόμενος');

    workers.push({
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
      roles: roles.results.map((r: any) => r.role),
    });
  }

  return c.json({ success: true, data: workers });
});

// GET /public/jobs — browse jobs without auth
app.get('/public/jobs', async (c) => {
  const db = c.env.DB;
  const limit = Math.min(parseInt(c.req.query('limit') || '30', 10), 50);

  const results = await db
    .prepare(
      `SELECT j.id, j.title, j.description, j.city, j.region, j.employment_type,
         j.salary_min, j.salary_max, j.salary_type, j.housing_provided, j.meals_provided,
         j.created_at,
         bp.company_name, bp.user_id as business_user_id,
         COALESCE(br.logo_url, bp.logo_url) as company_logo,
         COALESCE(NULLIF(br.name, ''), bp.company_name) as display_company_name,
         br.cover_photo_url as company_cover_photo
       FROM job_listings j
       LEFT JOIN business_profiles bp ON bp.id = j.business_id
       LEFT JOIN business_branches br ON br.user_id = bp.user_id
       WHERE j.status = 'published'
       ORDER BY j.created_at DESC
       LIMIT ?`
    )
    .bind(limit)
    .all();

  // Get roles for each job
  const jobs = [];
  for (const j of results.results as any[]) {
    const roles = await db
      .prepare('SELECT role FROM job_listing_roles WHERE job_listing_id = ?')
      .bind(j.id)
      .all();
    jobs.push({
      ...j,
      roles: roles.results.map((r: any) => r.role),
    });
  }

  return c.json({ success: true, data: jobs });
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
       WHERE j.business_id = ? AND j.status = 'published'
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
       WHERE j.status = 'published'
       ORDER BY j.created_at DESC LIMIT 10`
    ).all(),
    db.prepare(
      `SELECT
         (SELECT COUNT(*) FROM users WHERE status = 'active') as total_users,
         (SELECT COUNT(*) FROM worker_profiles wp JOIN users u ON u.id = wp.user_id
            WHERE u.status = 'active') as total_workers,
         (SELECT COUNT(*) FROM business_profiles bp JOIN users u ON u.id = bp.user_id
            WHERE u.status = 'active') as total_businesses,
         (SELECT COUNT(*) FROM job_listings WHERE status = 'published') as total_jobs,
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
    const firstName = (w.full_name || '').split(' ')[0] || 'Νέος';
    const role = w.roles ? w.roles.split(',')[0] : '';
    activity.push({
      id: `w_${w.created_at}`,
      type: 'signup',
      icon: '🆕',
      text: `${firstName} εγγράφηκε${role ? ` ως ${role}` : ''}`,
      location: w.city || undefined,
      photoUrl: w.photo_url || undefined,
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
async function scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
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
}

export default {
  fetch: app.fetch,
  scheduled,
};
