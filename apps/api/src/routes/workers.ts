import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { updateWorkerProfileSchema } from '@staffnow/validation';
import type { Env, AuthUser } from '../types';
import { requireAuth, requireRole } from '../middleware/auth';
import { checkSwipeLimit, checkActiveMatchesLimit } from '../middleware/subscription';
import { success, error, paginated } from '../lib/response';
import { openaiChat } from '../lib/openai';
import { generateId } from '../lib/id';
import { recordActivity, getRequestIp, getGeoFromRequest, recordDataChange, computeDiff } from '../lib/activity';

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

    // Snapshot BEFORE the change for the data_changes diff
    const beforeProfile = await db
      .prepare('SELECT * FROM worker_profiles WHERE id = ?')
      .bind(profile.id)
      .first<any>();

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
      'employment_type',
      'is_visible',
      'cv_url',
      'skills',
    ];

    const fieldMap: Record<string, string> = {
      fullName: 'full_name',
      photoUrl: 'photo_url',
      cvUrl: 'cv_url',
      willingToRelocate: 'willing_to_relocate',
      yearsOfExperience: 'years_of_experience',
      expectedHourlyRate: 'expected_hourly_rate',
      expectedMonthlySalary: 'expected_monthly_salary',
      isVisible: 'is_visible',
      employmentType: 'employment_type',
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
            'INSERT INTO worker_profile_roles (id, worker_profile_id, role) VALUES (?, ?, ?)'
          )
          .bind(generateId(), profile.id, roleName)
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
    // 10 evenly-weighted fields (10% each). The years_of_experience check
    // requires > 0 so the default 0 from registration doesn't inflate the
    // percentage. Keep this formula in sync with /admin/users (admin.ts).
    const completenessFields = [
      fp?.full_name,
      fp?.bio,
      fp?.photo_url,
      fp?.region,
      fp?.city,
      fp?.availability,
      typeof fp?.years_of_experience === 'number' && (fp?.years_of_experience as number) > 0,
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

    // Auto-embed profile for AI matching (fire-and-forget)
    try {
      const rolesList = updatedRoles.results.map((r: any) => r.role);
      const langsList = updatedLangs.results.map((l: any) => l.language || l);
      const parts: string[] = [];
      const u = updated as any;
      if (u.full_name) parts.push(`Name: ${u.full_name}`);
      if (rolesList.length) parts.push(`Roles: ${rolesList.join(', ')}`);
      if (u.bio) parts.push(`Bio: ${u.bio}`);
      if (u.years_of_experience) parts.push(`Experience: ${u.years_of_experience} years`);
      if (u.city) parts.push(`City: ${u.city}`);
      if (u.region) parts.push(`Region: ${u.region}`);
      if (u.employment_type) parts.push(`Type: ${u.employment_type}`);
      if (u.availability) parts.push(`Availability: ${u.availability}`);
      if (langsList.length) parts.push(`Languages: ${langsList.join(', ')}`);
      if (u.expected_hourly_rate) parts.push(`Hourly rate: ${u.expected_hourly_rate}€`);
      if (u.expected_monthly_salary) parts.push(`Monthly salary: ${u.expected_monthly_salary}€`);
      const text = parts.join('. ');
      if (text.length > 20 && c.env.AI) {
        const result = await c.env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [text] });
        if (result?.data?.[0]) {
          await db.prepare('UPDATE worker_profiles SET embedding = ? WHERE id = ?')
            .bind(JSON.stringify(result.data[0]), profile.id)
            .run();
        }
      }
    } catch (embErr) {
      console.error('Auto-embed failed (non-blocking):', embErr);
    }

    const ip = getRequestIp(c);
    const ua = c.req.header('User-Agent') || null;
    const geo = getGeoFromRequest(c);
    const diff = computeDiff(beforeProfile, fullProfile, [
      'updated_at',
      'embedding',
      'profile_completeness',
    ]);
    c.executionCtx.waitUntil(
      (async () => {
        await recordActivity(c.env, {
          userId: user.id,
          type: 'profile_update',
          entityType: 'worker_profile',
          entityId: profile.id,
          metadata: { completeness },
          ip,
          userAgent: ua,
          geo,
        });
        if (Object.keys(diff).length > 0) {
          await recordDataChange(c.env, {
            actorUserId: user.id,
            actorRole: user.role,
            actorEmail: user.email,
            action: 'profile_update',
            entityType: 'worker_profile',
            entityId: profile.id,
            entityOwnerId: user.id,
            fieldChanges: diff,
            metadata: { completeness },
            ip,
            userAgent: ua,
            geo,
          });
        }
      })(),
    );

    return success(c, {
      profile: updated,
      roles: updatedRoles.results.map((r: { role: string }) => r.role),
      languages: updatedLangs.results,
    });
  }
);

// GET /discover — businesses discover workers
// GET /favorites/list — list saved workers (for business)
workers.get('/favorites/list', requireAuth, requireRole('business'), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const results = await db.prepare(
    `SELECT f.id as fav_id, f.created_at as saved_at,
       wp.user_id, wp.full_name, wp.photo_url, wp.city, wp.region, wp.bio,
       wp.years_of_experience, wp.expected_monthly_salary
     FROM favorites f
     JOIN worker_profiles wp ON wp.user_id = f.target_id
     JOIN users u ON u.id = wp.user_id AND u.status = 'active'
     WHERE f.user_id = ? AND f.target_type = 'worker'
     ORDER BY f.created_at DESC LIMIT 50`
  ).bind(user.id).all();

  return success(c, results.results);
});

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

  // Exclude blocked workers
  conditions.push(
    `wp.user_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)`
  );
  params.push(user.id);

  // Exclude matched workers
  conditions.push(
    `wp.user_id NOT IN (SELECT worker_id FROM matches WHERE business_id = '${user.id}' AND status = 'active')`
  );

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

  // Discover ranking — boosted workers come first, then Premium subscribers,
  // then verified, then completeness.
  //
  //   • is_boosted: active 'discover' boost row in worker_boosts (24h window)
  //   • is_premium: cached flag στο users table (συγχρονίζεται από το
  //                 subscription webhook όταν αγοράζεται worker_premium)
  //   • is_verified: identity-verified (worker_profiles.verified=1)
  //   • profile_completeness: how filled out the profile is
  //
  // The boost row makes the Premium feature actually do something visible —
  // χωρίς αυτό, ο worker πληρώνει 2 credits και δεν αλλάζει η θέση του.
  const dataQuery = `
    SELECT DISTINCT wp.*, u.email, u.status as user_status, u.is_premium,
      CASE WHEN active_boost.id IS NOT NULL THEN 1 ELSE 0 END as is_boosted,
      CASE WHEN wp.verified = 1 THEN 1 ELSE 0 END as is_verified,
      wp.profile_completeness,
      (SELECT direction FROM swipes WHERE swiper_id = '${user.id}' AND target_id = wp.user_id AND target_type = 'worker' LIMIT 1) as swipe_status,
      (SELECT COUNT(*) FROM matches WHERE business_id = '${user.id}' AND worker_id = wp.user_id AND status = 'active') as is_matched
    FROM worker_profiles wp
    JOIN users u ON u.id = wp.user_id
    LEFT JOIN (
      SELECT user_id, id FROM worker_boosts
       WHERE kind = 'discover' AND expires_at > datetime('now')
    ) active_boost ON active_boost.user_id = wp.user_id
    ${roleJoin}
    ${langJoin}
    ${whereClause}
    ORDER BY is_boosted DESC, u.is_premium DESC, is_verified DESC,
             wp.profile_completeness DESC, wp.created_at DESC
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

// GET /:id — get worker by ID (hides email/phone unless viewer is matched)
workers.get('/:id', requireAuth, async (c) => {
  const viewer = c.get('user');
  const workerId = c.req.param('id');
  const db = c.env.DB;
  const isSelf = viewer.id === workerId;
  const isAdmin = viewer.role === 'admin';

  const profile = await db
    .prepare(
      `SELECT wp.*, u.email, u.status as user_status, u.last_login_at as last_active_at,
              u.is_premium
       FROM worker_profiles wp
       JOIN users u ON u.id = wp.user_id
       WHERE wp.user_id = ? AND u.status = 'active'`
    )
    .bind(workerId)
    .first();

  if (!profile) {
    return error(c, 'Ο εργαζόμενος δεν βρέθηκε', 404);
  }

  // Check if viewer has an active match with this worker (only businesses get contact info)
  let isMatched = false;
  if (!isSelf && !isAdmin && viewer.role === 'business') {
    const match = await db
      .prepare("SELECT id FROM matches WHERE worker_id = ? AND business_id = ? AND status = 'active' LIMIT 1")
      .bind(workerId, viewer.id)
      .first();
    isMatched = !!match;
  }

  // Strip sensitive fields unless self/admin/matched
  const p = profile as any;
  if (!isSelf && !isAdmin && !isMatched) {
    p.email = undefined;
    p.phone = undefined;
    p.cv_url = undefined;
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
    profile: p,
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

  // Get business name for notification
  const bizForNotif = await db.prepare('SELECT company_name FROM business_profiles WHERE user_id = ?').bind(user.id).first<{ company_name: string }>();
  const bizNameForNotif = bizForNotif?.company_name || 'Μια επιχείρηση';

  // Notify worker about interest
  await db.prepare(
    `INSERT INTO notifications (id, user_id, type, title, body, data, created_at)
     VALUES (?, ?, 'system', ?, ?, ?, ?)`
  ).bind(generateId(), targetId, `❤️ Η ${bizNameForNotif} ενδιαφέρθηκε για το προφίλ σου`, 'Πάτησε για να δεις την επιχείρηση', JSON.stringify({ businessId: user.id }), now).run();

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
    // Enforce business plan's active matches cap. If exceeded, keep the swipe
    // but skip match creation — business must archive an old match first.
    const cap = await checkActiveMatchesLimit(db, user.id);
    if (!cap.allowed) {
      return success(c, {
        matched: false,
        atCap: true,
        message: `Έφτασες το όριο των ${cap.max} ενεργών matches. Αρχειοθέτησε παλιά matches ή αναβάθμισε το πλάνο.`,
        swipeId,
      });
    }

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
        `INSERT INTO conversations (id, match_id, worker_id, business_id, status, created_at)
         VALUES (?, ?, ?, ?, 'active', ?)`
      )
      .bind(conversationId, matchId, targetId, user.id, now)
      .run();

    // Get names
    const workerInfo = await db.prepare('SELECT full_name FROM worker_profiles WHERE user_id = ?').bind(targetId).first<{ full_name: string }>();
    const bizInfo = await db.prepare('SELECT company_name FROM business_profiles WHERE user_id = ?').bind(user.id).first<{ company_name: string }>();
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
        targetId,
        `🎉 Νέο match με ${bizName}`,
        'Έχετε νέο ταίριασμα! Μπορείτε να ξεκινήσετε συνομιλία.',
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
        `🎉 Νέο match με τον/την ${workerName}`,
        'Έχετε νέο ταίριασμα! Μπορείτε να ξεκινήσετε συνομιλία.',
        JSON.stringify({ matchId, conversationId }),
        now
      )
      .run();
  }

  const swIp = getRequestIp(c);
  const swUa = c.req.header('User-Agent') || null;
  const swGeo = getGeoFromRequest(c);
  c.executionCtx.waitUntil(
    (async () => {
      await recordActivity(c.env, {
        userId: user.id,
        type: 'swipe_like',
        entityType: 'worker',
        entityId: targetId,
        ip: swIp,
        userAgent: swUa,
        geo: swGeo,
      });
      if (matched && matchId) {
        await Promise.all([
          recordActivity(c.env, { userId: user.id, type: 'match', entityType: 'match', entityId: matchId, geo: swGeo }),
          recordActivity(c.env, { userId: targetId, type: 'match', entityType: 'match', entityId: matchId }),
        ]);
      }
    })(),
  );

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

  c.executionCtx.waitUntil(
    recordActivity(c.env, {
      userId: user.id,
      type: 'swipe_skip',
      entityType: 'worker',
      entityId: targetId,
      ip: getRequestIp(c),
      userAgent: c.req.header('User-Agent') || null,
      geo: getGeoFromRequest(c),
    }),
  );

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

// =====================================================================
// WORKER PREMIUM-ish features (credits-based pay-as-you-go).
// All require role=worker. Each action either consumes credits or, for
// premium subscribers, is free / unlimited.
// =====================================================================

/**
 * Atomically debit credits for a worker action.
 * Returns the new balance, or throws AppError if not enough credits.
 *
 * Idempotency is best-effort — callers should use this from a single
 * request lifecycle (no retry loops) to avoid double-debits.
 */
async function debitCredits(env: any, userId: string, amount: number, description: string) {
  const row = await env.DB.prepare('SELECT balance FROM credits WHERE user_id = ?')
    .bind(userId)
    .first<{ balance: number }>();
  if (!row || row.balance < amount) {
    throw new Error('INSUFFICIENT_CREDITS');
  }
  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE credits SET balance = balance - ?, total_spent = total_spent + ?, updated_at = ?
      WHERE user_id = ? AND balance >= ?`,
  )
    .bind(amount, amount, now, userId, amount)
    .run();
  await env.DB.prepare(
    `INSERT INTO credit_transactions (id, user_id, amount, type, description, created_at)
     VALUES (?, ?, ?, 'spend', ?, ?)`,
  )
    .bind(`ctx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`, userId, -amount, description, now)
    .run();
  return row.balance - amount;
}

async function isPremium(env: any, userId: string): Promise<boolean> {
  // Source of truth: an active worker_premium subscription whose period
  // has not expired. The legacy is_premium / premium_until columns are
  // kept as a denormalised cache (synced from the webhook handler).
  const sub = await env.DB.prepare(
    `SELECT status, current_period_end FROM subscriptions
      WHERE user_id = ? AND plan_id = 'worker_premium'
      ORDER BY created_at DESC LIMIT 1`,
  ).bind(userId).first<{ status: string; current_period_end: string }>();
  if (sub && sub.status === 'active' && new Date(sub.current_period_end) > new Date()) {
    return true;
  }
  const r = await env.DB.prepare(
    `SELECT is_premium, premium_until FROM users WHERE id = ?`,
  ).bind(userId).first<{ is_premium: number; premium_until: string | null }>();
  if (!r) return false;
  if (r.is_premium !== 1) return false;
  if (!r.premium_until) return true;
  return new Date(r.premium_until) > new Date();
}

/**
 * Internal helper — generates the AI CV from a profile snapshot.
 * Used by /ai/cv-generate (full price) and /ai/cv-regenerate (1 credit).
 */
async function generateCvForProfile(env: any, profile: any): Promise<string> {
  // Industry derivation: prefer the worker's listed roles. Fall back to
  // generic "εργασίας" so the optimizer doesn't drift to tourism by default.
  const roles = (profile.roles_csv || '').trim();
  const industry = roles
    ? `με βάση τους ρόλους: ${roles}`
    : 'με βάση τις δηλωμένες δεξιότητές του';

  const prompt = `Είσαι έμπειρος επαγγελματίας σύμβουλος καριέρας στην Ελλάδα. Καλύπτεις ΟΛΟΥΣ
τους κλάδους εργασίας: εστίαση, φιλοξενία, λιανικό εμπόριο, logistics, υπηρεσίες,
γραφείο, χειρωνακτικά επαγγέλματα. Μην υποθέτεις τουριστικό κλάδο αν δεν προκύπτει
από τα δεδομένα.

Φτιάξε ΟΛΟΚΛΗΡΩΜΕΝΟ, επαγγελματικό βιογραφικό σε ΕΛΛΗΝΙΚΑ ${industry}. Δομή:
1) Στοιχεία επικοινωνίας
2) Επαγγελματική περίληψη (3-4 γραμμές)
3) Εμπειρία (αν years_of_experience > 0, εκτίμησε χρονικά πεδία)
4) Δεξιότητες (γλώσσες, soft skills, εργαλεία/τεχνικές δεξιότητες σχετικές ΜΟΝΟ
   με τους ρόλους που δίνονται)
5) Εκπαίδευση (αν αναφέρεται)
6) Διαθεσιμότητα

Δεδομένα:
Όνομα: ${profile.full_name || ''}
Πόλη: ${profile.city || ''} / ${profile.region || ''}
Χρόνια εμπειρίας: ${profile.years_of_experience || 0}
Διαθεσιμότητα: ${profile.availability || ''}
Bio: ${profile.bio || ''}
Ρόλοι: ${profile.roles_csv || '(δεν δηλώθηκαν)'}
Επιθυμητός μηνιαίος μισθός: ${profile.expected_monthly_salary || 'συζητήσιμος'}

Έξοδος: καθαρό κείμενο, ΕΛΛΗΝΙΚΑ, max 600 λέξεις. ΜΗΝ προσθέσεις στοιχεία που
δεν υπάρχουν στο input.`;

  // 1) OpenAI (gpt-4o) — καλύτερη ποιότητα/Ελληνικά. Χρησιμοποιείται μόνο αν
  //    υπάρχει το secret OPENAI_API_KEY.
  const viaOpenAI = await openaiChat(env, prompt, {
    model: 'gpt-4o',
    maxTokens: 1100,
    temperature: 0.6,
  });
  if (viaOpenAI) return viaOpenAI;

  // 2) Fallback: Cloudflare Workers AI (δωρεάν, χωρίς key).
  try {
    const aiRes: any = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 900,
    });
    return aiRes?.response || aiRes?.result?.response || '';
  } catch (err) {
    console.warn('[ai-cv]', err);
    return '';
  }
}

async function loadWorkerProfile(env: any, userId: string) {
  return env.DB.prepare(
    `SELECT wp.*, GROUP_CONCAT(wpr.role, ', ') as roles_csv
       FROM worker_profiles wp
       LEFT JOIN worker_profile_roles wpr ON wpr.worker_profile_id = wp.id
      WHERE wp.user_id = ? GROUP BY wp.id`,
  )
    .bind(userId)
    .first<any>();
}

async function saveCv(env: any, userId: string, cvText: string, source: 'ai' | 'manual') {
  await env.DB.prepare(
    `UPDATE worker_profiles
        SET cv_text = ?, cv_updated_at = datetime('now'), cv_source = ?, updated_at = datetime('now')
      WHERE user_id = ?`,
  )
    .bind(cvText, source, userId)
    .run();
}

// ---------------------------------------------------------------------
// POST /workers/ai/cv-generate — first-time AI CV generation. 5 credits.
//   The result is auto-saved to worker_profiles.cv_text so future
//   edits/regenerations don't require regenerating from scratch.
// ---------------------------------------------------------------------
workers.post('/ai/cv-generate', requireAuth, requireRole('worker'), async (c) => {
  const user = c.get('user');
  const env: any = c.env;
  const premium = await isPremium(env, user.id);
  if (!premium) {
    try { await debitCredits(env, user.id, 5, 'AI CV Generator'); }
    catch { return error(c, 'INSUFFICIENT_CREDITS', 'Δεν έχετε αρκετά credits (απαιτούνται 5).', 402); }
  }

  const profile = await loadWorkerProfile(env, user.id);
  if (!profile) return error(c, 'NO_PROFILE', 'Συμπληρώστε πρώτα το προφίλ σας.', 400);

  const cv = await generateCvForProfile(env, profile);
  if (!cv) return error(c, 'AI_FAILED', 'Δεν μπόρεσε να δημιουργηθεί CV. Δοκιμάστε ξανά.', 500);

  await saveCv(env, user.id, cv, 'ai');
  return success(c, { cv, source: 'ai', updatedAt: new Date().toISOString() });
});

// ---------------------------------------------------------------------
// POST /workers/ai/cv-regenerate — re-runs AI on existing profile data.
//   Costs only 1 credit (vs 5 for first-time generate). Free for Premium.
// ---------------------------------------------------------------------
workers.post('/ai/cv-regenerate', requireAuth, requireRole('worker'), async (c) => {
  const user = c.get('user');
  const env: any = c.env;
  const premium = await isPremium(env, user.id);
  if (!premium) {
    try { await debitCredits(env, user.id, 1, 'AI CV Regenerate'); }
    catch { return error(c, 'INSUFFICIENT_CREDITS', 'Δεν έχετε αρκετά credits (απαιτείται 1).', 402); }
  }
  const profile = await loadWorkerProfile(env, user.id);
  if (!profile) return error(c, 'NO_PROFILE', 'Συμπληρώστε πρώτα το προφίλ σας.', 400);
  const cv = await generateCvForProfile(env, profile);
  if (!cv) return error(c, 'AI_FAILED', 'Αποτυχία regeneration.', 500);
  await saveCv(env, user.id, cv, 'ai');
  return success(c, { cv, source: 'ai', updatedAt: new Date().toISOString() });
});

// ---------------------------------------------------------------------
// GET  /workers/me/cv — fetch the worker's stored CV.
// PUT  /workers/me/cv — manual edit (worker overwrites cv_text). Free.
// ---------------------------------------------------------------------
workers.get('/me/cv', requireAuth, requireRole('worker'), async (c) => {
  const user = c.get('user');
  const row = await c.env.DB.prepare(
    `SELECT cv_text, cv_updated_at, cv_source FROM worker_profiles WHERE user_id = ?`,
  )
    .bind(user.id)
    .first<{ cv_text: string | null; cv_updated_at: string | null; cv_source: string | null }>();
  return success(c, {
    cv: row?.cv_text || null,
    updatedAt: row?.cv_updated_at || null,
    source: row?.cv_source || null,
  });
});

workers.put('/me/cv', requireAuth, requireRole('worker'), async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ cv: string }>().catch(() => null as any);
  const cv = typeof body?.cv === 'string' ? body.cv.trim() : '';
  if (!cv) return error(c, 'VALIDATION', 'Το CV δεν μπορεί να είναι κενό.', 400);
  if (cv.length > 20_000) {
    return error(c, 'VALIDATION', 'Το CV ξεπερνά τα 20.000 χαρακτήρες.', 400);
  }
  await saveCv(c.env, user.id, cv, 'manual');
  return success(c, { cv, source: 'manual', updatedAt: new Date().toISOString() });
});

// ---------------------------------------------------------------------
// POST /workers/me/cv/save-as-pdf
//   Generates a PDF from the worker's saved cv_text (with their avatar
//   embedded), stores it on R2, sets cv_url on the profile, and returns
//   the public URL. Free — no credits.
// ---------------------------------------------------------------------
workers.post('/me/cv/save-as-pdf', requireAuth, requireRole('worker'), async (c) => {
  const user = c.get('user');
  const profile = await loadWorkerProfile(c.env, user.id);
  if (!profile) return error(c, 'NO_PROFILE', 'Δεν βρέθηκε προφίλ.', 404);
  const cvText: string = (profile.cv_text || '').toString();
  if (!cvText.trim()) {
    return error(c, 'NO_CV', 'Δεν υπάρχει αποθηκευμένο CV. Δημιούργησε ένα πρώτα.', 400);
  }

  // Lazy-load pdf-lib + fontkit and the bundled Greek-capable TTF fonts.
  const { PDFDocument, rgb } = await import('pdf-lib');
  const fontkit = (await import('@pdf-lib/fontkit')).default;
  const dejaRegular = (await import('../assets/fonts/DejaVuSans.ttf')).default;
  const dejaBold = (await import('../assets/fonts/DejaVuSans-Bold.ttf')).default;
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  // DejaVu Sans is a long-proven font with full Greek + Latin coverage that
  // works reliably with pdf-lib's fontkit subsetter.
  const fontHelvetica = await pdfDoc.embedFont(dejaRegular, { subset: true });
  const fontBold = await pdfDoc.embedFont(dejaBold, { subset: true });

  // Try to embed the worker's avatar if available.
  let embeddedAvatar: any = null;
  if (profile.photo_url) {
    try {
      const r = await fetch(profile.photo_url);
      if (r.ok) {
        const buf = new Uint8Array(await r.arrayBuffer());
        const ct = (r.headers.get('content-type') || '').toLowerCase();
        if (ct.includes('png')) embeddedAvatar = await pdfDoc.embedPng(buf);
        else if (ct.includes('jpeg') || ct.includes('jpg')) embeddedAvatar = await pdfDoc.embedJpg(buf);
      }
    } catch {
      // ignore — fall through without photo
    }
  }

  // Strip zero-width characters that some AI outputs include — they have no
  // glyph and can throw off width calculations.
  const cleanText = (s: string) =>
    s.replace(/[\u200B\u200C\u200D\uFEFF]/g, '').replace(/\u00A0/g, ' ');

  // Page setup: A4 portrait
  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const MARGIN = 50;
  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  // Header — name + photo
  const fullName = cleanText(profile.full_name || 'Βιογραφικό');
  if (embeddedAvatar) {
    const photoSize = 70;
    page.drawImage(embeddedAvatar, {
      x: PAGE_W - MARGIN - photoSize,
      y: y - photoSize,
      width: photoSize,
      height: photoSize,
    });
  }
  page.drawText(fullName, {
    x: MARGIN,
    y: y - 20,
    size: 22,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  if (profile.city || profile.region) {
    const loc = cleanText([profile.city, profile.region].filter(Boolean).join(', '));
    page.drawText(loc, {
      x: MARGIN,
      y: y - 42,
      size: 11,
      font: fontHelvetica,
      color: rgb(0.4, 0.4, 0.4),
    });
  }
  y -= 90;

  // Divider
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_W - MARGIN, y },
    thickness: 1,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 20;

  // Body — wrap cv_text into lines and paginate.
  const lineSize = 11;
  const lineHeight = lineSize * 1.45;
  const maxWidth = PAGE_W - MARGIN * 2;

  const wrapLine = (text: string, font: any) => {
    const words = text.split(/\s+/);
    const out: string[] = [];
    let cur = '';
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      const width = font.widthOfTextAtSize(next, lineSize);
      if (width > maxWidth && cur) {
        out.push(cur);
        cur = w;
      } else {
        cur = next;
      }
    }
    if (cur) out.push(cur);
    return out;
  };

  const rawLines = cvText.replace(/\r\n/g, '\n').split('\n');
  for (const raw of rawLines) {
    const cleaned = cleanText(raw);
    const isHeading = /^(\d+[\)\.]|[A-ZΑ-Ω][^a-zα-ω]{2,})/.test(cleaned.trim()) && cleaned.trim().length < 80;
    const font = isHeading ? fontBold : fontHelvetica;
    const wrapped = cleaned.trim() === '' ? [''] : wrapLine(cleaned, font);
    for (const seg of wrapped) {
      if (y < MARGIN + lineHeight) {
        // new page
        page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - MARGIN;
      }
      if (seg) {
        page.drawText(seg, {
          x: MARGIN,
          y,
          size: lineSize,
          font,
          color: isHeading ? rgb(0.1, 0.1, 0.1) : rgb(0.2, 0.2, 0.2),
        });
      }
      y -= lineHeight;
    }
  }

  const pdfBytes = await pdfDoc.save();
  const pdfBlob = new Uint8Array(pdfBytes);

  // Upload to R2
  const key = `cv/${user.id}/${Date.now()}.pdf`;
  await c.env.R2.put(key, pdfBlob, {
    httpMetadata: { contentType: 'application/pdf' },
    customMetadata: {
      userId: user.id,
      generatedAt: new Date().toISOString(),
      source: 'ai-cv',
    },
  });

  const url = `https://pub-5e055b34e4694e02ac3de198a7776878.r2.dev/${key}`;

  // Update worker_profiles.cv_url
  await c.env.DB.prepare(
    `UPDATE worker_profiles SET cv_url = ?, updated_at = datetime('now') WHERE user_id = ?`,
  ).bind(url, user.id).run();

  return success(c, { url, key });
});

// ---------------------------------------------------------------------
// DELETE /workers/me/cv/file — clears the uploaded cv_url (worker can
// remove their CV file from the profile). Doesn't touch cv_text.
// ---------------------------------------------------------------------
workers.delete('/me/cv/file', requireAuth, requireRole('worker'), async (c) => {
  const user = c.get('user');
  await c.env.DB.prepare(
    `UPDATE worker_profiles SET cv_url = NULL, updated_at = datetime('now') WHERE user_id = ?`,
  ).bind(user.id).run();
  return success(c, { deleted: true });
});

// ---------------------------------------------------------------------
// GET /workers/:id/cv — businesses can read CVs of MATCHED workers only
//   (or admins, for moderation).
// ---------------------------------------------------------------------
workers.get('/:id/cv', requireAuth, async (c) => {
  const me = c.get('user');
  const targetUserId = c.req.param('id');

  if (me.role !== 'admin' && me.id !== targetUserId) {
    // Must have an active match with the target worker.
    const m = await c.env.DB.prepare(
      `SELECT 1 FROM matches WHERE business_id = ? AND worker_id = ? AND status = 'active' LIMIT 1`,
    ).bind(me.id, targetUserId).first();
    if (!m) {
      return error(c, 'FORBIDDEN', 'Πρόσβαση στο CV μόνο μετά από match.', 403);
    }
  }

  const row = await c.env.DB.prepare(
    `SELECT cv_text, cv_updated_at FROM worker_profiles WHERE user_id = ?`,
  )
    .bind(targetUserId)
    .first<{ cv_text: string | null; cv_updated_at: string | null }>();
  if (!row?.cv_text) return error(c, 'NO_CV', 'Ο εργαζόμενος δεν έχει αποθηκευμένο CV.', 404);
  return success(c, { cv: row.cv_text, updatedAt: row.cv_updated_at });
});

// ---------------------------------------------------------------------
// POST /workers/ai/profile-optimize — rewrite the worker's bio for
//   keyword density and clarity. Cost: 3 credits (free for Premium).
// ---------------------------------------------------------------------
workers.post('/ai/profile-optimize', requireAuth, requireRole('worker'), async (c) => {
  const user = c.get('user');
  const env: any = c.env;
  const premium = await isPremium(env, user.id);
  if (!premium) {
    try { await debitCredits(env, user.id, 3, 'AI Profile Optimizer'); }
    catch { return error(c, 'INSUFFICIENT_CREDITS', 'Δεν έχετε αρκετά credits (απαιτούνται 3).', 402); }
  }

  const profile = await env.DB.prepare(
    `SELECT wp.bio, wp.full_name, wp.years_of_experience, wp.availability,
            GROUP_CONCAT(wpr.role, ', ') as roles_csv
       FROM worker_profiles wp
       LEFT JOIN worker_profile_roles wpr ON wpr.worker_profile_id = wp.id
      WHERE wp.user_id = ? GROUP BY wp.id`,
  )
    .bind(user.id)
    .first<any>();

  // Industry hint: derive ONLY from declared roles. Default keywords are
  // generic so the optimizer doesn't drift to "tourism/hospitality" when
  // the worker is, say, a driver or warehouse picker.
  const roles = (profile?.roles_csv || '').trim();
  const industryHint = roles
    ? `Οι ρόλοι του εργαζόμενου: ${roles}. Χρησιμοποίησε keywords ΣΧΕΤΙΚΑ ΑΠΟΚΛΕΙΣΤΙΚΑ με αυτούς.`
    : 'Δεν έχουν δηλωθεί ρόλοι — μείνε σε γενικά επαγγελματικά keywords (αξιοπιστία, ομαδικότητα, υπευθυνότητα, εμπειρία).';

  const prompt = `Ξαναγράψε το παρακάτω bio εργαζομένου σε ΕΛΛΗΝΙΚΑ. Στόχος: 80–120 λέξεις, επαγγελματικό
ύφος, με 3-5 keywords σχετικά με τον κλάδο του εργαζόμενου.

${industryHint}

Καλύπτεις ΟΛΟΥΣ τους κλάδους: εστίαση, φιλοξενία, λιανικό εμπόριο, logistics, χειρωνακτικά
επαγγέλματα, υπηρεσίες, γραφείο. ΜΗΝ υποθέτεις τουριστικό κλάδο αν δεν προκύπτει από τους
ρόλους. ΜΗΝ προσθέσεις δεξιότητες ή εμπειρίες που δεν υπάρχουν στο input.

Στοιχεία:
Όνομα: ${profile?.full_name || ''}
Ρόλοι: ${profile?.roles_csv || '(δεν δηλώθηκαν)'}
Χρόνια εμπειρίας: ${profile?.years_of_experience || 0}
Διαθεσιμότητα: ${profile?.availability || ''}
Bio τώρα: ${profile?.bio || '(κενό)'}`;

  let optimized = '';
  try {
    const aiRes: any = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 350,
    });
    optimized = aiRes?.response || aiRes?.result?.response || '';
  } catch {}
  if (!optimized) return error(c, 'AI_FAILED', 'Δεν μπόρεσε να γίνει optimization. Δοκιμάστε ξανά.', 500);
  return success(c, { bio: optimized });
});

// ---------------------------------------------------------------------
// POST /workers/boost/discover — 24h top placement στο /discover.
//   Cost: 2 credits (free / unlimited για Premium).
// ---------------------------------------------------------------------
workers.post('/boost/discover', requireAuth, requireRole('worker'), async (c) => {
  const user = c.get('user');
  const env: any = c.env;
  const premium = await isPremium(env, user.id);
  let cost = 0;
  if (!premium) {
    cost = 2;
    try { await debitCredits(env, user.id, cost, 'Boost στο Discover (24h)'); }
    catch { return error(c, 'INSUFFICIENT_CREDITS', 'Δεν έχετε αρκετά credits (απαιτούνται 2).', 402); }
  }
  const id = `bst_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  await env.DB.prepare(
    `INSERT INTO worker_boosts (id, user_id, kind, target_id, expires_at, credit_cost, created_at)
     VALUES (?, ?, 'discover', NULL, ?, ?, datetime('now'))`,
  )
    .bind(id, user.id, expiresAt, cost)
    .run();
  return success(c, { id, expiresAt, kind: 'discover' });
});

// ---------------------------------------------------------------------
// POST /workers/boost/application — η αίτηση εμφανίζεται πρώτη στους
//   applicants μιας συγκεκριμένης αγγελίας. Cost: 1 credit.
// ---------------------------------------------------------------------
workers.post('/boost/application', requireAuth, requireRole('worker'), async (c) => {
  const user = c.get('user');
  const env: any = c.env;
  const body = await c.req.json<{ jobId: string }>().catch(() => null as any);
  if (!body?.jobId) return error(c, 'VALIDATION', 'Λείπει το jobId.', 400);

  const premium = await isPremium(env, user.id);
  let cost = 0;
  if (!premium) {
    cost = 1;
    try { await debitCredits(env, user.id, cost, `Boost αίτησης για αγγελία ${body.jobId}`); }
    catch { return error(c, 'INSUFFICIENT_CREDITS', 'Δεν έχετε αρκετά credits (απαιτείται 1).', 402); }
  }
  const id = `bst_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  // The boost lasts as long as the job is open — we use 30 days as upper bound.
  const expiresAt = new Date(Date.now() + 30 * 86_400_000).toISOString();
  await env.DB.prepare(
    `INSERT INTO worker_boosts (id, user_id, kind, target_id, expires_at, credit_cost, created_at)
     VALUES (?, ?, 'application', ?, ?, ?, datetime('now'))`,
  )
    .bind(id, user.id, body.jobId, expiresAt, cost)
    .run();
  return success(c, { id, expiresAt, kind: 'application', jobId: body.jobId });
});

export default workers;
