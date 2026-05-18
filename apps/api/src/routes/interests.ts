import { Hono } from 'hono';
import type { Env, AuthUser } from '../types';
import { requireAuth } from '../middleware/auth';
import { checkActiveMatchesLimit } from '../middleware/subscription';
import { success } from '../lib/response';
import { generateId } from '../lib/id';

const interests = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// GET /received — who liked me (swipes I received)
interests.get('/received', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  if (user.role === 'worker') {
    // Worker: businesses that liked me (exclude blocked)
    const results = await db
      .prepare(
        `SELECT s.id as swipe_id, s.swiper_id, s.created_at as liked_at,
           COALESCE(NULLIF(br.name, ''), NULLIF(bp.company_name, ''), u.display_name, u.email) as company_name,
           COALESCE(br.logo_url, bp.logo_url, u.avatar_url) as logo_url,
           COALESCE(br.business_type, bp.business_type) as business_type,
           COALESCE(br.region, bp.region) as region,
           COALESCE(br.staff_housing, bp.staff_housing) as staff_housing,
           COALESCE(br.meals_provided, bp.meals_provided) as meals_provided,
           COALESCE(br.description, bp.description) as description,
           u.email as business_email,
           (SELECT COUNT(*) FROM matches WHERE worker_id = ? AND business_id = s.swiper_id AND status = 'active') as is_matched,
           (SELECT COUNT(*) FROM blocks WHERE (blocker_id = ? AND blocked_id = s.swiper_id) OR (blocker_id = s.swiper_id AND blocked_id = ?)) as is_blocked
         FROM swipes s
         JOIN users u ON u.id = s.swiper_id
         LEFT JOIN business_profiles bp ON bp.user_id = s.swiper_id
         LEFT JOIN business_branches br ON br.user_id = s.swiper_id
         WHERE s.target_id = ? AND s.target_type = 'worker' AND s.direction = 'like'
           AND s.swiper_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)
           AND s.swiper_id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = ?)
         ORDER BY s.created_at DESC
         LIMIT 50`
      )
      .bind(user.id, user.id, user.id, user.id, user.id, user.id)
      .all();
    return success(c, results.results);
  } else {
    // Business: workers that liked my jobs (exclude blocked)
    const results = await db
      .prepare(
        `SELECT s.id as swipe_id, s.swiper_id, s.target_id as job_id, s.created_at as liked_at,
           COALESCE(NULLIF(wp.full_name, ''), u.display_name, u.email) as full_name,
           COALESCE(wp.photo_url, u.avatar_url) as photo_url,
           wp.city, wp.region, wp.bio, wp.years_of_experience, wp.availability,
           jl.title as job_title,
           (SELECT COUNT(*) FROM matches WHERE worker_id = s.swiper_id AND business_id = ? AND status = 'active') as is_matched,
           (SELECT COUNT(*) FROM blocks WHERE (blocker_id = ? AND blocked_id = s.swiper_id) OR (blocker_id = s.swiper_id AND blocked_id = ?)) as is_blocked
         FROM swipes s
         JOIN users u ON u.id = s.swiper_id
         LEFT JOIN worker_profiles wp ON wp.user_id = s.swiper_id
         LEFT JOIN job_listings jl ON jl.id = s.target_id
         WHERE s.target_type = 'job'
           AND jl.business_id IN (SELECT id FROM business_profiles WHERE user_id = ?)
           AND s.direction = 'like'
           AND s.swiper_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)
           AND s.swiper_id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = ?)
         ORDER BY s.created_at DESC
         LIMIT 50`
      )
      .bind(user.id, user.id, user.id, user.id, user.id, user.id)
      .all();
    return success(c, results.results);
  }
});

// GET /sent — who I liked (with details, excluding matched)
interests.get('/sent', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  if (user.role === 'worker') {
    // Worker sent likes to jobs
    const results = await db
      .prepare(
        `SELECT s.id, s.target_id, s.target_type, s.direction, s.created_at,
           j.title as job_title, j.city, j.salary_min, j.salary_max,
           COALESCE(NULLIF(br.name, ''), bp.company_name) as company_name,
           COALESCE(br.logo_url, bp.logo_url) as logo_url
         FROM swipes s
         LEFT JOIN job_listings j ON j.id = s.target_id AND s.target_type = 'job'
         LEFT JOIN business_profiles bp ON bp.id = j.business_id
         LEFT JOIN business_branches br ON br.user_id = bp.user_id
         WHERE s.swiper_id = ? AND s.direction = 'like'
           AND s.target_id NOT IN (SELECT m.job_id FROM matches m WHERE m.worker_id = ? AND m.status = 'active' AND m.job_id IS NOT NULL)
           AND bp.user_id NOT IN (SELECT m.business_id FROM matches m WHERE m.worker_id = ? AND m.status = 'active')
         ORDER BY s.created_at DESC LIMIT 50`
      )
      .bind(user.id, user.id, user.id)
      .all();
    return success(c, results.results);
  } else {
    // Business sent likes to workers
    const results = await db
      .prepare(
        `SELECT s.id, s.target_id, s.target_type, s.direction, s.created_at,
           COALESCE(wp.full_name, u.display_name, u.email) as worker_name,
           wp.photo_url, wp.city, wp.region
         FROM swipes s
         LEFT JOIN worker_profiles wp ON wp.user_id = s.target_id
         LEFT JOIN users u ON u.id = s.target_id
         WHERE s.swiper_id = ? AND s.direction = 'like' AND s.target_type = 'worker'
           AND s.target_id NOT IN (SELECT m.worker_id FROM matches m WHERE m.business_id = ? AND m.status = 'active')
         ORDER BY s.created_at DESC LIMIT 50`
      )
      .bind(user.id, user.id)
      .all();
    return success(c, results.results);
  }
});

// DELETE /cancel/:swipeId — cancel a sent like (delete swipe)
interests.delete('/cancel/:swipeId', requireAuth, async (c) => {
  const user = c.get('user');
  const swipeId = c.req.param('swipeId');
  const db = c.env.DB;

  const swipe = await db.prepare('SELECT id FROM swipes WHERE id = ? AND swiper_id = ?').bind(swipeId, user.id).first();
  if (!swipe) return c.json({ success: false, error: { message: 'Δεν βρέθηκε' } }, 404);

  await db.prepare('DELETE FROM swipes WHERE id = ? AND swiper_id = ?').bind(swipeId, user.id).run();
  return c.json({ success: true, data: { cancelled: true } });
});

// POST /like-back/:swiperId — create mutual match from interest
interests.post('/like-back/:swiperId', requireAuth, async (c) => {
  const user = c.get('user');
  const swiperId = c.req.param('swiperId');
  const db = c.env.DB;
  const now = new Date().toISOString();

  // Verify the swiper actually liked this user
  const originalSwipe = await db
    .prepare(
      "SELECT id, target_type FROM swipes WHERE swiper_id = ? AND target_id = ? AND direction = 'like' LIMIT 1"
    )
    .bind(swiperId, user.id)
    .first();

  // Also check if swiper liked a job of this user (business case)
  let jobSwipe = null;
  if (!originalSwipe && user.role === 'business') {
    jobSwipe = await db
      .prepare(
        `SELECT s.id, s.target_id as job_id FROM swipes s
         JOIN job_listings jl ON jl.id = s.target_id
         JOIN business_profiles bp ON bp.id = jl.business_id
         WHERE s.swiper_id = ? AND bp.user_id = ? AND s.target_type = 'job' AND s.direction = 'like'
         LIMIT 1`
      )
      .bind(swiperId, user.id)
      .first();
  }

  if (!originalSwipe && !jobSwipe) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Δεν βρέθηκε ενδιαφέρον' } }, 404);
  }

  // Check if match already exists
  const workerId = user.role === 'worker' ? user.id : swiperId;
  const businessId = user.role === 'business' ? user.id : swiperId;

  const existing = await db
    .prepare("SELECT id FROM matches WHERE worker_id = ? AND business_id = ? AND status = 'active'")
    .bind(workerId, businessId)
    .first();

  if (existing) {
    // Check if conversation exists
    const conv = await db.prepare("SELECT id FROM conversations WHERE match_id = ?").bind((existing as any).id).first();
    if (!conv) {
      // Create missing conversation
      const cid = generateId('cv');
      await db.prepare("INSERT INTO conversations (id, match_id, worker_id, business_id, status, created_at) VALUES (?, ?, ?, ?, 'active', ?)").bind(cid, (existing as any).id, workerId, businessId, now).run();
    }
    return c.json({ success: true, data: { matched: true, matchId: (existing as any).id, conversationId: conv ? (conv as any).id : null, alreadyMatched: true } });
  }

  // Active matches cap is on the business side.
  const cap = await checkActiveMatchesLimit(db, businessId);
  if (!cap.allowed) {
    return c.json({
      success: false,
      error: {
        code: 'MATCHES_CAP_REACHED',
        message: `Η επιχείρηση έχει φτάσει το όριο των ${cap.max} ενεργών matches. Πρέπει πρώτα να αρχειοθετήσει παλιά matches.`,
      },
    }, 403);
  }

  // Create match + conversation
  const matchId = generateId('mt');
  const convId = generateId('cv');

  await db
    .prepare("INSERT INTO matches (id, worker_id, business_id, status, matched_at) VALUES (?, ?, ?, 'active', ?)")
    .bind(matchId, workerId, businessId, now)
    .run();

  await db
    .prepare("INSERT INTO conversations (id, match_id, worker_id, business_id, status, created_at) VALUES (?, ?, ?, ?, 'active', ?)")
    .bind(convId, matchId, workerId, businessId, now)
    .run();

  // Get names
  const wpInfo = await db.prepare('SELECT full_name FROM worker_profiles WHERE user_id = ?').bind(workerId).first<{ full_name: string }>();
  const bpInfo = await db.prepare('SELECT company_name FROM business_profiles WHERE user_id = ?').bind(businessId).first<{ company_name: string }>();
  const workerName = wpInfo?.full_name || 'εργαζόμενο';
  const bizName = bpInfo?.company_name || 'επιχείρηση';

  // Notify both
  await db
    .prepare("INSERT INTO notifications (id, user_id, type, title, body, data, created_at) VALUES (?, ?, 'new_match', ?, ?, ?, ?)")
    .bind(generateId('nt'), workerId, `🎉 Νέο match με ${bizName}`, 'Μπορείτε να ξεκινήσετε συνομιλία!', JSON.stringify({ matchId, convId }), now)
    .run();

  await db
    .prepare("INSERT INTO notifications (id, user_id, type, title, body, data, created_at) VALUES (?, ?, 'new_match', ?, ?, ?, ?)")
    .bind(generateId('nt'), businessId, `🎉 Νέο match με τον/την ${workerName}`, 'Μπορείτε να ξεκινήσετε συνομιλία!', JSON.stringify({ matchId, convId }), now)
    .run();

  return c.json({ success: true, data: { matched: true, matchId, conversationId: convId } });
});

export default interests;
