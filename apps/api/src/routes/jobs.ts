import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createJobSchema, updateJobSchema } from '@staffnow/validation';
import type { Env, AuthUser } from '../types';
import { requireAuth, requireRole } from '../middleware/auth';
import { checkSwipeLimit, checkJobListingLimit, checkActiveMatchesLimit, hasFeature } from '../middleware/subscription';
import { PLANS } from '@staffnow/config';
import { success, error, paginated } from '../lib/response';
import { generateId } from '../lib/id';
import { recordActivity, getRequestIp, getGeoFromRequest, recordDataChange, computeDiff } from '../lib/activity';

const jobs = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// GET / — list published jobs with filters
jobs.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 50);
  const offset = (page - 1) * limit;

  // Filters
  const region = c.req.query('region');
  const role = c.req.query('role');
  const employmentType = c.req.query('employmentType');
  const minSalary = c.req.query('minSalary');
  const maxSalary = c.req.query('maxSalary');
  const housingProvided = c.req.query('housingProvided');
  const search = c.req.query('search');

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (user.role === 'business') {
    // Business sees their own jobs (all statuses)
    const bp = await db.prepare('SELECT id FROM business_profiles WHERE user_id = ?').bind(user.id).first<{ id: string }>();
    if (bp) {
      conditions.push('j.business_id = ?');
      params.push(bp.id);
    }
  } else {
    // Workers see published jobs, exclude matched ones
    conditions.push("j.status = 'published'");
    conditions.push(
      `j.business_id NOT IN (SELECT bp2.id FROM business_profiles bp2 JOIN matches mt ON mt.business_id = bp2.user_id WHERE mt.worker_id = ? AND mt.status = 'active')`
    );
    params.push(user.id);
  }

  if (region) {
    conditions.push('j.region = ?');
    params.push(region);
  }

  if (employmentType) {
    conditions.push('j.employment_type = ?');
    params.push(employmentType);
  }

  if (minSalary) {
    conditions.push('j.salary_max >= ?');
    params.push(parseInt(minSalary, 10));
  }

  if (maxSalary) {
    conditions.push('j.salary_min <= ?');
    params.push(parseInt(maxSalary, 10));
  }

  if (housingProvided) {
    conditions.push('j.housing_provided = ?');
    params.push(housingProvided === 'true' ? 1 : 0);
  }

  if (search) {
    conditions.push("(j.title LIKE ? OR j.description LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  let roleJoin = '';
  if (role) {
    roleJoin = 'JOIN job_listing_roles jr ON jr.job_listing_id = j.id';
    conditions.push('jr.role = ?');
    params.push(role);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count total
  const countResult = await db
    .prepare(
      `SELECT COUNT(DISTINCT j.id) as total
       FROM job_listings j
       ${roleJoin}
       ${whereClause}`
    )
    .bind(...params)
    .first<{ total: number }>();

  const total = countResult?.total || 0;

  // Get jobs
  const results = await db
    .prepare(
      `SELECT DISTINCT j.*, bp.company_name,
         COALESCE(br.logo_url, bp.logo_url) as company_logo,
         br.cover_photo_url as company_cover_photo,
         COALESCE(NULLIF(br.name, ''), bp.company_name) as display_company_name,
         COALESCE(br.address, bp.address) as company_address,
         COALESCE(br.city, j.city) as display_city,
         COALESCE(br.region, j.region, bp.region) as display_region,
         br.postal_code as company_postal_code,
         br.area as company_area,
         bp.user_id as business_user_id,
         br.staff_housing as branch_housing,
         br.meals_provided as branch_meals,
         br.transportation_assistance as branch_transport,
         br.description as branch_description,
         br.business_type as branch_business_type,
         br.phone as branch_phone,
         br.website as branch_website,
         bp.verified as business_verified,
         CASE WHEN sub.plan_id IN ('business_pro', 'business_elite', 'founding_pro') THEN 1 ELSE 0 END as is_premium,
         CASE WHEN active_boost.id IS NOT NULL THEN 1 ELSE 0 END as is_boosted,
         (SELECT direction FROM swipes WHERE swiper_id = '${user.id}' AND target_id = j.id AND target_type = 'job' LIMIT 1) as swipe_status,
         (SELECT COUNT(*) FROM matches WHERE worker_id = '${user.id}' AND business_id = bp.user_id AND status = 'active') as is_matched
       FROM job_listings j
       JOIN business_profiles bp ON bp.id = j.business_id
       LEFT JOIN business_branches br ON br.user_id = bp.user_id
       LEFT JOIN subscriptions sub ON sub.user_id = bp.user_id AND sub.status = 'active'
       LEFT JOIN (
         SELECT job_id, id FROM job_boosts WHERE expires_at > datetime('now')
       ) active_boost ON active_boost.job_id = j.id
       ${roleJoin}
       ${whereClause}
       ORDER BY is_boosted DESC, is_premium DESC, j.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .bind(...params, limit, offset)
    .all();

  // Fetch roles for each job
  const jobsWithRoles = await Promise.all(
    results.results.map(async (job: Record<string, unknown>) => {
      const jobRoles = await db
        .prepare('SELECT role FROM job_listing_roles WHERE job_listing_id = ?')
        .bind(job.id as string)
        .all();

      return {
        ...job,
        roles: jobRoles.results.map((r: { role: string }) => r.role),
      };
    })
  );

  return paginated(c, jobsWithRoles, total, page, limit);
});

// GET /favorites/list — list saved jobs (MUST be before /:id routes)
jobs.get('/favorites/list', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const results = await db.prepare(
    `SELECT f.id as fav_id, f.created_at as saved_at, j.*, bp.company_name,
       COALESCE(br.logo_url, bp.logo_url) as company_logo,
       COALESCE(NULLIF(br.name, ''), bp.company_name) as display_company_name,
       bp.user_id as business_user_id
     FROM favorites f
     JOIN job_listings j ON j.id = f.target_id
     JOIN business_profiles bp ON bp.id = j.business_id
     LEFT JOIN business_branches br ON br.user_id = bp.user_id
     WHERE f.user_id = ? AND f.target_type = 'job' AND j.status = 'published'
     ORDER BY f.created_at DESC LIMIT 50`
  ).bind(user.id).all();

  return success(c, results.results);
});

// POST / — create a new job (business only)
jobs.post(
  '/',
  requireAuth,
  requireRole('business'),
  zValidator('json', createJobSchema, (result, c) => {
    if (!result.success) {
      return error(c, 'Μη έγκυρα δεδομένα αγγελίας', 400, result.error.flatten().fieldErrors);
    }
  }),
  async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const body = c.req.valid('json');
    const now = new Date().toISOString();
    const jobId = generateId('jl');

    // Get business profile ID
    const bp = await db
      .prepare('SELECT id FROM business_profiles WHERE user_id = ?')
      .bind(user.id)
      .first<{ id: string }>();

    if (!bp) {
      return error(c, 'Δεν βρέθηκε προφίλ επιχείρησης', 404);
    }

    // ── Plan limit: max active job listings ───────────────────────────────
    const limit = await checkJobListingLimit(db, user.id);
    if (!limit.allowed) {
      const planNameEl = limit.planId ? (PLANS as any)[limit.planId]?.nameEl : 'Δωρεάν';
      const nextPlan =
        limit.planId === 'business_basic'
          ? 'Pro (10 αγγελίες)'
          : limit.planId === 'business_pro' || limit.planId === 'founding_pro'
            ? 'Elite (απεριόριστες)'
            : 'Starter (3 αγγελίες)';
      return c.json(
        {
          success: false,
          error: {
            code: 'JOB_LIMIT_REACHED',
            message: `Έφτασες το όριο των ${limit.max} αγγελιών στο πλάνο "${planNameEl}". Αναβάθμιση σε ${nextPlan}.`,
            details: { used: limit.used, max: limit.max, planId: limit.planId },
          },
        },
        403,
      );
    }

    await db
      .prepare(
        `INSERT INTO job_listings (
          id, business_id, title, description, region, city, address, postal_code,
          requires_relocation, employment_type, salary_min, salary_max, salary_type, salary_gross,
          housing_provided, meals_provided, transport_provided, bonus_provided, insurance_provided, no_benefits,
          hours_per_day, days_per_week, has_day_off, day_off_description, shift_type,
          experience_required, requires_drivers_license, requires_physical_fitness, requires_communication_skills,
          languages, start_date, end_date, status, branch_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?)`
      )
      .bind(
        jobId, bp.id,
        body.title, body.description || '',
        body.region || null, body.city || null, body.address || null, body.postal_code || null,
        body.requires_relocation ? 1 : 0,
        body.employment_type || body.employmentType || 'seasonal',
        body.salary_min || body.salaryMin || null,
        body.salary_max || body.salaryMax || null,
        body.salary_type || body.salaryType || 'monthly',
        body.salary_gross !== false ? 1 : 0,
        body.housing_provided || body.housingProvided ? 1 : 0,
        body.meals_provided || body.mealsProvided ? 1 : 0,
        body.transport_provided ? 1 : 0,
        body.bonus_provided ? 1 : 0,
        body.insurance_provided ? 1 : 0,
        body.no_benefits ? 1 : 0,
        body.hours_per_day || null, body.days_per_week || null,
        body.has_day_off ? 1 : 0, body.day_off_description || null,
        body.shift_type || null,
        body.experience_required || null,
        body.requires_drivers_license ? 1 : 0,
        body.requires_physical_fitness ? 1 : 0,
        body.requires_communication_skills ? 1 : 0,
        body.languages ? JSON.stringify(body.languages) : null,
        body.start_date || body.startDate || null,
        body.end_date || body.endDate || null,
        body.branch_id || null,
        now, now
      )
      .run();

    // Insert job roles
    if (body.roles && Array.isArray(body.roles)) {
      for (const roleName of body.roles) {
        await db
          .prepare(
            'INSERT INTO job_listing_roles (id, job_listing_id, role) VALUES (?, ?, ?)'
          )
          .bind(generateId(), jobId, roleName)
          .run();
      }
    }

    const job = await db
      .prepare('SELECT * FROM job_listings WHERE id = ?')
      .bind(jobId)
      .first();

    const jobRoles = await db
      .prepare('SELECT role FROM job_listing_roles WHERE job_listing_id = ?')
      .bind(jobId)
      .all();

    const ip = getRequestIp(c);
    const ua = c.req.header('User-Agent') || null;
    const geo = getGeoFromRequest(c);
    c.executionCtx.waitUntil(
      (async () => {
        await recordActivity(c.env, {
          userId: user.id,
          type: 'job_post',
          entityType: 'job',
          entityId: jobId,
          metadata: { title: body.title },
          ip,
          userAgent: ua,
          geo,
        });
        await recordDataChange(c.env, {
          actorUserId: user.id,
          actorRole: user.role,
          actorEmail: user.email,
          action: 'job_create',
          entityType: 'job_listing',
          entityId: jobId,
          entityOwnerId: user.id,
          metadata: { snapshot: job },
          ip,
          userAgent: ua,
          geo,
        });
      })(),
    );

    return success(
      c,
      {
        job,
        roles: jobRoles.results.map((r: { role: string }) => r.role),
      },
      201
    );
  }
);

// GET /:id — get job by ID
jobs.get('/:id', requireAuth, async (c) => {
  const jobId = c.req.param('id');
  const db = c.env.DB;

  const job = await db
    .prepare(
      `SELECT j.*, bp.company_name, bp.logo_url, bp.verified as business_verified,
         bp.region as business_region, bp.description as business_description
       FROM job_listings j
       JOIN business_profiles bp ON bp.id = j.business_id
       WHERE j.id = ?`
    )
    .bind(jobId)
    .first();

  if (!job) {
    return error(c, 'Η αγγελία δεν βρέθηκε', 404);
  }

  const roles = await db
    .prepare('SELECT role FROM job_listing_roles WHERE job_listing_id = ?')
    .bind(jobId)
    .all();

  return success(c, {
    job,
    roles: roles.results.map((r: { role: string }) => r.role),
  });
});

// PATCH /:id — update job (verify ownership)
jobs.patch(
  '/:id',
  requireAuth,
  requireRole('business'),
  async (c) => {
    const user = c.get('user');
    const jobId = c.req.param('id');
    const db = c.env.DB;
    const body = await c.req.json() as Record<string, unknown>;

    // Verify ownership
    const job = await db
      .prepare('SELECT id, business_id, status FROM job_listings WHERE id = ?')
      .bind(jobId)
      .first<{ id: string; business_id: string; status: string }>();

    if (!job) {
      return error(c, 'Η αγγελία δεν βρέθηκε', 404);
    }

    // Check ownership: job.business_id is business_profile_id, need to verify user owns it
    const ownsJob = await db.prepare(
      'SELECT id FROM business_profiles WHERE id = ? AND user_id = ?'
    ).bind(job.business_id, user.id).first();
    if (!ownsJob) {
      return error(c, 'Δεν έχετε δικαίωμα επεξεργασίας αυτής της αγγελίας', 403);
    }

    // Snapshot before for diff
    const beforeJob = await db
      .prepare('SELECT * FROM job_listings WHERE id = ?')
      .bind(jobId)
      .first<any>();

    const now = new Date().toISOString();
    const updateFields: string[] = [];
    const updateValues: (string | number | null)[] = [];

    const allowedFields = [
      'title', 'description', 'region', 'city', 'address', 'postal_code',
      'requires_relocation', 'employment_type',
      'salary_min', 'salary_max', 'salary_type', 'salary_gross',
      'housing_provided', 'meals_provided', 'transport_provided',
      'bonus_provided', 'insurance_provided', 'no_benefits',
      'hours_per_day', 'days_per_week', 'has_day_off', 'day_off_description', 'shift_type',
      'experience_required', 'requires_drivers_license', 'requires_physical_fitness',
      'requires_communication_skills', 'languages',
      'start_date', 'end_date', 'branch_id',
    ];

    const booleanFields = [
      'requires_relocation', 'salary_gross', 'housing_provided', 'meals_provided',
      'transport_provided', 'bonus_provided', 'insurance_provided', 'no_benefits',
      'has_day_off', 'requires_drivers_license', 'requires_physical_fitness',
      'requires_communication_skills',
    ];

    const fieldMap: Record<string, string> = {
      employmentType: 'employment_type',
      salaryMin: 'salary_min',
      salaryMax: 'salary_max',
      salaryType: 'salary_type',
      housingProvided: 'housing_provided',
      mealsProvided: 'meals_provided',
      startDate: 'start_date',
      endDate: 'end_date',
    };

    for (const [key, value] of Object.entries(body)) {
      if (key === 'roles' || key === 'languages') continue;
      const dbField = fieldMap[key] || key;
      if (allowedFields.includes(dbField) && value !== undefined) {
        if (booleanFields.includes(dbField)) {
          updateFields.push(`${dbField} = ?`);
          updateValues.push(value ? 1 : 0);
        } else {
          updateFields.push(`${dbField} = ?`);
          updateValues.push(value as string | number | null);
        }
      }
    }

    // Handle languages (JSON serialization)
    if (body.languages !== undefined) {
      updateFields.push('languages = ?');
      updateValues.push(body.languages ? JSON.stringify(body.languages) : null);
    }

    // Update roles if provided
    if (body.roles && Array.isArray(body.roles)) {
      await db
        .prepare('DELETE FROM job_listing_roles WHERE job_listing_id = ?')
        .bind(jobId)
        .run();

      for (const roleName of body.roles) {
        await db
          .prepare(
            'INSERT INTO job_listing_roles (id, job_listing_id, role) VALUES (?, ?, ?)'
          )
          .bind(generateId(), jobId, roleName)
          .run();
      }
    }

    updateFields.push('updated_at = ?');
    updateValues.push(now);

    if (updateFields.length > 0) {
      updateValues.push(jobId);
      await db
        .prepare(`UPDATE job_listings SET ${updateFields.join(', ')} WHERE id = ?`)
        .bind(...updateValues)
        .run();
    }

    const updated = await db
      .prepare('SELECT * FROM job_listings WHERE id = ?')
      .bind(jobId)
      .first();

    const updatedRoles = await db
      .prepare('SELECT role FROM job_listing_roles WHERE job_listing_id = ?')
      .bind(jobId)
      .all();

    const diff = computeDiff(beforeJob, updated as any, ['updated_at']);
    if (Object.keys(diff).length > 0) {
      c.executionCtx.waitUntil(
        recordDataChange(c.env, {
          actorUserId: user.id,
          actorRole: user.role,
          actorEmail: user.email,
          action: 'job_update',
          entityType: 'job_listing',
          entityId: jobId,
          entityOwnerId: user.id,
          fieldChanges: diff,
          ip: getRequestIp(c),
          userAgent: c.req.header('User-Agent') || null,
          geo: getGeoFromRequest(c),
        }),
      );
    }

    return success(c, {
      job: updated,
      roles: updatedRoles.results.map((r: { role: string }) => r.role),
    });
  }
);

// POST /:id/publish — publish a draft job
jobs.post('/:id/publish', requireAuth, requireRole('business'), async (c) => {
  const user = c.get('user');
  const jobId = c.req.param('id');
  const db = c.env.DB;

  const job = await db
    .prepare('SELECT id, business_id, status, title FROM job_listings WHERE id = ?')
    .bind(jobId)
    .first<{ id: string; business_id: string; status: string; title: string }>();

  if (!job) {
    return error(c, 'Η αγγελία δεν βρέθηκε', 404);
  }

  const ownsThisJob = await db.prepare('SELECT id FROM business_profiles WHERE id = ? AND user_id = ?').bind(job.business_id, user.id).first();
  if (!ownsThisJob) {
    return error(c, 'Δεν έχετε δικαίωμα δημοσίευσης αυτής της αγγελίας', 403);
  }

  if (job.status === 'published') {
    return error(c, 'Η αγγελία είναι ήδη δημοσιευμένη', 400);
  }

  // Plan limit check — only when transitioning from a non-counted status
  // (draft / archived / filled) to published. paused → published doesn't
  // change the active count.
  if (job.status !== 'paused') {
    const limit = await checkJobListingLimit(db, user.id);
    if (!limit.allowed) {
      const planNameEl = limit.planId ? (PLANS as any)[limit.planId]?.nameEl : 'Δωρεάν';
      const nextPlan =
        limit.planId === 'business_basic'
          ? 'Pro (10 αγγελίες)'
          : limit.planId === 'business_pro' || limit.planId === 'founding_pro'
            ? 'Elite (απεριόριστες)'
            : 'Starter (3 αγγελίες)';
      return c.json(
        {
          success: false,
          error: {
            code: 'JOB_LIMIT_REACHED',
            message: `Έφτασες το όριο των ${limit.max} αγγελιών στο πλάνο "${planNameEl}". Αναβάθμιση σε ${nextPlan}.`,
            details: { used: limit.used, max: limit.max, planId: limit.planId },
          },
        },
        403,
      );
    }
  }

  const now = new Date().toISOString();
  await db
    .prepare("UPDATE job_listings SET status = 'published', updated_at = ? WHERE id = ?")
    .bind(now, jobId)
    .run();

  return success(c, { published: true, jobId });
});

// POST /:id/pause — pause a published job (hide from workers)
jobs.post('/:id/pause', requireAuth, requireRole('business'), async (c) => {
  const user = c.get('user');
  const jobId = c.req.param('id');
  const db = c.env.DB;

  const job = await db
    .prepare('SELECT id, business_id, status FROM job_listings WHERE id = ?')
    .bind(jobId)
    .first<{ id: string; business_id: string; status: string }>();

  if (!job) return error(c, 'Η αγγελία δεν βρέθηκε', 404);

  const ownsJob = await db.prepare('SELECT id FROM business_profiles WHERE id = ? AND user_id = ?').bind(job.business_id, user.id).first();
  if (!ownsJob) return error(c, 'Δεν έχετε δικαίωμα', 403);

  if (job.status !== 'published') return error(c, 'Μόνο ενεργές αγγελίες μπορούν να παυθούν', 400);

  const now = new Date().toISOString();
  await db
    .prepare("UPDATE job_listings SET status = 'paused', updated_at = ? WHERE id = ?")
    .bind(now, jobId)
    .run();

  return success(c, { paused: true, jobId });
});

// POST /:id/boost — boost a job for 7 days (Pro+ plans only, costs 5 credits)
jobs.post('/:id/boost', requireAuth, requireRole('business'), async (c) => {
  const user = c.get('user');
  const jobId = c.req.param('id');
  const db = c.env.DB;

  // 1. Plan gate
  if (!(await hasFeature(db, user.id, 'boostedVisibility'))) {
    return c.json(
      {
        success: false,
        error: {
          code: 'BOOST_LOCKED',
          message: 'Το Boost είναι διαθέσιμο από το πλάνο Pro και πάνω.',
        },
      },
      403,
    );
  }

  // 2. Verify ownership
  const job = await db
    .prepare('SELECT id, business_id, status FROM job_listings WHERE id = ?')
    .bind(jobId)
    .first<{ id: string; business_id: string; status: string }>();
  if (!job) return error(c, 'Η αγγελία δεν βρέθηκε', 404);
  const ownsJob = await db
    .prepare('SELECT id FROM business_profiles WHERE id = ? AND user_id = ?')
    .bind(job.business_id, user.id)
    .first();
  if (!ownsJob) return error(c, 'Δεν έχετε δικαίωμα boost αυτής της αγγελίας', 403);

  // 3. Check if already boosted (active boost, not expired)
  const existing = await db
    .prepare("SELECT id, expires_at FROM job_boosts WHERE job_id = ? AND expires_at > datetime('now') ORDER BY expires_at DESC LIMIT 1")
    .bind(jobId)
    .first<{ id: string; expires_at: string }>();
  if (existing) {
    return c.json(
      {
        success: false,
        error: {
          code: 'ALREADY_BOOSTED',
          message: `Η αγγελία είναι ήδη boosted μέχρι ${new Date(existing.expires_at).toLocaleDateString('el-GR')}.`,
          details: { expires_at: existing.expires_at },
        },
      },
      409,
    );
  }

  // 4. Deduct credits (5 credits per boost)
  const COST = 5;
  const creditRow = await db
    .prepare('SELECT balance FROM credits WHERE user_id = ?')
    .bind(user.id)
    .first<{ balance: number }>();
  if (!creditRow || creditRow.balance < COST) {
    return c.json(
      {
        success: false,
        error: {
          code: 'INSUFFICIENT_CREDITS',
          message: `Χρειάζεσαι ${COST} credits για boost. Έχεις ${creditRow?.balance ?? 0}. Αγόρασε credits πρώτα.`,
          details: { required: COST, current: creditRow?.balance ?? 0 },
        },
      },
      402,
    );
  }

  const now = new Date().toISOString();
  // Boost lasts 7 days from purchase
  const expiresAt = new Date(Date.now() + 7 * 86_400_000).toISOString();
  const boostId = generateId('jb');

  await db
    .prepare(
      'UPDATE credits SET balance = balance - ?, total_spent = total_spent + ?, updated_at = ? WHERE user_id = ?',
    )
    .bind(COST, COST, now, user.id)
    .run();
  await db
    .prepare(
      `INSERT INTO credit_transactions (id, user_id, amount, type, description, reference_id, reference_type, created_at)
       VALUES (?, ?, ?, 'spend', 'Boost αγγελίας (7 ημέρες)', ?, 'job_boost', ?)`,
    )
    .bind(generateId('ctx'), user.id, -COST, jobId, now)
    .run();
  await db
    .prepare(
      `INSERT INTO job_boosts (id, job_id, business_user_id, starts_at, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(boostId, jobId, user.id, now, expiresAt, now)
    .run();

  return success(c, {
    boosted: true,
    boostId,
    expiresAt,
    creditsRemaining: creditRow.balance - COST,
  });
});

// POST /:id/resume — resume a paused job
jobs.post('/:id/resume', requireAuth, requireRole('business'), async (c) => {
  const user = c.get('user');
  const jobId = c.req.param('id');
  const db = c.env.DB;

  const job = await db
    .prepare('SELECT id, business_id, status FROM job_listings WHERE id = ?')
    .bind(jobId)
    .first<{ id: string; business_id: string; status: string }>();

  if (!job) return error(c, 'Η αγγελία δεν βρέθηκε', 404);

  const ownsJob = await db.prepare('SELECT id FROM business_profiles WHERE id = ? AND user_id = ?').bind(job.business_id, user.id).first();
  if (!ownsJob) return error(c, 'Δεν έχετε δικαίωμα', 403);

  if (job.status !== 'paused') return error(c, 'Μόνο αγγελίες σε παύση μπορούν να επανεκκινηθούν', 400);

  const now = new Date().toISOString();
  await db
    .prepare("UPDATE job_listings SET status = 'published', updated_at = ? WHERE id = ?")
    .bind(now, jobId)
    .run();

  return success(c, { resumed: true, jobId });
});

// POST /:id/archive — archive a job
jobs.post('/:id/archive', requireAuth, requireRole('business'), async (c) => {
  const user = c.get('user');
  const jobId = c.req.param('id');
  const db = c.env.DB;

  const job = await db
    .prepare('SELECT id, business_id, status FROM job_listings WHERE id = ?')
    .bind(jobId)
    .first<{ id: string; business_id: string; status: string }>();

  if (!job) return error(c, 'Η αγγελία δεν βρέθηκε', 404);

  const ownsThisJob = await db.prepare('SELECT id FROM business_profiles WHERE id = ? AND user_id = ?').bind(job.business_id, user.id).first();
  if (!ownsThisJob) return error(c, 'Δεν έχετε δικαίωμα αρχειοθέτησης αυτής της αγγελίας', 403);

  if (job.status === 'archived') return error(c, 'Η αγγελία είναι ήδη αρχειοθετημένη', 400);

  const now = new Date().toISOString();
  await db
    .prepare("UPDATE job_listings SET status = 'archived', updated_at = ? WHERE id = ?")
    .bind(now, jobId)
    .run();

  return success(c, { archived: true, jobId });
});

// DELETE /:id — permanently delete a job
jobs.delete('/:id', requireAuth, requireRole('business'), async (c) => {
  const user = c.get('user');
  const jobId = c.req.param('id');
  const db = c.env.DB;

  const job = await db
    .prepare('SELECT id, business_id FROM job_listings WHERE id = ?')
    .bind(jobId)
    .first<{ id: string; business_id: string }>();

  if (!job) return error(c, 'Η αγγελία δεν βρέθηκε', 404);

  const ownsJob = await db.prepare('SELECT id FROM business_profiles WHERE id = ? AND user_id = ?').bind(job.business_id, user.id).first();
  if (!ownsJob) return error(c, 'Δεν έχετε δικαίωμα διαγραφής', 403);

  // Snapshot before delete
  const snapshot = await db
    .prepare('SELECT * FROM job_listings WHERE id = ?')
    .bind(jobId)
    .first<any>();

  // Delete roles first
  await db.prepare('DELETE FROM job_listing_roles WHERE job_listing_id = ?').bind(jobId).run();
  // Delete the job
  await db.prepare('DELETE FROM job_listings WHERE id = ?').bind(jobId).run();

  c.executionCtx.waitUntil(
    recordDataChange(c.env, {
      actorUserId: user.id,
      actorRole: user.role,
      actorEmail: user.email,
      action: 'job_delete',
      entityType: 'job_listing',
      entityId: jobId,
      entityOwnerId: user.id,
      metadata: { snapshot },
      ip: getRequestIp(c),
      userAgent: c.req.header('User-Agent') || null,
      geo: getGeoFromRequest(c),
    }),
  );

  return success(c, { deleted: true, jobId });
});

// POST /:id/like — worker likes a job (mutual matching with business)
jobs.post('/:id/like', requireAuth, requireRole('worker'), async (c) => {
  const user = c.get('user');
  const jobId = c.req.param('id');
  const db = c.env.DB;
  const now = new Date().toISOString();

  // Get job and verify it's published
  const job = await db
    .prepare("SELECT id, business_id, title FROM job_listings WHERE id = ? AND status = 'published'")
    .bind(jobId)
    .first<{ id: string; business_id: string; title: string }>();

  if (!job) {
    return error(c, 'Η αγγελία δεν βρέθηκε', 404);
  }

  // Check duplicate swipe
  const existingSwipe = await db
    .prepare(
      "SELECT id FROM swipes WHERE swiper_id = ? AND target_id = ? AND target_type = 'job'"
    )
    .bind(user.id, jobId)
    .first();

  if (existingSwipe) {
    return error(c, 'Έχετε ήδη κάνει swipe σε αυτή την αγγελία', 409);
  }

  // Get business user_id from business_profile (early - needed for both notification + match check)
  const bizProfileEarly = await db
    .prepare('SELECT user_id FROM business_profiles WHERE id = ?')
    .bind(job.business_id)
    .first<{ user_id: string }>();
  const bizUserIdEarly = bizProfileEarly?.user_id || job.business_id;

  // Get worker name for notification
  const workerInfo = await db.prepare('SELECT full_name FROM worker_profiles WHERE user_id = ?').bind(user.id).first<{ full_name: string }>();
  const workerName = workerInfo?.full_name || 'Νέος υποψήφιος';

  // Notify business about interest
  await db.prepare(
    `INSERT INTO notifications (id, user_id, type, title, body, data, created_at)
     VALUES (?, ?, 'system', ?, ?, ?, ?)`
  ).bind(generateId(), bizUserIdEarly, `❤️ ${workerName} ενδιαφέρθηκε για την αγγελία σου`, job.title, JSON.stringify({ jobId, workerId: user.id }), now).run();

  // Create swipe
  await db
    .prepare(
      `INSERT INTO swipes (id, swiper_id, target_id, target_type, direction, created_at)
       VALUES (?, ?, ?, 'job', 'like', ?)`
    )
    .bind(generateId(), user.id, jobId, now)
    .run();

  // Get business user_id from business_profile
  const bizProfile = await db
    .prepare('SELECT user_id FROM business_profiles WHERE id = ?')
    .bind(job.business_id)
    .first<{ user_id: string }>();

  const bizUserId = bizProfile?.user_id || job.business_id;

  // Check for mutual match: business liked this worker
  const mutualSwipe = await db
    .prepare(
      "SELECT id FROM swipes WHERE swiper_id = ? AND target_id = ? AND target_type = 'worker' AND direction = 'like'"
    )
    .bind(bizUserId, user.id)
    .first();

  let matched = false;
  let matchId: string | null = null;

  if (mutualSwipe) {
    // Enforce business plan's active matches cap (the cap belongs to the
    // business side; the worker just expressed interest).
    const cap = await checkActiveMatchesLimit(db, bizUserId);
    if (!cap.allowed) {
      return success(c, {
        matched: false,
        atCap: true,
        message: 'Η επιχείρηση έχει φτάσει το όριο matches. Δοκίμασε ξανά σύντομα.',
      });
    }

    matched = true;
    matchId = generateId();
    const conversationId = generateId();

    await db
      .prepare(
        `INSERT INTO matches (id, worker_id, business_id, job_id, status, matched_at)
         VALUES (?, ?, ?, ?, 'active', ?)`
      )
      .bind(matchId, user.id, bizUserId, jobId, now)
      .run();

    await db
      .prepare(
        `INSERT INTO conversations (id, match_id, worker_id, business_id, status, created_at)
         VALUES (?, ?, ?, ?, 'active', ?)`
      )
      .bind(conversationId, matchId, user.id, bizUserId, now)
      .run();

    // Get names for notifications
    const workerInfo = await db.prepare('SELECT full_name FROM worker_profiles WHERE user_id = ?').bind(user.id).first<{ full_name: string }>();
    const bizInfo = await db.prepare('SELECT company_name FROM business_profiles WHERE user_id = ?').bind(bizUserId).first<{ company_name: string }>();
    const workerName = workerInfo?.full_name || 'εργαζόμενο';
    const bizName = bizInfo?.company_name || 'επιχείρηση';

    // Notify worker
    await db
      .prepare(
        `INSERT INTO notifications (id, user_id, type, title, body, data, created_at)
         VALUES (?, ?, 'new_match', ?, ?, ?, ?)`
      )
      .bind(
        generateId(),
        user.id,
        `🎉 Νέο match με ${bizName}`,
        `Ταιριάξατε για την αγγελία: ${job.title}`,
        JSON.stringify({ matchId, conversationId, jobId }),
        now
      )
      .run();

    // Notify business
    await db
      .prepare(
        `INSERT INTO notifications (id, user_id, type, title, body, data, created_at)
         VALUES (?, ?, 'new_match', ?, ?, ?, ?)`
      )
      .bind(
        generateId(),
        bizUserId,
        `🎉 Νέο match με τον/την ${workerName}`,
        `Ταιριάξατε για την αγγελία: ${job.title}`,
        JSON.stringify({ matchId, conversationId, jobId }),
        now
      )
      .run();
  }

  // Activity log: swipe like (+ match if applicable)
  const swipeIp = getRequestIp(c);
  const swipeUa = c.req.header('User-Agent') || null;
  const swipeGeo = getGeoFromRequest(c);
  c.executionCtx.waitUntil(
    (async () => {
      await recordActivity(c.env, {
        userId: user.id,
        type: 'swipe_like',
        entityType: 'job',
        entityId: jobId,
        metadata: { jobTitle: job.title },
        ip: swipeIp,
        userAgent: swipeUa,
        geo: swipeGeo,
      });
      if (matched) {
        await Promise.all([
          recordActivity(c.env, {
            userId: user.id,
            type: 'match',
            entityType: 'match',
            entityId: matchId,
            metadata: { jobId, jobTitle: job.title },
            geo: swipeGeo,
          }),
          recordActivity(c.env, {
            userId: bizUserId,
            type: 'match',
            entityType: 'match',
            entityId: matchId,
            metadata: { jobId, jobTitle: job.title },
          }),
        ]);
      }
    })(),
  );

  return success(c, { swiped: true, matched, matchId }, matched ? 201 : 200);
});

// POST /:id/skip — worker skips a job
jobs.post('/:id/skip', requireAuth, requireRole('worker'), async (c) => {
  const user = c.get('user');
  const jobId = c.req.param('id');
  const db = c.env.DB;
  const now = new Date().toISOString();

  const job = await db
    .prepare("SELECT id FROM job_listings WHERE id = ? AND status = 'published'")
    .bind(jobId)
    .first();

  if (!job) {
    return error(c, 'Η αγγελία δεν βρέθηκε', 404);
  }

  const existing = await db
    .prepare(
      "SELECT id FROM swipes WHERE swiper_id = ? AND target_id = ? AND target_type = 'job'"
    )
    .bind(user.id, jobId)
    .first();

  if (existing) {
    return error(c, 'Έχετε ήδη κάνει swipe σε αυτή την αγγελία', 409);
  }

  await db
    .prepare(
      `INSERT INTO swipes (id, swiper_id, target_id, target_type, direction, created_at)
       VALUES (?, ?, ?, 'job', 'skip', ?)`
    )
    .bind(generateId(), user.id, jobId, now)
    .run();

  c.executionCtx.waitUntil(
    recordActivity(c.env, {
      userId: user.id,
      type: 'swipe_skip',
      entityType: 'job',
      entityId: jobId,
      ip: getRequestIp(c),
      userAgent: c.req.header('User-Agent') || null,
      geo: getGeoFromRequest(c),
    }),
  );

  return success(c, { skipped: true });
});

// POST /:id/favorite — save a job to favorites
jobs.post('/:id/favorite', requireAuth, async (c) => {
  const user = c.get('user');
  const jobId = c.req.param('id');
  const db = c.env.DB;
  const now = new Date().toISOString();

  const existing = await db.prepare("SELECT id FROM favorites WHERE user_id = ? AND target_id = ? AND target_type = 'job'").bind(user.id, jobId).first();
  if (existing) return success(c, { favorited: true });

  await db.prepare("INSERT INTO favorites (id, user_id, target_id, target_type, created_at) VALUES (?, ?, ?, 'job', ?)").bind(generateId(), user.id, jobId, now).run();
  return success(c, { favorited: true }, 201);
});

// DELETE /:id/favorite — remove job from favorites
jobs.delete('/:id/favorite', requireAuth, async (c) => {
  const user = c.get('user');
  const jobId = c.req.param('id');
  const db = c.env.DB;

  await db.prepare("DELETE FROM favorites WHERE user_id = ? AND target_id = ? AND target_type = 'job'").bind(user.id, jobId).run();
  return success(c, { unfavorited: true });
});

export default jobs;
