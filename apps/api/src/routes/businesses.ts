import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { updateBusinessProfileSchema } from '@staffnow/validation';
import type { Env, AuthUser } from '../types';
import { requireAuth, requireRole } from '../middleware/auth';
import { checkSwipeLimit, checkActiveMatchesLimit } from '../middleware/subscription';
import { success, error, paginated } from '../lib/response';
import { generateId } from '../lib/id';
import { recordDataChange, computeDiff, getRequestIp, getGeoFromRequest } from '../lib/activity';
import { notifyUser } from '../lib/notify';
import { getReputation } from '../lib/reputation';
import { smsConfigured } from '../lib/sms';

const businesses = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// GET /me — business's own profile
businesses.get('/me', requireAuth, requireRole('business'), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const profile = await db
    .prepare('SELECT * FROM business_profiles WHERE user_id = ?')
    .bind(user.id)
    .first();

  if (!profile) {
    return error(c, 'Το προφίλ δεν βρέθηκε', 404);
  }

  // Get count of active jobs.
  // job_listings.business_id stores business_profiles.id (NOT user_id), so we
  // must bind the profile id — binding user.id always returned 0 and disagreed
  // with /stats/dashboard (which joins via bp.user_id).
  const jobCount = await db
    .prepare(
      "SELECT COUNT(*) as count FROM job_listings WHERE business_id = ? AND status = 'published'"
    )
    .bind((profile as any).id)
    .first<{ count: number }>();

  return success(c, {
    profile,
    activeJobs: jobCount?.count || 0,
  });
});

// PATCH /me — update business profile
businesses.patch(
  '/me',
  requireAuth,
  requireRole('business'),
  zValidator('json', updateBusinessProfileSchema, (result, c) => {
    if (!result.success) {
      return error(c, 'Μη έγκυρα δεδομένα προφίλ', 400, result.error.flatten().fieldErrors);
    }
  }),
  async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const body = c.req.valid('json');

    const profile = await db
      .prepare('SELECT id FROM business_profiles WHERE user_id = ?')
      .bind(user.id)
      .first<{ id: string }>();

    if (!profile) {
      return error(c, 'Το προφίλ δεν βρέθηκε', 404);
    }

    // Snapshot before for diff
    const beforeProfile = await db
      .prepare('SELECT * FROM business_profiles WHERE id = ?')
      .bind(profile.id)
      .first<any>();

    const now = new Date().toISOString();
    const updateFields: string[] = [];
    const updateValues: (string | number | null)[] = [];

    // Maps validated camelCase input keys to their actual business_profiles columns.
    const fieldMap: Record<string, string> = {
      companyName: 'company_name',
      businessType: 'business_type',
      region: 'region',
      address: 'address',
      phone: 'phone',
      website: 'website',
      description: 'description',
      logoUrl: 'logo_url',
      staffHousing: 'staff_housing',
      mealsProvided: 'meals_provided',
      transportationAssistance: 'transportation_assistance',
      salaryRangeMin: 'salary_range_min',
      salaryRangeMax: 'salary_range_max',
    };

    const booleanFields = new Set([
      'staff_housing',
      'meals_provided',
      'transportation_assistance',
    ]);

    for (const [key, value] of Object.entries(body)) {
      const dbField = fieldMap[key];
      if (dbField && value !== undefined) {
        updateFields.push(`${dbField} = ?`);
        // D1 does not bind booleans directly; store as 0/1.
        updateValues.push(
          booleanFields.has(dbField) ? (value ? 1 : 0) : (value as string | number | null),
        );
      }
    }

    updateFields.push('updated_at = ?');
    updateValues.push(now);

    if (updateFields.length > 0) {
      updateValues.push(profile.id);
      await db
        .prepare(`UPDATE business_profiles SET ${updateFields.join(', ')} WHERE id = ?`)
        .bind(...updateValues)
        .run();
    }

    const updated = await db
      .prepare('SELECT * FROM business_profiles WHERE id = ?')
      .bind(profile.id)
      .first();

    const diff = computeDiff(beforeProfile, updated as any, ['updated_at', 'profile_completeness']);
    if (Object.keys(diff).length > 0) {
      c.executionCtx.waitUntil(
        recordDataChange(c.env, {
          actorUserId: user.id,
          actorRole: user.role,
          actorEmail: user.email,
          action: 'profile_update',
          entityType: 'business_profile',
          entityId: profile.id,
          entityOwnerId: user.id,
          fieldChanges: diff,
          ip: getRequestIp(c),
          userAgent: c.req.header('User-Agent') || null,
          geo: getGeoFromRequest(c),
        }),
      );
    }

    return success(c, { profile: updated });
  }
);

// =====================================================================
// Επαλήθευση επιχείρησης
//
// Ο πίνακας verification_requests και ο έλεγχος από admin
// (GET/POST /admin/verifications) υπήρχαν ήδη — έλειπε μόνο ο τρόπος να
// υποβάλει η ίδια η επιχείρηση αίτημα. Η έγκριση γίνεται αποκλειστικά από
// admin· εδώ δεν αγγίζουμε ποτέ το business_profiles.verified.
// =====================================================================

// GET /me/verification — κατάσταση του τελευταίου αιτήματος
businesses.get('/me/verification', requireAuth, requireRole('business'), async (c) => {
  const user = c.get('user');

  const profile = await c.env.DB.prepare(
    'SELECT verified FROM business_profiles WHERE user_id = ?',
  )
    .bind(user.id)
    .first<{ verified: number }>();

  if (!profile) return error(c, 'Το προφίλ δεν βρέθηκε', 404);

  const request = await c.env.DB.prepare(
    `SELECT id, status, rejection_reason, vat_number, registry_number, notes, created_at, reviewed_at
     FROM verification_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
  )
    .bind(user.id)
    .first();

  /*
    ΤΟ ΚΙΝΗΤΟ ΛΕΙΠΕ ΕΝΤΕΛΩΣ ΑΠΟ ΕΔΩ — ΚΑΙ ΤΟ ΤΑΜΠΛΟ ΤΟ ΖΗΤΟΥΣΕ.

    Το TaskNow δείχνει στην επιχείρηση κάρτα «Επαλήθευση» με «○ Κινητό» και
    κουμπί «Επαλήθευσε το κινητό →» που οδηγεί εδώ. Η σελίδα όμως δεν είχε
    κανένα βήμα κινητού: αν η επιχείρηση ήταν ήδη επαληθευμένη, έβλεπε μόνο το
    πράσινο «είσαι επαληθευμένη» και τέλος. Δηλαδή το κουμπί οδηγούσε σε
    αδιέξοδο, και το «○ Κινητό» δεν γινόταν ✓ ποτέ.

    Τα ίδια πεδία με τον εργαζόμενο, ώστε η οθόνη να είναι μία και κοινή.
  */
  const account = await c.env.DB.prepare(
    'SELECT email, email_confirmed_at, phone, phone_confirmed_at FROM users WHERE id = ?',
  )
    .bind(user.id)
    .first<{
      email: string;
      email_confirmed_at: string | null;
      phone: string | null;
      phone_confirmed_at: string | null;
    }>();

  return success(c, {
    verified: profile.verified === 1,
    request: request || null,
    phone: account?.phone || '',
    phoneConfirmed: !!account?.phone_confirmed_at,
    // Λέει στη σελίδα ποια εκδοχή να δείξει: κωδικό SMS ή «δηλωμένο».
    smsAvailable: smsConfigured(c.env),
    email: account?.email || '',
    emailConfirmed: !!account?.email_confirmed_at,
  });
});

// POST /me/verify — υποβολή αιτήματος επαλήθευσης
businesses.post('/me/verify', requireAuth, requireRole('business'), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const body = await c.req.json<{
    vat_number?: string;
    registry_number?: string;
    document_url?: string;
    notes?: string;
  }>().catch(() => null);

  if (!body) return error(c, 'Μη έγκυρα δεδομένα', 400);

  // Το ΑΦΜ είναι ακριβώς 9 ψηφία.
  const vat = (body.vat_number || '').replace(/\s/g, '');
  if (!/^\d{9}$/.test(vat)) {
    return error(c, 'Το ΑΦΜ πρέπει να είναι 9 ψηφία', 400);
  }

  // Το document_url είναι NOT NULL στον πίνακα (0010) — το απαιτούμε ρητά
  // αντί να αφήσουμε τη βάση να πετάξει 500.
  const documentUrl = (body.document_url || '').trim();
  if (!documentUrl) {
    return error(c, 'Χρειάζεται δικαιολογητικό (ΑΦΜ από TaxisNet ή ΓΕΜΗ)', 400);
  }

  const profile = await db
    .prepare('SELECT id, verified FROM business_profiles WHERE user_id = ?')
    .bind(user.id)
    .first<{ id: string; verified: number }>();

  if (!profile) return error(c, 'Το προφίλ δεν βρέθηκε', 404);
  if (profile.verified === 1) {
    return error(c, 'Η επιχείρηση είναι ήδη επαληθευμένη', 400);
  }

  const pending = await db
    .prepare("SELECT id FROM verification_requests WHERE user_id = ? AND status = 'pending'")
    .bind(user.id)
    .first<{ id: string }>();

  if (pending) {
    return error(c, 'Υπάρχει ήδη αίτημα σε αναμονή ελέγχου', 400);
  }

  const id = generateId();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO verification_requests
         (id, user_id, document_url, document_type, status, vat_number, registry_number, notes, created_at)
       VALUES (?, ?, ?, 'business', 'pending', ?, ?, ?, ?)`,
    )
    .bind(
      id,
      user.id,
      documentUrl,
      vat,
      (body.registry_number || '').trim() || null,
      (body.notes || '').trim() || null,
      now,
    )
    .run();

  return success(c, { id, status: 'pending', createdAt: now }, 201);
});

// GET /discover — workers discover businesses
businesses.get('/discover', requireAuth, requireRole('worker'), async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 50);
  const offset = (page - 1) * limit;

  // Filters
  const region = c.req.query('region');
  const industry = c.req.query('industry');
  const companySize = c.req.query('companySize');

  const conditions: string[] = ['u.status = ?', 'u.role = ?'];
  const params: (string | number)[] = ['active', 'business'];

  // Exclude already swiped businesses
  conditions.push(
    `bp.user_id NOT IN (SELECT target_id FROM swipes WHERE swiper_id = ? AND target_type = 'business')`
  );
  params.push(user.id);

  // Exclude blocked
  conditions.push(
    `bp.user_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)`
  );
  params.push(user.id);

  conditions.push(
    `bp.user_id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = ?)`
  );
  params.push(user.id);

  if (region) {
    conditions.push('bp.region = ?');
    params.push(region);
  }

  if (industry) {
    conditions.push('bp.industry = ?');
    params.push(industry);
  }

  if (companySize) {
    conditions.push('bp.company_size = ?');
    params.push(companySize);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await db
    .prepare(
      `SELECT COUNT(*) as total FROM business_profiles bp
       JOIN users u ON u.id = bp.user_id
       ${whereClause}`
    )
    .bind(...params)
    .first<{ total: number }>();

  const total = countResult?.total || 0;

  const results = await db
    .prepare(
      `SELECT bp.*, u.email, u.status as user_status,
         CASE WHEN sub.plan_id IN ('business_pro', 'business_elite', 'founding_pro') THEN 1 ELSE 0 END as is_premium,
         CASE WHEN bp.verified = 1 THEN 1 ELSE 0 END as is_verified,
         bp.profile_completeness
       FROM business_profiles bp
       JOIN users u ON u.id = bp.user_id
       LEFT JOIN subscriptions sub ON sub.user_id = u.id AND sub.status = 'active'
       ${whereClause}
       ORDER BY is_premium DESC, is_verified DESC, bp.profile_completeness DESC, bp.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .bind(...params, limit, offset)
    .all();

  // Get active job count for each business
  const businessesWithJobCount = await Promise.all(
    results.results.map(async (biz: Record<string, unknown>) => {
      // business_id stores business_profiles.id (NOT user_id) — bind biz.id.
      const jobCount = await db
        .prepare(
          "SELECT COUNT(*) as count FROM job_listings WHERE business_id = ? AND status = 'published'"
        )
        .bind(biz.id as string)
        .first<{ count: number }>();

      return {
        ...biz,
        activeJobs: jobCount?.count || 0,
      };
    })
  );

  return paginated(c, businessesWithJobCount, total, page, limit);
});

// GET /:id — get business by ID
businesses.get('/:id', requireAuth, async (c) => {
  const viewer = c.get('user');
  const businessId = c.req.param('id');
  const db = c.env.DB;
  const isSelf = viewer.id === businessId;
  const isAdmin = viewer.role === 'admin';

  const profile = await db
    .prepare(
      `SELECT bp.*, u.email, u.status as user_status
       FROM business_profiles bp
       JOIN users u ON u.id = bp.user_id
       WHERE bp.user_id = ? AND u.status = 'active'`
    )
    .bind(businessId)
    .first();

  if (!profile) {
    return error(c, 'Η επιχείρηση δεν βρέθηκε', 404);
  }

  // Hide email unless viewer is self/admin/matched worker
  let isMatched = false;
  if (!isSelf && !isAdmin && viewer.role === 'worker') {
    const match = await db
      .prepare("SELECT id FROM matches WHERE business_id = ? AND worker_id = ? AND status = 'active' LIMIT 1")
      .bind(businessId, viewer.id)
      .first();
    isMatched = !!match;
  }
  if (!isSelf && !isAdmin && !isMatched) {
    (profile as any).email = undefined;
    (profile as any).phone = undefined;
  }

  // Get branch info (cover photo, etc.)
  const branch = await db
    .prepare('SELECT * FROM business_branches WHERE user_id = ? ORDER BY created_at ASC LIMIT 1')
    .bind(businessId)
    .first();

  // job_listings.business_id stores business_profiles.id (NOT user_id)
  // so we use the bp.id from the profile we just fetched
  const bpId = (profile as any).id;
  const activeJobs = await db
    .prepare(
      "SELECT id, title, region, city, employment_type, salary_min, salary_max, salary_type, housing_provided, meals_provided, transport_provided, bonus_provided, insurance_provided, no_benefits, created_at FROM job_listings WHERE business_id = ? AND status = 'published' ORDER BY created_at DESC LIMIT 10"
    )
    .bind(bpId)
    .all();

  // Merge branch data with profile - branch data takes priority
  const mergedProfile: any = { ...(profile as any) };
  if (branch) {
    const b = branch as any;
    mergedProfile.company_name = b.name || mergedProfile.company_name;
    mergedProfile.logo_url = b.logo_url || mergedProfile.logo_url;
    mergedProfile.business_type = b.business_type || mergedProfile.business_type;
    mergedProfile.description = b.description || mergedProfile.description;
    mergedProfile.phone = b.phone || mergedProfile.phone;
    mergedProfile.website = b.website || mergedProfile.website;
    mergedProfile.address = b.address || mergedProfile.address;
    mergedProfile.region = b.region || mergedProfile.region;
    mergedProfile.city = b.city;
    mergedProfile.cover_photo_url = b.cover_photo_url;
    mergedProfile.staff_housing = b.staff_housing != null ? b.staff_housing : mergedProfile.staff_housing;
    mergedProfile.meals_provided = b.meals_provided != null ? b.meals_provided : mergedProfile.meals_provided;
    mergedProfile.transportation_assistance = b.transportation_assistance != null ? b.transportation_assistance : mergedProfile.transportation_assistance;
    mergedProfile.bonus_provided = b.bonus_provided;
    mergedProfile.insurance_provided = b.insurance_provided;
    mergedProfile.no_benefits = b.no_benefits;
    mergedProfile.operating_hours = b.operating_hours;
    mergedProfile.google_business_url = b.google_business_url;
    mergedProfile.postal_code = b.postal_code;
    mergedProfile.area = b.area;
  }

  // Αληθινή φήμη, από τις επιβεβαιωμένες προσλήψεις — όχι σταθερό «4.8».
  Object.assign(mergedProfile, await getReputation(db, businessId, 'business'));

  return success(c, {
    profile: mergedProfile,
    activeJobs: activeJobs.results,
  });
});

// POST /:id/like — worker likes a business
businesses.post('/:id/like', requireAuth, requireRole('worker'), checkSwipeLimit, async (c) => {
  const user = c.get('user');
  const targetId = c.req.param('id');
  const db = c.env.DB;
  const now = new Date().toISOString();

  // Check target exists
  const target = await db
    .prepare("SELECT id FROM users WHERE id = ? AND role = 'business' AND status = 'active'")
    .bind(targetId)
    .first();

  if (!target) {
    return error(c, 'Η επιχείρηση δεν βρέθηκε', 404);
  }

  // Ίδιος κανόνας με τους εργαζόμενους: ΜΟΝΟ ένα προηγούμενο «ενδιαφέρον»
  // μπλοκάρει. Μια παλιά προσπέραση δεν πρέπει να κλειδώνει τον χρήστη για
  // πάντα — αλλάζει γνώμη ή πατάει λάθος, και είναι φυσιολογικό.
  const existingSwipe = await db
    .prepare(
      "SELECT id, direction FROM swipes WHERE swiper_id = ? AND target_id = ? AND target_type = 'business'"
    )
    .bind(user.id, targetId)
    .first<{ id: string; direction: string }>();

  if (existingSwipe?.direction === 'like') {
    return error(c, 'Έχετε ήδη δηλώσει ενδιαφέρον για αυτή την επιχείρηση', 409);
  }

  // Νέο ενδιαφέρον ή αναβάθμιση παλιάς προσπέρασης — μία γραμμή ανά ζευγάρι.
  let swipeId: string;
  if (existingSwipe) {
    swipeId = existingSwipe.id;
    await db
      .prepare("UPDATE swipes SET direction = 'like', created_at = ? WHERE id = ?")
      .bind(now, swipeId)
      .run();
  } else {
    swipeId = generateId();
    await db
      .prepare(
        `INSERT INTO swipes (id, swiper_id, target_id, target_type, direction, created_at)
         VALUES (?, ?, ?, 'business', 'like', ?)`
      )
      .bind(swipeId, user.id, targetId, now)
      .run();
  }

  // Notify the business about the incoming interest (in-app + off-site). This
  // event previously produced NO notification at all on a one-way like.
  const workerForNotif = await db
    .prepare('SELECT full_name FROM worker_profiles WHERE user_id = ?')
    .bind(user.id)
    .first<{ full_name: string }>();
  const workerNameForNotif = workerForNotif?.full_name || 'Ένας εργαζόμενος';

  await db
    .prepare(
      `INSERT INTO notifications (id, user_id, type, title, body, data, created_at)
       VALUES (?, ?, 'system', ?, ?, ?, ?)`
    )
    .bind(
      generateId('nt'),
      targetId,
      `👋 ${workerNameForNotif} ενδιαφέρθηκε για την επιχείρησή σου`,
      'Πάτησε για να δεις το προφίλ του',
      JSON.stringify({ workerId: user.id }),
      now
    )
    .run();

  c.executionCtx.waitUntil(
    notifyUser(c.env, {
      userId: targetId,
      title: `👋 ${workerNameForNotif} ενδιαφέρθηκε για την επιχείρησή σου`,
      body: 'Δες το προφίλ του και κάνε like πίσω για να ξεκινήσετε συνομιλία.',
      url: '/dashboard/interests',
      ctaText: 'Δες τα ενδιαφέροντα',
      emailCategory: 'interest',
      emailCooldownMinutes: 30,
    }),
  );

  // Check for mutual match (business liked this worker)
  const mutualSwipe = await db
    .prepare(
      "SELECT id FROM swipes WHERE swiper_id = ? AND target_id = ? AND target_type = 'worker' AND direction = 'like'"
    )
    .bind(targetId, user.id)
    .first();

  let matched = false;
  let matchId: string | null = null;

  if (mutualSwipe) {
    // Cap belongs to the business side (targetId here is the business user_id).
    const cap = await checkActiveMatchesLimit(db, targetId);
    if (!cap.allowed) {
      return success(c, {
        matched: false,
        atCap: true,
        message: 'Η επιχείρηση έχει φτάσει το όριο matches. Δοκίμασε ξανά σύντομα.',
      });
    }

    matched = true;
    matchId = generateId();
    const conversationId = generateId();

    await db
      .prepare(
        `INSERT INTO matches (id, worker_id, business_id, status, created_at, updated_at)
         VALUES (?, ?, ?, 'active', ?, ?)`
      )
      .bind(matchId, user.id, targetId, now, now)
      .run();

    await db
      .prepare(
        `INSERT INTO conversations (id, match_id, worker_id, business_id, status, created_at)
         VALUES (?, ?, ?, ?, 'active', ?)`
      )
      .bind(conversationId, matchId, user.id, targetId, now)
      .run();

    // Notify both parties
    await db
      .prepare(
        `INSERT INTO notifications (id, user_id, type, title, body, data, read, created_at, updated_at)
         VALUES (?, ?, 'match', ?, ?, ?, 0, ?, ?)`
      )
      .bind(
        generateId(),
        user.id,
        'Νέο ταίριασμα!',
        'Έχετε ένα νέο ταίριασμα με μια επιχείρηση. Ξεκινήστε τη συνομιλία!',
        JSON.stringify({ matchId, conversationId }),
        now,
        now
      )
      .run();

    await db
      .prepare(
        `INSERT INTO notifications (id, user_id, type, title, body, data, read, created_at, updated_at)
         VALUES (?, ?, 'match', ?, ?, ?, 0, ?, ?)`
      )
      .bind(
        generateId(),
        targetId,
        'Νέο ταίριασμα!',
        'Έχετε ένα νέο ταίριασμα με έναν εργαζόμενο. Ξεκινήστε τη συνομιλία!',
        JSON.stringify({ matchId, conversationId }),
        now,
        now
      )
      .run();

    // Off-site notify both parties about the new match (best-effort).
    const convPath = `/dashboard/messages?c=${conversationId}`;
    c.executionCtx.waitUntil(
      Promise.allSettled([
        notifyUser(c.env, {
          userId: user.id,
          title: '🎉 Νέο ταίριασμα!',
          body: 'Ταιριάξατε με μια επιχείρηση. Ξεκινήστε τη συνομιλία!',
          url: convPath,
          ctaText: 'Άνοιγμα συνομιλίας',
          emailCategory: 'match',
          emailCooldownMinutes: 5,
        }),
        notifyUser(c.env, {
          userId: targetId,
          title: '🎉 Νέο ταίριασμα!',
          body: 'Ταιριάξατε με έναν εργαζόμενο. Ξεκινήστε τη συνομιλία!',
          url: convPath,
          ctaText: 'Άνοιγμα συνομιλίας',
          emailCategory: 'match',
          emailCooldownMinutes: 5,
        }),
      ]),
    );
  }

  return success(c, { swiped: true, matched, matchId }, matched ? 201 : 200);
});

export default businesses;
