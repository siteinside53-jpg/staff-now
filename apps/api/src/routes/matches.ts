import { Hono } from 'hono';
import type { Env, AuthUser } from '../types';
import { requireAuth } from '../middleware/auth';
import { success, error, paginated } from '../lib/response';

const matches = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// GET / — list user's matches with worker/business/job info, last message, unread count
matches.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 50);
  const offset = (page - 1) * limit;
  const status = c.req.query('status') || 'active';

  // Determine which side of the match the user is on
  const conditions: string[] = ["m.status = ?"];
  const params: (string | number)[] = [status];

  if (user.role === 'worker') {
    conditions.push('m.worker_id = ?');
  } else {
    conditions.push('m.business_id = ?');
  }
  params.push(user.id);

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // Count total
  const countResult = await db
    .prepare(`SELECT COUNT(*) as total FROM matches m ${whereClause}`)
    .bind(...params)
    .first<{ total: number }>();

  const total = countResult?.total || 0;

  // Get matches with related info
  const results = await db
    .prepare(
      `SELECT m.*,
         COALESCE(NULLIF(wp.full_name, ''), u_w.display_name, u_w.email) as worker_name,
         COALESCE(wp.photo_url, u_w.avatar_url) as worker_avatar, wp.region as worker_region,
         COALESCE(NULLIF(bp.company_name, ''), u_b.display_name, u_b.email) as business_name,
         COALESCE(bp.logo_url, u_b.avatar_url) as business_logo,
         bp.region as business_region,
         j.title as job_title, j.id as linked_job_id,
         conv.id as conversation_id
       FROM matches m
       LEFT JOIN worker_profiles wp ON wp.user_id = m.worker_id
       LEFT JOIN users u_w ON u_w.id = m.worker_id
       LEFT JOIN business_profiles bp ON bp.user_id = m.business_id
       LEFT JOIN users u_b ON u_b.id = m.business_id
       LEFT JOIN job_listings j ON j.id = m.job_id
       LEFT JOIN conversations conv ON conv.match_id = m.id
       ${whereClause}
       ORDER BY m.matched_at DESC
       LIMIT ? OFFSET ?`
    )
    .bind(...params, limit, offset)
    .all();

  // Enrich with last message and unread count per match
  const enriched = await Promise.all(
    results.results.map(async (match: Record<string, unknown>) => {
      const conversationId = match.conversation_id as string | null;

      let lastMessage = null;
      let unreadCount = 0;

      if (conversationId) {
        lastMessage = await db
          .prepare(
            `SELECT id, sender_id, content, created_at
             FROM messages
             WHERE conversation_id = ?
             ORDER BY created_at DESC LIMIT 1`
          )
          .bind(conversationId)
          .first();

        const unread = await db
          .prepare(
            `SELECT COUNT(*) as count FROM messages
             WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL`
          )
          .bind(conversationId, user.id)
          .first<{ count: number }>();

        unreadCount = unread?.count || 0;
      }

      return {
        ...match,
        lastMessage,
        unreadCount,
      };
    })
  );

  return paginated(c, enriched, total, page, limit);
});

// GET /:id — detailed match info with contact reveal
matches.get('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const matchId = c.req.param('id');
  const db = c.env.DB;

  const match = await db
    .prepare(
      `SELECT m.*,
         wp.*, wp.id as worker_profile_id,
         u_worker.email as worker_email,
         bp.*, bp.id as business_profile_id,
         u_business.email as business_email,
         j.title as job_title, j.description as job_description,
         j.region as job_region, j.employment_type as job_employment_type,
         j.salary_min as job_min_salary, j.salary_max as job_max_salary,
         conv.id as conversation_id
       FROM matches m
       JOIN worker_profiles wp ON wp.user_id = m.worker_id
       JOIN users u_worker ON u_worker.id = m.worker_id
       JOIN business_profiles bp ON bp.user_id = m.business_id
       JOIN users u_business ON u_business.id = m.business_id
       LEFT JOIN job_listings j ON j.id = m.job_id
       LEFT JOIN conversations conv ON conv.match_id = m.id
       WHERE m.id = ?`
    )
    .bind(matchId)
    .first();

  if (!match) {
    return error(c, 'Το ταίριασμα δεν βρέθηκε', 404);
  }

  const m = match as Record<string, unknown>;

  // Verify the user is part of this match
  if (m.worker_id !== user.id && m.business_id !== user.id) {
    return error(c, 'Δεν έχετε πρόσβαση σε αυτό το ταίριασμα', 403);
  }

  // Build worker info
  const workerInfo: Record<string, unknown> = {
    id: m.worker_id,
    name: m.full_name,
    avatar: m.photo_url,
    region: m.worker_region || m.region,
    bio: m.bio,
    yearsExperience: m.years_of_experience,
    availability: m.availability,
    profileCompleteness: m.profile_completeness,
  };

  // Build business info
  const businessInfo: Record<string, unknown> = {
    id: m.business_id,
    companyName: m.company_name,
    logo: m.business_logo || m.logo_url,
    region: m.business_region,
    industry: m.industry,
    description: m.business_description || m.description,
    companySize: m.company_size,
  };

  // Contact details are revealed only for active matches
  if (m.status === 'active') {
    // Check if user has subscription that allows contact reveal
    const subscription = await db
      .prepare(
        "SELECT plan_id FROM subscriptions WHERE user_id = ? AND status = 'active'"
      )
      .bind(user.id)
      .first<{ plan_id: string }>();

    const hasPremium =
      subscription?.plan_id === 'professional' || subscription?.plan_id === 'enterprise';

    if (hasPremium) {
      workerInfo.email = m.worker_email;
      workerInfo.phone = m.phone;
      businessInfo.email = m.business_email;
      businessInfo.contactName = m.contact_name;
      businessInfo.contactEmail = m.contact_email;
      businessInfo.contactPhone = m.contact_phone;
    }

    workerInfo.contactRevealed = hasPremium;
    businessInfo.contactRevealed = hasPremium;
  }

  // Worker roles
  const workerRoles = await db
    .prepare(
      'SELECT role FROM worker_profile_roles WHERE worker_profile_id = ?'
    )
    .bind(m.worker_profile_id as string)
    .all();

  // Worker languages
  const workerLanguages = await db
    .prepare(
      'SELECT language, level FROM worker_languages WHERE worker_profile_id = ?'
    )
    .bind(m.worker_profile_id as string)
    .all();

  // Job info
  let jobInfo = null;
  if (m.job_id) {
    jobInfo = {
      id: m.job_id,
      title: m.job_title,
      description: m.job_description,
      region: m.job_region,
      employmentType: m.job_employment_type,
      minSalary: m.job_min_salary,
      maxSalary: m.job_max_salary,
    };
  }

  return success(c, {
    match: {
      id: m.id,
      status: m.status,
      createdAt: m.created_at,
      conversationId: m.conversation_id,
    },
    worker: {
      ...workerInfo,
      roles: workerRoles.results.map((r: { role_name: string }) => r.role),
      languages: workerLanguages.results,
    },
    business: businessInfo,
    job: jobInfo,
  });
});

// POST /:id/archive — archive a match
matches.post('/:id/archive', requireAuth, async (c) => {
  const user = c.get('user');
  const matchId = c.req.param('id');
  const db = c.env.DB;

  const match = await db
    .prepare('SELECT id, worker_id, business_id, status FROM matches WHERE id = ?')
    .bind(matchId)
    .first<{ id: string; worker_id: string; business_id: string; status: string }>();

  if (!match) {
    return error(c, 'Το ταίριασμα δεν βρέθηκε', 404);
  }

  if (match.worker_id !== user.id && match.business_id !== user.id) {
    return error(c, 'Δεν έχετε πρόσβαση σε αυτό το ταίριασμα', 403);
  }

  if (match.status === 'archived') {
    return error(c, 'Το ταίριασμα είναι ήδη αρχειοθετημένο', 400);
  }

  const now = new Date().toISOString();
  await db
    .prepare("UPDATE matches SET status = 'archived', updated_at = ? WHERE id = ?")
    .bind(now, matchId)
    .run();

  return success(c, { archived: true, matchId });
});

export default matches;
