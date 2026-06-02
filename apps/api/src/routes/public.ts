import { Hono } from 'hono';
import type { Env } from '../types';

/**
 * Public preview endpoints.
 *
 * Σκοπός: επισκέπτης χωρίς λογαριασμό μπορεί να δει δείγμα από
 * εργαζόμενους (`/public/workers`) ή αγγελίες (`/public/jobs`) πριν
 * αποφασίσει να φτιάξει λογαριασμό.
 *
 * Privacy:
 *  - Δεν εκθέτουμε email, τηλέφωνο, διεύθυνση, ολόκληρο επώνυμο, bio.
 *  - Επιστρέφουμε μόνο το όνομα + αρχικό επώνυμο για workers.
 *  - Τα IDs επιστρέφονται για να μπορεί ο gate popup να redirect-άρει
 *    μετά την εγγραφή — δεν δίνουν πρόσβαση σε contact info.
 */
const publicRoutes = new Hono<{ Bindings: Env }>();

// -------------------- helpers --------------------

function timeAgoGreek(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (Number.isNaN(diff) || diff < 0) return '';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'μόλις τώρα';
  if (mins < 60) return `πριν ${mins} λεπτ${mins === 1 ? 'ό' : 'ά'}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `πριν ${hours} ώρ${hours === 1 ? 'α' : 'ες'}`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `πριν ${days} ημέρ${days === 1 ? 'α' : 'ες'}`;
  const months = Math.floor(days / 30);
  return `πριν ${months} μήν${months === 1 ? 'α' : 'ες'}`;
}

/**
 * Συντομογραφία: «Μαρία Καρατζά» -> «Μαρία Κ.»
 * Αν δεν υπάρχει επώνυμο επιστρέφει μόνο το όνομα.
 */
function previewName(fullName: string | null): string {
  if (!fullName) return 'Εργαζόμενος/η';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Εργαζόμενος/η';
  const first = parts[0] ?? '';
  if (parts.length === 1) return first;
  const last = parts[parts.length - 1] ?? '';
  const lastInitial = last.charAt(0).toUpperCase();
  return `${first} ${lastInitial}.`;
}

// -------------------- /public/workers --------------------

publicRoutes.get('/workers', async (c) => {
  const db = c.env.DB;
  const limitParam = parseInt(c.req.query('limit') || '20', 10);
  const limit = Math.min(Math.max(limitParam, 1), 30);

  // NOTE: parameterized binding everywhere (no string interpolation
  // of user input).
  const sql = `
    SELECT
      wp.user_id  AS id,
      wp.full_name AS fullName,
      wp.region,
      wp.city,
      wp.years_of_experience AS experienceYears,
      wp.expected_monthly_salary AS expectedSalary,
      wp.verified,
      u.is_premium AS isPremium,
      CASE WHEN active_boost.id IS NOT NULL THEN 1 ELSE 0 END AS isBoosted,
      (
        SELECT role FROM worker_profile_roles
         WHERE worker_profile_id = wp.id
         ORDER BY id ASC
         LIMIT 1
      ) AS role
    FROM worker_profiles wp
    JOIN users u ON u.id = wp.user_id
    LEFT JOIN (
      SELECT user_id, id FROM worker_boosts
       WHERE kind = 'discover' AND expires_at > datetime('now')
    ) active_boost ON active_boost.user_id = wp.user_id
    WHERE u.status = 'active'
      AND u.role = 'worker'
      AND wp.is_visible = 1
    ORDER BY isBoosted DESC, u.is_premium DESC, wp.verified DESC,
             wp.profile_completeness DESC, wp.created_at DESC
    LIMIT ?
  `;

  let rs: { results?: any[] } = { results: [] };
  try {
    rs = await db.prepare(sql).bind(limit).all();
  } catch (e) {
    console.error('[public/workers] query failed', e);
    return c.json({ success: true, data: [] });
  }

  const data = (rs.results ?? []).map((r: any) => ({
    id: String(r.id),
    firstName: previewName(r.fullName),
    role: r.role ?? null,
    region: r.region ?? r.city ?? 'Ελλάδα',
    experienceYears: Number(r.experienceYears ?? 0),
    expectedSalary: r.expectedSalary ?? null,
    verified: !!r.verified,
    isPremium: !!r.isPremium,
    isBoosted: !!r.isBoosted,
  }));

  return c.json({ success: true, data });
});

// -------------------- /public/jobs --------------------

publicRoutes.get('/jobs', async (c) => {
  const db = c.env.DB;
  const limitParam = parseInt(c.req.query('limit') || '20', 10);
  const limit = Math.min(Math.max(limitParam, 1), 30);

  const sql = `
    SELECT
      j.id,
      j.title,
      bp.company_name AS companyName,
      COALESCE(j.city, j.region, bp.region, 'Ελλάδα') AS location,
      j.salary_min AS salaryMin,
      j.salary_max AS salaryMax,
      j.employment_type AS employmentType,
      j.housing_provided AS housingProvided,
      j.meals_provided AS mealsProvided,
      j.created_at AS createdAt,
      bp.verified,
      CASE WHEN active_boost.id IS NOT NULL THEN 1 ELSE 0 END AS isBoosted
    FROM job_listings j
    JOIN business_profiles bp ON bp.id = j.business_id
    LEFT JOIN (
      SELECT job_id, id FROM job_boosts
       WHERE expires_at > datetime('now')
    ) active_boost ON active_boost.job_id = j.id
    WHERE j.status = 'published'
    ORDER BY isBoosted DESC, j.created_at DESC
    LIMIT ?
  `;

  let rs: { results?: any[] } = { results: [] };
  try {
    rs = await db.prepare(sql).bind(limit).all();
  } catch (e) {
    console.error('[public/jobs] query failed', e);
    return c.json({ success: true, data: [] });
  }

  const data = (rs.results ?? []).map((r: any) => ({
    id: String(r.id),
    title: r.title,
    companyName: r.companyName,
    location: r.location,
    salaryMin: r.salaryMin ?? null,
    salaryMax: r.salaryMax ?? null,
    employmentType: r.employmentType ?? 'full_time',
    housingProvided: !!r.housingProvided,
    mealsProvided: !!r.mealsProvided,
    postedAgo: timeAgoGreek(r.createdAt),
    verified: !!r.verified,
    isBoosted: !!r.isBoosted,
  }));

  return c.json({ success: true, data });
});

export default publicRoutes;
