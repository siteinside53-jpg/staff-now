import { Hono } from 'hono';
import type { Env, AuthUser } from '../types';
import { requireAuth, requireRole } from '../middleware/auth';
import { success, error, paginated } from '../lib/response';
import { generateId } from '../lib/id';
import { resolveAllPlans, resolvePlan } from '../lib/plans';
import type { PlanId } from '@staffnow/config';
import { PLANS } from '@staffnow/config';
import { hashPassword } from '../lib/password';

const admin = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// All routes require admin role
admin.use('*', requireAuth, requireRole('admin'));

// =====================================================================
// Shared analytics queries — used by REST endpoints (/stats,
// /analytics/series) AND by the SSE stream (/analytics/stream).
// Extracted so the live stream stays in sync with the one-shot REST
// responses without code duplication.
// =====================================================================
async function computeStats(env: Env) {
  const db = env.DB;

  const [
    totalUsers,
    totalWorkers,
    totalBusinesses,
    totalJobs,
    publishedJobs,
    totalMatches,
    activeSubscriptions,
    pendingVerifications,
    openReports,
    newUsersToday,
    newMatchesToday,
    newJobsToday,
    suspendedUsers,
    resolvedReports,
    dismissedReports,
    actionTakenReports,
    resolved7d,
    dismissed7d,
    actionTaken7d,
    avgResponseHours,
  ] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'worker'").first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'business'").first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM job_listings').first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM job_listings WHERE status = 'published'").first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM matches').first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'").first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM verification_requests WHERE status = 'pending'").first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM reports WHERE status = 'pending'").first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM users WHERE created_at >= date('now', 'start of day')").first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM matches WHERE matched_at >= date('now', 'start of day')").first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM job_listings WHERE created_at >= date('now', 'start of day')").first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'suspended'").first<{ count: number }>(),
    // Reports: per-status totals + last-7d activity + median moderation latency
    db.prepare("SELECT COUNT(*) as count FROM reports WHERE status = 'resolved'").first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM reports WHERE status = 'dismissed'").first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM reports WHERE status = 'action_taken'").first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM reports WHERE status = 'resolved' AND reviewed_at >= datetime('now', '-7 days')").first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM reports WHERE status = 'dismissed' AND reviewed_at >= datetime('now', '-7 days')").first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM reports WHERE status = 'action_taken' AND reviewed_at >= datetime('now', '-7 days')").first<{ count: number }>(),
    db.prepare("SELECT AVG((julianday(reviewed_at) - julianday(created_at)) * 24.0) as hours FROM reports WHERE reviewed_at IS NOT NULL").first<{ hours: number | null }>(),
  ]);

  const subscriptionsByPlan = await db
    .prepare("SELECT plan_id, COUNT(*) as count FROM subscriptions WHERE status = 'active' GROUP BY plan_id")
    .all();

  const usersByStatus = await db
    .prepare('SELECT status, COUNT(*) as count FROM users GROUP BY status')
    .all();

  return {
    users: {
      total: totalUsers?.count || 0,
      workers: totalWorkers?.count || 0,
      businesses: totalBusinesses?.count || 0,
      newToday: newUsersToday?.count || 0,
      suspended: suspendedUsers?.count || 0,
      byStatus: usersByStatus.results,
    },
    jobs: {
      total: totalJobs?.count || 0,
      published: publishedJobs?.count || 0,
      newToday: newJobsToday?.count || 0,
    },
    matches: {
      total: totalMatches?.count || 0,
      newToday: newMatchesToday?.count || 0,
    },
    subscriptions: {
      active: activeSubscriptions?.count || 0,
      byPlan: subscriptionsByPlan.results,
    },
    verifications: {
      pending: pendingVerifications?.count || 0,
    },
    reports: {
      pending: openReports?.count || 0,
      resolved: resolvedReports?.count || 0,
      dismissed: dismissedReports?.count || 0,
      action_taken: actionTakenReports?.count || 0,
      resolved7d: resolved7d?.count || 0,
      dismissed7d: dismissed7d?.count || 0,
      actionTaken7d: actionTaken7d?.count || 0,
      avgResponseHours: avgResponseHours?.hours ?? null,
    },
  };
}

async function computeSeries(env: Env, daysRaw: number) {
  const db = env.DB;
  const days = Number.isFinite(daysRaw) ? Math.max(1, Math.min(daysRaw, 90)) : 14;
  const modifier = `-${days} days`;

  const buildSeries = (rows: { day: string; count: number }[]): number[] => {
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.day, r.count);
    const result: number[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result.push(map.get(key) || 0);
    }
    return result;
  };

  const [signups, matches, jobs, messages] = await Promise.all([
    db
      .prepare(
        `SELECT date(created_at) as day, COUNT(*) as count
         FROM users
         WHERE created_at >= date('now', ?)
         GROUP BY day ORDER BY day`
      )
      .bind(modifier)
      .all(),
    db
      .prepare(
        `SELECT date(matched_at) as day, COUNT(*) as count
         FROM matches
         WHERE matched_at >= date('now', ?)
         GROUP BY day ORDER BY day`
      )
      .bind(modifier)
      .all(),
    db
      .prepare(
        `SELECT date(created_at) as day, COUNT(*) as count
         FROM job_listings
         WHERE created_at >= date('now', ?)
         GROUP BY day ORDER BY day`
      )
      .bind(modifier)
      .all(),
    db
      .prepare(
        `SELECT date(created_at) as day, COUNT(*) as count
         FROM messages
         WHERE created_at >= date('now', ?)
         GROUP BY day ORDER BY day`
      )
      .bind(modifier)
      .all(),
  ]);

  const signupsSeries = buildSeries(signups.results as any);

  return {
    signups: signupsSeries,
    matches: buildSeries(matches.results as any),
    jobs: buildSeries(jobs.results as any),
    messages: buildSeries(messages.results as any),
    // DAU approximation (deterministic, based on signups)
    dau: signupsSeries.map((v) => Math.max(1, v * 4)),
  };
}

// =====================================================================
// GET /stats — dashboard statistics
// =====================================================================
admin.get('/stats', async (c) => {
  return success(c, await computeStats(c.env));
});

// =====================================================================
// GET /users — paginated, filterable user list
// =====================================================================
admin.get('/users', async (c) => {
  const db = c.env.DB;

  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);
  const offset = (page - 1) * limit;

  const role = c.req.query('role');
  const status = c.req.query('status');
  const search = c.req.query('search');
  const sortBy = c.req.query('sortBy') || 'created_at';
  const sortOrder = c.req.query('sortOrder') === 'asc' ? 'ASC' : 'DESC';

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (role) {
    conditions.push('u.role = ?');
    params.push(role);
  }

  if (status) {
    conditions.push('u.status = ?');
    params.push(status);
  }

  if (search) {
    conditions.push('(u.email LIKE ? OR wp.full_name LIKE ? OR bp.company_name LIKE ?)');
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const allowedSortFields = ['created_at', 'last_login_at', 'email', 'role', 'status'];
  const safeSortBy = allowedSortFields.includes(sortBy) ? `u.${sortBy}` : 'u.created_at';

  const countResult = await db
    .prepare(
      `SELECT COUNT(*) as total
       FROM users u
       LEFT JOIN worker_profiles wp ON wp.user_id = u.id
       LEFT JOIN business_profiles bp ON bp.user_id = u.id
       ${whereClause}`
    )
    .bind(...params)
    .first<{ total: number }>();

  const total = countResult?.total || 0;

  // Both worker and business completeness are computed on-the-fly so the admin
  // panel always reflects the user's *current* profile state — even if the
  // stored `profile_completeness` column is stale (e.g. a worker added a photo
  // via a separate endpoint that doesn't recalculate the cached value, or
  // signed up before a field was added). The worker formula mirrors exactly
  // the one in routes/workers.ts → 10 evenly-weighted signals (10% each):
  //   1. full_name      (non-empty)
  //   2. bio            (non-empty)
  //   3. photo_url      (non-empty)
  //   4. region         (non-empty)
  //   5. city           (non-empty)
  //   6. availability   (not NULL)
  //   7. years_of_experience > 0  (excludes the default 0 from registration)
  //   8. expected_hourly_rate OR expected_monthly_salary  (any rate set)
  //   9. ≥1 selected role
  //  10. ≥1 declared language
  const results = await db
    .prepare(
      `SELECT u.id, u.email, u.role, u.status, u.created_at, u.last_login_at as last_login,
         wp.full_name as worker_full_name, wp.photo_url as worker_avatar,
         wp.verified as worker_verified,
         wp.years_of_experience as worker_years,
         (CASE WHEN wp.id IS NULL THEN NULL ELSE
           (
             (CASE WHEN wp.full_name IS NOT NULL AND TRIM(wp.full_name) != '' THEN 10 ELSE 0 END) +
             (CASE WHEN wp.bio IS NOT NULL AND TRIM(wp.bio) != '' THEN 10 ELSE 0 END) +
             (CASE WHEN wp.photo_url IS NOT NULL AND TRIM(wp.photo_url) != '' THEN 10 ELSE 0 END) +
             (CASE WHEN wp.region IS NOT NULL AND TRIM(wp.region) != '' THEN 10 ELSE 0 END) +
             (CASE WHEN wp.city IS NOT NULL AND TRIM(wp.city) != '' THEN 10 ELSE 0 END) +
             (CASE WHEN wp.availability IS NOT NULL THEN 10 ELSE 0 END) +
             (CASE WHEN wp.years_of_experience IS NOT NULL AND wp.years_of_experience > 0 THEN 10 ELSE 0 END) +
             (CASE WHEN wp.expected_hourly_rate IS NOT NULL OR wp.expected_monthly_salary IS NOT NULL THEN 10 ELSE 0 END) +
             (CASE WHEN EXISTS (SELECT 1 FROM worker_profile_roles WHERE worker_profile_id = wp.id) THEN 10 ELSE 0 END) +
             (CASE WHEN EXISTS (SELECT 1 FROM worker_profile_languages WHERE worker_profile_id = wp.id) THEN 10 ELSE 0 END)
           )
         END) as worker_completeness,
         bp.company_name, bp.logo_url as business_logo,
         bp.verified as business_verified,
         (CASE WHEN bp.id IS NULL THEN NULL ELSE
           (
             -- For each text field we COALESCE branch then profile so a fully
             -- filled business_branches row counts even when the legacy
             -- bp columns remain NULL. The user-facing forms write the
             -- branch first, so the admin used to miss most of the data.
             (CASE WHEN COALESCE(NULLIF(br.business_type, 'other'), NULLIF(bp.business_type, 'other')) IS NOT NULL THEN 10 ELSE 0 END) +
             (CASE WHEN COALESCE(NULLIF(TRIM(br.region), ''), NULLIF(TRIM(bp.region), '')) IS NOT NULL THEN 10 ELSE 0 END) +
             (CASE WHEN COALESCE(NULLIF(TRIM(br.address), ''), NULLIF(TRIM(bp.address), '')) IS NOT NULL THEN 10 ELSE 0 END) +
             (CASE WHEN COALESCE(NULLIF(TRIM(br.phone), ''), NULLIF(TRIM(bp.phone), '')) IS NOT NULL THEN 10 ELSE 0 END) +
             (CASE WHEN COALESCE(NULLIF(TRIM(br.website), ''), NULLIF(TRIM(bp.website), '')) IS NOT NULL THEN 10 ELSE 0 END) +
             (CASE WHEN LENGTH(TRIM(COALESCE(br.description, bp.description, ''))) >= 30 THEN 10 ELSE 0 END) +
             (CASE WHEN COALESCE(NULLIF(TRIM(br.logo_url), ''), NULLIF(TRIM(bp.logo_url), '')) IS NOT NULL THEN 10 ELSE 0 END) +
             (CASE WHEN bp.verified = 1 THEN 10 ELSE 0 END) +
             (CASE WHEN br.id IS NOT NULL THEN 10 ELSE 0 END) +
             (CASE WHEN EXISTS (SELECT 1 FROM job_listings j WHERE j.business_id = bp.id AND j.status = 'published') THEN 10 ELSE 0 END)
           )
         END) as business_completeness,
         sub.plan_id, sub.status as subscription_status
       FROM users u
       LEFT JOIN worker_profiles wp ON wp.user_id = u.id
       LEFT JOIN business_profiles bp ON bp.user_id = u.id
       LEFT JOIN business_branches br ON br.user_id = u.id
       LEFT JOIN subscriptions sub ON sub.user_id = u.id AND sub.status = 'active'
       ${whereClause}
       ORDER BY ${safeSortBy} ${sortOrder}
       LIMIT ? OFFSET ?`
    )
    .bind(...params, limit, offset)
    .all();

  // Map worker_full_name into first_name/last_name for frontend compatibility
  const mapped = (results.results as any[]).map((r) => {
    const fullName = (r.worker_full_name || '').trim();
    const parts = fullName.split(' ');
    return {
      ...r,
      first_name: parts[0] || null,
      last_name: parts.slice(1).join(' ') || null,
    };
  });

  return paginated(c, mapped, total, page, limit);
});

// =====================================================================
// POST /users/:id/suspend
// =====================================================================
admin.post('/users/:id/suspend', async (c) => {
  const targetId = c.req.param('id');
  const db = c.env.DB;
  const adminUser = c.get('user');
  const body = await c.req.json<{ reason?: string }>().catch(() => ({ reason: undefined }));

  const user = await db
    .prepare('SELECT id, email, role, status FROM users WHERE id = ?')
    .bind(targetId)
    .first<{ id: string; email: string; role: string; status: string }>();

  if (!user) return error(c, 'Ο χρήστης δεν βρέθηκε', 404);
  if (user.role === 'admin') return error(c, 'Δεν μπορείτε να αναστείλετε έναν διαχειριστή', 403);
  if (user.status === 'suspended') return error(c, 'Ο χρήστης είναι ήδη σε αναστολή', 400);

  const now = new Date().toISOString();

  await db
    .prepare("UPDATE users SET status = 'suspended', updated_at = ? WHERE id = ?")
    .bind(now, targetId)
    .run();

  // Audit log
  await db
    .prepare(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      generateId(),
      adminUser.id,
      'user_suspended',
      'user',
      targetId,
      JSON.stringify({ reason: body.reason || null, target_email: user.email }),
      now
    )
    .run();

  // Notify the user
  await db
    .prepare(
      `INSERT INTO notifications (id, user_id, type, title, body, read_at, created_at)
       VALUES (?, ?, 'system', ?, ?, NULL, ?)`
    )
    .bind(
      generateId(),
      targetId,
      'Αναστολή λογαριασμού',
      body.reason
        ? `Ο λογαριασμός σας ανεστάλη. Λόγος: ${body.reason}`
        : 'Ο λογαριασμός σας ανεστάλη. Επικοινωνήστε με την υποστήριξη.',
      now
    )
    .run();

  return success(c, { suspended: true, userId: targetId });
});

// =====================================================================
// POST /users/:id/unsuspend
// =====================================================================
admin.post('/users/:id/unsuspend', async (c) => {
  const targetId = c.req.param('id');
  const db = c.env.DB;
  const adminUser = c.get('user');

  const user = await db
    .prepare('SELECT id, status FROM users WHERE id = ?')
    .bind(targetId)
    .first<{ id: string; status: string }>();

  if (!user) return error(c, 'Ο χρήστης δεν βρέθηκε', 404);
  if (user.status !== 'suspended') return error(c, 'Ο χρήστης δεν είναι σε αναστολή', 400);

  const now = new Date().toISOString();

  await db
    .prepare("UPDATE users SET status = 'active', updated_at = ? WHERE id = ?")
    .bind(now, targetId)
    .run();

  await db
    .prepare(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(generateId(), adminUser.id, 'user_unsuspended', 'user', targetId, now)
    .run();

  await db
    .prepare(
      `INSERT INTO notifications (id, user_id, type, title, body, read_at, created_at)
       VALUES (?, ?, 'system', ?, ?, NULL, ?)`
    )
    .bind(
      generateId(),
      targetId,
      'Επαναφορά λογαριασμού',
      'Ο λογαριασμός σας έχει επαναφερθεί. Μπορείτε πλέον να χρησιμοποιήσετε κανονικά την πλατφόρμα.',
      now
    )
    .run();

  return success(c, { unsuspended: true, userId: targetId });
});

// =====================================================================
// POST /users/:id/message — admin sends a direct message to any user
// =====================================================================
admin.post('/users/:id/message', async (c) => {
  const targetId = c.req.param('id');
  const db = c.env.DB;
  const adminUser = c.get('user');
  const body = await c.req.json<{ content: string }>();

  if (!body?.content?.trim()) {
    return error(c, 'Το μήνυμα δεν μπορεί να είναι κενό', 400);
  }
  if (body.content.length > 5000) {
    return error(c, 'Το μήνυμα είναι πολύ μεγάλο (μέγιστο 5000 χαρακτήρες)', 400);
  }

  const target = await db
    .prepare('SELECT id, email, role FROM users WHERE id = ? AND status = \'active\'')
    .bind(targetId)
    .first<{ id: string; email: string; role: string }>();

  if (!target) return error(c, 'Ο χρήστης δεν βρέθηκε', 404);
  if (target.role === 'admin') return error(c, 'Δεν μπορείτε να στείλετε μήνυμα σε άλλο admin μέσω αυτής της οδού', 400);

  const now = new Date().toISOString();

  // Find or create admin match + conversation
  // Structure: worker_id = target (if worker) / business_id = target (if business)
  // Admin acts as "other side" for the purposes of the conversation
  const workerId = target.role === 'worker' ? target.id : adminUser.id;
  const businessId = target.role === 'business' ? target.id : adminUser.id;

  let match = await db
    .prepare("SELECT id FROM matches WHERE worker_id = ? AND business_id = ? AND status = 'active' LIMIT 1")
    .bind(workerId, businessId)
    .first<{ id: string }>();

  let conversationId: string;
  if (!match) {
    const newMatchId = generateId('mt');
    conversationId = generateId('cv');
    await db.prepare("INSERT INTO matches (id, worker_id, business_id, status, matched_at) VALUES (?, ?, ?, 'active', ?)").bind(newMatchId, workerId, businessId, now).run();
    await db.prepare("INSERT INTO conversations (id, match_id, worker_id, business_id, status, created_at) VALUES (?, ?, ?, ?, 'active', ?)").bind(conversationId, newMatchId, workerId, businessId, now).run();
  } else {
    const conv = await db.prepare('SELECT id FROM conversations WHERE match_id = ?').bind(match.id).first<{ id: string }>();
    if (!conv) {
      conversationId = generateId('cv');
      await db.prepare("INSERT INTO conversations (id, match_id, worker_id, business_id, status, created_at) VALUES (?, ?, ?, ?, 'active', ?)").bind(conversationId, match.id, workerId, businessId, now).run();
    } else {
      conversationId = conv.id;
    }
  }

  // Send message as admin
  const msgId = generateId();
  await db.prepare(
    `INSERT INTO messages (id, conversation_id, sender_id, content, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(msgId, conversationId, adminUser.id, body.content.trim(), now).run();

  // Update conversation last_message_at + unhide
  await db.prepare('UPDATE conversations SET last_message_at = ?, hidden_by = NULL WHERE id = ?').bind(now, conversationId).run();

  // Notify target
  await db.prepare(
    `INSERT INTO notifications (id, user_id, type, title, body, created_at)
     VALUES (?, ?, 'new_message', ?, ?, ?)`
  ).bind(generateId('nt'), targetId, 'Νέο μήνυμα από StaffNow', body.content.trim().slice(0, 100), now).run();

  // Audit log
  await db.prepare(
    `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, metadata, created_at)
     VALUES (?, ?, 'admin_message_sent', 'user', ?, ?, ?)`
  ).bind(generateId(), adminUser.id, targetId, JSON.stringify({ target_email: target.email, message_preview: body.content.slice(0, 100) }), now).run();

  return success(c, { conversationId, messageId: msgId, sent: true });
});

// =====================================================================
// GET /verifications
// =====================================================================
admin.get('/verifications', async (c) => {
  const db = c.env.DB;

  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 50);
  const offset = (page - 1) * limit;
  const status = c.req.query('status') || 'pending';

  const countResult = await db
    .prepare('SELECT COUNT(*) as total FROM verification_requests WHERE status = ?')
    .bind(status)
    .first<{ total: number }>();

  const total = countResult?.total || 0;

  const results = await db
    .prepare(
      `SELECT vr.*,
         u.email, u.role,
         wp.full_name as worker_full_name,
         bp.company_name
       FROM verification_requests vr
       JOIN users u ON u.id = vr.user_id
       LEFT JOIN worker_profiles wp ON wp.user_id = vr.user_id
       LEFT JOIN business_profiles bp ON bp.user_id = vr.user_id
       WHERE vr.status = ?
       ORDER BY vr.created_at ASC
       LIMIT ? OFFSET ?`
    )
    .bind(status, limit, offset)
    .all();

  return paginated(c, results.results, total, page, limit);
});

// =====================================================================
// POST /verifications/:id/review
// =====================================================================
admin.post('/verifications/:id/review', async (c) => {
  const verificationId = c.req.param('id');
  const db = c.env.DB;
  const adminUser = c.get('user');
  const body = await c.req.json<{ decision: 'approved' | 'rejected'; reason?: string }>();

  if (!body.decision || !['approved', 'rejected'].includes(body.decision)) {
    return error(c, 'Η απόφαση πρέπει να είναι "approved" ή "rejected"', 400);
  }

  const verification = await db
    .prepare('SELECT id, user_id, status, document_type FROM verification_requests WHERE id = ?')
    .bind(verificationId)
    .first<{ id: string; user_id: string; status: string; document_type: string }>();

  if (!verification) return error(c, 'Η αίτηση επαλήθευσης δεν βρέθηκε', 404);
  if (verification.status !== 'pending') return error(c, 'Η αίτηση έχει ήδη αξιολογηθεί', 400);

  const now = new Date().toISOString();

  await db
    .prepare(
      `UPDATE verification_requests
       SET status = ?, reviewed_by = ?, rejection_reason = ?, reviewed_at = ?
       WHERE id = ?`
    )
    .bind(body.decision, adminUser.id, body.reason || null, now, verificationId)
    .run();

  if (body.decision === 'approved') {
    await db
      .prepare('UPDATE worker_profiles SET verified = 1, updated_at = ? WHERE user_id = ?')
      .bind(now, verification.user_id)
      .run();
    await db
      .prepare('UPDATE business_profiles SET verified = 1, updated_at = ? WHERE user_id = ?')
      .bind(now, verification.user_id)
      .run();
  }

  await db
    .prepare(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      generateId(),
      adminUser.id,
      `verification_${body.decision}`,
      'verification',
      verificationId,
      JSON.stringify({ reason: body.reason || null }),
      now
    )
    .run();

  return success(c, { reviewed: true, verificationId, decision: body.decision });
});

// =====================================================================
// GET /reports — list reports
// =====================================================================
admin.get('/reports', async (c) => {
  const db = c.env.DB;

  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 50);
  const offset = (page - 1) * limit;
  const status = c.req.query('status') || 'pending';

  const countResult = await db
    .prepare('SELECT COUNT(*) as total FROM reports WHERE status = ?')
    .bind(status)
    .first<{ total: number }>();

  const total = countResult?.total || 0;

  const results = await db
    .prepare(
      `SELECT r.id, r.reporter_id, r.target_user_id as reported_id,
         r.reason as type, r.description as reason,
         r.status, r.created_at,
         reporter.email as reporter_email, reporter.role as reporter_role,
         reported.email as reported_email, reported.role as reported_role,
         wp_reporter.full_name as reporter_full_name,
         bp_reporter.company_name as reporter_company,
         wp_reported.full_name as reported_full_name,
         bp_reported.company_name as reported_company
       FROM reports r
       JOIN users reporter ON reporter.id = r.reporter_id
       JOIN users reported ON reported.id = r.target_user_id
       LEFT JOIN worker_profiles wp_reporter ON wp_reporter.user_id = r.reporter_id
       LEFT JOIN business_profiles bp_reporter ON bp_reporter.user_id = r.reporter_id
       LEFT JOIN worker_profiles wp_reported ON wp_reported.user_id = r.target_user_id
       LEFT JOIN business_profiles bp_reported ON bp_reported.user_id = r.target_user_id
       WHERE r.status = ?
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .bind(status, limit, offset)
    .all();

  // Map full_name → first_name/last_name for frontend
  const mapped = (results.results as any[]).map((r) => {
    const reporterParts = (r.reporter_full_name || '').split(' ');
    const reportedParts = (r.reported_full_name || '').split(' ');
    return {
      ...r,
      reporter_first_name: reporterParts[0] || null,
      reporter_last_name: reporterParts.slice(1).join(' ') || null,
      reported_first_name: reportedParts[0] || null,
      reported_last_name: reportedParts.slice(1).join(' ') || null,
    };
  });

  return paginated(c, mapped, total, page, limit);
});

// =====================================================================
// POST /reports/:id/review
// =====================================================================
admin.post('/reports/:id/review', async (c) => {
  const reportId = c.req.param('id');
  const db = c.env.DB;
  const adminUser = c.get('user');
  const body = await c.req.json<{
    decision: 'resolved' | 'dismissed' | 'action_taken';
    action?: 'warn' | 'suspend' | 'none';
    reason?: string;
  }>();

  if (!body.decision || !['resolved', 'dismissed', 'action_taken'].includes(body.decision)) {
    return error(c, 'Η απόφαση πρέπει να είναι "resolved", "dismissed" ή "action_taken"', 400);
  }

  const report = await db
    .prepare('SELECT id, reporter_id, target_user_id, status, reason, description FROM reports WHERE id = ?')
    .bind(reportId)
    .first<{
      id: string;
      reporter_id: string;
      target_user_id: string;
      status: string;
      reason: string;
      description: string;
    }>();

  if (!report) return error(c, 'Η αναφορά δεν βρέθηκε', 404);
  if (report.status !== 'pending') return error(c, 'Η αναφορά έχει ήδη αξιολογηθεί', 400);

  const now = new Date().toISOString();

  await db
    .prepare(
      `UPDATE reports
       SET status = ?, reviewed_by = ?, reviewed_at = ?
       WHERE id = ?`
    )
    .bind(body.decision, adminUser.id, now, reportId)
    .run();

  if (body.action === 'suspend') {
    await db
      .prepare("UPDATE users SET status = 'suspended', updated_at = ? WHERE id = ?")
      .bind(now, report.target_user_id)
      .run();

    await db
      .prepare(
        `INSERT INTO notifications (id, user_id, type, title, body, read_at, created_at)
         VALUES (?, ?, 'system', ?, ?, NULL, ?)`
      )
      .bind(
        generateId(),
        report.target_user_id,
        'Αναστολή λογαριασμού',
        'Ο λογαριασμός σας ανεστάλη μετά από αναφορά. Επικοινωνήστε με την υποστήριξη.',
        now
      )
      .run();
  }

  if (body.action === 'warn') {
    await db
      .prepare(
        `INSERT INTO notifications (id, user_id, type, title, body, read_at, created_at)
         VALUES (?, ?, 'system', ?, ?, NULL, ?)`
      )
      .bind(
        generateId(),
        report.target_user_id,
        'Προειδοποίηση',
        body.reason
          ? `Λάβατε προειδοποίηση: ${body.reason}`
          : 'Λάβατε προειδοποίηση. Παρακαλώ τηρήστε τους κανόνες της πλατφόρμας.',
        now
      )
      .run();
  }

  await db
    .prepare(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      generateId(),
      adminUser.id,
      `report_${body.decision}`,
      'report',
      reportId,
      JSON.stringify({ action: body.action || 'none', reason: body.reason || null }),
      now
    )
    .run();

  await db
    .prepare(
      `INSERT INTO notifications (id, user_id, type, title, body, read_at, created_at)
       VALUES (?, ?, 'system', ?, ?, NULL, ?)`
    )
    .bind(
      generateId(),
      report.reporter_id,
      'Ενημέρωση αναφοράς',
      'Η αναφορά σας αξιολογήθηκε από την ομάδα μας. Σας ευχαριστούμε.',
      now
    )
    .run();

  return success(c, { reviewed: true, reportId, decision: body.decision, action: body.action || 'none' });
});

// =====================================================================
// GET /jobs — admin job moderation
// =====================================================================
admin.get('/jobs', async (c) => {
  const db = c.env.DB;
  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);
  const offset = (page - 1) * limit;
  const status = c.req.query('status');
  const search = c.req.query('search');

  const conditions: string[] = [];
  const params: any[] = [];

  if (status) {
    conditions.push('j.status = ?');
    params.push(status);
  }
  if (search) {
    conditions.push('(j.title LIKE ? OR bp.company_name LIKE ? OR j.city LIKE ? OR br.name LIKE ?)');
    const t = `%${search}%`;
    params.push(t, t, t, t);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await db
    .prepare(`SELECT COUNT(*) as total FROM job_listings j LEFT JOIN business_profiles bp ON bp.id = j.business_id LEFT JOIN business_branches br ON br.user_id = bp.user_id ${where}`)
    .bind(...params)
    .first<{ total: number }>();

  const results = await db
    .prepare(
      `SELECT j.id, j.title, j.city, j.region, j.employment_type,
         j.salary_min, j.salary_max, j.salary_type, j.status, j.created_at,
         COALESCE(NULLIF(bp.company_name, ''), NULLIF(br.name, '')) as company_name,
         bp.user_id as business_user_id,
         (SELECT COUNT(*) FROM swipes WHERE target_id = j.id AND target_type = 'job' AND direction = 'like') as interested_count,
         -- matches.job_id is mostly NULL (matches are tracked at the
         -- worker↔business level, not per-job). Count workers who swiped
         -- THIS job AND have an active match with the business.
         (SELECT COUNT(*) FROM swipes s
            JOIN matches m ON m.worker_id = s.swiper_id AND m.business_id = bp.user_id AND m.status = 'active'
            WHERE s.target_id = j.id AND s.target_type = 'job' AND s.direction = 'like'
         ) as matches_count,
         (SELECT COUNT(*) FROM reports WHERE target_user_id = bp.user_id) as reports_count
       FROM job_listings j
       LEFT JOIN business_profiles bp ON bp.id = j.business_id
       LEFT JOIN business_branches br ON br.user_id = bp.user_id
       ${where}
       ORDER BY j.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .bind(...params, limit, offset)
    .all();

  return paginated(c, results.results, countRes?.total || 0, page, limit);
});

// =====================================================================
// POST /jobs/:id/pause | /unpause | DELETE /jobs/:id
// =====================================================================
admin.post('/jobs/:id/pause', async (c) => {
  const id = c.req.param('id');
  const adminUser = c.get('user');
  const now = new Date().toISOString();
  await c.env.DB.prepare("UPDATE job_listings SET status = 'paused', updated_at = ? WHERE id = ?").bind(now, id).run();
  await c.env.DB
    .prepare(`INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, created_at) VALUES (?, ?, 'job_paused', 'job', ?, ?)`)
    .bind(generateId(), adminUser.id, id, now)
    .run();
  return success(c, { paused: true });
});

admin.post('/jobs/:id/unpause', async (c) => {
  const id = c.req.param('id');
  const adminUser = c.get('user');
  const now = new Date().toISOString();
  await c.env.DB.prepare("UPDATE job_listings SET status = 'published', updated_at = ? WHERE id = ?").bind(now, id).run();
  await c.env.DB
    .prepare(`INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, created_at) VALUES (?, ?, 'job_unpaused', 'job', ?, ?)`)
    .bind(generateId(), adminUser.id, id, now)
    .run();
  return success(c, { unpaused: true });
});

admin.delete('/jobs/:id', async (c) => {
  const id = c.req.param('id');
  const adminUser = c.get('user');
  const now = new Date().toISOString();
  await c.env.DB.prepare("UPDATE job_listings SET status = 'archived', updated_at = ? WHERE id = ?").bind(now, id).run();
  await c.env.DB
    .prepare(`INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, created_at) VALUES (?, ?, 'job_deleted', 'job', ?, ?)`)
    .bind(generateId(), adminUser.id, id, now)
    .run();
  return success(c, { archived: true });
});

// =====================================================================
// GET /matches — admin matches monitoring
// =====================================================================
admin.get('/matches', async (c) => {
  const db = c.env.DB;
  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);
  const offset = (page - 1) * limit;
  const status = c.req.query('status');
  const range = c.req.query('range') || 'all';

  const conditions: string[] = [];
  const params: any[] = [];

  if (status) {
    conditions.push('m.status = ?');
    params.push(status);
  }

  if (range === 'today') {
    conditions.push("m.matched_at >= date('now', 'start of day')");
  } else if (range === '7d') {
    conditions.push("m.matched_at >= date('now', '-7 days')");
  } else if (range === '30d') {
    conditions.push("m.matched_at >= date('now', '-30 days')");
  }
  // 'all' or any other value → no date filter

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await db
    .prepare(`SELECT COUNT(*) as total FROM matches m ${where}`)
    .bind(...params)
    .first<{ total: number }>();

  const results = await db
    .prepare(
      `SELECT m.id, m.worker_id, m.business_id, m.job_id, m.status, m.matched_at,
         wp.full_name as worker_name, wp.photo_url as worker_avatar,
         COALESCE(NULLIF(bp.company_name, ''), NULLIF(br.name, '')) as company_name,
         COALESCE(br.logo_url, bp.logo_url) as business_logo,
         j.title as job_title,
         (SELECT id FROM conversations WHERE match_id = m.id LIMIT 1) as conversation_id,
         (SELECT COUNT(*) FROM messages WHERE conversation_id = (SELECT id FROM conversations WHERE match_id = m.id LIMIT 1)) as message_count
       FROM matches m
       LEFT JOIN worker_profiles wp ON wp.user_id = m.worker_id
       LEFT JOIN business_profiles bp ON bp.user_id = m.business_id
       LEFT JOIN business_branches br ON br.user_id = bp.user_id
       LEFT JOIN job_listings j ON j.id = m.job_id
       ${where}
       ORDER BY m.matched_at DESC
       LIMIT ? OFFSET ?`
    )
    .bind(...params, limit, offset)
    .all();

  return paginated(c, results.results, countRes?.total || 0, page, limit);
});

// =====================================================================
// GET /conversations — admin monitoring of conversations
//
// Returns metadata only by default (no message bodies). Privacy-preserving:
// admins see participants, message count, last activity, but full content
// requires explicit drill-down (not implemented here for safety).
// =====================================================================
admin.get('/conversations', async (c) => {
  const db = c.env.DB;
  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);
  const offset = (page - 1) * limit;
  const status = c.req.query('status'); // 'active' | 'archived' | undefined
  const range = c.req.query('range') || '30d'; // 'today' | '7d' | '30d' | 'all'
  const search = c.req.query('search');

  const conditions: string[] = [];
  const params: any[] = [];

  if (status) {
    conditions.push('cv.status = ?');
    params.push(status);
  }
  if (range === 'today') {
    conditions.push("cv.created_at >= date('now', 'start of day')");
  } else if (range === '7d') {
    conditions.push("cv.created_at >= date('now', '-7 days')");
  } else if (range === '30d') {
    conditions.push("cv.created_at >= date('now', '-30 days')");
  }
  if (search) {
    conditions.push('(wp.full_name LIKE ? OR bp.company_name LIKE ?)');
    const t = `%${search}%`;
    params.push(t, t);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await db
    .prepare(
      `SELECT COUNT(*) as total
         FROM conversations cv
         LEFT JOIN worker_profiles wp ON wp.user_id = cv.worker_id
         LEFT JOIN business_profiles bp ON bp.user_id = cv.business_id
         LEFT JOIN business_branches br ON br.user_id = cv.business_id
         ${where}`,
    )
    .bind(...params)
    .first<{ total: number }>();

  const results = await db
    .prepare(
      `SELECT cv.id, cv.match_id, cv.worker_id, cv.business_id, cv.status, cv.created_at,
         wp.full_name as worker_name, wp.photo_url as worker_avatar,
         COALESCE(NULLIF(bp.company_name, ''), NULLIF(br.name, '')) as company_name,
         COALESCE(br.logo_url, bp.logo_url) as business_logo,
         (SELECT COUNT(*) FROM messages WHERE conversation_id = cv.id) as message_count,
         (SELECT MAX(created_at) FROM messages WHERE conversation_id = cv.id) as last_message_at,
         (SELECT COUNT(*) FROM reports WHERE target_user_id IN (cv.worker_id, cv.business_id)) as reports_count
       FROM conversations cv
       LEFT JOIN worker_profiles wp ON wp.user_id = cv.worker_id
       LEFT JOIN business_profiles bp ON bp.user_id = cv.business_id
       LEFT JOIN business_branches br ON br.user_id = cv.business_id
       ${where}
       ORDER BY cv.created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .bind(...params, limit, offset)
    .all();

  return paginated(c, results.results, countRes?.total || 0, page, limit);
});

// =====================================================================
// GET /conversations/:id/messages — full message history for one conversation.
// Privacy guard: every read is logged in audit_logs so we have a paper trail
// of any admin who accessed user content.
// =====================================================================
admin.get('/conversations/:id/messages', async (c) => {
  const id = c.req.param('id');
  const adminUser = c.get('user');
  const db = c.env.DB;

  const conv = await db
    .prepare(
      `SELECT cv.id, cv.worker_id, cv.business_id, cv.status, cv.created_at,
         wp.full_name as worker_name, wp.photo_url as worker_avatar,
         COALESCE(NULLIF(bp.company_name, ''), NULLIF(br.name, '')) as company_name,
         COALESCE(br.logo_url, bp.logo_url) as business_logo
       FROM conversations cv
       LEFT JOIN worker_profiles wp ON wp.user_id = cv.worker_id
       LEFT JOIN business_profiles bp ON bp.user_id = cv.business_id
       LEFT JOIN business_branches br ON br.user_id = cv.business_id
       WHERE cv.id = ?`
    )
    .bind(id)
    .first<any>();

  if (!conv) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Η συνομιλία δεν βρέθηκε' } }, 404);

  const messages = await db
    .prepare(
      `SELECT id, sender_id, content, created_at, read_at
       FROM messages
       WHERE conversation_id = ?
       ORDER BY created_at ASC`
    )
    .bind(id)
    .all();

  // Audit-log this content access.
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, created_at)
       VALUES (?, ?, 'conversation_view', 'conversation', ?, ?)`
    )
    .bind(generateId(), adminUser.id, id, now)
    .run();

  return c.json({
    success: true,
    data: {
      conversation: conv,
      messages: messages.results || [],
    },
  });
});

// =====================================================================
// GET /subscriptions — subscriptions overview
// =====================================================================
admin.get('/subscriptions', async (c) => {
  const db = c.env.DB;

  const [byPlan, totalActive, totalCanceled, activePlans] = await Promise.all([
    db
      .prepare(
        `SELECT plan_id, status, COUNT(*) as count
         FROM subscriptions
         GROUP BY plan_id, status`
      )
      .all(),
    db.prepare("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'").first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'canceled'").first<{ count: number }>(),
    db
      .prepare(
        `SELECT plan_id, COUNT(*) as count
         FROM subscriptions
         WHERE status = 'active'
         GROUP BY plan_id`
      )
      .all(),
  ]);

  return success(c, {
    byPlan: byPlan.results,
    totals: {
      active: totalActive?.count || 0,
      canceled: totalCanceled?.count || 0,
    },
    activePlans: activePlans.results,
  });
});

// =====================================================================
// GET /payments — list of payment events (from subscriptions)
// =====================================================================
admin.get('/payments', async (c) => {
  const db = c.env.DB;
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);

  const results = await db
    .prepare(
      `SELECT s.id, s.plan_id, s.status, s.created_at, s.stripe_subscription_id,
         u.email, u.role,
         bp.company_name,
         wp.full_name as worker_name
       FROM subscriptions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN business_profiles bp ON bp.user_id = u.id
       LEFT JOIN worker_profiles wp ON wp.user_id = u.id
       ORDER BY s.created_at DESC
       LIMIT ?`
    )
    .bind(limit)
    .all();

  return success(c, results.results);
});

// =====================================================================
// GET /audit-log — complete admin actions history
// =====================================================================
admin.get('/audit-log', async (c) => {
  const db = c.env.DB;
  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);
  const offset = (page - 1) * limit;
  const action = c.req.query('action');
  const adminId = c.req.query('admin_id');

  const conditions: string[] = [];
  const params: any[] = [];

  if (action) {
    conditions.push('al.action = ?');
    params.push(action);
  }
  if (adminId) {
    conditions.push('al.user_id = ?');
    params.push(adminId);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await db
    .prepare(`SELECT COUNT(*) as total FROM audit_logs al ${where}`)
    .bind(...params)
    .first<{ total: number }>();

  const results = await db
    .prepare(
      `SELECT al.*,
              u.email as admin_email,
              COALESCE(wp.full_name, bp.company_name, u.display_name) as admin_name
         FROM audit_logs al
         LEFT JOIN users u ON u.id = al.user_id
         LEFT JOIN worker_profiles wp ON wp.user_id = al.user_id
         LEFT JOIN business_profiles bp ON bp.user_id = al.user_id
         ${where}
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .bind(...params, limit, offset)
    .all();

  return paginated(c, results.results, {
    page,
    perPage: limit,
    total: countRes?.total || 0,
  });
});

// =====================================================================
// GET /events — system events feed
// =====================================================================
admin.get('/events', async (c) => {
  const db = c.env.DB;
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 50);
  const acked = await loadAckedEventIds(c.env);

  const [recentReports, recentSignups, recentSuspensions, failedPayments] = await Promise.all([
    db
      .prepare(
        `SELECT r.id, r.created_at, r.reason, r.description, u.email
         FROM reports r
         JOIN users u ON u.id = r.target_user_id
         WHERE r.status = 'pending'
         ORDER BY r.created_at DESC LIMIT 5`
      )
      .all(),
    db
      .prepare(
        `SELECT id, email, role, created_at FROM users
         WHERE created_at >= datetime('now', '-7 days')
         ORDER BY created_at DESC LIMIT 5`
      )
      .all(),
    db
      .prepare(
        `SELECT al.id, al.created_at, al.action, al.metadata
         FROM audit_logs al
         WHERE al.action IN ('user_suspended', 'job_deleted')
         ORDER BY al.created_at DESC LIMIT 5`
      )
      .all(),
    db
      .prepare(
        `SELECT id, created_at, amount_cents, currency, user_id
         FROM payments
         WHERE status = 'failed'
         ORDER BY created_at DESC LIMIT 5`,
      )
      .all()
      .catch(() => ({ results: [] as any[] })),
  ]);

  const events: any[] = [];

  for (const r of recentReports.results as any[]) {
    const id = `ev_rep_${r.id}`;
    events.push({
      id, type: 'report', title: 'Νέα αναφορά',
      body: `${r.email} — ${r.reason || 'χωρίς λεπτομέρειες'}`,
      severity: 'high', read: acked.has(id), createdAt: r.created_at,
    });
  }

  for (const s of recentSignups.results as any[]) {
    const id = `ev_su_${s.id}`;
    events.push({
      id, type: 'signup', title: 'Νέα εγγραφή',
      body: `${s.email} (${s.role})`,
      severity: 'low', read: acked.has(id) || true, createdAt: s.created_at,
    });
  }

  for (const s of recentSuspensions.results as any[]) {
    const id = `ev_sus_${s.id}`;
    events.push({
      id, type: 'suspicious', title: 'Διαχειριστική ενέργεια',
      body: s.action === 'user_suspended' ? 'Αναστολή χρήστη' : 'Διαγραφή αγγελίας',
      severity: 'medium', read: acked.has(id), createdAt: s.created_at,
    });
  }

  for (const p of failedPayments.results as any[]) {
    const id = `ev_pay_${p.id}`;
    const amt = p.amount_cents != null ? `${(p.amount_cents / 100).toFixed(2)}${p.currency || 'EUR'}` : '';
    events.push({
      id, type: 'payment_failed', title: 'Αποτυχία πληρωμής',
      body: `Χρήστης ${p.user_id || '—'}${amt ? ' — ' + amt : ''}`,
      severity: 'high', read: acked.has(id), createdAt: p.created_at,
    });
  }

  events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return success(c, events.slice(0, limit));
});

// =====================================================================
// GET /analytics/series — time-series data for sparklines
// =====================================================================
admin.get('/analytics/series', async (c) => {
  const rawDays = parseInt(c.req.query('days') || '14', 10);
  return success(c, await computeSeries(c.env, rawDays));
});

// =====================================================================
// GET /admin-users — list of platform admins
// =====================================================================
admin.get('/admin-users', async (c) => {
  const db = c.env.DB;
  const results = await db
    .prepare(
      `SELECT id, email, display_name, status, last_login_at, created_at, role
       FROM users
       WHERE role = 'admin'
       ORDER BY created_at ASC`
    )
    .all();
  return success(c, results.results);
});

// =====================================================================
// GET /settings/flags — read feature flags from KV
// =====================================================================
admin.get('/settings/flags', async (c) => {
  try {
    const raw = await c.env.KV.get('platform:feature_flags');
    const flags = raw ? JSON.parse(raw) : {};
    return success(c, flags);
  } catch {
    return success(c, {});
  }
});

// =====================================================================
// POST /settings/flags — save feature flags to KV
// =====================================================================
admin.post('/settings/flags', async (c) => {
  const body = await c.req.json();
  const adminUser = c.get('user');

  await c.env.KV.put('platform:feature_flags', JSON.stringify(body));

  // Audit
  const db = c.env.DB;
  await db
    .prepare(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, metadata, created_at)
       VALUES (?, ?, 'settings_flags_updated', 'settings', 'feature_flags', ?, ?)`
    )
    .bind(generateId(), adminUser.id, JSON.stringify(body), new Date().toISOString())
    .run();

  return success(c, { saved: true });
});

// =====================================================================
// GET / POST /settings/moderation — moderation rule toggles (KV-backed)
// =====================================================================
admin.get('/settings/moderation', async (c) => {
  try {
    const raw = await c.env.KV.get('platform:moderation_rules');
    return success(c, raw ? JSON.parse(raw) : {});
  } catch {
    return success(c, {});
  }
});

admin.post('/settings/moderation', async (c) => {
  const body = await c.req.json();
  const adminUser = c.get('user');
  await c.env.KV.put('platform:moderation_rules', JSON.stringify(body));
  await c.env.DB
    .prepare(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, metadata, created_at)
       VALUES (?, ?, 'settings_moderation_updated', 'settings', 'moderation_rules', ?, ?)`,
    )
    .bind(generateId(), adminUser.id, JSON.stringify(body), new Date().toISOString())
    .run();
  return success(c, { saved: true });
});

// =====================================================================
// GET /settings/categories — real business_type distribution from D1
// =====================================================================
admin.get('/settings/categories', async (c) => {
  const db = c.env.DB;
  const rows = await db
    .prepare(
      `SELECT COALESCE(NULLIF(br.business_type, ''), 'unknown') as type, COUNT(DISTINCT bp.user_id) as count
       FROM business_profiles bp
       LEFT JOIN business_branches br ON br.user_id = bp.user_id
       GROUP BY type
       ORDER BY count DESC`,
    )
    .all();
  return success(c, { items: rows.results });
});

// =====================================================================
// GET /settings/plans-summary — real subscription counts per plan
// =====================================================================
admin.get('/settings/plans-summary', async (c) => {
  const db = c.env.DB;
  const rows = await db
    .prepare(
      `SELECT plan_id, COUNT(*) as count
       FROM subscriptions
       WHERE status = 'active'
       GROUP BY plan_id`,
    )
    .all();
  return success(c, { items: rows.results });
});

// =====================================================================
// PLAN EDITING (DB-backed overrides on top of static PLANS config)
// =====================================================================

// GET /plans/effective — defaults + DB overrides merged, ready for the UI
admin.get('/plans/effective', async (c) => {
  const plans = await resolveAllPlans(c.env);
  return success(c, { items: plans });
});

// PATCH /plans/:id — update overrides for a plan
const PATCHABLE_COLS = [
  'name_el', 'price_monthly', 'price_yearly', 'badge',
  'max_job_listings', 'max_active_matches', 'max_swipes_per_month', 'monthly_credits',
  'advanced_filters', 'boosted_visibility', 'verified_badge', 'favorite_lists',
  'priority_support', 'ai_shortlist', 'ai_hiring_chat', 'api_access',
  'premium_tick', 'unlimited_boosts', 'profile_views_stats', 'read_receipts',
  'monthly_credits_bonus',
] as const;

admin.patch('/plans/:id', async (c) => {
  const planId = c.req.param('id');
  if (!(planId in PLANS)) {
    return error(c, `Άγνωστο plan: ${planId}`, 400);
  }
  const body = await c.req.json<Record<string, unknown>>();
  const adminUser = c.get('user');
  const db = c.env.DB;

  // Build column / value pairs only for keys actually present in the body.
  const cols: string[] = [];
  const vals: unknown[] = [];
  for (const col of PATCHABLE_COLS) {
    if (col in body) {
      cols.push(col);
      const v = body[col];
      // Booleans become 0/1; null stays null; numbers/strings pass through.
      if (typeof v === 'boolean') vals.push(v ? 1 : 0);
      else if (v === null || v === undefined) vals.push(null);
      else vals.push(v);
    }
  }
  if (cols.length === 0) return error(c, 'Δεν δόθηκε κανένα πεδίο για ενημέρωση', 400);

  const now = new Date().toISOString();

  // UPSERT: insert if missing, otherwise update only the patched fields.
  const exists = await db
    .prepare('SELECT plan_id FROM plan_overrides WHERE plan_id = ?')
    .bind(planId)
    .first();

  if (exists) {
    const setClause = cols.map((c) => `${c} = ?`).join(', ');
    await db
      .prepare(
        `UPDATE plan_overrides SET ${setClause}, updated_by = ?, updated_at = ? WHERE plan_id = ?`,
      )
      .bind(...vals, adminUser.id, now, planId)
      .run();
  } else {
    const insertCols = ['plan_id', ...cols, 'updated_by', 'updated_at'].join(', ');
    const placeholders = ['?', ...cols.map(() => '?'), '?', '?'].join(', ');
    await db
      .prepare(`INSERT INTO plan_overrides (${insertCols}) VALUES (${placeholders})`)
      .bind(planId, ...vals, adminUser.id, now)
      .run();
  }

  await db
    .prepare(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, metadata, created_at)
       VALUES (?, ?, 'plan_updated', 'plan', ?, ?, ?)`,
    )
    .bind(generateId(), adminUser.id, planId, JSON.stringify(body), now)
    .run();

  const fresh = await resolvePlan(c.env, planId as PlanId);
  return success(c, fresh);
});

// =====================================================================
// ADMIN TEAM (RBAC labels)
// =====================================================================

const ADMIN_ROLES = ['super', 'operations', 'moderation', 'support', 'finance', 'analytics'] as const;

// GET /admins — list all admin users with their role labels
admin.get('/admins', async (c) => {
  const rows = await c.env.DB
    .prepare(
      `SELECT id, email, display_name, avatar_url, admin_role, status, created_at, last_login_at
       FROM users
       WHERE role = 'admin'
       ORDER BY created_at ASC`,
    )
    .all();
  return success(c, { items: rows.results });
});

// POST /admins — promote an existing user OR auto-create a new admin account.
// If a user with `email` already exists, promote them. Otherwise create a
// pending admin account with a random password + a one-time invite link the
// caller can share. The new admin lands the link on /auth/reset-password and
// sets their own password to log in for the first time.
admin.post('/admins', async (c) => {
  const body = await c.req.json<{ email: string; admin_role: string }>();
  const adminUser = c.get('user');
  const db = c.env.DB;
  const env = c.env;

  if (!body.email || !body.admin_role) return error(c, 'Email και ρόλος είναι υποχρεωτικά', 400);
  if (!ADMIN_ROLES.includes(body.admin_role as any)) return error(c, 'Άκυρος ρόλος', 400);

  const email = body.email.trim().toLowerCase();
  const now = new Date().toISOString();

  const existing = await db
    .prepare('SELECT id, email, role FROM users WHERE email = ?')
    .bind(email)
    .first<{ id: string; email: string; role: string }>();

  if (existing) {
    // Promote existing account
    await db
      .prepare("UPDATE users SET role = 'admin', admin_role = ?, updated_at = ? WHERE id = ?")
      .bind(body.admin_role, now, existing.id)
      .run();
    await db
      .prepare(
        `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, metadata, created_at)
         VALUES (?, ?, 'admin_team_added', 'user', ?, ?, ?)`,
      )
      .bind(generateId(), adminUser.id, existing.id, JSON.stringify({ admin_role: body.admin_role, previous_role: existing.role }), now)
      .run();
    return success(c, { added: true, user_id: existing.id, mode: 'promoted' });
  }

  // No existing account — create a fresh admin user with a random throw-away
  // password and a 7-day password-reset token. We surface the invite URL back
  // to the caller so they can share it manually until we wire transactional
  // email for invitations.
  const newId = generateId('usr');
  const randomPwd = crypto.randomUUID() + crypto.randomUUID();
  const passwordHash = await hashPassword(randomPwd, env.PASSWORD_SALT);
  const resetToken = generateId('rst');
  const resetExpiresAt = new Date(Date.now() + 7 * 24 * 3600_000).toISOString(); // 7 days

  await db
    .prepare(
      `INSERT INTO users (id, email, password_hash, role, status, email_verified,
                          password_reset_token, password_reset_expires_at,
                          admin_role, created_at, updated_at)
       VALUES (?, ?, ?, 'admin', 'active', 1, ?, ?, ?, ?, ?)`,
    )
    .bind(newId, email, passwordHash, resetToken, resetExpiresAt, body.admin_role, now, now)
    .run();

  await db
    .prepare(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, metadata, created_at)
       VALUES (?, ?, 'admin_team_invited', 'user', ?, ?, ?)`,
    )
    .bind(generateId(), adminUser.id, newId, JSON.stringify({ email, admin_role: body.admin_role }), now)
    .run();

  const appUrl = (env.API_URL || '').replace(/\/$/, '').replace(/^https?:\/\/api\./, 'https://');
  const baseUrl = appUrl && appUrl.startsWith('https://') ? appUrl : 'https://staffnow.gr';
  const inviteUrl = `${baseUrl}/auth/reset-password?token=${encodeURIComponent(resetToken)}`;

  return success(c, {
    added: true,
    user_id: newId,
    mode: 'created',
    invite_url: inviteUrl,
    invite_expires_at: resetExpiresAt,
    email,
  });
});

// PATCH /admins/:id — change role label for an existing admin
admin.patch('/admins/:id', async (c) => {
  const targetId = c.req.param('id');
  const body = await c.req.json<{ admin_role: string }>();
  const adminUser = c.get('user');
  if (!ADMIN_ROLES.includes(body.admin_role as any)) return error(c, 'Άκυρος ρόλος', 400);

  const now = new Date().toISOString();
  await c.env.DB
    .prepare("UPDATE users SET admin_role = ?, updated_at = ? WHERE id = ? AND role = 'admin'")
    .bind(body.admin_role, now, targetId)
    .run();
  await c.env.DB
    .prepare(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, metadata, created_at)
       VALUES (?, ?, 'admin_role_changed', 'user', ?, ?, ?)`,
    )
    .bind(generateId(), adminUser.id, targetId, JSON.stringify({ admin_role: body.admin_role }), now)
    .run();
  return success(c, { updated: true });
});

// DELETE /admins/:id — remove admin role (demote back to a normal user)
admin.delete('/admins/:id', async (c) => {
  const targetId = c.req.param('id');
  const adminUser = c.get('user');
  if (targetId === adminUser.id) return error(c, 'Δεν μπορείς να αφαιρέσεις τον εαυτό σου', 400);

  const now = new Date().toISOString();
  await c.env.DB
    .prepare("UPDATE users SET role = 'business', admin_role = NULL, updated_at = ? WHERE id = ?")
    .bind(now, targetId)
    .run();
  await c.env.DB
    .prepare(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, metadata, created_at)
       VALUES (?, ?, 'admin_team_removed', 'user', ?, '{}', ?)`,
    )
    .bind(generateId(), adminUser.id, targetId, now)
    .run();
  return success(c, { removed: true });
});

// =====================================================================
// NOTIFICATIONS — read-state acks (KV-backed)
// =====================================================================

async function loadAckedEventIds(env: Env): Promise<Set<string>> {
  try {
    const raw = await env.KV.get('admin:acked_events');
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}
async function saveAckedEventIds(env: Env, set: Set<string>) {
  // Cap the set so KV doesn't grow unbounded — keep the last 5000 acks.
  const arr = Array.from(set).slice(-5000);
  await env.KV.put('admin:acked_events', JSON.stringify(arr));
}

admin.post('/events/:id/read', async (c) => {
  const id = c.req.param('id');
  const set = await loadAckedEventIds(c.env);
  set.add(id);
  await saveAckedEventIds(c.env, set);
  return success(c, { acked: true });
});

admin.post('/events/read-all', async (c) => {
  const body = await c.req.json<{ ids: string[] }>().catch(() => ({ ids: [] as string[] }));
  if (!Array.isArray(body.ids)) return error(c, 'ids πρέπει να είναι array', 400);
  const set = await loadAckedEventIds(c.env);
  for (const id of body.ids) set.add(id);
  await saveAckedEventIds(c.env, set);
  return success(c, { acked: body.ids.length });
});

// =====================================================================
// SIDEBAR NAV BADGES — "new since I last visited" counts
// =====================================================================
// One KV key (`admin:nav_seen`) stores a JSON dict of per-section ISO
// timestamps. `GET /nav-counts` computes counts of new rows since each
// timestamp; `POST /nav-seen/:section` writes "now" so the badge clears.
// First-time bootstrap: when a section has no timestamp yet, we save
// "now" and return 0 — avoids showing huge backlogs to fresh installs.

const NAV_SECTIONS = [
  'jobs',
  'users',
  'employers',
  'workers',
  'matches',
  'messages',
  'reports',
  'security',
  'notifications',
] as const;
type NavSection = (typeof NAV_SECTIONS)[number];

async function loadNavSeen(env: Env): Promise<Record<string, string>> {
  try {
    const raw = await env.KV.get('admin:nav_seen');
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}
async function saveNavSeen(env: Env, state: Record<string, string>) {
  await env.KV.put('admin:nav_seen', JSON.stringify(state));
}

admin.get('/nav-counts', async (c) => {
  const seen = await loadNavSeen(c.env);
  const now = new Date().toISOString();

  // For any section that has never been "seen" yet, treat it as if it was
  // first visited *now* — so we don't dump entire history as new on a fresh
  // install. We do NOT persist this bootstrap to KV: writing on every poll
  // would exhaust the daily KV-write quota (the frontend polls every 30s,
  // and KV reads are eventually consistent so the bootstrap path would
  // repeatedly think state is empty). Real KV writes only happen in
  // POST /nav-seen/:section, which is event-driven (admin opens a section).
  const since = (s: NavSection) => seen[s] || now;
  const db = c.env.DB;

  const [
    jobsR,
    usersR,
    empR,
    wrkR,
    mchR,
    convR,
    repR,
    errR,
    pendingRepR,
    failedPayR,
  ] = await Promise.all([
    db.prepare('SELECT COUNT(*) AS c FROM job_listings WHERE created_at > ?').bind(since('jobs')).first<{ c: number }>(),
    db.prepare('SELECT COUNT(*) AS c FROM users WHERE created_at > ?').bind(since('users')).first<{ c: number }>(),
    db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'business' AND created_at > ?").bind(since('employers')).first<{ c: number }>(),
    db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'worker' AND created_at > ?").bind(since('workers')).first<{ c: number }>(),
    db.prepare('SELECT COUNT(*) AS c FROM matches WHERE matched_at > ?').bind(since('matches')).first<{ c: number }>(),
    db.prepare('SELECT COUNT(*) AS c FROM conversations WHERE created_at > ?').bind(since('messages')).first<{ c: number }>(),
    db.prepare('SELECT COUNT(*) AS c FROM reports WHERE created_at > ?').bind(since('reports')).first<{ c: number }>(),
    db.prepare('SELECT COUNT(*) AS c FROM error_logs WHERE created_at > ?').bind(since('security')).first<{ c: number }>(),
    // Notifications feed approximation: count event-source rows newer than
    // the section's last-seen mark. Mirrors the 4 generators in /admin/events.
    db.prepare("SELECT COUNT(*) AS c FROM reports WHERE status = 'pending' AND created_at > ?").bind(since('notifications')).first<{ c: number }>(),
    db.prepare("SELECT COUNT(*) AS c FROM payments WHERE status = 'failed' AND created_at > ?").bind(since('notifications')).first<{ c: number }>().catch(() => ({ c: 0 })),
  ]);

  // For notifications, also count fresh signups since last seen (matches the
  // event feed which lists recent registrations).
  const newSignupsForNotifs = await db
    .prepare('SELECT COUNT(*) AS c FROM users WHERE created_at > ?')
    .bind(since('notifications'))
    .first<{ c: number }>();

  const notificationsCount =
    (pendingRepR?.c || 0) + (failedPayR?.c || 0) + (newSignupsForNotifs?.c || 0);

  return success(c, {
    jobs: jobsR?.c || 0,
    users: usersR?.c || 0,
    employers: empR?.c || 0,
    workers: wrkR?.c || 0,
    matches: mchR?.c || 0,
    messages: convR?.c || 0,
    reports: repR?.c || 0,
    security: errR?.c || 0,
    notifications: notificationsCount,
  });
});

admin.post('/nav-seen/:section', async (c) => {
  const section = c.req.param('section');
  if (!(NAV_SECTIONS as readonly string[]).includes(section)) {
    return error(c, 'Άγνωστο section', 400);
  }
  const seen = await loadNavSeen(c.env);
  seen[section] = new Date().toISOString();
  await saveNavSeen(c.env, seen);
  return success(c, { ok: true });
});

// DELETE /plans/:id/overrides — wipe all overrides for a plan (revert to code defaults)
admin.delete('/plans/:id/overrides', async (c) => {
  const planId = c.req.param('id');
  if (!(planId in PLANS)) return error(c, 'Άγνωστο plan', 400);
  const adminUser = c.get('user');
  const now = new Date().toISOString();
  await c.env.DB.prepare('DELETE FROM plan_overrides WHERE plan_id = ?').bind(planId).run();
  await c.env.DB
    .prepare(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, metadata, created_at)
       VALUES (?, ?, 'plan_overrides_reset', 'plan', ?, '{}', ?)`,
    )
    .bind(generateId(), adminUser.id, planId, now)
    .run();
  const fresh = await resolvePlan(c.env, planId as PlanId);
  return success(c, fresh);
});

// =====================================================================
// LIVE ACTIVITY / SESSION ANALYTICS
// =====================================================================

const ONLINE_WINDOW_MIN = 5; // user is "online" if active in last N minutes

// GET /presence — counts of online / today / week, plus a list of currently-online users
admin.get('/presence', async (c) => {
  const db = c.env.DB;
  const since = new Date(Date.now() - ONLINE_WINDOW_MIN * 60_000).toISOString();
  const sinceToday = new Date();
  sinceToday.setHours(0, 0, 0, 0);
  const sinceTodayIso = sinceToday.toISOString();
  const sinceWeek = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [onlineRow, todayRow, weekRow, online] = await Promise.all([
    db
      .prepare(
        `SELECT COUNT(DISTINCT u.id) as count
         FROM users u
         WHERE u.last_seen_at IS NOT NULL AND u.last_seen_at >= ?`,
      )
      .bind(since)
      .first<{ count: number }>(),
    db
      .prepare(
        `SELECT COUNT(DISTINCT u.id) as count
         FROM users u
         WHERE u.last_seen_at IS NOT NULL AND u.last_seen_at >= ?`,
      )
      .bind(sinceTodayIso)
      .first<{ count: number }>(),
    db
      .prepare(
        `SELECT COUNT(DISTINCT u.id) as count
         FROM users u
         WHERE u.last_seen_at IS NOT NULL AND u.last_seen_at >= ?`,
      )
      .bind(sinceWeek)
      .first<{ count: number }>(),
    db
      .prepare(
        `SELECT u.id, u.email, u.role, u.display_name, u.last_seen_at,
            COALESCE(wp.full_name, bp.company_name, u.display_name, u.email) as name,
            COALESCE(wp.photo_url, bp.logo_url, u.avatar_url) as photo
         FROM users u
         LEFT JOIN worker_profiles wp ON wp.user_id = u.id
         LEFT JOIN business_profiles bp ON bp.user_id = u.id
         WHERE u.last_seen_at IS NOT NULL AND u.last_seen_at >= ?
         ORDER BY u.last_seen_at DESC
         LIMIT 30`,
      )
      .bind(since)
      .all(),
  ]);

  return success(c, {
    onlineNow: onlineRow?.count || 0,
    activeToday: todayRow?.count || 0,
    activeThisWeek: weekRow?.count || 0,
    onlineWindowMinutes: ONLINE_WINDOW_MIN,
    users: online.results || [],
  });
});

// GET /activity/live — combined live feed (logins, registrations, key actions)
admin.get('/activity/live', async (c) => {
  const db = c.env.DB;
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 200);
  const types = c.req.query('types'); // optional comma-separated filter

  let conditions = '';
  let params: any[] = [];
  if (types) {
    const list = types
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.length > 0) {
      conditions = `WHERE al.activity_type IN (${list.map(() => '?').join(',')})`;
      params = list;
    }
  }

  const res = await db
    .prepare(
      `SELECT al.id, al.user_id, al.activity_type, al.entity_type, al.entity_id,
              al.metadata, al.ip_address, al.user_agent, al.created_at,
              u.email as user_email, u.role as user_role,
              COALESCE(wp.full_name, bp.company_name, u.display_name, u.email) as user_name,
              COALESCE(wp.photo_url, bp.logo_url, u.avatar_url) as user_photo
       FROM user_activity_log al
       LEFT JOIN users u ON u.id = al.user_id
       LEFT JOIN worker_profiles wp ON wp.user_id = u.id
       LEFT JOIN business_profiles bp ON bp.user_id = u.id
       ${conditions}
       ORDER BY al.created_at DESC
       LIMIT ?`,
    )
    .bind(...params, limit)
    .all();

  return success(c, res.results || []);
});

// GET /signups/recent — most recent registrations
admin.get('/signups/recent', async (c) => {
  const db = c.env.DB;
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);
  const res = await db
    .prepare(
      `SELECT u.id, u.email, u.role, u.status, u.created_at, u.last_login_at, u.last_seen_at,
            COALESCE(wp.full_name, bp.company_name) as name,
            COALESCE(wp.photo_url, bp.logo_url) as photo,
            COALESCE(wp.region, bp.region) as region
         FROM users u
         LEFT JOIN worker_profiles wp ON wp.user_id = u.id
         LEFT JOIN business_profiles bp ON bp.user_id = u.id
         WHERE u.role IN ('worker', 'business')
         ORDER BY u.created_at DESC
         LIMIT ?`,
    )
    .bind(limit)
    .all();
  return success(c, res.results || []);
});

// GET /geo-stats — country/city breakdown of activity
admin.get('/geo-stats', async (c) => {
  const db = c.env.DB;
  const days = Math.max(1, Math.min(parseInt(c.req.query('days') || '30', 10) || 30, 90));
  const modifier = `-${days} days`;

  const [countries, cities, todayCountries, totals] = await Promise.all([
    db
      .prepare(
        `SELECT country, COUNT(DISTINCT user_id) as users, COUNT(*) as actions
         FROM user_activity_log
         WHERE country IS NOT NULL AND country <> ''
           AND created_at >= datetime('now', ?)
         GROUP BY country
         ORDER BY actions DESC
         LIMIT 30`,
      )
      .bind(modifier)
      .all(),
    db
      .prepare(
        `SELECT country, city, COUNT(DISTINCT user_id) as users, COUNT(*) as actions
         FROM user_activity_log
         WHERE city IS NOT NULL AND city <> ''
           AND created_at >= datetime('now', ?)
         GROUP BY country, city
         ORDER BY actions DESC
         LIMIT 30`,
      )
      .bind(modifier)
      .all(),
    db
      .prepare(
        `SELECT country, COUNT(DISTINCT user_id) as users
         FROM user_activity_log
         WHERE country IS NOT NULL AND country <> ''
           AND created_at >= datetime('now', '-1 day')
         GROUP BY country
         ORDER BY users DESC
         LIMIT 10`,
      )
      .all(),
    db
      .prepare(
        `SELECT COUNT(*) as totalActions,
                COUNT(DISTINCT country) as uniqueCountries,
                COUNT(DISTINCT city) as uniqueCities,
                COUNT(DISTINCT user_id) as uniqueUsers
         FROM user_activity_log
         WHERE created_at >= datetime('now', ?)`,
      )
      .bind(modifier)
      .first<any>(),
  ]);

  return success(c, {
    days,
    totals: totals || { totalActions: 0, uniqueCountries: 0, uniqueCities: 0, uniqueUsers: 0 },
    countries: countries.results || [],
    cities: cities.results || [],
    today: todayCountries.results || [],
  });
});

// GET /data-changes — Trust & Safety: every file/profile/job/branch mutation
admin.get('/data-changes', async (c) => {
  const db = c.env.DB;
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10) || 1);
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 200);
  const offset = (page - 1) * limit;
  const action = c.req.query('action');
  const entityType = c.req.query('entityType');
  const actorId = c.req.query('actorId');
  const ownerId = c.req.query('ownerId');
  const search = c.req.query('search');

  const conditions: string[] = [];
  const params: any[] = [];
  if (action) {
    conditions.push('dc.action = ?');
    params.push(action);
  }
  if (entityType) {
    conditions.push('dc.entity_type = ?');
    params.push(entityType);
  }
  if (actorId) {
    conditions.push('dc.actor_user_id = ?');
    params.push(actorId);
  }
  if (ownerId) {
    conditions.push('dc.entity_owner_id = ?');
    params.push(ownerId);
  }
  if (search) {
    conditions.push('(dc.actor_email LIKE ? OR dc.actor_name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows, totalRow] = await Promise.all([
    db
      .prepare(
        `SELECT dc.*,
                u.email as actor_email_join,
                COALESCE(wp.full_name, bp.company_name, u.display_name) as actor_name_join,
                COALESCE(wp.photo_url, bp.logo_url, u.avatar_url) as actor_photo,
                u.role as actor_role_join,
                ou.email as owner_email,
                COALESCE(owp.full_name, obp.company_name, ou.display_name) as owner_name
           FROM data_changes dc
           LEFT JOIN users u ON u.id = dc.actor_user_id
           LEFT JOIN worker_profiles wp ON wp.user_id = dc.actor_user_id
           LEFT JOIN business_profiles bp ON bp.user_id = dc.actor_user_id
           LEFT JOIN users ou ON ou.id = dc.entity_owner_id
           LEFT JOIN worker_profiles owp ON owp.user_id = dc.entity_owner_id
           LEFT JOIN business_profiles obp ON obp.user_id = dc.entity_owner_id
           ${whereSql}
           ORDER BY dc.created_at DESC
           LIMIT ? OFFSET ?`,
      )
      .bind(...params, limit, offset)
      .all<any>(),
    db
      .prepare(`SELECT COUNT(*) as c FROM data_changes dc ${whereSql}`)
      .bind(...params)
      .first<{ c: number }>(),
  ]);

  return paginated(c, rows.results || [], { page, perPage: limit, total: totalRow?.c || 0 });
});

// GET /live-visitors — real-time presence (logged-in + anonymous)
admin.get('/live-visitors', async (c) => {
  const db = c.env.DB;
  const windowSec = Math.max(15, Math.min(parseInt(c.req.query('windowSec') || '60', 10) || 60, 600));
  const cutoff = new Date(Date.now() - windowSec * 1000).toISOString();
  const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();

  const [loggedRes, anonRes] = await Promise.all([
    db
      .prepare(
        `SELECT u.id as user_id, u.email, u.role,
                COALESCE(wp.full_name, bp.company_name, u.display_name, u.email) as name,
                COALESCE(wp.photo_url, bp.logo_url, u.avatar_url) as photo,
                u.last_seen_at,
                (SELECT MAX(started_at) FROM user_sessions us WHERE us.user_id = u.id AND us.is_active = 1) as session_started_at,
                (SELECT current_path FROM user_sessions us WHERE us.user_id = u.id AND us.is_active = 1 ORDER BY started_at DESC LIMIT 1) as current_path,
                (SELECT country FROM user_sessions us WHERE us.user_id = u.id AND us.is_active = 1 ORDER BY started_at DESC LIMIT 1) as country,
                (SELECT city FROM user_sessions us WHERE us.user_id = u.id AND us.is_active = 1 ORDER BY started_at DESC LIMIT 1) as city,
                (SELECT region FROM user_sessions us WHERE us.user_id = u.id AND us.is_active = 1 ORDER BY started_at DESC LIMIT 1) as region,
                (SELECT ip_address FROM user_sessions us WHERE us.user_id = u.id AND us.is_active = 1 ORDER BY started_at DESC LIMIT 1) as ip_address
           FROM users u
           LEFT JOIN worker_profiles wp ON wp.user_id = u.id
           LEFT JOIN business_profiles bp ON bp.user_id = u.id
          WHERE u.last_seen_at IS NOT NULL AND u.last_seen_at >= ?
          ORDER BY u.last_seen_at DESC
          LIMIT 100`,
      )
      .bind(cutoff)
      .all<any>(),
    db
      .prepare(
        `SELECT visitor_id, first_seen_at, last_seen_at, current_path, page_views,
                country, city, region, ip_address, user_agent
           FROM anonymous_sessions
          WHERE last_seen_at >= ?
          ORDER BY last_seen_at DESC
          LIMIT 100`,
      )
      .bind(cutoff)
      .all<any>(),
  ]);

  const loggedVisitors = (loggedRes.results || []) as any[];
  const anonVisitors = (anonRes.results || []) as any[];

  // Page trails (last 5 page_views in last hour)
  const trailsByUser = new Map<string, Array<{ path: string; ts: string }>>();
  if (loggedVisitors.length > 0) {
    const userIds = loggedVisitors.map((v) => v.user_id);
    const placeholders = userIds.map(() => '?').join(',');
    const rows = await db
      .prepare(
        `SELECT user_id, entity_id as path, created_at as ts
           FROM user_activity_log
          WHERE activity_type = 'page_view'
            AND user_id IN (${placeholders})
            AND created_at >= ?
          ORDER BY created_at DESC`,
      )
      .bind(...userIds, oneHourAgo)
      .all<any>()
      .catch(() => ({ results: [] as any[] }));
    for (const r of rows.results || []) {
      const arr = trailsByUser.get(r.user_id) || [];
      if (arr.length < 5) arr.push({ path: r.path, ts: r.ts });
      trailsByUser.set(r.user_id, arr);
    }
  }

  const trailsByVisitor = new Map<string, Array<{ path: string; ts: string }>>();
  if (anonVisitors.length > 0) {
    const visitorIds = anonVisitors.map((v) => v.visitor_id);
    const placeholders = visitorIds.map(() => '?').join(',');
    const rows = await db
      .prepare(
        `SELECT visitor_id, entity_id as path, created_at as ts
           FROM anonymous_activity_log
          WHERE activity_type = 'page_view'
            AND visitor_id IN (${placeholders})
            AND created_at >= ?
          ORDER BY created_at DESC`,
      )
      .bind(...visitorIds, oneHourAgo)
      .all<any>()
      .catch(() => ({ results: [] as any[] }));
    for (const r of rows.results || []) {
      const arr = trailsByVisitor.get(r.visitor_id) || [];
      if (arr.length < 5) arr.push({ path: r.path, ts: r.ts });
      trailsByVisitor.set(r.visitor_id, arr);
    }
  }

  const visitors = [
    ...loggedVisitors.map((v) => ({
      kind: 'user' as const,
      id: v.user_id,
      name: v.name,
      email: v.email,
      role: v.role,
      photo: v.photo,
      country: v.country,
      city: v.city,
      region: v.region,
      ipMasked: maskIp(v.ip_address),
      currentPath: v.current_path,
      lastSeenAt: v.last_seen_at,
      sessionStartedAt: v.session_started_at,
      pageViews: (trailsByUser.get(v.user_id) || []).length,
      trail: trailsByUser.get(v.user_id) || [],
    })),
    ...anonVisitors.map((v) => ({
      kind: 'anon' as const,
      id: v.visitor_id,
      name: null,
      email: null,
      role: null,
      photo: null,
      country: v.country,
      city: v.city,
      region: v.region,
      ipMasked: maskIp(v.ip_address),
      currentPath: v.current_path,
      lastSeenAt: v.last_seen_at,
      sessionStartedAt: v.first_seen_at,
      pageViews: v.page_views || 0,
      trail: trailsByVisitor.get(v.visitor_id) || [],
    })),
  ].sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime());

  return success(c, {
    windowSec,
    cutoff,
    serverTime: new Date().toISOString(),
    totals: {
      loggedIn: loggedVisitors.length,
      anonymous: anonVisitors.length,
      total: visitors.length,
    },
    visitors,
  });
});

function maskIp(ip?: string | null): string | null {
  if (!ip) return null;
  if (ip.includes(':')) {
    const parts = ip.split(':').slice(0, 2);
    return `${parts.join(':')}::xxxx`;
  }
  const parts = ip.split('.');
  if (parts.length !== 4) return ip;
  return `${parts[0]}.${parts[1]}.${parts[2]}.x`;
}

// GET /jobs/:id/full — full job details (every column + roles + applicants)
admin.get('/jobs/:id/full', async (c) => {
  const db = c.env.DB;
  const jobId = c.req.param('id');

  const job = await db
    .prepare(
      `SELECT j.*, bp.user_id as business_user_id, bp.company_name,
              br.name as branch_name, br.city as branch_city, br.region as branch_region,
              br.address as branch_address
       FROM job_listings j
       LEFT JOIN business_profiles bp ON bp.id = j.business_id
       LEFT JOIN business_branches br ON br.id = j.branch_id
       WHERE j.id = ?`,
    )
    .bind(jobId)
    .first<any>();

  if (!job) return error(c, 'NOT_FOUND', 'Δεν βρέθηκε η αγγελία.', 404);

  const [roles, positions, applicants, swipesLikes, swipesSkips, matchesCount] = await Promise.all([
    db
      .prepare('SELECT role FROM job_listing_roles WHERE job_listing_id = ?')
      .bind(jobId)
      .all<{ role: string }>(),
    db
      .prepare(
        `SELECT id, role, description, salary_min, salary_max, salary_type, positions_count
         FROM job_positions WHERE job_listing_id = ?`,
      )
      .bind(jobId)
      .all<any>()
      .catch(() => ({ results: [] as any[] })),
    db
      .prepare(
        `SELECT s.id, s.swiper_id, s.created_at,
                COALESCE(wp.full_name, u.email) as swiper_name,
                wp.photo_url as swiper_photo,
                wp.region as swiper_region,
                CASE WHEN m.id IS NOT NULL THEN 1 ELSE 0 END as matched
         FROM swipes s
         LEFT JOIN users u ON u.id = s.swiper_id
         LEFT JOIN worker_profiles wp ON wp.user_id = s.swiper_id
         LEFT JOIN matches m ON m.worker_id = s.swiper_id
            AND m.business_id = ? AND m.status = 'active'
         WHERE s.target_id = ? AND s.target_type = 'job' AND s.direction = 'like'
         ORDER BY s.created_at DESC LIMIT 50`,
      )
      .bind(job.business_user_id, jobId)
      .all<any>()
      .catch(() => ({ results: [] as any[] })),
    db
      .prepare(
        "SELECT COUNT(*) as c FROM swipes WHERE target_id = ? AND target_type = 'job' AND direction = 'like'",
      )
      .bind(jobId)
      .first<{ c: number }>()
      .catch(() => ({ c: 0 })),
    db
      .prepare(
        "SELECT COUNT(*) as c FROM swipes WHERE target_id = ? AND target_type = 'job' AND direction = 'skip'",
      )
      .bind(jobId)
      .first<{ c: number }>()
      .catch(() => ({ c: 0 })),
    // Matches count: workers who swiped this job AND have an active match
    // with the business. matches.job_id is mostly NULL because matches are
    // typically created business-level (not tied to a specific job in DB).
    db
      .prepare(
        `SELECT COUNT(DISTINCT m.id) as c FROM matches m
         JOIN swipes s ON s.swiper_id = m.worker_id
         WHERE m.business_id = ?
           AND m.status = 'active'
           AND s.target_id = ?
           AND s.target_type = 'job'
           AND s.direction = 'like'`,
      )
      .bind(job.business_user_id, jobId)
      .first<{ c: number }>()
      .catch(() => ({ c: 0 })),
  ]);

  return success(c, {
    job,
    roles: (roles.results || []).map((r) => r.role),
    positions: positions.results || [],
    applicants: applicants.results || [],
    counts: {
      likes: swipesLikes?.c || 0,
      skips: swipesSkips?.c || 0,
      matches: matchesCount?.c || 0,
    },
  });
});

// GET /users/:id/timeline — full per-user activity timeline + profile + counts
admin.get('/users/:id/timeline', async (c) => {
  const db = c.env.DB;
  const userId = c.req.param('id');
  const limit = Math.min(parseInt(c.req.query('limit') || '100', 10), 500);

  const userRow = await db
    .prepare(
      `SELECT u.id, u.email, u.role, u.status, u.email_verified,
              u.created_at, u.updated_at, u.last_login_at, u.last_seen_at,
              u.display_name, u.avatar_url
         FROM users u
         WHERE u.id = ?`,
    )
    .bind(userId)
    .first<any>();

  if (!userRow) return error(c, 'NOT_FOUND', 'Δεν βρέθηκε ο χρήστης.', 404);

  // Pull role-specific profile
  let workerProfile: any = null;
  let businessProfile: any = null;
  let branches: any[] = [];
  if (userRow.role === 'worker') {
    workerProfile = await db
      .prepare('SELECT * FROM worker_profiles WHERE user_id = ?')
      .bind(userId)
      .first<any>();
  } else if (userRow.role === 'business') {
    businessProfile = await db
      .prepare('SELECT * FROM business_profiles WHERE user_id = ?')
      .bind(userId)
      .first<any>();

    // Fetch all business_branches for this user
    const branchesRes = await db
      .prepare('SELECT * FROM business_branches WHERE user_id = ? ORDER BY created_at ASC')
      .bind(userId)
      .all<any>();
    branches = branchesRes.results || [];

    // ---- Unified job fetch: ONE query for ALL jobs of this business ----
    // Why: previously we did N queries (one per branch) + a separate orphan query
    // that only matched `branch_id IS NULL`. Jobs whose branch_id pointed to a
    // deleted/renamed branch were silently dropped. We now fetch every row by
    // business_id and group in JS so nothing is lost.
    let allJobs: any[] = [];
    if (businessProfile?.id) {
      const jobsRes = await db
        .prepare(
          `SELECT id, branch_id, title, status, employment_type, salary_type,
                  salary_min, salary_max, city, region,
                  housing_provided, meals_provided, bonus_provided,
                  created_at, updated_at
           FROM job_listings
           WHERE business_id = ?
           ORDER BY created_at DESC`,
        )
        .bind(businessProfile.id)
        .all<any>();
      allJobs = jobsRes.results || [];
    }

    // Group jobs by branch_id; anything that doesn't match a real branch
    // becomes "orphan".
    const branchIds = new Set(branches.map((b: any) => b.id));
    const branchJobsMap = new Map<string, any[]>();
    const orphanJobs: any[] = [];
    for (const j of allJobs) {
      if (j.branch_id && branchIds.has(j.branch_id)) {
        const arr = branchJobsMap.get(j.branch_id) || [];
        arr.push(j);
        branchJobsMap.set(j.branch_id, arr);
      } else {
        orphanJobs.push(j);
      }
    }

    const computeCounts = (jobs: any[]) => ({
      total: jobs.length,
      published: jobs.filter((j) => j.status === 'published').length,
      paused: jobs.filter((j) => j.status === 'paused').length,
      archived: jobs.filter((j) => j.status === 'archived').length,
      draft: jobs.filter((j) => j.status === 'draft').length,
    });

    // If user has exactly ONE branch, attach orphan jobs to it (they
    // implicitly belong to the only business). Only show a separate
    // "ορφανές" section when there are 2+ branches and we can't tell where
    // an orphan job goes.
    if (orphanJobs.length > 0 && branches.length === 1) {
      const only = branches[0];
      const merged = (branchJobsMap.get(only.id) || []).concat(orphanJobs);
      // Re-sort by created_at DESC after merging
      merged.sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });
      branchJobsMap.set(only.id, merged);
      orphanJobs.length = 0; // consumed
    }

    for (const b of branches) {
      const jobs = branchJobsMap.get(b.id) || [];
      b.jobs = jobs;
      b.jobsCounts = computeCounts(jobs);
    }

    if (orphanJobs.length > 0) {
      branches.push({
        id: '__orphan__',
        name:
          branches.length > 0
            ? 'Αγγελίες χωρίς υποκατάστημα'
            : businessProfile?.company_name || 'Επιχείρηση',
        business_type: businessProfile?.business_type || null,
        city: businessProfile?.city || null,
        region: businessProfile?.region || null,
        phone: businessProfile?.phone || null,
        website: businessProfile?.website || null,
        address: businessProfile?.address || null,
        description: businessProfile?.description || null,
        logo_url: businessProfile?.logo_url || null,
        jobs: orphanJobs,
        jobsCounts: computeCounts(orphanJobs),
        __orphan: branches.length > 0,
      });
    }
  }

  // Compose user summary used by the UI header
  const name =
    workerProfile?.full_name ||
    businessProfile?.company_name ||
    userRow.display_name ||
    null;
  const photo = workerProfile?.photo_url || businessProfile?.logo_url || userRow.avatar_url || null;
  const region = workerProfile?.region || businessProfile?.region || null;
  const city = workerProfile?.city || businessProfile?.city || null;
  const phone = workerProfile?.phone || businessProfile?.phone || null;

  // Counts (run in parallel)
  const [
    activity,
    sessions,
    pages,
    matchesCount,
    swipesGiven,
    likesReceived,
    conversationsCount,
    messagesCount,
    jobsCount,
    publishedJobsCount,
    reportsAgainst,
    reportsBy,
    subscription,
  ] = await Promise.all([
    db
      .prepare(
        `SELECT id, activity_type, entity_type, entity_id, metadata, ip_address, user_agent, created_at
         FROM user_activity_log
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
      )
      .bind(userId, limit)
      .all(),
    db
      .prepare(
        `SELECT id, started_at, last_activity_at, ended_at, is_active, ip_address, user_agent
         FROM user_sessions
         WHERE user_id = ?
         ORDER BY started_at DESC
         LIMIT 20`,
      )
      .bind(userId)
      .all(),
    db
      .prepare(
        `SELECT entity_id as path, COUNT(*) as count
         FROM user_activity_log
         WHERE user_id = ? AND activity_type = 'page_view' AND entity_id IS NOT NULL
           AND created_at >= datetime('now', '-30 days')
         GROUP BY entity_id
         ORDER BY count DESC
         LIMIT 10`,
      )
      .bind(userId)
      .all(),
    db
      .prepare(
        `SELECT COUNT(*) as c FROM matches
         WHERE worker_id = ? OR business_id = ?`,
      )
      .bind(userId, userId)
      .first<{ c: number }>(),
    db
      .prepare(
        `SELECT COUNT(*) as c FROM swipes WHERE swiper_id = ?`,
      )
      .bind(userId)
      .first<{ c: number }>()
      .catch(() => ({ c: 0 })),
    db
      .prepare(
        `SELECT COUNT(*) as c FROM swipes WHERE target_id = ? AND direction = 'like'`,
      )
      .bind(userId)
      .first<{ c: number }>()
      .catch(() => ({ c: 0 })),
    db
      .prepare(
        `SELECT COUNT(*) as c FROM conversations
         WHERE worker_id = ? OR business_id = ?`,
      )
      .bind(userId, userId)
      .first<{ c: number }>()
      .catch(() => ({ c: 0 })),
    db
      .prepare(
        `SELECT COUNT(*) as c FROM messages WHERE sender_id = ?`,
      )
      .bind(userId)
      .first<{ c: number }>()
      .catch(() => ({ c: 0 })),
    userRow.role === 'business'
      ? db
          .prepare(
            `SELECT COUNT(*) as c FROM job_listings j
             JOIN business_profiles bp ON bp.id = j.business_id
             WHERE bp.user_id = ?`,
          )
          .bind(userId)
          .first<{ c: number }>()
          .catch(() => ({ c: 0 }))
      : Promise.resolve({ c: 0 }),
    userRow.role === 'business'
      ? db
          .prepare(
            `SELECT COUNT(*) as c FROM job_listings j
             JOIN business_profiles bp ON bp.id = j.business_id
             WHERE bp.user_id = ? AND j.status = 'published'`,
          )
          .bind(userId)
          .first<{ c: number }>()
          .catch(() => ({ c: 0 }))
      : Promise.resolve({ c: 0 }),
    db
      .prepare(`SELECT COUNT(*) as c FROM reports WHERE target_user_id = ?`)
      .bind(userId)
      .first<{ c: number }>()
      .catch(() => ({ c: 0 })),
    db
      .prepare(`SELECT COUNT(*) as c FROM reports WHERE reporter_id = ?`)
      .bind(userId)
      .first<{ c: number }>()
      .catch(() => ({ c: 0 })),
    db
      .prepare(
        `SELECT plan_id, status, current_period_end FROM subscriptions
         WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
      )
      .bind(userId)
      .first<any>()
      .catch(() => null),
  ]);

  return success(c, {
    user: {
      ...userRow,
      name,
      photo,
      region,
      city,
      phone,
    },
    profile: workerProfile || businessProfile || null,
    counts: {
      matches: matchesCount?.c || 0,
      swipesGiven: swipesGiven?.c || 0,
      likesReceived: likesReceived?.c || 0,
      conversations: conversationsCount?.c || 0,
      messagesSent: messagesCount?.c || 0,
      jobsTotal: jobsCount?.c || 0,
      jobsPublished: publishedJobsCount?.c || 0,
      reportsAgainst: reportsAgainst?.c || 0,
      reportsBy: reportsBy?.c || 0,
    },
    subscription: subscription || null,
    branches: branches || [],
    activity: activity.results || [],
    sessions: sessions.results || [],
    topPages: pages.results || [],
  });
});

// =====================================================================
// GET /cohort-stats?role=worker|business — real aggregate stats for the
// workers/employers admin pages (replaces hardcoded "4.8 rating" etc).
// =====================================================================
admin.get('/cohort-stats', async (c) => {
  const role = c.req.query('role');
  if (role !== 'worker' && role !== 'business') {
    return error(c, 'BAD_REQUEST', 'role must be worker or business', 400);
  }
  const db = c.env.DB;

  if (role === 'worker') {
    const [total, verified, complete, avgComp, avgYears, withRoles, premium, photoed, suspended] =
      await Promise.all([
        db.prepare(`SELECT COUNT(*) AS c FROM users WHERE role='worker'`).first<{ c: number }>(),
        db.prepare(`SELECT COUNT(*) AS c FROM worker_profiles WHERE verified=1`).first<{ c: number }>(),
        db
          .prepare(`SELECT COUNT(*) AS c FROM worker_profiles WHERE profile_completeness >= 80`)
          .first<{ c: number }>(),
        db
          .prepare(`SELECT ROUND(AVG(profile_completeness), 1) AS c FROM worker_profiles`)
          .first<{ c: number }>(),
        db
          .prepare(`SELECT ROUND(AVG(years_of_experience), 1) AS c FROM worker_profiles WHERE years_of_experience IS NOT NULL`)
          .first<{ c: number }>(),
        db
          .prepare(
            `SELECT COUNT(DISTINCT worker_profile_id) AS c FROM worker_profile_roles`,
          )
          .first<{ c: number }>(),
        db
          .prepare(
            `SELECT COUNT(*) AS c FROM subscriptions WHERE status='active' AND plan_id LIKE 'worker_%'`,
          )
          .first<{ c: number }>(),
        db
          .prepare(`SELECT COUNT(*) AS c FROM worker_profiles WHERE photo_url IS NOT NULL AND TRIM(photo_url) != ''`)
          .first<{ c: number }>(),
        db.prepare(`SELECT COUNT(*) AS c FROM users WHERE role='worker' AND status='suspended'`).first<{ c: number }>(),
      ]);
    return success(c, {
      total: total?.c || 0,
      verified: verified?.c || 0,
      complete80plus: complete?.c || 0,
      avgCompleteness: avgComp?.c || 0,
      avgYearsExperience: avgYears?.c || 0,
      withRoles: withRoles?.c || 0,
      premium: premium?.c || 0,
      withPhoto: photoed?.c || 0,
      suspended: suspended?.c || 0,
    });
  }

  // business
  const [total, verified, paid, distinctTypes, withBranch, withJobs, publishedJobs, suspended, freePlan] =
    await Promise.all([
      db.prepare(`SELECT COUNT(*) AS c FROM users WHERE role='business'`).first<{ c: number }>(),
      db.prepare(`SELECT COUNT(*) AS c FROM business_profiles WHERE verified=1`).first<{ c: number }>(),
      db
        .prepare(
          `SELECT COUNT(*) AS c FROM subscriptions WHERE status='active' AND plan_id LIKE 'business_%'`,
        )
        .first<{ c: number }>(),
      db
        .prepare(`SELECT COUNT(DISTINCT business_type) AS c FROM business_profiles WHERE business_type IS NOT NULL`)
        .first<{ c: number }>(),
      db
        .prepare(
          `SELECT COUNT(DISTINCT user_id) AS c FROM business_branches`,
        )
        .first<{ c: number }>(),
      db
        .prepare(
          `SELECT COUNT(DISTINCT bp.user_id) AS c
             FROM business_profiles bp
             JOIN job_listings j ON j.business_id = bp.id`,
        )
        .first<{ c: number }>(),
      db.prepare(`SELECT COUNT(*) AS c FROM job_listings WHERE status='published'`).first<{ c: number }>(),
      db.prepare(`SELECT COUNT(*) AS c FROM users WHERE role='business' AND status='suspended'`).first<{ c: number }>(),
      db
        .prepare(
          `SELECT COUNT(*) AS c FROM users u
             LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
             WHERE u.role = 'business' AND s.id IS NULL`,
        )
        .first<{ c: number }>(),
    ]);
  return success(c, {
    total: total?.c || 0,
    verified: verified?.c || 0,
    paid: paid?.c || 0,
    distinctTypes: distinctTypes?.c || 0,
    withBranch: withBranch?.c || 0,
    withJobs: withJobs?.c || 0,
    publishedJobs: publishedJobs?.c || 0,
    suspended: suspended?.c || 0,
    freePlan: freePlan?.c || 0,
  });
});

// =====================================================================
// SECURITY DASHBOARD
//   GET  /errors                — paginated, filterable error list
//   GET  /errors/:id            — full row (incl. stack + body snippet)
//   POST /errors/:id/resolve    — triage: mark as fixed
//   GET  /security/overview     — counters / sparklines for the dashboard
//   GET  /security/suspicious   — heuristic-based "things look weird" feed
//   GET  /security/stream       — Server-Sent Events live feed (auth via ?token=)
//   GET  /users/:id/full        — every event we have for one user
// =====================================================================

admin.get('/errors', async (c) => {
  const db = c.env.DB;
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 200);
  const offset = (page - 1) * limit;

  const level = c.req.query('level');         // 'error' | 'warn' | 'fatal'
  const code = c.req.query('code');
  const userId = c.req.query('user_id');
  const path = c.req.query('path');
  const resolved = c.req.query('resolved');   // '0' | '1'
  const search = c.req.query('search');

  const conditions: string[] = [];
  const params: any[] = [];

  if (level) {
    conditions.push('level = ?');
    params.push(level);
  }
  if (code) {
    conditions.push('code = ?');
    params.push(code);
  }
  if (userId) {
    conditions.push('user_id = ?');
    params.push(userId);
  }
  if (path) {
    conditions.push('path LIKE ?');
    params.push(`%${path}%`);
  }
  if (resolved === '0' || resolved === '1') {
    conditions.push('resolved = ?');
    params.push(parseInt(resolved, 10));
  }
  if (search) {
    conditions.push('(message LIKE ? OR path LIKE ? OR user_email LIKE ? OR ip_address LIKE ?)');
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await db
    .prepare(`SELECT COUNT(*) AS total FROM error_logs ${where}`)
    .bind(...params)
    .first<{ total: number }>();

  const rows = await db
    .prepare(
      `SELECT id, level, code, message, status_code,
              method, path, query,
              user_id, user_role, user_email,
              ip_address, country, city, region,
              resolved, created_at
         FROM error_logs
         ${where}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?`,
    )
    .bind(...params, limit, offset)
    .all();

  return paginated(c, rows.results, {
    page,
    perPage: limit,
    total: countRes?.total || 0,
  });
});

admin.get('/errors/:id', async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB.prepare(
    `SELECT * FROM error_logs WHERE id = ?`,
  )
    .bind(id)
    .first<any>();
  if (!row) return error(c, 'NOT_FOUND', 'Δεν βρέθηκε το σφάλμα.', 404);
  return success(c, row);
});

admin.post('/errors/:id/resolve', async (c) => {
  const me = c.get('user') as AuthUser;
  const id = c.req.param('id');
  let body: any = {};
  try {
    body = await c.req.json();
  } catch {}
  const notes = typeof body?.notes === 'string' ? body.notes.slice(0, 500) : null;

  const res = await c.env.DB.prepare(
    `UPDATE error_logs
        SET resolved = 1, resolved_by = ?, resolved_at = datetime('now'), notes = ?
      WHERE id = ?`,
  )
    .bind(me.id, notes, id)
    .run();

  if (!res.success) return error(c, 'INTERNAL_ERROR', 'Αποτυχία ενημέρωσης.', 500);
  return success(c, { id, resolved: true });
});

admin.get('/security/overview', async (c) => {
  const db = c.env.DB;

  const [
    err5m,
    err1h,
    err24h,
    errOpen,
    err24hByCode,
    err24hByPath,
    distinctErrIps24h,
    fatal24h,
    sparkline24h,
  ] = await Promise.all([
    db
      .prepare(`SELECT COUNT(*) AS c FROM error_logs WHERE created_at >= datetime('now','-5 minutes')`)
      .first<{ c: number }>(),
    db
      .prepare(`SELECT COUNT(*) AS c FROM error_logs WHERE created_at >= datetime('now','-1 hour')`)
      .first<{ c: number }>(),
    db
      .prepare(`SELECT COUNT(*) AS c FROM error_logs WHERE created_at >= datetime('now','-1 day')`)
      .first<{ c: number }>(),
    db
      .prepare(`SELECT COUNT(*) AS c FROM error_logs WHERE resolved = 0`)
      .first<{ c: number }>(),
    db
      .prepare(
        `SELECT code, COUNT(*) AS c FROM error_logs
          WHERE created_at >= datetime('now','-1 day')
          GROUP BY code ORDER BY c DESC LIMIT 8`,
      )
      .all(),
    db
      .prepare(
        `SELECT path, COUNT(*) AS c FROM error_logs
          WHERE created_at >= datetime('now','-1 day') AND path IS NOT NULL
          GROUP BY path ORDER BY c DESC LIMIT 8`,
      )
      .all(),
    db
      .prepare(
        `SELECT COUNT(DISTINCT ip_address) AS c FROM error_logs
          WHERE created_at >= datetime('now','-1 day') AND ip_address IS NOT NULL`,
      )
      .first<{ c: number }>(),
    db
      .prepare(`SELECT COUNT(*) AS c FROM error_logs WHERE level = 'fatal' AND created_at >= datetime('now','-1 day')`)
      .first<{ c: number }>(),
    db
      .prepare(
        `SELECT strftime('%Y-%m-%dT%H:00:00Z', created_at) AS bucket, COUNT(*) AS c
           FROM error_logs
          WHERE created_at >= datetime('now','-1 day')
          GROUP BY bucket
          ORDER BY bucket ASC`,
      )
      .all(),
  ]);

  return success(c, {
    errors: {
      last5m: err5m?.c || 0,
      last1h: err1h?.c || 0,
      last24h: err24h?.c || 0,
      open: errOpen?.c || 0,
      fatal24h: fatal24h?.c || 0,
      distinctIps24h: distinctErrIps24h?.c || 0,
      byCode: err24hByCode.results || [],
      byPath: err24hByPath.results || [],
      sparkline24h: sparkline24h.results || [],
    },
  });
});

// ---------------------------------------------------------------------
// Suspicious activity heuristics. Pure SQL — fast on D1, no N+1 queries.
// ---------------------------------------------------------------------
admin.get('/security/suspicious', async (c) => {
  const db = c.env.DB;
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);

  const [
    newCountryLogins,
    repeatedFailures,
    errorBursts,
    rapidEdits,
    privilegeChanges,
  ] = await Promise.all([
    // 1) login from a country the user has never logged in from before
    db
      .prepare(
        `SELECT s.id, s.user_id, s.country, s.city, s.ip_address, s.started_at,
                u.email, u.role
           FROM user_sessions s
           JOIN users u ON u.id = s.user_id
          WHERE s.started_at >= datetime('now','-7 days')
            AND s.country IS NOT NULL
            AND NOT EXISTS (
                  SELECT 1 FROM user_sessions s2
                   WHERE s2.user_id = s.user_id
                     AND s2.country = s.country
                     AND s2.started_at < s.started_at
                )
          ORDER BY s.started_at DESC
          LIMIT ?`,
      )
      .bind(limit)
      .all(),

    // 2) >= 5 server errors from the same IP in the last hour
    db
      .prepare(
        `SELECT ip_address, country, COUNT(*) AS c, MAX(created_at) AS last_at
           FROM error_logs
          WHERE created_at >= datetime('now','-1 hour') AND ip_address IS NOT NULL
          GROUP BY ip_address
         HAVING COUNT(*) >= 5
          ORDER BY c DESC LIMIT ?`,
      )
      .bind(limit)
      .all(),

    // 3) error spike per path in the last 15 minutes
    db
      .prepare(
        `SELECT path, COUNT(*) AS c, MAX(created_at) AS last_at
           FROM error_logs
          WHERE created_at >= datetime('now','-15 minutes') AND path IS NOT NULL
          GROUP BY path
         HAVING COUNT(*) >= 3
          ORDER BY c DESC LIMIT ?`,
      )
      .bind(limit)
      .all(),

    // 4) > 5 profile_update for the same actor in 10 min (potential script)
    db
      .prepare(
        `SELECT actor_user_id, actor_email, COUNT(*) AS c, MAX(created_at) AS last_at
           FROM data_changes
          WHERE created_at >= datetime('now','-10 minutes')
            AND action = 'profile_update'
          GROUP BY actor_user_id
         HAVING COUNT(*) >= 5
          ORDER BY c DESC LIMIT ?`,
      )
      .bind(limit)
      .all(),

    // 5) any role / status changes (these should be rare!)
    db
      .prepare(
        `SELECT id, user_id, action, metadata, created_at
           FROM audit_logs
          WHERE action IN ('user_role_changed','user_deleted','user_suspended')
            AND created_at >= datetime('now','-30 days')
          ORDER BY created_at DESC LIMIT ?`,
      )
      .bind(limit)
      .all(),
  ]);

  return success(c, {
    newCountryLogins: newCountryLogins.results || [],
    repeatedFailures: repeatedFailures.results || [],
    errorBursts: errorBursts.results || [],
    rapidEdits: rapidEdits.results || [],
    privilegeChanges: privilegeChanges.results || [],
  });
});

// ---------------------------------------------------------------------
// SSE live feed.
// EventSource() cannot send `Authorization` headers, so we authenticate
// via `?token=...`. We re-implement auth inline for this single route.
// ---------------------------------------------------------------------
admin.get('/security/stream', async (c) => {
  const token = c.req.query('token');
  if (!token) return error(c, 'UNAUTHORIZED', 'Λείπει το token.', 401);

  const { verifyJWT } = await import('../lib/jwt');
  const payload = await verifyJWT(token, c.env.JWT_SECRET);
  if (!payload) return error(c, 'UNAUTHORIZED', 'Μη έγκυρο token.', 401);

  const me = await c.env.DB.prepare(
    'SELECT id, role, status FROM users WHERE id = ?',
  )
    .bind(payload.sub)
    .first<{ id: string; role: string; status: string }>();
  if (!me || me.role !== 'admin' || me.status !== 'active') {
    return error(c, 'FORBIDDEN', 'Μόνο admins.', 403);
  }

  // Cursors initialised "now" so the client only receives new events.
  let lastErrorAt = new Date().toISOString();
  let lastChangeAt = new Date().toISOString();
  let lastAuditAt = new Date().toISOString();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {}
      };

      send('hello', { ts: new Date().toISOString() });

      const tick = async () => {
        try {
          const [errs, changes, audit] = await Promise.all([
            c.env.DB.prepare(
              `SELECT id, level, code, message, status_code, method, path,
                      user_id, user_email, ip_address, country, city, created_at
                 FROM error_logs
                WHERE created_at > ?
                ORDER BY created_at ASC LIMIT 50`,
            )
              .bind(lastErrorAt)
              .all(),
            c.env.DB.prepare(
              `SELECT id, actor_user_id, actor_email, actor_role, action,
                      entity_type, entity_id, country, city, ip_address, created_at
                 FROM data_changes
                WHERE created_at > ?
                ORDER BY created_at ASC LIMIT 50`,
            )
              .bind(lastChangeAt)
              .all(),
            c.env.DB.prepare(
              `SELECT id, user_id, action, entity_type, entity_id, metadata, created_at
                 FROM audit_logs
                WHERE created_at > ?
                ORDER BY created_at ASC LIMIT 50`,
            )
              .bind(lastAuditAt)
              .all(),
          ]);

          for (const r of (errs.results as any[]) || []) {
            send('error', r);
            lastErrorAt = r.created_at;
          }
          for (const r of (changes.results as any[]) || []) {
            send('change', r);
            lastChangeAt = r.created_at;
          }
          for (const r of (audit.results as any[]) || []) {
            send('audit', r);
            lastAuditAt = r.created_at;
          }

          send('heartbeat', { ts: new Date().toISOString() });
        } catch (streamErr: any) {
          send('error_stream', { message: streamErr?.message || 'stream error' });
        }
      };

      await tick();
      const interval = setInterval(tick, 5_000);

      const abort = (c.req.raw as any)?.signal as AbortSignal | undefined;
      abort?.addEventListener('abort', () => {
        clearInterval(interval);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
});

// ---------------------------------------------------------------------
// GET /analytics/stream — SSE live feed for the /admin/analytics page.
// Same shape as /security/stream: authenticates via ?token=, ticks
// every 5 seconds, emits a `snapshot` event containing the latest
// stats + 14-day series. Frontend hook keeps only the most recent
// snapshot (no rolling buffer needed here).
// ---------------------------------------------------------------------
admin.get('/analytics/stream', async (c) => {
  const token = c.req.query('token');
  if (!token) return error(c, 'UNAUTHORIZED', 'Λείπει το token.', 401);

  const { verifyJWT } = await import('../lib/jwt');
  const payload = await verifyJWT(token, c.env.JWT_SECRET);
  if (!payload) return error(c, 'UNAUTHORIZED', 'Μη έγκυρο token.', 401);

  const me = await c.env.DB.prepare(
    'SELECT id, role, status FROM users WHERE id = ?',
  )
    .bind(payload.sub)
    .first<{ id: string; role: string; status: string }>();
  if (!me || me.role !== 'admin' || me.status !== 'active') {
    return error(c, 'FORBIDDEN', 'Μόνο admins.', 403);
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {}
      };

      send('hello', { ts: new Date().toISOString() });

      const tick = async () => {
        try {
          const [stats, series] = await Promise.all([
            computeStats(c.env),
            computeSeries(c.env, 14),
          ]);
          send('snapshot', { stats, series, ts: new Date().toISOString() });
          send('heartbeat', { ts: new Date().toISOString() });
        } catch (streamErr: any) {
          // Don't close the stream — let the next tick retry. Surface the
          // failure to the client as a non-fatal event.
          send('snapshot_error', { message: streamErr?.message || 'snapshot error' });
        }
      };

      await tick();
      const interval = setInterval(tick, 5_000);

      const abort = (c.req.raw as any)?.signal as AbortSignal | undefined;
      abort?.addEventListener('abort', () => {
        clearInterval(interval);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
});

// =====================================================================
// GET /users/:id/full — every event we have for one user
// (security drill-down: "show me everything about this person")
// =====================================================================
admin.get('/users/:id/full', async (c) => {
  const id = c.req.param('id');
  const db = c.env.DB;
  const limit = Math.min(parseInt(c.req.query('limit') || '200', 10), 500);

  const user = await db
    .prepare(
      `SELECT u.id, u.email, u.role, u.status, u.created_at, u.last_seen_at,
              COALESCE(wp.full_name, bp.company_name, u.display_name) AS name,
              wp.photo_url AS worker_photo, bp.logo_url AS business_logo
         FROM users u
         LEFT JOIN worker_profiles wp ON wp.user_id = u.id
         LEFT JOIN business_profiles bp ON bp.user_id = u.id
        WHERE u.id = ?`,
    )
    .bind(id)
    .first<any>();
  if (!user) return error(c, 'NOT_FOUND', 'Ο χρήστης δεν βρέθηκε.', 404);

  const [activity, sessions, dataChanges, errors, audit] = await Promise.all([
    db
      .prepare(
        `SELECT id, activity_type AS type, entity_type, entity_id, metadata,
                ip_address, country, city, created_at
           FROM user_activity_log
          WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
      )
      .bind(id, limit)
      .all(),
    db
      .prepare(
        `SELECT id, started_at, last_activity_at, ended_at, is_active,
                ip_address, country, city, region, user_agent
           FROM user_sessions
          WHERE user_id = ? ORDER BY started_at DESC LIMIT 50`,
      )
      .bind(id)
      .all(),
    db
      .prepare(
        `SELECT id, action, entity_type, entity_id, field_changes, metadata,
                ip_address, country, city, created_at
           FROM data_changes
          WHERE actor_user_id = ? OR entity_owner_id = ?
          ORDER BY created_at DESC LIMIT ?`,
      )
      .bind(id, id, limit)
      .all(),
    db
      .prepare(
        `SELECT id, level, code, message, status_code, method, path,
                ip_address, country, city, resolved, created_at
           FROM error_logs
          WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
      )
      .bind(id, limit)
      .all(),
    db
      .prepare(
        `SELECT id, action, entity_type, entity_id, metadata, ip_address, created_at
           FROM audit_logs
          WHERE user_id = ? OR entity_id = ?
          ORDER BY created_at DESC LIMIT ?`,
      )
      .bind(id, id, limit)
      .all(),
  ]);

  return success(c, {
    user,
    activity: activity.results || [],
    sessions: sessions.results || [],
    dataChanges: dataChanges.results || [],
    errors: errors.results || [],
    audit: audit.results || [],
  });
});

// =====================================================================
// BILLING ADMIN
//   GET  /billing/payments              — every payment row (filterable)
//   GET  /billing/manual-transfers      — pending bank transfers
//   POST /billing/manual-transfers/:id/confirm   — admin marks as paid
//   POST /billing/manual-transfers/:id/cancel    — admin voids order
//   POST /billing/payments/:id/refund   — Stripe refund
//   GET  /billing/overview              — KPIs
// =====================================================================

admin.get('/billing/payments', async (c) => {
  const db = c.env.DB;
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 200);
  const offset = (page - 1) * limit;
  const status = c.req.query('status');
  const provider = c.req.query('provider');

  const conditions: string[] = [];
  const params: any[] = [];
  if (status) { conditions.push('p.status = ?'); params.push(status); }
  if (provider) { conditions.push('p.provider = ?'); params.push(provider); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const total = await db
    .prepare(`SELECT COUNT(*) AS c FROM payments p ${where}`)
    .bind(...params)
    .first<{ c: number }>();

  const rows = await db
    .prepare(
      `SELECT p.id, p.user_id, p.provider, p.provider_ref, p.plan_id,
              p.amount_cents, p.currency, p.status, p.refunded_cents,
              p.document_type, p.invoice_id, p.created_at,
              u.email as user_email,
              COALESCE(bp.company_name, wp.full_name, u.display_name) as user_name,
              i.doc_number as invoice_number
         FROM payments p
         LEFT JOIN users u ON u.id = p.user_id
         LEFT JOIN business_profiles bp ON bp.user_id = p.user_id
         LEFT JOIN worker_profiles wp ON wp.user_id = p.user_id
         LEFT JOIN invoices i ON i.id = p.invoice_id
         ${where}
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?`,
    )
    .bind(...params, limit, offset)
    .all();

  return paginated(c, rows.results, { page, perPage: limit, total: total?.c || 0 });
});

admin.get('/billing/manual-transfers', async (c) => {
  const db = c.env.DB;
  const status = c.req.query('status') || 'pending';
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 200);

  const rows = await db
    .prepare(
      `SELECT m.*, u.email as user_email,
              COALESCE(bp.company_name, u.display_name) as user_name
         FROM manual_bank_transfers m
         LEFT JOIN users u ON u.id = m.user_id
         LEFT JOIN business_profiles bp ON bp.user_id = m.user_id
        WHERE m.status = ?
        ORDER BY m.created_at DESC
        LIMIT ?`,
    )
    .bind(status, limit)
    .all();

  return success(c, { items: rows.results || [] });
});

admin.post('/billing/manual-transfers/:id/confirm', async (c) => {
  const me = c.get('user') as AuthUser;
  const id = c.req.param('id');
  const db = c.env.DB;

  const order = await db
    .prepare(`SELECT * FROM manual_bank_transfers WHERE id = ?`)
    .bind(id)
    .first<any>();
  if (!order) return error(c, 'NOT_FOUND', 'Δεν βρέθηκε η παραγγελία.', 404);
  if (order.status !== 'pending') {
    return error(c, 'INVALID_STATE', `Η παραγγελία είναι ήδη "${order.status}".`, 409);
  }

  const { recordPayment, issueDocument, activateSubscription, BILLING_PLANS } = await import(
    '../lib/billing'
  );

  // Record the payment under provider 'manual' — idempotent on (provider, provider_ref).
  const payment = await recordPayment(c.env, {
    userId: order.user_id,
    provider: 'manual',
    providerRef: order.reference_code, // unique per order
    planId: order.plan_id,
    amountCents: order.amount_cents,
    currency: 'EUR',
    status: 'succeeded',
    documentType: order.document_type,
    metadata: {
      source: 'manual_bank_transfer',
      transfer_id: order.id,
      confirmed_by: me.id,
    },
  });

  // Issue invoice/receipt.
  const plan = BILLING_PLANS[order.plan_id];
  await issueDocument(c.env, {
    paymentId: payment.paymentId,
    userId: order.user_id,
    docType: order.document_type,
    totalCents: order.amount_cents,
    description: `Συνδρομή ${plan?.nameEl || order.plan_id} (κατάθεση τραπέζης)`,
    planId: order.plan_id,
  });

  // Activate the subscription. Period = monthly/yearly from order.
  const periodMs = order.billing_period === 'yearly' ? 365 * 86_400_000 : 30 * 86_400_000;
  await activateSubscription(c.env, {
    userId: order.user_id,
    planId: order.plan_id,
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date(Date.now() + periodMs).toISOString(),
    status: 'active',
  });

  await db
    .prepare(
      `UPDATE manual_bank_transfers
          SET status = 'paid', paid_at = datetime('now'), paid_by_admin_id = ?,
              payment_id = ?, updated_at = datetime('now')
        WHERE id = ?`,
    )
    .bind(me.id, payment.paymentId, id)
    .run();

  // Audit log entry.
  try {
    await db.prepare(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, metadata, ip_address, created_at)
       VALUES (?, ?, 'manual_transfer_confirmed', 'manual_bank_transfer', ?, ?, ?, datetime('now'))`,
    )
      .bind(
        generateId('al'),
        me.id,
        id,
        JSON.stringify({
          plan_id: order.plan_id,
          amount_cents: order.amount_cents,
          target_user: order.user_id,
        }),
        c.req.header('CF-Connecting-IP') || null,
      )
      .run();
  } catch {}

  // Notify user.
  await db
    .prepare(
      `INSERT INTO notifications (id, user_id, type, title, body, read, created_at, updated_at)
       VALUES (?, ?, 'billing', ?, ?, 0, datetime('now'), datetime('now'))`,
    )
    .bind(
      generateId('ntf'),
      order.user_id,
      'Η συνδρομή σας ενεργοποιήθηκε',
      `Επιβεβαιώθηκε η κατάθεση (κωδικός ${order.reference_code}). Η συνδρομή σας είναι ενεργή.`,
    )
    .run();

  return success(c, { ok: true, paymentId: payment.paymentId });
});

admin.post('/billing/manual-transfers/:id/cancel', async (c) => {
  const me = c.get('user') as AuthUser;
  const id = c.req.param('id');
  let body: any = {};
  try { body = await c.req.json(); } catch {}
  const reason: string = typeof body?.reason === 'string' ? body.reason.slice(0, 300) : '';

  const order = await c.env.DB
    .prepare(`SELECT status FROM manual_bank_transfers WHERE id = ?`)
    .bind(id)
    .first<{ status: string }>();
  if (!order) return error(c, 'NOT_FOUND', 'Δεν βρέθηκε η παραγγελία.', 404);
  if (order.status !== 'pending') {
    return error(c, 'INVALID_STATE', `Η παραγγελία είναι ήδη "${order.status}".`, 409);
  }

  await c.env.DB
    .prepare(
      `UPDATE manual_bank_transfers
          SET status = 'cancelled', notes = ?, updated_at = datetime('now')
        WHERE id = ?`,
    )
    .bind(reason || null, id)
    .run();

  try {
    await c.env.DB.prepare(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, metadata, ip_address, created_at)
       VALUES (?, ?, 'manual_transfer_cancelled', 'manual_bank_transfer', ?, ?, ?, datetime('now'))`,
    )
      .bind(
        generateId('al'),
        me.id,
        id,
        JSON.stringify({ reason }),
        c.req.header('CF-Connecting-IP') || null,
      )
      .run();
  } catch {}

  return success(c, { ok: true });
});

admin.post('/billing/payments/:id/refund', async (c) => {
  const me = c.get('user') as AuthUser;
  const id = c.req.param('id');
  let body: any = {};
  try { body = await c.req.json(); } catch {}
  const amountCents: number | undefined = typeof body?.amountCents === 'number' ? body.amountCents : undefined;

  const payment = await c.env.DB
    .prepare(`SELECT * FROM payments WHERE id = ?`)
    .bind(id)
    .first<any>();
  if (!payment) return error(c, 'NOT_FOUND', 'Δεν βρέθηκε η πληρωμή.', 404);
  if (payment.provider !== 'stripe') {
    return error(c, 'UNSUPPORTED', 'Το refund υποστηρίζεται μόνο για Stripe σε αυτή τη φάση.', 400);
  }
  if (!payment.provider_ref) {
    return error(c, 'NO_REF', 'Λείπει το Stripe reference.', 400);
  }

  const params = new URLSearchParams({ payment_intent: payment.provider_ref });
  if (amountCents && amountCents > 0) {
    params.set('amount', String(amountCents));
  }
  const r = await fetch('https://api.stripe.com/v1/refunds', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${c.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  const j = (await r.json()) as { id?: string; error?: { message: string } };
  if (j.error) return error(c, 'STRIPE_ERROR', j.error.message || 'Refund failed', 500);

  // The 'charge.refunded' webhook will update the row authoritatively.
  // For UX, we flip status optimistically.
  await c.env.DB
    .prepare(`UPDATE payments SET status = 'refunded', updated_at = datetime('now') WHERE id = ?`)
    .bind(id)
    .run();

  try {
    await c.env.DB.prepare(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, metadata, ip_address, created_at)
       VALUES (?, ?, 'payment_refunded', 'payment', ?, ?, ?, datetime('now'))`,
    )
      .bind(
        generateId('al'),
        me.id,
        id,
        JSON.stringify({ amount_cents: amountCents || payment.amount_cents, refund_id: j.id }),
        c.req.header('CF-Connecting-IP') || null,
      )
      .run();
  } catch {}

  return success(c, { ok: true, refundId: j.id });
});

admin.get('/billing/overview', async (c) => {
  const db = c.env.DB;

  const [activeCount, pastDueCount, gracePending, mrrRow, paid24h, failed24h, pendingTransfers, refunded30d] =
    await Promise.all([
      db.prepare(`SELECT COUNT(*) AS c FROM subscriptions WHERE status='active'`).first<{ c: number }>(),
      db.prepare(`SELECT COUNT(*) AS c FROM subscriptions WHERE status='past_due'`).first<{ c: number }>(),
      db
        .prepare(`SELECT COUNT(*) AS c FROM subscriptions WHERE grace_period_until IS NOT NULL AND grace_period_until > datetime('now')`)
        .first<{ c: number }>(),
      // Crude MRR — sum of monthly amounts of active subs based on plan price.
      db
        .prepare(
          `SELECT plan_id, COUNT(*) AS c FROM subscriptions WHERE status='active' GROUP BY plan_id`,
        )
        .all<{ plan_id: string; c: number }>(),
      db
        .prepare(`SELECT COUNT(*) AS c, COALESCE(SUM(amount_cents),0) AS s FROM payments WHERE status='succeeded' AND created_at >= datetime('now','-1 day')`)
        .first<{ c: number; s: number }>(),
      db
        .prepare(`SELECT COUNT(*) AS c FROM payments WHERE status='failed' AND created_at >= datetime('now','-1 day')`)
        .first<{ c: number }>(),
      db.prepare(`SELECT COUNT(*) AS c FROM manual_bank_transfers WHERE status='pending'`).first<{ c: number }>(),
      db
        .prepare(`SELECT COALESCE(SUM(refunded_cents),0) AS s FROM payments WHERE refunded_cents > 0 AND created_at >= datetime('now','-30 day')`)
        .first<{ s: number }>(),
    ]);

  // Compute MRR from plan catalogue.
  const { BILLING_PLANS } = await import('../lib/billing');
  let mrrCents = 0;
  for (const row of (mrrRow.results || []) as any[]) {
    const plan = BILLING_PLANS[row.plan_id];
    if (plan) mrrCents += plan.monthlyCents * row.c;
  }

  return success(c, {
    activeSubscriptions: activeCount?.c || 0,
    pastDue: pastDueCount?.c || 0,
    inGracePeriod: gracePending?.c || 0,
    mrrCents,
    paid24h: { count: paid24h?.c || 0, amountCents: paid24h?.s || 0 },
    failed24h: failed24h?.c || 0,
    pendingTransfers: pendingTransfers?.c || 0,
    refunded30dCents: refunded30d?.s || 0,
  });
});

export default admin;
