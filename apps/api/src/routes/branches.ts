import { Hono } from 'hono';
import type { Env, AuthUser } from '../types';
import { requireAuth, requireRole } from '../middleware/auth';
import { success, error } from '../lib/response';
import { generateId } from '../lib/id';

const branches = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// GET / — list my branches
branches.get('/', requireAuth, requireRole('business'), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const results = await db
    .prepare('SELECT * FROM business_branches WHERE user_id = ? ORDER BY created_at DESC')
    .bind(user.id)
    .all();
  return success(c, results.results);
});

// POST / — create branch
branches.post('/', requireAuth, requireRole('business'), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const body = await c.req.json();
  const now = new Date().toISOString();
  const id = generateId('br');

  // Check limit (max 10)
  const count = await db.prepare('SELECT COUNT(*) as c FROM business_branches WHERE user_id = ?').bind(user.id).first<{ c: number }>();
  if ((count?.c || 0) >= 10) return error(c, 'Μέχρι 10 επιχειρήσεις', 400);

  await db
    .prepare(
      `INSERT INTO business_branches (id, user_id, name, business_type, description, region, city, address, phone, website, logo_url, staff_housing, meals_provided, transportation_assistance, legal_form, tax_id, postal_code, area, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id, user.id,
      body.name || '', body.business_type || 'other', body.description || '',
      body.region || null, body.city || null, body.address || null,
      body.phone || null, body.website || null, body.logo_url || null,
      body.staff_housing ? 1 : 0, body.meals_provided ? 1 : 0, body.transportation_assistance ? 1 : 0,
      body.legal_form || null, body.tax_id || null,
      body.postal_code || null, body.area || null,
      now, now
    )
    .run();

  const branch = await db.prepare('SELECT * FROM business_branches WHERE id = ?').bind(id).first();
  return success(c, branch, 201);
});

// PATCH /:id — update branch
branches.patch('/:id', requireAuth, requireRole('business'), async (c) => {
  const user = c.get('user');
  const branchId = c.req.param('id');
  const db = c.env.DB;
  const body = await c.req.json();
  const now = new Date().toISOString();

  const branch = await db.prepare('SELECT id FROM business_branches WHERE id = ? AND user_id = ?').bind(branchId, user.id).first();
  if (!branch) return error(c, 'Η επιχείρηση δεν βρέθηκε', 404);

  const fields = ['name', 'business_type', 'description', 'region', 'city', 'address', 'phone', 'website', 'logo_url', 'staff_housing', 'meals_provided', 'transportation_assistance', 'legal_form', 'tax_id', 'postal_code', 'area'];
  const updates: string[] = [];
  const values: any[] = [];

  for (const f of fields) {
    if (body[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(['staff_housing', 'meals_provided', 'transportation_assistance'].includes(f) ? (body[f] ? 1 : 0) : body[f]);
    }
  }

  if (updates.length > 0) {
    updates.push('updated_at = ?');
    values.push(now, branchId);
    await db.prepare(`UPDATE business_branches SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
  }

  const updated = await db.prepare('SELECT * FROM business_branches WHERE id = ?').bind(branchId).first();
  return success(c, updated);
});

// DELETE /:id — delete branch
branches.delete('/:id', requireAuth, requireRole('business'), async (c) => {
  const user = c.get('user');
  const branchId = c.req.param('id');
  const db = c.env.DB;

  const branch = await db.prepare('SELECT id FROM business_branches WHERE id = ? AND user_id = ?').bind(branchId, user.id).first();
  if (!branch) return error(c, 'Η επιχείρηση δεν βρέθηκε', 404);

  await db.prepare('DELETE FROM business_branches WHERE id = ?').bind(branchId).run();
  return success(c, { deleted: true });
});

export default branches;
