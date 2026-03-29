import { Hono } from 'hono';
import type { Env, AuthUser } from '../types';
import { requireAuth } from '../middleware/auth';
import { success } from '../lib/response';

const interests = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// GET /received — who liked me (swipes I received)
interests.get('/received', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  if (user.role === 'worker') {
    // Worker: businesses that liked me
    const results = await db
      .prepare(
        `SELECT s.id as swipe_id, s.swiper_id, s.created_at as liked_at,
           bp.company_name, bp.logo_url, bp.business_type, bp.region,
           bp.staff_housing, bp.meals_provided, bp.description,
           u.email as business_email,
           (SELECT COUNT(*) FROM matches WHERE worker_id = ? AND business_id = s.swiper_id AND status = 'active') as is_matched
         FROM swipes s
         JOIN users u ON u.id = s.swiper_id
         LEFT JOIN business_profiles bp ON bp.user_id = s.swiper_id
         WHERE s.target_id = ? AND s.target_type = 'worker' AND s.direction = 'like'
         ORDER BY s.created_at DESC
         LIMIT 50`
      )
      .bind(user.id, user.id)
      .all();
    return success(c, results.results);
  } else {
    // Business: workers that liked my jobs
    const results = await db
      .prepare(
        `SELECT s.id as swipe_id, s.swiper_id, s.target_id as job_id, s.created_at as liked_at,
           wp.full_name, wp.photo_url, wp.city, wp.region, wp.bio, wp.years_of_experience, wp.availability,
           jl.title as job_title,
           (SELECT COUNT(*) FROM matches WHERE worker_id = s.swiper_id AND business_id = ? AND status = 'active') as is_matched
         FROM swipes s
         JOIN users u ON u.id = s.swiper_id
         LEFT JOIN worker_profiles wp ON wp.user_id = s.swiper_id
         LEFT JOIN job_listings jl ON jl.id = s.target_id
         WHERE s.target_type = 'job'
           AND jl.business_id IN (SELECT id FROM business_profiles WHERE user_id = ?)
           AND s.direction = 'like'
         ORDER BY s.created_at DESC
         LIMIT 50`
      )
      .bind(user.id, user.id)
      .all();
    return success(c, results.results);
  }
});

// GET /sent — who I liked
interests.get('/sent', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const results = await db
    .prepare(
      `SELECT s.id, s.target_id, s.target_type, s.direction, s.created_at
       FROM swipes s WHERE s.swiper_id = ? AND s.direction = 'like'
       ORDER BY s.created_at DESC LIMIT 50`
    )
    .bind(user.id)
    .all();
  return success(c, results.results);
});

export default interests;
