import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createJobSchema, updateJobSchema } from '@staffnow/validation';
import type { Env, AuthUser } from '../types';
import { requireAuth, requireRole } from '../middleware/auth';
import { checkSwipeLimit } from '../middleware/subscription';
import { success, error, paginated } from '../lib/response';
import { generateId } from '../lib/id';

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
    // Workers see only published jobs, excluding swiped
    conditions.push("j.status = 'published'");
    conditions.push(
      `j.id NOT IN (SELECT target_id FROM swipes WHERE swiper_id = ? AND target_type = 'job')`
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
      `SELECT DISTINCT j.*, bp.company_name, bp.logo_url, bp.verified as business_verified,
         CASE WHEN sub.plan_id IN ('professional', 'enterprise') THEN 1 ELSE 0 END as is_premium
       FROM job_listings j
       JOIN business_profiles bp ON bp.id = j.business_id
       LEFT JOIN subscriptions sub ON sub.user_id = bp.user_id AND sub.status = 'active'
       ${roleJoin}
       ${whereClause}
       ORDER BY is_premium DESC, j.created_at DESC
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

    await db
      .prepare(
        `INSERT INTO job_listings (id, business_id, title, description, region, city,
         employment_type, salary_min, salary_max, salary_type, housing_provided, meals_provided,
         status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)`
      )
      .bind(
        jobId,
        bp.id,
        body.title,
        body.description || '',
        body.region || null,
        body.city || null,
        body.employment_type || body.employmentType || 'seasonal',
        body.salary_min || body.minSalary || null,
        body.salary_max || body.maxSalary || null,
        'monthly',
        body.housing_provided || body.housingProvided ? 1 : 0,
        body.meals_provided || body.mealsProvided ? 1 : 0,
        now,
        now
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
  zValidator('json', updateJobSchema, (result, c) => {
    if (!result.success) {
      return error(c, 'Μη έγκυρα δεδομένα αγγελίας', 400, result.error.flatten().fieldErrors);
    }
  }),
  async (c) => {
    const user = c.get('user');
    const jobId = c.req.param('id');
    const db = c.env.DB;
    const body = c.req.valid('json');

    // Verify ownership
    const job = await db
      .prepare('SELECT id, business_id, status FROM job_listings WHERE id = ?')
      .bind(jobId)
      .first<{ id: string; business_id: string; status: string }>();

    if (!job) {
      return error(c, 'Η αγγελία δεν βρέθηκε', 404);
    }

    if (job.business_id !== user.id) {
      return error(c, 'Δεν έχετε δικαίωμα επεξεργασίας αυτής της αγγελίας', 403);
    }

    const now = new Date().toISOString();
    const updateFields: string[] = [];
    const updateValues: (string | number | null)[] = [];

    const allowedFields = [
      'title',
      'description',
      'region',
      'city',
      'country',
      'employment_type',
      'min_salary',
      'max_salary',
      'salary_currency',
      'housing_provided',
      'housing_details',
      'requirements',
      'benefits',
      'positions_available',
      'start_date',
    ];

    const fieldMap: Record<string, string> = {
      employmentType: 'employment_type',
      minSalary: 'min_salary',
      maxSalary: 'max_salary',
      salaryCurrency: 'salary_currency',
      housingProvided: 'housing_provided',
      housingDetails: 'housing_details',
      positionsAvailable: 'positions_available',
      startDate: 'start_date',
    };

    for (const [key, value] of Object.entries(body)) {
      if (key === 'roles') continue;
      const dbField = fieldMap[key] || key;
      if (allowedFields.includes(dbField) && value !== undefined) {
        if (dbField === 'housing_provided') {
          updateFields.push(`${dbField} = ?`);
          updateValues.push(value ? 1 : 0);
        } else {
          updateFields.push(`${dbField} = ?`);
          updateValues.push(value as string | number | null);
        }
      }
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

  if (job.business_id !== user.id) {
    return error(c, 'Δεν έχετε δικαίωμα δημοσίευσης αυτής της αγγελίας', 403);
  }

  if (job.status === 'published') {
    return error(c, 'Η αγγελία είναι ήδη δημοσιευμένη', 400);
  }

  if (job.status === 'archived') {
    return error(c, 'Δεν μπορείτε να δημοσιεύσετε μια αρχειοθετημένη αγγελία', 400);
  }

  const now = new Date().toISOString();
  await db
    .prepare("UPDATE job_listings SET status = 'published', published_at = ?, updated_at = ? WHERE id = ?")
    .bind(now, now, jobId)
    .run();

  return success(c, { published: true, jobId });
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

  if (!job) {
    return error(c, 'Η αγγελία δεν βρέθηκε', 404);
  }

  if (job.business_id !== user.id) {
    return error(c, 'Δεν έχετε δικαίωμα αρχειοθέτησης αυτής της αγγελίας', 403);
  }

  if (job.status === 'archived') {
    return error(c, 'Η αγγελία είναι ήδη αρχειοθετημένη', 400);
  }

  const now = new Date().toISOString();
  await db
    .prepare("UPDATE job_listings SET status = 'archived', updated_at = ? WHERE id = ?")
    .bind(now, jobId)
    .run();

  return success(c, { archived: true, jobId });
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
        `INSERT INTO conversations (id, match_id, created_at, updated_at)
         VALUES (?, ?, ?, ?)`
      )
      .bind(conversationId, matchId, now, now)
      .run();

    // Notify worker
    await db
      .prepare(
        `INSERT INTO notifications (id, user_id, type, title, body, data, created_at)
         VALUES (?, ?, 'new_match', ?, ?, ?, ?)`
      )
      .bind(
        generateId(),
        user.id,
        'Νέο ταίριασμα!',
        `Ταιριάξατε με μια αγγελία: ${job.title}`,
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
        'Νέο ταίριασμα!',
        `Ένας εργαζόμενος ταίριαξε με την αγγελία σας: ${job.title}`,
        JSON.stringify({ matchId, conversationId, jobId }),
        now
      )
      .run();
  }

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

  return success(c, { skipped: true });
});

export default jobs;
