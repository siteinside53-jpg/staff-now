/**
 * Γραφεία εύρεσης εργασίας — ο πίνακας ελέγχου τους.
 *
 * Ένα γραφείο είναι λογαριασμός επιχείρησης με γραμμή στο agency_profiles.
 * Οι πελάτες του = business_branches (μία ανά εταιρεία-πελάτη). Κάθε αγγελία
 * που βγάζει «για λογαριασμό» πελάτη έχει branch_id, οπότε εδώ μετράμε ανά
 * πελάτη: αγγελίες, ενδιαφέρον, matches, προσλήψεις.
 */

import { Hono } from 'hono';
import type { Env, AuthUser } from '../types';
import { requireAuth, requireRole } from '../middleware/auth';
import { success, error } from '../lib/response';

const agency = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

async function loadAgency(db: D1Database, userId: string) {
  return db
    .prepare('SELECT user_id, agency_name, license_no, website, contact_person, created_at FROM agency_profiles WHERE user_id = ?')
    .bind(userId)
    .first<{ user_id: string; agency_name: string | null; license_no: string | null; website: string | null; contact_person: string | null; created_at: string }>();
}

// GET /agency/overview — πελάτες με αριθμούς
agency.get('/overview', requireAuth, requireRole('business'), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const profile = await loadAgency(db, user.id);
  if (!profile) return error(c, 'NOT_AGENCY', 'Ο λογαριασμός δεν είναι γραφείο εύρεσης εργασίας.', 403);

  const bp = await db.prepare('SELECT id FROM business_profiles WHERE user_id = ?').bind(user.id).first<{ id: string }>();
  const businessProfileId = bp?.id || '';

  const clients = await db
    .prepare(
      `SELECT b.id, b.name, b.business_type, b.city, b.region, b.logo_url, b.is_visible, b.created_at,
              (SELECT COUNT(*) FROM job_listings j WHERE j.branch_id = b.id) AS jobs_total,
              (SELECT COUNT(*) FROM job_listings j WHERE j.branch_id = b.id AND j.status = 'published') AS jobs_open,
              (SELECT COUNT(*) FROM swipes s JOIN job_listings j ON j.id = s.target_id
                WHERE j.branch_id = b.id AND s.target_type = 'job' AND s.direction = 'like') AS applicants,
              (SELECT COUNT(*) FROM matches m JOIN job_listings j ON j.id = m.job_id
                WHERE j.branch_id = b.id AND m.status = 'active') AS matches,
              (SELECT COUNT(*) FROM hires h JOIN job_listings j ON j.id = h.job_id
                WHERE j.branch_id = b.id AND h.status = 'confirmed') AS hires
         FROM business_branches b
        WHERE b.user_id = ?
        ORDER BY b.created_at DESC`,
    )
    .bind(user.id)
    .all<Record<string, unknown>>();

  const totals = await db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM job_listings WHERE business_id = ? AND status = 'published') AS jobs_open,
         (SELECT COUNT(*) FROM job_listings WHERE business_id = ? AND branch_id IS NULL) AS jobs_unassigned,
         (SELECT COUNT(*) FROM swipes s JOIN job_listings j ON j.id = s.target_id
           WHERE j.business_id = ? AND s.target_type = 'job' AND s.direction = 'like') AS applicants,
         (SELECT COUNT(*) FROM matches WHERE business_id = ? AND status = 'active') AS matches,
         (SELECT COUNT(*) FROM hires WHERE business_id = ? AND status = 'confirmed') AS hires`,
    )
    .bind(businessProfileId, businessProfileId, businessProfileId, user.id, user.id)
    .first<Record<string, number>>();

  return success(c, {
    agency: profile,
    clients: clients.results || [],
    totals: {
      clients: (clients.results || []).length,
      jobsOpen: Number(totals?.jobs_open || 0),
      jobsUnassigned: Number(totals?.jobs_unassigned || 0),
      applicants: Number(totals?.applicants || 0),
      matches: Number(totals?.matches || 0),
      hires: Number(totals?.hires || 0),
    },
  });
});

// PATCH /agency/profile — στοιχεία γραφείου
agency.patch('/profile', requireAuth, requireRole('business'), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const existing = await loadAgency(db, user.id);
  if (!existing) return error(c, 'NOT_AGENCY', 'Ο λογαριασμός δεν είναι γραφείο εύρεσης εργασίας.', 403);
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}) as Record<string, unknown>);
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : null);
  const agencyName = str(body.agencyName, 200) ?? existing.agency_name;
  const licenseNo = str(body.licenseNo, 60) ?? existing.license_no;
  const website = str(body.website, 300) ?? existing.website;
  const contactPerson = str(body.contactPerson, 120) ?? existing.contact_person;
  const now = new Date().toISOString();
  await db
    .prepare('UPDATE agency_profiles SET agency_name = ?, license_no = ?, website = ?, contact_person = ?, updated_at = ? WHERE user_id = ?')
    .bind(agencyName, licenseNo, website, contactPerson, now, user.id)
    .run();
  // Το όνομα του γραφείου είναι και το όνομα της επιχείρησης, ώστε να φαίνεται παντού.
  if (agencyName) {
    await db.prepare("UPDATE business_profiles SET company_name = ?, updated_at = ? WHERE user_id = ? AND (company_name = '' OR company_name IS NULL)").bind(agencyName, now, user.id).run();
  }
  return success(c, { agency: await loadAgency(db, user.id) });
});

// POST /agency/enable — μια υπάρχουσα επιχείρηση γίνεται γραφείο
agency.post('/enable', requireAuth, requireRole('business'), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const body = await c.req.json<{ agencyName?: string }>().catch(() => ({}) as { agencyName?: string });
  const bp = await db.prepare('SELECT company_name FROM business_profiles WHERE user_id = ?').bind(user.id).first<{ company_name: string }>();
  const name = (typeof body.agencyName === 'string' ? body.agencyName.trim().slice(0, 200) : '') || bp?.company_name || null;
  await db
    .prepare('INSERT OR IGNORE INTO agency_profiles (user_id, agency_name, created_at, updated_at) VALUES (?, ?, ?, ?)')
    .bind(user.id, name, new Date().toISOString(), new Date().toISOString())
    .run();
  return success(c, { agency: await loadAgency(db, user.id) });
});

export default agency;
