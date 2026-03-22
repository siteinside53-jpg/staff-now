import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { updateWorkerProfileSchema } from '@staffnow/validation';
import type { Env, AuthUser } from '../types';
import { requireAuth, requireRole } from '../middleware/auth';
import { checkSwipeLimit } from '../middleware/subscription';
import { success, error, paginated } from '../lib/response';
import { generateId } from '../lib/id';

const workers = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// GET /me — worker's own profile with roles and languages
workers.get('/me', requireAuth, requireRole('worker'), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const profile = await db
    .prepare('SELECT * FROM worker_profiles WHERE user_id = ?')
    .bind(user.id)
    .first();

  if (!profile) {
    return error(c, 'Το προφίλ δεν βρέθηκε', 404);
  }

  const roles = await db
    .prepare('SELECT role FROM worker_profile_roles WHERE worker_profile_id = ?')
    .bind((profile as { id: string }).id)
    .all();

  const languages = await db
    .prepare('SELECT language FROM worker_profile_languages WHERE worker_profile_id = ?')
    .bind((profile as { id: string }).id)
    .all();

  return success(c, {
    profile,
    roles: roles.results.map((r: { role: string }) => r.role),
    languages: languages.results,
  });
});

// PATCH /me — update worker profile
workers.patch(
  '/me',
  requireAuth,
  requireRole('worker'),
  zValidator('json', updateWorkerProfileSchema, (result, c) => {
    if (!result.success) {
      return error(c, 'Μη έγκυρα δεδομένα προφίλ', 400, result.error.flatten().fieldErrors);
    }
  }),
  async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const body = c.req.valid('json');

    const profile = await db
      .prepare('SELECT id FROM worker_profiles WHERE user_id = ?')
      .bind(user.id)
      .first<{ id: string }>();

    if (!profile) {
      return error(c, 'Το προφίλ δεν βρέθηκε', 404);
    }

    const now = new Date().toISOString();

    // Build dynamic update
    const updateFields: string[] = [];
    const updateValues: (string | number | null)[] = [];

    const allowedFields = [
      'full_name',
      'bio',
      'photo_url',
      'region',
      'city',
      'willing_to_relocate',
      'years_of_experience',
      'expected_hourly_rate',
      'expected_monthly_salary',
      'availability',
      'is_visible',
    ];

    const fieldMap: Record<string, string> = {
      fullName: 'full_name',
      photoUrl: 'photo_url',
      willingToRelocate: 'willing_to_relocate',
      yearsOfExperience: 'years_of_experience',
      expectedHourlyRate: 'expected_hourly_rate',
      expectedMonthlySalary: 'expected_monthly_salary',
      isVisible: 'is_visible',
    };

    for (const [key, value] of Object.entries(body)) {
      if (key === 'roles' || key === 'languages') continue;
      const dbField = fieldMap[key] || key;
      if (allowedFields.includes(dbField) && value !== undefined) {
        updateFields.push(`${dbField} = ?`);
        updateValues.push(value as string | number | null);
      }
    }

    // Update roles if provided
    if (body.roles && Array.isArray(body.roles)) {
      await db
        .prepare('DELETE FROM worker_profile_roles WHERE worker_profile_id = ?')
        .bind(profile.id)
        .run();

      for (const roleName of body.roles) {
        await db
          .prepare(
            'INSERT INTO worker_profile_roles (id, worker_profile_id, role, created_at) VALUES (?, ?, ?, ?)'
          )
          .bind(generateId(), profile.id, roleName, now)
          .run();
      }
    }

    // Update languages if provided
    if (body.languages && Array.isArray(body.languages)) {
      await db
        .prepare('DELETE FROM worker_profile_languages WHERE worker_profile_id = ?')
        .bind(profile.id)
        .run();

      for (const lang of body.languages) {
        await db
          .prepare(
            'INSERT INTO worker_profile_languages (id, worker_profile_id, language) VALUES (?, ?, ?)'
          )
          .bind(generateId(), profile.id, typeof lang === 'string' ? lang : lang.language)
          .run();
      }
    }

    // Recalculate profile completeness
    const fullProfile = await db
      .prepare('SELECT * FROM worker_profiles WHERE id = ?')
      .bind(profile.id)
      .first();

    const rolesCount = await db
      .prepare('SELECT COUNT(*) as count FROM worker_profile_roles WHERE worker_profile_id = ?')
      .bind(profile.id)
      .first<{ count: number }>();

    const langsCount = await db
      .prepare('SELECT COUNT(*) as count FROM worker_profile_languages WHERE worker_profile_id = ?')
      .bind(profile.id)
      .first<{ count: number }>();

    const fp = fullProfile as Record<string, unknown> | null;
    const completenessFields = [
      fp?.full_name,
      fp?.bio,
      fp?.photo_url,
      fp?.region,
      fp?.city,
      fp?.availability,
      fp?.years_of_experience !== null && fp?.years_of_experience !== undefined,
      fp?.expected_hourly_rate || fp?.expected_monthly_salary,
      (rolesCount?.count || 0) > 0,
      (langsCount?.count || 0) > 0,
    ];

    const filledCount = completenessFields.filter((f) => {
      if (typeof f === 'boolean') return f;
      return f !== null && f !== undefined && f !== '';
    }).length;

    const completeness = Math.round((filledCount / completenessFields.length) * 100);

    updateFields.push('profile_completeness = ?');
    updateValues.push(completeness);
    updateFields.push('updated_at = ?');
    updateValues.push(now);

    if (updateFields.length > 0) {
      updateValues.push(profile.id);
      await db
        .prepare(`UPDATE worker_profiles SET ${updateFields.join(', ')} WHERE id = ?`)
        .bind(...updateValues)
        .run();
    }

    // Fetch updated profile
    const updated = await db
      .prepare('SELECT * FROM worker_profiles WHERE id = ?')
      .bind(profile.id)
      .first();

    const updatedRoles = await db
      .prepare('SELECT role FROM worker_profile_roles WHERE worker_profile_id = ?')
      .bind(profile.id)
      .all();

    const updatedLangs = await db
      .prepare('SELECT language FROM worker_profile_languages WHERE worker_profile_id = ?')
      .bind(profile.id)
      .all();

    return success(c, {
      profile: updated,
      roles: updatedRoles.results.map((r: { role: string }) => r.role),
      languages: updatedLangs.results,
    });
  }
);

// GET /discover — businesses discover workers
workers.get('/discover', requireAuth, requireRole('business'), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 50);
  const offset = (page - 1) * limit;

  // Filters
  const region = c.req.query('region');
  const role = c.req.query('role');
  const employmentType = c.req.query('employmentType');
  const minExperience = c.req.query('minExperience');
  const maxSalary = c.req.query('maxSalary');
  const housingRequired = c.req.query('housingRequired');
  const language = c.req.query('language');

  const conditions: string[] = ['u.status = ?', 'u.role = ?'];
  const params: (string | number)[] = ['active', 'worker'];

  // Exclude already swiped workers
  conditions.push(
    `wp.user_id NOT IN (SELECT target_id FROM swipes WHERE swiper_id = ? AND target_type = 'worker')`
  );
  params.push(user.id);

  // Exclude blocked workers
  conditions.push(
    `wp.user_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)`
  );
  params.push(user.id);

  // Exclude users who blocked this business
  conditions.push(
    `wp.user_id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = ?)`
  );
  params.push(user.id);

  if (region) {
    conditions.push('wp.region = ?');
    params.push(region);
  }

  if (employmentType) {
    conditions.push('wp.availability = ?');
    params.push(employmentType);
  }

  if (minExperience) {
    conditions.push('wp.years_of_experience >= ?');
    params.push(parseInt(minExperience, 10));
  }

  if (maxSalary) {
    conditions.push('wp.expected_monthly_salary <= ?');
    params.push(parseInt(maxSalary, 10));
  }

  let roleJoin = '';
  if (role) {
    roleJoin = 'JOIN worker_profile_roles wr ON wr.worker_profile_id = wp.id';
    conditions.push('wr.role = ?');
    params.push(role);
  }

  let langJoin = '';
  if (language) {
    langJoin = 'JOIN worker_profile_languages wl ON wl.worker_profile_id = wp.id';
    conditions.push('wl.language = ?');
    params.push(language);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count total
  const countQuery = `
    SELECT COUNT(DISTINCT wp.id) as total
    FROM worker_profiles wp
    JOIN users u ON u.id = wp.user_id
    ${roleJoin}
    ${langJoin}
    ${whereClause}
  `;

  const countResult = await db
    .prepare(countQuery)
    .bind(...params)
    .first<{ total: number }>();

  const total = countResult?.total || 0;

  // Get workers with ranking: premium > verified > completeness
  const dataQuery = `
    SELECT DISTINCT wp.*, u.email, u.status as user_status,
      CASE WHEN sub.plan_id IN ('professional', 'enterprise') THEN 1 ELSE 0 END as is_premium,
      CASE WHEN wp.verified = 1 THEN 1 ELSE 0 END as is_verified,
      wp.profile_completeness
    FROM worker_profiles wp
    JOIN users u ON u.id = wp.user_id
    LEFT JOIN subscriptions sub ON sub.user_id = u.id AND sub.status = 'active'
    ${roleJoin}
    ${langJoin}
    ${whereClause}
    ORDER BY is_premium DESC, is_verified DESC, wp.profile_completeness DESC, wp.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const dataParams = [...params, limit, offset];
  const results = await db
    .prepare(dataQuery)
    .bind(...dataParams)
    .all();

  // Fetch roles and languages for each worker
  const workersWithDetails = await Promise.all(
    results.results.map(async (worker: Record<string, unknown>) => {
      const roles = await db
        .prepare('SELECT role FROM worker_profile_roles WHERE worker_profile_id = ?')
        .bind(worker.id as string)
        .all();

      const languages = await db
        .prepare('SELECT language FROM worker_profile_languages WHERE worker_profile_id = ?')
        .bind(worker.id as string)
        .all();

      return {
        ...worker,
        roles: roles.results.map((r: { role: string }) => r.role),
        languages: languages.results,
      };
    })
  );

  return paginated(c, workersWithDetails, total, page, limit);
});

// GET /:id — get worker by ID
workers.get('/:id', requireAuth, async (c) => {
  const workerId = c.req.param('id');
  const db = c.env.DB;

  const profile = await db
    .prepare(
      `SELECT wp.*, u.email, u.status as user_status
       FROM worker_profiles wp
       JOIN users u ON u.id = wp.user_id
       WHERE wp.user_id = ? AND u.status = 'active'`
    )
    .bind(workerId)
    .first();

  if (!profile) {
    return error(c, 'Ο εργαζόμενος δεν βρέθηκε', 404);
  }

  const roles = await db
    .prepare('SELECT role FROM worker_profile_roles WHERE worker_profile_id = ?')
    .bind((profile as { id: string }).id)
    .all();

  const languages = await db
    .prepare('SELECT language FROM worker_profile_languages WHERE worker_profile_id = ?')
    .bind((profile as { id: string }).id)
    .all();

  return success(c, {
    profile,
    roles: roles.results.map((r: { role: string }) => r.role),
    languages: languages.results,
  });
});

// POST /:id/like — business likes a worker
workers.post('/:id/like', requireAuth, requireRole('business'), async (c) => {
  const user = c.get('user');
  const targetId = c.req.param('id');
  const db = c.env.DB;
  const now = new Date().toISOString();

  // Check target exists
  const target = await db
    .prepare("SELECT id FROM users WHERE id = ? AND role = 'worker' AND status = 'active'")
    .bind(targetId)
    .first();

  if (!target) {
    return error(c, 'Ο εργαζόμενος δεν βρέθηκε', 404);
  }

  // Check duplicate
  const existingSwipe = await db
    .prepare(
      "SELECT id FROM swipes WHERE swiper_id = ? AND target_id = ? AND target_type = 'worker'"
    )
    .bind(user.id, targetId)
    .first();

  if (existingSwipe) {
    return error(c, 'Έχετε ήδη κάνει swipe σε αυτόν τον εργαζόμενο', 409);
  }

  // Create swipe
  const swipeId = generateId();
  await db
    .prepare(
      `INSERT INTO swipes (id, swiper_id, target_id, target_type, direction, created_at)
       VALUES (?, ?, ?, 'worker', 'like', ?)`
    )
    .bind(swipeId, user.id, targetId, now)
    .run();

  // Check for mutual match (worker liked this business)
  const mutualSwipe = await db
    .prepare(
      "SELECT id FROM swipes WHERE swiper_id = ? AND target_id = ? AND target_type = 'business' AND direction = 'like'"
    )
    .bind(targetId, user.id)
    .first();

  let matched = false;
  let matchId: string | null = null;

  if (mutualSwipe) {
    matched = true;
    matchId = generateId();
    const conversationId = generateId();

    // Create match
    await db
      .prepare(
        `INSERT INTO matches (id, worker_id, business_id, status, matched_at)
         VALUES (?, ?, ?, 'active', ?)`
      )
      .bind(matchId, targetId, user.id, now)
      .run();

    // Create conversation
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
        targetId,
        'Νέο ταίριασμα!',
        'Έχετε ένα νέο ταίριασμα με μια επιχείρηση!',
        JSON.stringify({ matchId, conversationId }),
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
        user.id,
        'Νέο ταίριασμα!',
        'Έχετε ένα νέο ταίριασμα με έναν εργαζόμενο!',
        JSON.stringify({ matchId, conversationId }),
        now
      )
      .run();
  }

  return success(c, { swiped: true, matched, matchId }, matched ? 201 : 200);
});

// POST /:id/skip — business skips a worker
workers.post('/:id/skip', requireAuth, requireRole('business'), async (c) => {
  const user = c.get('user');
  const targetId = c.req.param('id');
  const db = c.env.DB;
  const now = new Date().toISOString();

  const target = await db
    .prepare("SELECT id FROM users WHERE id = ? AND role = 'worker' AND status = 'active'")
    .bind(targetId)
    .first();

  if (!target) {
    return error(c, 'Ο εργαζόμενος δεν βρέθηκε', 404);
  }

  const existing = await db
    .prepare(
      "SELECT id FROM swipes WHERE swiper_id = ? AND target_id = ? AND target_type = 'worker'"
    )
    .bind(user.id, targetId)
    .first();

  if (existing) {
    return error(c, 'Έχετε ήδη κάνει swipe σε αυτόν τον εργαζόμενο', 409);
  }

  await db
    .prepare(
      `INSERT INTO swipes (id, swiper_id, target_id, target_type, direction, created_at)
       VALUES (?, ?, ?, 'worker', 'skip', ?)`
    )
    .bind(generateId(), user.id, targetId, now)
    .run();

  return success(c, { skipped: true });
});

// POST /:id/favorite — business favorites a worker
workers.post('/:id/favorite', requireAuth, requireRole('business'), async (c) => {
  const user = c.get('user');
  const targetId = c.req.param('id');
  const db = c.env.DB;
  const now = new Date().toISOString();

  const target = await db
    .prepare("SELECT id FROM users WHERE id = ? AND role = 'worker' AND status = 'active'")
    .bind(targetId)
    .first();

  if (!target) {
    return error(c, 'Ο εργαζόμενος δεν βρέθηκε', 404);
  }

  const existing = await db
    .prepare(
      "SELECT id FROM favorites WHERE user_id = ? AND target_id = ? AND target_type = 'worker'"
    )
    .bind(user.id, targetId)
    .first();

  if (existing) {
    return error(c, 'Ο εργαζόμενος είναι ήδη στα αγαπημένα', 409);
  }

  await db
    .prepare(
      `INSERT INTO favorites (id, user_id, target_id, target_type, created_at)
       VALUES (?, ?, ?, 'worker', ?)`
    )
    .bind(generateId(), user.id, targetId, now)
    .run();

  return success(c, { favorited: true }, 201);
});

// DELETE /:id/favorite — remove worker from favorites
workers.delete('/:id/favorite', requireAuth, requireRole('business'), async (c) => {
  const user = c.get('user');
  const targetId = c.req.param('id');
  const db = c.env.DB;

  const existing = await db
    .prepare(
      "SELECT id FROM favorites WHERE user_id = ? AND target_id = ? AND target_type = 'worker'"
    )
    .bind(user.id, targetId)
    .first();

  if (!existing) {
    return error(c, 'Ο εργαζόμενος δεν βρέθηκε στα αγαπημένα', 404);
  }

  await db
    .prepare(
      "DELETE FROM favorites WHERE user_id = ? AND target_id = ? AND target_type = 'worker'"
    )
    .bind(user.id, targetId)
    .run();

  return success(c, { unfavorited: true });
});

export default workers;
