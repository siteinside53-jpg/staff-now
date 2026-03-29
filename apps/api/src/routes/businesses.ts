import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { updateBusinessProfileSchema } from '@staffnow/validation';
import type { Env, AuthUser } from '../types';
import { requireAuth, requireRole } from '../middleware/auth';
import { checkSwipeLimit } from '../middleware/subscription';
import { success, error, paginated } from '../lib/response';
import { generateId } from '../lib/id';

const businesses = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// GET /me — business's own profile
businesses.get('/me', requireAuth, requireRole('business'), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const profile = await db
    .prepare('SELECT * FROM business_profiles WHERE user_id = ?')
    .bind(user.id)
    .first();

  if (!profile) {
    return error(c, 'Το προφίλ δεν βρέθηκε', 404);
  }

  // Get count of active jobs
  const jobCount = await db
    .prepare(
      "SELECT COUNT(*) as count FROM job_listings WHERE business_id = ? AND status = 'published'"
    )
    .bind(user.id)
    .first<{ count: number }>();

  return success(c, {
    profile,
    activeJobs: jobCount?.count || 0,
  });
});

// PATCH /me — update business profile
businesses.patch(
  '/me',
  requireAuth,
  requireRole('business'),
  zValidator('json', updateBusinessProfileSchema, (result, c) => {
    if (!result.success) {
      return error(c, 'Μη έγκυρα δεδομένα προφίλ', 400, result.error.flatten().fieldErrors);
    }
  }),
  async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const body = c.req.valid('json');

    const profile = await db
      .prepare('SELECT id FROM business_profiles WHERE user_id = ?')
      .bind(user.id)
      .first<{ id: string }>();

    if (!profile) {
      return error(c, 'Το προφίλ δεν βρέθηκε', 404);
    }

    const now = new Date().toISOString();
    const updateFields: string[] = [];
    const updateValues: (string | number | null)[] = [];

    const allowedFields = [
      'company_name',
      'description',
      'industry',
      'website',
      'phone',
      'logo_url',
      'cover_url',
      'region',
      'city',
      'country',
      'address',
      'company_size',
      'founded_year',
      'tax_id',
      'contact_name',
      'contact_email',
      'contact_phone',
    ];

    const fieldMap: Record<string, string> = {
      companyName: 'company_name',
      logoUrl: 'logo_url',
      coverUrl: 'cover_url',
      companySize: 'company_size',
      foundedYear: 'founded_year',
      taxId: 'tax_id',
      contactName: 'contact_name',
      contactEmail: 'contact_email',
      contactPhone: 'contact_phone',
    };

    for (const [key, value] of Object.entries(body)) {
      const dbField = fieldMap[key] || key;
      if (allowedFields.includes(dbField) && value !== undefined) {
        updateFields.push(`${dbField} = ?`);
        updateValues.push(value as string | number | null);
      }
    }

    // Recalculate profile completeness
    const fullProfile = await db
      .prepare('SELECT * FROM business_profiles WHERE id = ?')
      .bind(profile.id)
      .first();

    const fp = fullProfile as Record<string, unknown> | null;
    const completenessFields = [
      fp?.company_name,
      fp?.description,
      fp?.industry,
      fp?.phone,
      fp?.logo_url,
      fp?.region,
      fp?.country,
      fp?.company_size,
      fp?.contact_name,
      fp?.contact_email,
    ];

    // Merge current values with update
    const merged = { ...fp };
    for (const [key, value] of Object.entries(body)) {
      const dbField = fieldMap[key] || key;
      if (allowedFields.includes(dbField)) {
        merged[dbField] = value;
      }
    }

    const mergedCompletenessFields = [
      merged.company_name,
      merged.description,
      merged.industry,
      merged.phone,
      merged.logo_url,
      merged.region,
      merged.country,
      merged.company_size,
      merged.contact_name,
      merged.contact_email,
    ];

    const filledCount = mergedCompletenessFields.filter(
      (f) => f !== null && f !== undefined && f !== ''
    ).length;

    const completeness = Math.round((filledCount / mergedCompletenessFields.length) * 100);

    updateFields.push('profile_completeness = ?');
    updateValues.push(completeness);
    updateFields.push('updated_at = ?');
    updateValues.push(now);

    if (updateFields.length > 0) {
      updateValues.push(profile.id);
      await db
        .prepare(`UPDATE business_profiles SET ${updateFields.join(', ')} WHERE id = ?`)
        .bind(...updateValues)
        .run();
    }

    const updated = await db
      .prepare('SELECT * FROM business_profiles WHERE id = ?')
      .bind(profile.id)
      .first();

    return success(c, { profile: updated });
  }
);

// GET /discover — workers discover businesses
businesses.get('/discover', requireAuth, requireRole('worker'), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 50);
  const offset = (page - 1) * limit;

  // Filters
  const region = c.req.query('region');
  const industry = c.req.query('industry');
  const companySize = c.req.query('companySize');

  const conditions: string[] = ['u.status = ?', 'u.role = ?'];
  const params: (string | number)[] = ['active', 'business'];

  // Exclude already swiped businesses
  conditions.push(
    `bp.user_id NOT IN (SELECT target_id FROM swipes WHERE swiper_id = ? AND target_type = 'business')`
  );
  params.push(user.id);

  // Exclude blocked
  conditions.push(
    `bp.user_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)`
  );
  params.push(user.id);

  conditions.push(
    `bp.user_id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = ?)`
  );
  params.push(user.id);

  if (region) {
    conditions.push('bp.region = ?');
    params.push(region);
  }

  if (industry) {
    conditions.push('bp.industry = ?');
    params.push(industry);
  }

  if (companySize) {
    conditions.push('bp.company_size = ?');
    params.push(companySize);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await db
    .prepare(
      `SELECT COUNT(*) as total FROM business_profiles bp
       JOIN users u ON u.id = bp.user_id
       ${whereClause}`
    )
    .bind(...params)
    .first<{ total: number }>();

  const total = countResult?.total || 0;

  const results = await db
    .prepare(
      `SELECT bp.*, u.email, u.status as user_status,
         CASE WHEN sub.plan_id IN ('professional', 'enterprise') THEN 1 ELSE 0 END as is_premium,
         CASE WHEN bp.verified = 1 THEN 1 ELSE 0 END as is_verified,
         bp.profile_completeness
       FROM business_profiles bp
       JOIN users u ON u.id = bp.user_id
       LEFT JOIN subscriptions sub ON sub.user_id = u.id AND sub.status = 'active'
       ${whereClause}
       ORDER BY is_premium DESC, is_verified DESC, bp.profile_completeness DESC, bp.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .bind(...params, limit, offset)
    .all();

  // Get active job count for each business
  const businessesWithJobCount = await Promise.all(
    results.results.map(async (biz: Record<string, unknown>) => {
      const jobCount = await db
        .prepare(
          "SELECT COUNT(*) as count FROM job_listings WHERE business_id = ? AND status = 'published'"
        )
        .bind(biz.user_id as string)
        .first<{ count: number }>();

      return {
        ...biz,
        activeJobs: jobCount?.count || 0,
      };
    })
  );

  return paginated(c, businessesWithJobCount, total, page, limit);
});

// GET /:id — get business by ID
businesses.get('/:id', requireAuth, async (c) => {
  const businessId = c.req.param('id');
  const db = c.env.DB;

  const profile = await db
    .prepare(
      `SELECT bp.*, u.email, u.status as user_status
       FROM business_profiles bp
       JOIN users u ON u.id = bp.user_id
       WHERE bp.user_id = ? AND u.status = 'active'`
    )
    .bind(businessId)
    .first();

  if (!profile) {
    return error(c, 'Η επιχείρηση δεν βρέθηκε', 404);
  }

  const activeJobs = await db
    .prepare(
      "SELECT id, title, region, employment_type, salary_min, salary_max, created_at FROM job_listings WHERE business_id = ? AND status = 'published' ORDER BY created_at DESC LIMIT 10"
    )
    .bind(businessId)
    .all();

  return success(c, {
    profile,
    activeJobs: activeJobs.results,
  });
});

// POST /:id/like — worker likes a business
businesses.post('/:id/like', requireAuth, requireRole('worker'), checkSwipeLimit, async (c) => {
  const user = c.get('user');
  const targetId = c.req.param('id');
  const db = c.env.DB;
  const now = new Date().toISOString();

  // Check target exists
  const target = await db
    .prepare("SELECT id FROM users WHERE id = ? AND role = 'business' AND status = 'active'")
    .bind(targetId)
    .first();

  if (!target) {
    return error(c, 'Η επιχείρηση δεν βρέθηκε', 404);
  }

  // Check duplicate
  const existingSwipe = await db
    .prepare(
      "SELECT id FROM swipes WHERE swiper_id = ? AND target_id = ? AND target_type = 'business'"
    )
    .bind(user.id, targetId)
    .first();

  if (existingSwipe) {
    return error(c, 'Έχετε ήδη κάνει swipe σε αυτή την επιχείρηση', 409);
  }

  // Create swipe
  const swipeId = generateId();
  await db
    .prepare(
      `INSERT INTO swipes (id, swiper_id, target_id, target_type, direction, created_at)
       VALUES (?, ?, ?, 'business', 'like', ?)`
    )
    .bind(swipeId, user.id, targetId, now)
    .run();

  // Check for mutual match (business liked this worker)
  const mutualSwipe = await db
    .prepare(
      "SELECT id FROM swipes WHERE swiper_id = ? AND target_id = ? AND target_type = 'worker' AND direction = 'like'"
    )
    .bind(targetId, user.id)
    .first();

  let matched = false;
  let matchId: string | null = null;

  if (mutualSwipe) {
    matched = true;
    matchId = generateId();
    const conversationId = generateId();

    await db
      .prepare(
        `INSERT INTO matches (id, worker_id, business_id, status, created_at, updated_at)
         VALUES (?, ?, ?, 'active', ?, ?)`
      )
      .bind(matchId, user.id, targetId, now, now)
      .run();

    await db
      .prepare(
        `INSERT INTO conversations (id, match_id, created_at, updated_at)
         VALUES (?, ?, ?, ?)`
      )
      .bind(conversationId, matchId, now, now)
      .run();

    // Notify both parties
    await db
      .prepare(
        `INSERT INTO notifications (id, user_id, type, title, body, data, read, created_at, updated_at)
         VALUES (?, ?, 'match', ?, ?, ?, 0, ?, ?)`
      )
      .bind(
        generateId(),
        user.id,
        'Νέο ταίριασμα!',
        'Έχετε ένα νέο ταίριασμα με μια επιχείρηση. Ξεκινήστε τη συνομιλία!',
        JSON.stringify({ matchId, conversationId }),
        now,
        now
      )
      .run();

    await db
      .prepare(
        `INSERT INTO notifications (id, user_id, type, title, body, data, read, created_at, updated_at)
         VALUES (?, ?, 'match', ?, ?, ?, 0, ?, ?)`
      )
      .bind(
        generateId(),
        targetId,
        'Νέο ταίριασμα!',
        'Έχετε ένα νέο ταίριασμα με έναν εργαζόμενο. Ξεκινήστε τη συνομιλία!',
        JSON.stringify({ matchId, conversationId }),
        now,
        now
      )
      .run();
  }

  return success(c, { swiped: true, matched, matchId }, matched ? 201 : 200);
});

export default businesses;
