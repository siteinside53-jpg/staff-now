import { Hono } from 'hono';
import type { Env, AuthUser } from '../types';
import { requireAuth, requireRole } from '../middleware/auth';
import { success, error, paginated } from '../lib/response';
import { generateId } from '../lib/id';

const admin = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// All routes require admin role
admin.use('*', requireAuth, requireRole('admin'));

// GET /stats — dashboard statistics
admin.get('/stats', async (c) => {
  const db = c.env.DB;

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
  ] = await Promise.all([
    db.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>(),
    db
      .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'worker'")
      .first<{ count: number }>(),
    db
      .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'business'")
      .first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM jobs').first<{ count: number }>(),
    db
      .prepare("SELECT COUNT(*) as count FROM jobs WHERE status = 'published'")
      .first<{ count: number }>(),
    db.prepare('SELECT COUNT(*) as count FROM matches').first<{ count: number }>(),
    db
      .prepare("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'")
      .first<{ count: number }>(),
    db
      .prepare(
        "SELECT COUNT(*) as count FROM verification_requests WHERE status = 'pending'"
      )
      .first<{ count: number }>(),
    db
      .prepare("SELECT COUNT(*) as count FROM reports WHERE status = 'pending'")
      .first<{ count: number }>(),
    db
      .prepare(
        "SELECT COUNT(*) as count FROM users WHERE created_at >= date('now', 'start of day')"
      )
      .first<{ count: number }>(),
    db
      .prepare(
        "SELECT COUNT(*) as count FROM matches WHERE created_at >= date('now', 'start of day')"
      )
      .first<{ count: number }>(),
  ]);

  // Subscription breakdown by plan
  const subscriptionsByPlan = await db
    .prepare(
      "SELECT plan_id, COUNT(*) as count FROM subscriptions WHERE status = 'active' GROUP BY plan_id"
    )
    .all();

  // Users by status
  const usersByStatus = await db
    .prepare('SELECT status, COUNT(*) as count FROM users GROUP BY status')
    .all();

  return success(c, {
    users: {
      total: totalUsers?.count || 0,
      workers: totalWorkers?.count || 0,
      businesses: totalBusinesses?.count || 0,
      newToday: newUsersToday?.count || 0,
      byStatus: usersByStatus.results,
    },
    jobs: {
      total: totalJobs?.count || 0,
      published: publishedJobs?.count || 0,
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
    },
  });
});

// GET /users — paginated, filterable user list
admin.get('/users', async (c) => {
  const db = c.env.DB;

  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 100);
  const offset = (page - 1) * limit;

  // Filters
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
    conditions.push(
      "(u.email LIKE ? OR wp.first_name LIKE ? OR wp.last_name LIKE ? OR bp.company_name LIKE ?)"
    );
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Validate sortBy to prevent SQL injection
  const allowedSortFields = ['created_at', 'last_login', 'email', 'role', 'status'];
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

  const results = await db
    .prepare(
      `SELECT u.id, u.email, u.role, u.status, u.created_at, u.last_login,
         u.stripe_customer_id,
         wp.first_name, wp.last_name, wp.avatar_url as worker_avatar,
         wp.profile_completeness as worker_completeness, wp.verified as worker_verified,
         bp.company_name, bp.logo_url as business_logo,
         bp.profile_completeness as business_completeness, bp.verified as business_verified,
         sub.plan_id, sub.status as subscription_status
       FROM users u
       LEFT JOIN worker_profiles wp ON wp.user_id = u.id
       LEFT JOIN business_profiles bp ON bp.user_id = u.id
       LEFT JOIN subscriptions sub ON sub.user_id = u.id AND sub.status = 'active'
       ${whereClause}
       ORDER BY ${safeSortBy} ${sortOrder}
       LIMIT ? OFFSET ?`
    )
    .bind(...params, limit, offset)
    .all();

  return paginated(c, results.results, total, page, limit);
});

// POST /users/:id/suspend — suspend a user
admin.post('/users/:id/suspend', async (c) => {
  const targetId = c.req.param('id');
  const db = c.env.DB;
  const body = await c.req.json<{ reason?: string }>().catch(() => ({ reason: undefined }));

  const user = await db
    .prepare('SELECT id, email, role, status FROM users WHERE id = ?')
    .bind(targetId)
    .first<{ id: string; email: string; role: string; status: string }>();

  if (!user) {
    return error(c, 'Ο χρήστης δεν βρέθηκε', 404);
  }

  if (user.role === 'admin') {
    return error(c, 'Δεν μπορείτε να αναστείλετε έναν διαχειριστή', 403);
  }

  if (user.status === 'suspended') {
    return error(c, 'Ο χρήστης είναι ήδη σε αναστολή', 400);
  }

  const now = new Date().toISOString();

  await db
    .prepare("UPDATE users SET status = 'suspended', updated_at = ? WHERE id = ?")
    .bind(now, targetId)
    .run();

  // Log the suspension
  await db
    .prepare(
      `INSERT INTO admin_actions (id, admin_id, action, target_id, target_type, reason, created_at)
       VALUES (?, ?, 'suspend', ?, 'user', ?, ?)`
    )
    .bind(generateId(), c.get('user').id, targetId, body.reason || null, now)
    .run();

  // Notify the user
  await db
    .prepare(
      `INSERT INTO notifications (id, user_id, type, title, body, read, created_at, updated_at)
       VALUES (?, ?, 'system', ?, ?, 0, ?, ?)`
    )
    .bind(
      generateId(),
      targetId,
      'Αναστολή λογαριασμού',
      body.reason
        ? `Ο λογαριασμός σας έχει ανασταλεί. Λόγος: ${body.reason}`
        : 'Ο λογαριασμός σας έχει ανασταλεί. Επικοινωνήστε με την υποστήριξη για περισσότερες πληροφορίες.',
      now,
      now
    )
    .run();

  return success(c, { suspended: true, userId: targetId });
});

// POST /users/:id/unsuspend — unsuspend a user
admin.post('/users/:id/unsuspend', async (c) => {
  const targetId = c.req.param('id');
  const db = c.env.DB;

  const user = await db
    .prepare('SELECT id, status FROM users WHERE id = ?')
    .bind(targetId)
    .first<{ id: string; status: string }>();

  if (!user) {
    return error(c, 'Ο χρήστης δεν βρέθηκε', 404);
  }

  if (user.status !== 'suspended') {
    return error(c, 'Ο χρήστης δεν είναι σε αναστολή', 400);
  }

  const now = new Date().toISOString();

  await db
    .prepare("UPDATE users SET status = 'active', updated_at = ? WHERE id = ?")
    .bind(now, targetId)
    .run();

  // Log the action
  await db
    .prepare(
      `INSERT INTO admin_actions (id, admin_id, action, target_id, target_type, created_at)
       VALUES (?, ?, 'unsuspend', ?, 'user', ?)`
    )
    .bind(generateId(), c.get('user').id, targetId, now)
    .run();

  // Notify the user
  await db
    .prepare(
      `INSERT INTO notifications (id, user_id, type, title, body, read, created_at, updated_at)
       VALUES (?, ?, 'system', ?, ?, 0, ?, ?)`
    )
    .bind(
      generateId(),
      targetId,
      'Επαναφορά λογαριασμού',
      'Ο λογαριασμός σας έχει επαναφερθεί. Μπορείτε πλέον να χρησιμοποιήσετε κανονικά την πλατφόρμα.',
      now,
      now
    )
    .run();

  return success(c, { unsuspended: true, userId: targetId });
});

// GET /verifications — list pending verification requests
admin.get('/verifications', async (c) => {
  const db = c.env.DB;

  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 50);
  const offset = (page - 1) * limit;
  const status = c.req.query('status') || 'pending';

  const countResult = await db
    .prepare(
      'SELECT COUNT(*) as total FROM verification_requests WHERE status = ?'
    )
    .bind(status)
    .first<{ total: number }>();

  const total = countResult?.total || 0;

  const results = await db
    .prepare(
      `SELECT vr.*,
         u.email, u.role,
         wp.first_name, wp.last_name,
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

// POST /verifications/:id/review — approve or reject a verification request
admin.post('/verifications/:id/review', async (c) => {
  const verificationId = c.req.param('id');
  const db = c.env.DB;
  const body = await c.req.json<{ decision: 'approved' | 'rejected'; reason?: string }>();

  if (!body.decision || !['approved', 'rejected'].includes(body.decision)) {
    return error(c, 'Η απόφαση πρέπει να είναι "approved" ή "rejected"', 400);
  }

  const verification = await db
    .prepare('SELECT id, user_id, status, type FROM verification_requests WHERE id = ?')
    .bind(verificationId)
    .first<{ id: string; user_id: string; status: string; type: string }>();

  if (!verification) {
    return error(c, 'Το αίτημα επαλήθευσης δεν βρέθηκε', 404);
  }

  if (verification.status !== 'pending') {
    return error(c, 'Το αίτημα επαλήθευσης έχει ήδη αξιολογηθεί', 400);
  }

  const now = new Date().toISOString();
  const adminUser = c.get('user');

  // Update verification request
  await db
    .prepare(
      `UPDATE verification_requests
       SET status = ?, reviewed_by = ?, review_reason = ?, reviewed_at = ?, updated_at = ?
       WHERE id = ?`
    )
    .bind(body.decision, adminUser.id, body.reason || null, now, now, verificationId)
    .run();

  // If approved, update the profile's verified status
  if (body.decision === 'approved') {
    const userRole = await db
      .prepare('SELECT role FROM users WHERE id = ?')
      .bind(verification.user_id)
      .first<{ role: string }>();

    if (userRole?.role === 'worker') {
      await db
        .prepare(
          'UPDATE worker_profiles SET verified = 1, updated_at = ? WHERE user_id = ?'
        )
        .bind(now, verification.user_id)
        .run();
    } else if (userRole?.role === 'business') {
      await db
        .prepare(
          'UPDATE business_profiles SET verified = 1, updated_at = ? WHERE user_id = ?'
        )
        .bind(now, verification.user_id)
        .run();
    }
  }

  // Log admin action
  await db
    .prepare(
      `INSERT INTO admin_actions (id, admin_id, action, target_id, target_type, reason, created_at)
       VALUES (?, ?, ?, ?, 'verification', ?, ?)`
    )
    .bind(
      generateId(),
      adminUser.id,
      `verification_${body.decision}`,
      verificationId,
      body.reason || null,
      now
    )
    .run();

  // Notify user
  const isApproved = body.decision === 'approved';
  await db
    .prepare(
      `INSERT INTO notifications (id, user_id, type, title, body, read, created_at, updated_at)
       VALUES (?, ?, 'verification', ?, ?, 0, ?, ?)`
    )
    .bind(
      generateId(),
      verification.user_id,
      isApproved ? 'Επαλήθευση εγκρίθηκε' : 'Επαλήθευση απορρίφθηκε',
      isApproved
        ? 'Το αίτημα επαλήθευσής σας εγκρίθηκε! Το προφίλ σας είναι πλέον επαληθευμένο.'
        : body.reason
          ? `Το αίτημα επαλήθευσής σας απορρίφθηκε. Λόγος: ${body.reason}`
          : 'Το αίτημα επαλήθευσής σας απορρίφθηκε. Δοκιμάστε ξανά με ενημερωμένα στοιχεία.',
      now,
      now
    )
    .run();

  return success(c, {
    reviewed: true,
    verificationId,
    decision: body.decision,
  });
});

// GET /reports — list reports
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
      `SELECT r.*,
         reporter.email as reporter_email, reporter.role as reporter_role,
         reported.email as reported_email, reported.role as reported_role,
         wp_reporter.first_name as reporter_first_name, wp_reporter.last_name as reporter_last_name,
         bp_reporter.company_name as reporter_company,
         wp_reported.first_name as reported_first_name, wp_reported.last_name as reported_last_name,
         bp_reported.company_name as reported_company
       FROM reports r
       JOIN users reporter ON reporter.id = r.reporter_id
       JOIN users reported ON reported.id = r.reported_id
       LEFT JOIN worker_profiles wp_reporter ON wp_reporter.user_id = r.reporter_id
       LEFT JOIN business_profiles bp_reporter ON bp_reporter.user_id = r.reporter_id
       LEFT JOIN worker_profiles wp_reported ON wp_reported.user_id = r.reported_id
       LEFT JOIN business_profiles bp_reported ON bp_reported.user_id = r.reported_id
       WHERE r.status = ?
       ORDER BY r.created_at ASC
       LIMIT ? OFFSET ?`
    )
    .bind(status, limit, offset)
    .all();

  return paginated(c, results.results, total, page, limit);
});

// POST /reports/:id/review — review a report
admin.post('/reports/:id/review', async (c) => {
  const reportId = c.req.param('id');
  const db = c.env.DB;
  const body = await c.req.json<{
    decision: 'resolved' | 'dismissed' | 'action_taken';
    action?: 'warn' | 'suspend' | 'none';
    reason?: string;
  }>();

  if (
    !body.decision ||
    !['resolved', 'dismissed', 'action_taken'].includes(body.decision)
  ) {
    return error(
      c,
      'Η απόφαση πρέπει να είναι "resolved", "dismissed" ή "action_taken"',
      400
    );
  }

  const report = await db
    .prepare('SELECT id, reporter_id, reported_id, status, reason, type FROM reports WHERE id = ?')
    .bind(reportId)
    .first<{
      id: string;
      reporter_id: string;
      reported_id: string;
      status: string;
      reason: string;
      type: string;
    }>();

  if (!report) {
    return error(c, 'Η αναφορά δεν βρέθηκε', 404);
  }

  if (report.status !== 'pending') {
    return error(c, 'Η αναφορά έχει ήδη αξιολογηθεί', 400);
  }

  const now = new Date().toISOString();
  const adminUser = c.get('user');

  // Update report
  await db
    .prepare(
      `UPDATE reports
       SET status = ?, reviewed_by = ?, review_reason = ?, action_taken = ?, reviewed_at = ?, updated_at = ?
       WHERE id = ?`
    )
    .bind(
      body.decision,
      adminUser.id,
      body.reason || null,
      body.action || null,
      now,
      now,
      reportId
    )
    .run();

  // If action is suspend, suspend the reported user
  if (body.action === 'suspend') {
    await db
      .prepare("UPDATE users SET status = 'suspended', updated_at = ? WHERE id = ?")
      .bind(now, report.reported_id)
      .run();

    await db
      .prepare(
        `INSERT INTO notifications (id, user_id, type, title, body, read, created_at, updated_at)
         VALUES (?, ?, 'system', ?, ?, 0, ?, ?)`
      )
      .bind(
        generateId(),
        report.reported_id,
        'Αναστολή λογαριασμού',
        'Ο λογαριασμός σας έχει ανασταλεί λόγω αναφοράς. Επικοινωνήστε με την υποστήριξη.',
        now,
        now
      )
      .run();
  }

  // If action is warn, notify the reported user
  if (body.action === 'warn') {
    await db
      .prepare(
        `INSERT INTO notifications (id, user_id, type, title, body, read, created_at, updated_at)
         VALUES (?, ?, 'system', ?, ?, 0, ?, ?)`
      )
      .bind(
        generateId(),
        report.reported_id,
        'Προειδοποίηση',
        body.reason
          ? `Λάβατε μια προειδοποίηση: ${body.reason}`
          : 'Λάβατε μια προειδοποίηση. Παρακαλώ τηρήστε τους κανόνες της πλατφόρμας.',
        now,
        now
      )
      .run();
  }

  // Log admin action
  await db
    .prepare(
      `INSERT INTO admin_actions (id, admin_id, action, target_id, target_type, reason, created_at)
       VALUES (?, ?, ?, ?, 'report', ?, ?)`
    )
    .bind(
      generateId(),
      adminUser.id,
      `report_${body.decision}`,
      reportId,
      body.reason || null,
      now
    )
    .run();

  // Notify reporter that their report was reviewed
  await db
    .prepare(
      `INSERT INTO notifications (id, user_id, type, title, body, read, created_at, updated_at)
       VALUES (?, ?, 'system', ?, ?, 0, ?, ?)`
    )
    .bind(
      generateId(),
      report.reporter_id,
      'Ενημέρωση αναφοράς',
      'Η αναφορά σας αξιολογήθηκε από την ομάδα μας. Σας ευχαριστούμε για τη συμβολή σας.',
      now,
      now
    )
    .run();

  return success(c, {
    reviewed: true,
    reportId,
    decision: body.decision,
    action: body.action || 'none',
  });
});

export default admin;
