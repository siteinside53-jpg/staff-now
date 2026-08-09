import { Hono } from 'hono';
import type { Context } from 'hono';
import type { Env, AuthUser } from '../types';
import { requireAuth } from '../middleware/auth';
import {
  authRateLimiter,
  passwordResetRateLimiter,
  emailCodeRateLimiter,
  phoneCodeRateLimiter,
  confirmCodeRateLimiter,
  twoFactorRateLimiter,
} from '../middleware/rate-limiter';
import { generateSecret, verifyTotp, otpauthUri } from '../lib/totp';
import { hashPassword, verifyPassword } from '../lib/password';
import { signJWT } from '../lib/jwt';
import { generateId } from '../lib/id';
import { success, error } from '../lib/response';
import { recordActivity, startSession, endSession, getRequestIp, getGeoFromRequest } from '../lib/activity';
import { sendEmail, emailLayout } from '../lib/email';
import { sendSms, smsConfigured } from '../lib/sms';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from '@staffnow/validation';

// Το site είναι στατικό και σερβίρεται πάντα από αυτό το domain, όπως ακριβώς
// και στο lib/notify.ts. Ο σύνδεσμος επαναφοράς πρέπει να δείχνει στο site,
// όχι στο API.
const WEB_ORIGIN = 'https://staffnow.gr';

const auth = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// POST /register
auth.post('/register', authRateLimiter, async (c) => {
  const body = await c.req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return error(c, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Μη έγκυρα δεδομένα.', 400);
  }

  const { email, password, role } = parsed.data;
  const db = c.env.DB;

  // Check existing user
  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) {
    return error(c, 'CONFLICT', 'Υπάρχει ήδη λογαριασμός με αυτό το email.', 409);
  }

  const userId = generateId('usr');
  const passwordHash = await hashPassword(password, c.env.PASSWORD_SALT);
  const now = new Date().toISOString();

  // Create user
  await db
    .prepare(
      `INSERT INTO users (id, email, password_hash, role, status, email_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', 1, ?, ?)`,
    )
    .bind(userId, email, passwordHash, role, now, now)
    .run();

  // Create initial profile
  if (role === 'worker') {
    await db
      .prepare(
        `INSERT INTO worker_profiles (id, user_id, full_name, profile_completeness, created_at, updated_at)
         VALUES (?, ?, '', 0, ?, ?)`,
      )
      .bind(generateId('wp'), userId, now, now)
      .run();
  } else if (role === 'business') {
    await db
      .prepare(
        `INSERT INTO business_profiles (id, user_id, company_name, business_type, description, created_at, updated_at)
         VALUES (?, ?, '', 'other', '', ?, ?)`,
      )
      .bind(generateId('bp'), userId, now, now)
      .run();
  }

  // Generate JWT
  const token = await signJWT({ sub: userId, email, role }, c.env.JWT_SECRET);

  // Set cookie
  const isProduction = c.env.ENVIRONMENT === 'production';
  c.header(
    'Set-Cookie',
    `staffnow_token=${token}; HttpOnly; ${isProduction ? 'Secure; ' : ''}SameSite=Lax; Path=/; Max-Age=${72 * 3600}`,
  );

  // Track activity (best-effort, never throws)
  const ip = getRequestIp(c);
  const ua = c.req.header('User-Agent') || null;
  const geo = getGeoFromRequest(c);
  c.executionCtx.waitUntil(
    (async () => {
      await startSession(c.env, { userId, ip, userAgent: ua, geo });
      await recordActivity(c.env, {
        userId,
        type: 'register',
        metadata: { role, email },
        ip,
        userAgent: ua,
        geo,
      });
    })(),
  );

  return success(c, { user: { id: userId, email, role, status: 'active' }, token }, 201);
});

// POST /login
auth.post('/login', authRateLimiter, async (c) => {
  const body = await c.req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return error(c, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Μη έγκυρα δεδομένα.', 400);
  }

  const { email, password } = parsed.data;
  const db = c.env.DB;
  const lockKey = `login_fails:${email.toLowerCase()}`;
  const MAX_ATTEMPTS = 5;
  const LOCK_DURATION_S = 15 * 60; // 15 minutes

  // Check lockout
  let failedAttempts = 0;
  try {
    const stored = await c.env.KV.get(lockKey);
    if (stored) failedAttempts = parseInt(stored, 10) || 0;
  } catch { /* KV unavailable — allow through */ }

  if (failedAttempts >= MAX_ATTEMPTS) {
    return error(c, 'LOCKED', 'Πολλές αποτυχημένες προσπάθειες. Δοκιμάστε ξανά σε 15 λεπτά.', 429);
  }

  const user = await db
    .prepare(
      'SELECT id, email, password_hash, role, status, totp_secret, totp_enabled_at FROM users WHERE email = ?',
    )
    .bind(email)
    .first<{
      id: string;
      email: string;
      password_hash: string;
      role: string;
      status: string;
      totp_secret: string | null;
      totp_enabled_at: string | null;
    }>();

  const bumpFailures = () => {
    try {
      c.executionCtx.waitUntil(
        c.env.KV.put(lockKey, String(failedAttempts + 1), { expirationTtl: LOCK_DURATION_S }),
      );
    } catch { /* ignore KV errors */ }
  };

  if (!user) {
    bumpFailures();
    return error(c, 'UNAUTHORIZED', 'Λάθος email ή κωδικός.', 401);
  }

  if (user.status === 'suspended') {
    return error(c, 'FORBIDDEN', 'Ο λογαριασμός σας έχει ανασταλεί.', 403);
  }

  const valid = await verifyPassword(password, user.password_hash, c.env.PASSWORD_SALT);
  if (!valid) {
    bumpFailures();
    return error(c, 'UNAUTHORIZED', 'Λάθος email ή κωδικός.', 401);
  }

  // Clear lockout on successful login
  try { c.executionCtx.waitUntil(c.env.KV.delete(lockKey)); } catch {}

  // Αν ΚΑΙ ΜΟΝΟ ΑΝ ο λογαριασμός έχει ανάψει διπλή επαλήθευση, η σύνδεση
  // σταματάει εδώ. Δεν εκδίδεται κλειδί συνεδρίας — εκδίδεται μια «απόδειξη
  // ότι ο κωδικός ήταν σωστός», που από μόνη της δεν ανοίγει τίποτα πουθενά.
  //
  // Για κάθε άλλον λογαριασμό (εργαζόμενοι, επιχειρήσεις) οι δύο στήλες είναι
  // NULL, οπότε αυτό το `if` δεν εκτελείται ποτέ και η απάντηση παραμένει
  // γράμμα προς γράμμα η ίδια με πριν.
  if (user.totp_secret && user.totp_enabled_at) {
    return startTwoFactorChallenge(c, user.id);
  }

  return issueSession(c, user);
});

/**
 * Η ουρά κάθε επιτυχημένης σύνδεσης: `last_login_at`, έκδοση κλειδιού, cookie,
 * καταγραφή δραστηριότητας, απάντηση.
 *
 * Είναι μία και μόνη συνάρτηση επίτηδες. Το δεύτερο βήμα της διπλής
 * επαλήθευσης καταλήγει **εδώ ακριβώς**, άρα η απάντηση που παίρνει η σελίδα
 * είναι εξ ορισμού πανομοιότυπη είτε πέρασε από ένα βήμα είτε από δύο — και
 * δεν υπάρχει περίπτωση να ξεχαστεί κάτι στη μία από τις δύο διαδρομές.
 */
async function issueSession(
  c: Context<{ Bindings: Env; Variables: { user: AuthUser } }>,
  user: { id: string; email: string; role: string; status: string },
) {
  await c.env.DB
    .prepare("UPDATE users SET last_login_at = datetime('now'), updated_at = datetime('now') WHERE id = ?")
    .bind(user.id)
    .run();

  const token = await signJWT({ sub: user.id, email: user.email, role: user.role }, c.env.JWT_SECRET);

  const isProduction = c.env.ENVIRONMENT === 'production';
  c.header(
    'Set-Cookie',
    `staffnow_token=${token}; HttpOnly; ${isProduction ? 'Secure; ' : ''}SameSite=Lax; Path=/; Max-Age=${72 * 3600}`,
  );

  // Track activity (best-effort)
  const ip = getRequestIp(c);
  const ua = c.req.header('User-Agent') || null;
  const geo = getGeoFromRequest(c);
  const userIdForLog = user.id;
  c.executionCtx.waitUntil(
    (async () => {
      await startSession(c.env, { userId: userIdForLog, ip, userAgent: ua, geo });
      await recordActivity(c.env, {
        userId: userIdForLog,
        type: 'login',
        metadata: { email: user.email, role: user.role },
        ip,
        userAgent: ua,
        geo,
      });
    })(),
  );

  return success(c, {
    user: { id: user.id, email: user.email, role: user.role, status: user.status },
    token,
  });
}

// POST /logout
//
// Μέχρι τώρα η αποσύνδεση έσβηνε ΜΟΝΟ το cookie του browser. Το ίδιο το token
// συνέχιζε να ισχύει μέχρι 72 ώρες: όποιος το είχε αντιγράψει (κοινόχρηστος
// υπολογιστής, κλεμμένο κινητό) μπορούσε να μπαίνει κανονικά αφού εσύ είχες
// πατήσει «Αποσύνδεση». Τώρα σημειώνουμε στη βάση τη στιγμή της αποσύνδεσης
// και κάθε token που εκδόθηκε πριν από αυτήν πεθαίνει ακαριαία.
auth.post('/logout', requireAuth, async (c) => {
  const u = c.get('user');
  c.header('Set-Cookie', 'staffnow_token=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
  await c.env.DB.prepare("UPDATE users SET sessions_valid_from = datetime('now') WHERE id = ?")
    .bind(u.id)
    .run();
  const logoutIp = getRequestIp(c);
  const logoutUa = c.req.header('User-Agent') || null;
  const logoutGeo = getGeoFromRequest(c);
  c.executionCtx.waitUntil(
    (async () => {
      await endSession(c.env, u.id);
      await recordActivity(c.env, {
        userId: u.id,
        type: 'logout',
        ip: logoutIp,
        userAgent: logoutUa,
        geo: logoutGeo,
      });
    })(),
  );
  return success(c, { message: 'Αποσυνδεθήκατε επιτυχώς.' });
});

// GET /me
auth.get('/me', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  let profile = null;
  if (user.role === 'worker') {
    profile = await db.prepare('SELECT * FROM worker_profiles WHERE user_id = ?').bind(user.id).first();
    if (profile) {
      const p = profile as any;
      const roles = await db
        .prepare('SELECT role FROM worker_profile_roles WHERE worker_profile_id = ?')
        .bind(p.id)
        .all();
      p.roles = (roles.results as Array<{ role: string }>).map((r) => r.role);
      const languages = await db
        .prepare('SELECT language FROM worker_profile_languages WHERE worker_profile_id = ?')
        .bind(p.id)
        .all();
      p.languages = (languages.results as Array<{ language: string }>).map((l) => l.language);
    }
  } else if (user.role === 'business') {
    profile = await db.prepare('SELECT * FROM business_profiles WHERE user_id = ?').bind(user.id).first();
    // Merge branch data (name, logo, cover) if missing from profile
    const branch = await db.prepare('SELECT name, logo_url, cover_photo_url, description, business_type, region, city FROM business_branches WHERE user_id = ?').bind(user.id).first<any>();
    if (profile && branch) {
      const p = profile as any;
      if (!p.company_name && branch.name) p.company_name = branch.name;
      if (!p.logo_url && branch.logo_url) p.logo_url = branch.logo_url;
      if (!p.cover_photo_url && branch.cover_photo_url) p.cover_photo_url = branch.cover_photo_url;
      if (!p.description && branch.description) p.description = branch.description;
      if (!p.business_type && branch.business_type) p.business_type = branch.business_type;
      if (!p.region && branch.region) p.region = branch.region;
      if (!p.city && branch.city) p.city = branch.city;
    }
  }

  const subscription = await db
    .prepare("SELECT plan_id, status, current_period_end, cancel_at_period_end FROM subscriptions WHERE user_id = ? AND status IN ('active', 'trialing')")
    .bind(user.id)
    .first();

  // Fetch full user data including display_name and avatar_url
  const fullUser = await db.prepare('SELECT id, email, role, status, display_name, avatar_url, email_confirmed_at FROM users WHERE id = ?').bind(user.id).first();
  return success(c, { user: fullUser || user, profile, subscription });
});

// PATCH /me/settings — update account display name + avatar
auth.patch('/me/settings', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const body = await c.req.json();
  const now = new Date().toISOString();

  const updates: string[] = [];
  const values: any[] = [];

  if (body.displayName !== undefined) { updates.push('display_name = ?'); values.push(body.displayName); }
  if (body.avatarUrl !== undefined) { updates.push('avatar_url = ?'); values.push(body.avatarUrl); }

  if (updates.length > 0) {
    updates.push('updated_at = ?');
    values.push(now, user.id);
    await db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
  }

  const updated = await db.prepare('SELECT id, email, role, status, display_name, avatar_url FROM users WHERE id = ?').bind(user.id).first();
  return success(c, updated);
});

// DELETE /me — permanently delete the authenticated user's account
auth.delete('/me', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  // Remove rows that reference users(id) WITHOUT ON DELETE CASCADE first, then
  // delete the user (every other table cascades). Batched so it's atomic.
  await db.batch([
    db.prepare('DELETE FROM credit_transactions WHERE user_id = ?').bind(user.id),
    db.prepare('DELETE FROM credits WHERE user_id = ?').bind(user.id),
    db.prepare('UPDATE plan_overrides SET updated_by = NULL WHERE updated_by = ?').bind(user.id),
    db.prepare('DELETE FROM users WHERE id = ?').bind(user.id),
  ]);

  return success(c, { message: 'Ο λογαριασμός διαγράφηκε.' });
});

// ---------------------------------------------------------------------------
// Επιβεβαίωση email με 6ψήφιο κωδικό.
//
// Το `users.email_verified` μπαίνει 1 κατά την εγγραφή, οπότε δεν αποδεικνύει
// τίποτα. Το `email_confirmed_at` γράφεται μόνο εδώ, αφού ο χρήστης βάλει τον
// κωδικό που έλαβε — αυτό είναι που δείχνει το σήμα «Επαληθευμένο email».
// ---------------------------------------------------------------------------

// POST /email/send-code
auth.post('/email/send-code', requireAuth, emailCodeRateLimiter, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const row = await db
    .prepare('SELECT email, email_confirmed_at FROM users WHERE id = ?')
    .bind(user.id)
    .first<{ email: string; email_confirmed_at: string | null }>();

  if (!row) return error(c, 'NOT_FOUND', 'Ο λογαριασμός δεν βρέθηκε.', 404);
  if (row.email_confirmed_at) {
    return error(c, 'ALREADY_CONFIRMED', 'Το email σου είναι ήδη επιβεβαιωμένο.', 400);
  }

  // 6 ψηφία, ομοιόμορφα — χωρίς Math.random().
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0');
  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();

  await db
    .prepare('UPDATE users SET email_verification_token = ?, email_verify_expires_at = ? WHERE id = ?')
    .bind(code, expiresAt, user.id)
    .run();

  if (c.env.ENVIRONMENT !== 'production') {
    // eslint-disable-next-line no-console
    console.log(`[DEV] Email confirmation code for ${row.email}: ${code}`);
  }

  const sent = await sendEmail(
    { apiKey: c.env.EMAIL_API_KEY, from: c.env.EMAIL_FROM || 'StaffNow <no-reply@staffnow.gr>' },
    {
      to: row.email,
      subject: `${code} — ο κωδικός επιβεβαίωσης StaffNow`,
      html: emailLayout({
        title: 'Επιβεβαίωση email',
        body: `Ο κωδικός επιβεβαίωσης του λογαριασμού σου είναι:<br><br><span style="display:inline-block;font-size:30px;font-weight:800;letter-spacing:8px;color:#0f172a;background:#f1f5f9;border-radius:12px;padding:12px 20px;">${code}</span><br><br>Ισχύει για 15 λεπτά. Αν δεν το ζήτησες εσύ, αγνόησε αυτό το email.`,
        ctaText: 'Άνοιγμα StaffNow',
        ctaUrl: `${WEB_ORIGIN}/dashboard/verification`,
        icon: '✉️',
        tint: '#dbeafe',
      }),
    },
  );

  // Εδώ το email ΔΕΝ είναι best-effort: αν δεν φύγει, ο χρήστης περιμένει κωδικό
  // που δεν θα έρθει ποτέ. Λέμε την αλήθεια αντί για ψεύτικο «στάλθηκε».
  // Στο dev ο κωδικός τυπώνεται στην κονσόλα, οπότε η ροή δοκιμάζεται κανονικά.
  if (!sent && c.env.ENVIRONMENT === 'production') {
    return error(c, 'EMAIL_FAILED', 'Δεν στάλθηκε το email. Δοκίμασε ξανά σε λίγο.', 502);
  }

  return success(c, { sent: true, expiresAt });
});

// POST /email/confirm
auth.post('/email/confirm', requireAuth, confirmCodeRateLimiter, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const body = await c.req.json<{ code?: string }>().catch(() => null);
  const code = (body?.code || '').replace(/\D/g, '');
  if (code.length !== 6) return error(c, 'VALIDATION_ERROR', 'Ο κωδικός είναι 6 ψηφία.', 400);

  const row = await db
    .prepare(
      `SELECT email_verification_token, email_verify_expires_at, email_confirmed_at
       FROM users WHERE id = ?`,
    )
    .bind(user.id)
    .first<{
      email_verification_token: string | null;
      email_verify_expires_at: string | null;
      email_confirmed_at: string | null;
    }>();

  if (!row) return error(c, 'NOT_FOUND', 'Ο λογαριασμός δεν βρέθηκε.', 404);
  if (row.email_confirmed_at) return success(c, { confirmed: true });

  if (!row.email_verification_token || !row.email_verify_expires_at) {
    return error(c, 'NO_CODE', 'Ζήτησε πρώτα νέο κωδικό.', 400);
  }
  if (new Date(row.email_verify_expires_at).getTime() < Date.now()) {
    return error(c, 'CODE_EXPIRED', 'Ο κωδικός έληξε. Ζήτησε νέο.', 400);
  }
  if (row.email_verification_token !== code) {
    return error(c, 'CODE_INVALID', 'Λάθος κωδικός.', 400);
  }

  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE users
       SET email_confirmed_at = ?, email_verified = 1,
           email_verification_token = NULL, email_verify_expires_at = NULL, updated_at = ?
       WHERE id = ?`,
    )
    .bind(now, now, user.id)
    .run();

  return success(c, { confirmed: true, confirmedAt: now });
});

// ---------------------------------------------------------------------------
// Επιβεβαίωση κινητού με 6ψήφιο κωδικό SMS.
//
// Ίδιο ακριβώς μοτίβο με το email παραπάνω. Δύο διαφορές που μετράνε:
//
//  1) Κόστος. Κάθε SMS πληρώνεται. Γι' αυτό υπάρχουν ΤΡΙΑ ανεξάρτητα φρένα:
//     το `phoneCodeRateLimiter` (3 ανά 15 λεπτά), το σκληρό όριο
//     `phone_sms_count` (10 συνολικά ανά λογαριασμό) και η απαίτηση να έχει
//     ήδη επιβεβαιωθεί το email — ώστε να μη φτάνει καν εδώ φρέσκος ψεύτικος
//     λογαριασμός.
//
//  2) Ο πάροχος μπορεί να μην είναι ρυθμισμένος. Τότε ΔΕΝ προσποιούμαστε ότι
//     στείλαμε κάτι: αποθηκεύουμε το νούμερο και απαντάμε `smsAvailable:false`,
//     οπότε η σελίδα λέει ειλικρινά ότι η επιβεβαίωση θα γίνει τηλεφωνικά.
// ---------------------------------------------------------------------------

/** Ελληνικό κινητό: 10 ψηφία που ξεκινούν από 69 (δεχόμαστε και +30 μπροστά). */
const normalizeGreekMobile = (raw: string) =>
  (raw || '').replace(/[\s.()-]/g, '').replace(/^\+30/, '').replace(/^0030/, '');

/** Πάνω από τόσα SMS ανά λογαριασμό σταματάμε και ζητάμε επικοινωνία μαζί μας. */
const MAX_SMS_PER_USER = 10;

// POST /phone/send-code
auth.post('/phone/send-code', requireAuth, phoneCodeRateLimiter, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const body = await c.req.json<{ phone?: string }>().catch(() => null);
  const phone = normalizeGreekMobile(body?.phone || '');
  if (!/^69\d{8}$/.test(phone)) {
    return error(c, 'VALIDATION_ERROR', 'Δώσε έγκυρο κινητό (10 ψηφία, ξεκινά με 69).', 400);
  }

  const row = await db
    .prepare('SELECT phone, phone_confirmed_at, phone_sms_count, email_confirmed_at FROM users WHERE id = ?')
    .bind(user.id)
    .first<{
      phone: string | null;
      phone_confirmed_at: string | null;
      phone_sms_count: number | null;
      email_confirmed_at: string | null;
    }>();

  if (!row) return error(c, 'NOT_FOUND', 'Ο λογαριασμός δεν βρέθηκε.', 404);

  if (!row.email_confirmed_at) {
    return error(c, 'EMAIL_NOT_CONFIRMED', 'Επιβεβαίωσε πρώτα το email σου.', 400);
  }
  if (row.phone_confirmed_at && row.phone === phone) {
    return error(c, 'ALREADY_CONFIRMED', 'Αυτό το κινητό είναι ήδη επιβεβαιωμένο.', 400);
  }

  // Ένα κινητό ανήκει σε έναν λογαριασμό: αλλιώς δύο άτομα «επαληθεύονται» με
  // το ίδιο νούμερο και το σήμα ✓ δεν σημαίνει τίποτα.
  const taken = await db
    .prepare('SELECT id FROM users WHERE phone = ? AND phone_confirmed_at IS NOT NULL AND id != ?')
    .bind(phone, user.id)
    .first<{ id: string }>();
  if (taken) {
    return error(c, 'PHONE_TAKEN', 'Αυτό το κινητό χρησιμοποιείται ήδη σε άλλον λογαριασμό.', 409);
  }

  const now = new Date().toISOString();
  const smsAvailable = smsConfigured(c.env);

  // Χωρίς πάροχο δεν στέλνουμε τίποτα και δεν χρεωνόμαστε τίποτα: κρατάμε το
  // νούμερο για τον χειροκίνητο έλεγχο και το λέμε καθαρά στη σελίδα.
  if (!smsAvailable) {
    await db
      .prepare('UPDATE users SET phone = ?, updated_at = ? WHERE id = ?')
      .bind(phone, now, user.id)
      .run();
    await db
      .prepare('UPDATE worker_profiles SET phone = ?, updated_at = ? WHERE user_id = ?')
      .bind(phone, now, user.id)
      .run();
    return success(c, { sent: false, smsAvailable: false });
  }

  if ((row.phone_sms_count || 0) >= MAX_SMS_PER_USER) {
    return error(
      c,
      'SMS_LIMIT',
      'Ξεπεράστηκε το όριο αποστολών. Στείλε μας μήνυμα για να το επιβεβαιώσουμε χειροκίνητα.',
      429,
    );
  }

  // 6 ψηφία, ομοιόμορφα — χωρίς Math.random().
  const code = String((crypto.getRandomValues(new Uint32Array(1))[0] ?? 0) % 1_000_000).padStart(6, '0');
  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();

  // Αλλαγή νούμερου σημαίνει ότι το παλιό δεν ισχύει πια: μηδενίζουμε το
  // `phone_confirmed_at` για να μη μείνει σήμα «επιβεβαιωμένο» σε λάθος νούμερο.
  await db
    .prepare(
      `UPDATE users
       SET phone = ?, phone_verification_token = ?, phone_verify_expires_at = ?,
           phone_confirmed_at = NULL, phone_sms_count = phone_sms_count + 1, updated_at = ?
       WHERE id = ?`,
    )
    .bind(phone, code, expiresAt, now, user.id)
    .run();

  if (c.env.ENVIRONMENT !== 'production') {
    // eslint-disable-next-line no-console
    console.log(`[DEV] Phone confirmation code for ${phone}: ${code}`);
  }

  const sent = await sendSms(
    {
      accountSid: c.env.TWILIO_ACCOUNT_SID || '',
      authToken: c.env.TWILIO_AUTH_TOKEN || '',
      from: c.env.TWILIO_SMS_FROM || 'StaffNow',
    },
    { to: phone, body: `StaffNow: ο κωδικός επιβεβαίωσης είναι ${code}. Ισχύει για 15 λεπτά.` },
  );

  // Όπως και στο email: αν δεν φύγει, δεν λέμε ψέματα ότι στάλθηκε. Στο dev ο
  // κωδικός τυπώνεται στην κονσόλα, οπότε η ροή δοκιμάζεται κανονικά.
  if (!sent && c.env.ENVIRONMENT === 'production') {
    return error(c, 'SMS_FAILED', 'Δεν στάλθηκε το SMS. Δοκίμασε ξανά σε λίγο.', 502);
  }

  return success(c, { sent: true, smsAvailable: true, expiresAt });
});

// POST /phone/confirm
auth.post('/phone/confirm', requireAuth, confirmCodeRateLimiter, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const body = await c.req.json<{ code?: string }>().catch(() => null);
  const code = (body?.code || '').replace(/\D/g, '');
  if (code.length !== 6) return error(c, 'VALIDATION_ERROR', 'Ο κωδικός είναι 6 ψηφία.', 400);

  const row = await db
    .prepare(
      `SELECT phone, phone_verification_token, phone_verify_expires_at, phone_confirmed_at
       FROM users WHERE id = ?`,
    )
    .bind(user.id)
    .first<{
      phone: string | null;
      phone_verification_token: string | null;
      phone_verify_expires_at: string | null;
      phone_confirmed_at: string | null;
    }>();

  if (!row) return error(c, 'NOT_FOUND', 'Ο λογαριασμός δεν βρέθηκε.', 404);
  if (row.phone_confirmed_at) return success(c, { confirmed: true, phone: row.phone });

  if (!row.phone_verification_token || !row.phone_verify_expires_at) {
    return error(c, 'NO_CODE', 'Ζήτησε πρώτα νέο κωδικό.', 400);
  }
  if (new Date(row.phone_verify_expires_at).getTime() < Date.now()) {
    return error(c, 'CODE_EXPIRED', 'Ο κωδικός έληξε. Ζήτησε νέο.', 400);
  }
  if (row.phone_verification_token !== code) {
    return error(c, 'CODE_INVALID', 'Λάθος κωδικός.', 400);
  }

  // Ξαναελέγχουμε τη μοναδικότητα: ανάμεσα στην αποστολή και στην επιβεβαίωση
  // μπορεί κάποιος άλλος να πρόλαβε να κατοχυρώσει το ίδιο νούμερο.
  const taken = await db
    .prepare('SELECT id FROM users WHERE phone = ? AND phone_confirmed_at IS NOT NULL AND id != ?')
    .bind(row.phone, user.id)
    .first<{ id: string }>();
  if (taken) {
    return error(c, 'PHONE_TAKEN', 'Αυτό το κινητό χρησιμοποιείται ήδη σε άλλον λογαριασμό.', 409);
  }

  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE users
       SET phone_confirmed_at = ?, phone_verification_token = NULL,
           phone_verify_expires_at = NULL, updated_at = ?
       WHERE id = ?`,
    )
    .bind(now, now, user.id)
    .run();

  // Καθρέφτισμα στο worker_profiles.phone: εκεί το διαβάζουν σήμερα ο πίνακας
  // ελέγχου και το προφίλ, οπότε συνεχίζουν να δουλεύουν απαράλλαχτα.
  await db
    .prepare('UPDATE worker_profiles SET phone = ?, updated_at = ? WHERE user_id = ?')
    .bind(row.phone, now, user.id)
    .run();

  return success(c, { confirmed: true, confirmedAt: now, phone: row.phone });
});

// POST /forgot-password
auth.post('/forgot-password', passwordResetRateLimiter, async (c) => {
  const body = await c.req.json();
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return error(c, 'VALIDATION_ERROR', 'Παρακαλώ εισάγετε ένα έγκυρο email.', 400);
  }

  const { email } = parsed.data;
  const db = c.env.DB;

  const user = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: string }>();

  if (user) {
    const resetToken = generateId('rst');
    const expiresAt = new Date(Date.now() + 3600_000).toISOString();

    await db
      .prepare('UPDATE users SET password_reset_token = ?, password_reset_expires_at = ? WHERE id = ?')
      .bind(resetToken, expiresAt, user.id)
      .run();

    // Αποστολή του συνδέσμου επαναφοράς. Μέχρι τώρα ο κωδικός δημιουργούνταν
    // αλλά δεν έφευγε ποτέ email, οπότε όποιος ξεχνούσε τον κωδικό του δεν
    // μπορούσε να ξαναμπεί. Η αποστολή είναι best-effort (όπως στο notify.ts):
    // αν αποτύχει ο πάροχος email, δεν ρίχνουμε το αίτημα.
    const resetUrl = `${WEB_ORIGIN}/auth/reset-password?token=${encodeURIComponent(resetToken)}`;

    if (c.env.ENVIRONMENT !== 'production') {
      // eslint-disable-next-line no-console
      console.log(`[DEV] Password reset for ${email}: ${resetUrl}`);
    }

    await sendEmail(
      { apiKey: c.env.EMAIL_API_KEY, from: c.env.EMAIL_FROM || 'StaffNow <no-reply@staffnow.gr>' },
      {
        to: email,
        subject: 'Επαναφορά κωδικού StaffNow',
        html: emailLayout({
          title: 'Επαναφορά κωδικού',
          body: 'Ζητήθηκε επαναφορά του κωδικού σου στο StaffNow. Πάτησε το κουμπί για να ορίσεις νέο κωδικό. Ο σύνδεσμος ισχύει για 1 ώρα.<br><br>Αν δεν το ζήτησες εσύ, αγνόησε αυτό το email — ο κωδικός σου παραμένει ο ίδιος.',
          ctaText: 'Ορισμός νέου κωδικού',
          ctaUrl: resetUrl,
          icon: '🔑',
          tint: '#dbeafe',
        }),
      },
    );
  }

  return success(c, { message: 'Αν υπάρχει λογαριασμός με αυτό το email, θα λάβετε οδηγίες επαναφοράς.' });
});

// POST /reset-password
auth.post('/reset-password', passwordResetRateLimiter, async (c) => {
  const body = await c.req.json();
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return error(c, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Μη έγκυρα δεδομένα.', 400);
  }

  const { token, password } = parsed.data;
  const db = c.env.DB;

  const user = await db
    .prepare("SELECT id FROM users WHERE password_reset_token = ? AND password_reset_expires_at > datetime('now')")
    .bind(token)
    .first<{ id: string }>();

  if (!user) {
    return error(c, 'UNAUTHORIZED', 'Μη έγκυρος ή ληγμένος σύνδεσμος επαναφοράς.', 401);
  }

  const passwordHash = await hashPassword(password, c.env.PASSWORD_SALT);

  // `sessions_valid_from`: η επαναφορά κωδικού γίνεται συνήθως επειδή κάποιος
  // φοβάται ότι του πήραν τον λογαριασμό. Δεν αρκεί να αλλάξει ο κωδικός — αν
  // ο εισβολέας κρατάει ήδη ενεργό token, θα συνέχιζε να μπαίνει. Εδώ διώχνουμε
  // όλες τις ανοιχτές συνεδρίες, σε όλες τις συσκευές.
  await db
    .prepare("UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires_at = NULL, sessions_valid_from = datetime('now'), updated_at = datetime('now') WHERE id = ?")
    .bind(passwordHash, user.id)
    .run();

  return success(c, { message: 'Ο κωδικός σας ενημερώθηκε επιτυχώς.' });
});

// POST /change-password — αλλαγή κωδικού από συνδεδεμένο χρήστη (Ρυθμίσεις).
// Η οθόνη Ρυθμίσεων καλούσε αυτή τη λειτουργία ενώ δεν υπήρχε, οπότε το κουμπί
// αποτύγχανε πάντα και έδειχνε «ελέγξτε τον τρέχοντα κωδικό» — κατηγορώντας
// άδικα τον χρήστη.
//
// Χρησιμοποιεί τον authRateLimiter (10 ανά 15′) και όχι τον passwordReset
// (3 ανά ώρα): τα όρια μετριούνται ανά IP, όχι ανά χρήστη. Με 3/ώρα, ένας
// χρήστης που θα έγραφε λάθος τον τρέχοντα κωδικό του τρεις φορές θα κλείδωνε
// για μία ώρα — και σε γραφείο με κοινή σύνδεση θα κλείδωναν όλοι μαζί.
auth.post('/change-password', requireAuth, authRateLimiter, async (c) => {
  const authUser = c.get('user');
  const db = c.env.DB;

  const body = await c.req.json();
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return error(c, 'VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Μη έγκυρα δεδομένα.', 400);
  }

  const { currentPassword, password } = parsed.data;

  const user = await db
    .prepare('SELECT id, password_hash FROM users WHERE id = ?')
    .bind(authUser.id)
    .first<{ id: string; password_hash: string | null }>();

  // Λογαριασμοί μέσω Google δεν έχουν κωδικό — δεν υπάρχει τι να αλλάξει.
  if (!user || !user.password_hash) {
    return error(c, 'BAD_REQUEST', 'Ο λογαριασμός σας δεν έχει κωδικό. Συνδέεστε μέσω Google.', 400);
  }

  const valid = await verifyPassword(currentPassword, user.password_hash, c.env.PASSWORD_SALT);
  if (!valid) {
    // ΠΡΟΣΟΧΗ: σκόπιμα 400 και όχι 401. Ο client (packages/api-client) σβήνει το
    // token σε κάθε 401 και στέλνει τον χρήστη στη σύνδεση. Με 401 εδώ, ένα απλό
    // τυπογραφικό στον τρέχοντα κωδικό θα πετούσε τον χρήστη έξω από τον
    // λογαριασμό του. Η συνεδρία είναι έγκυρη· λάθος είναι μόνο το πεδίο.
    return error(c, 'VALIDATION_ERROR', 'Ο τρέχων κωδικός δεν είναι σωστός.', 400);
  }

  const passwordHash = await hashPassword(password, c.env.PASSWORD_SALT);

  // Ακυρώνουμε και τυχόν εκκρεμή σύνδεσμο επαναφοράς: αν κάποιος είχε ζητήσει
  // «ξέχασα τον κωδικό» και μετά τον άλλαξε κανονικά, ο παλιός σύνδεσμος του
  // email δεν πρέπει να δουλεύει πια.
  //
  // Το `sessions_valid_from` διώχνει όλες τις ανοιχτές συνεδρίες. Αυτό είναι το
  // νόημα της αλλαγής κωδικού: όποιος ήταν μέσα με το παλιό token, βγαίνει.
  await db
    .prepare("UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires_at = NULL, sessions_valid_from = datetime('now'), updated_at = datetime('now') WHERE id = ?")
    .bind(passwordHash, user.id)
    .run();

  // ...εκτός από τον ίδιο, που μόλις μας ζήτησε την αλλαγή. Του δίνουμε αμέσως
  // καινούριο token, αλλιώς το επόμενο αίτημά του θα έπαιρνε 401 και ο client
  // (packages/api-client) θα τον πετούσε στη σελίδα σύνδεσης — σαν να χάλασε
  // κάτι, ενώ όλα πήγαν καλά.
  const token = await signJWT({ sub: authUser.id, email: authUser.email, role: authUser.role }, c.env.JWT_SECRET);
  const isProduction = c.env.ENVIRONMENT === 'production';
  c.header(
    'Set-Cookie',
    `staffnow_token=${token}; HttpOnly; ${isProduction ? 'Secure; ' : ''}SameSite=Lax; Path=/; Max-Age=${72 * 3600}`,
  );

  return success(c, { message: 'Ο κωδικός σας άλλαξε επιτυχώς.', token });
});

// ============================================================================
// ΔΙΠΛΗ ΕΠΑΛΗΘΕΥΣΗ (2FA) — 6ψήφιος κωδικός από εφαρμογή κινητού
// ============================================================================
//
// Η λογική σε τρεις γραμμές:
//
//   1) Ο χρήστης ζητάει «στήσιμο»: παίρνει ένα μυστικό που μπαίνει στη στήλη
//      `totp_pending_secret` — ΥΠΟ ΔΟΚΙΜΗ, δεν επηρεάζει καθόλου τη σύνδεση.
//   2) Στέλνει έναν ζωντανό 6ψήφιο. Μόνο τότε το μυστικό γίνεται ενεργό και
//      παίρνει τους 10 κωδικούς ανάκτησης. Έτσι, αν πληκτρολόγησε λάθος το
//      κλειδί στην εφαρμογή, η ενεργοποίηση απλώς δεν ολοκληρώνεται.
//   3) Από εκεί και πέρα, η σύνδεση γίνεται σε δύο βήματα.
//
// Δύο κανόνες που τηρούνται παντού εδώ κάτω:
//
//   * **Ποτέ 401 σε λάθος κωδικό.** Ο client (`packages/api-client`) σβήνει το
//     token σε κάθε 401· ένα τυπογραφικό θα πετούσε τον χρήστη έξω και από
//     άλλες ανοιχτές καρτέλες. Λάθος κωδικός = 400.
//   * **Η «απόδειξη» δεν είναι κλειδί συνεδρίας.** Είναι τυχαίο κείμενο 5
//     λεπτών στο KV. Δεν είναι JWT επίτηδες: ένα JWT *είναι* πλήρης συνεδρία
//     για το `requireAuth`, και μια αβλεψία θα το έκανε παρακαμπτήριο
//     ολόκληρης της διπλής επαλήθευσης.

/** Πόσο ζει η «απόδειξη ότι ο κωδικός ήταν σωστός». */
const TWO_FA_CHALLENGE_TTL_S = 300;

/** Πόσο ζει ένα μυστικό υπό δοκιμή, πριν χρειαστεί να ξαναρχίσεις το στήσιμο. */
const TWO_FA_SETUP_TTL_MS = 15 * 60 * 1000;

/** Λάθος 6ψήφιοι μέσα στην ΙΔΙΑ απόπειρα σύνδεσης, πριν ακυρωθεί η απόδειξη. */
const TWO_FA_MAX_FAILS_PER_CHALLENGE = 5;

/** Λάθος 6ψήφιοι ανά λογαριασμό ανά 15 λεπτά, σε όλες τις απόπειρες μαζί. */
const TWO_FA_MAX_FAILS_PER_USER = 10;
const TWO_FA_USER_LOCK_TTL_S = 15 * 60;

const RECOVERY_CODE_COUNT = 10;

/**
 * Αλφάβητο χωρίς `O/0` και `I/1`: οι κωδικοί ανάκτησης τυπώνονται σε χαρτί και
 * αντιγράφονται με το χέρι, οπότε δύο χαρακτήρες που μοιάζουν είναι λάθος.
 */
const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

interface TwoFactorRow {
  id: string;
  email: string;
  role: string;
  status: string;
  password_hash: string | null;
  totp_secret: string | null;
  totp_enabled_at: string | null;
  totp_pending_secret: string | null;
  totp_pending_expires_at: string | null;
  totp_recovery_codes: string | null;
  totp_last_step: string | null;
}

const TWO_FA_SELECT = `SELECT id, email, role, status, password_hash,
    totp_secret, totp_enabled_at, totp_pending_secret, totp_pending_expires_at,
    totp_recovery_codes, totp_last_step
  FROM users WHERE id = ?`;

/** `A7K2-9QXM4P8B` — 12 χαρακτήρες, ~60 bits. */
function generateRecoveryCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = Array.from(bytes, (b) => RECOVERY_ALPHABET[b % RECOVERY_ALPHABET.length]);
  return `${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`;
}

/**
 * Φτιάχνει 10 καινούριους κωδικούς και επιστρέφει (α) το καθαρό κείμενο, που
 * φαίνεται **μία και μόνη φορά**, και (β) τα hashes που πάνε στη βάση. Ό,τι
 * αποθηκεύεται είναι κρυπτογραφημένο με τον ίδιο μηχανισμό που κρύβει τους
 * κωδικούς πρόσβασης — όποιος διαβάσει τη βάση δεν βρίσκει τίποτα χρήσιμο.
 */
async function buildRecoveryCodes(salt: string): Promise<{ plain: string[]; hashes: string[] }> {
  const plain = Array.from({ length: RECOVERY_CODE_COUNT }, generateRecoveryCode);
  const hashes = await Promise.all(plain.map((code) => hashPassword(code, salt)));
  return { plain, hashes };
}

function parseRecoveryHashes(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Το φρένο ανά λογαριασμό. Ζει στο KV με το κλειδί `2fa_fails:<id>` — το ίδιο
 * που αναφέρει η εντολή έκτακτης ανάγκης στο `migrations/0050_admin_totp.sql`.
 */
async function twoFactorUserLocked(env: Env, userId: string): Promise<boolean> {
  try {
    const raw = await env.KV.get(`2fa_fails:${userId}`);
    return (raw ? parseInt(raw, 10) : 0) >= TWO_FA_MAX_FAILS_PER_USER;
  } catch {
    return false; // KV κάτω: δεν κλειδώνουμε κανέναν άδικα.
  }
}

async function bumpTwoFactorUserFails(env: Env, userId: string): Promise<void> {
  try {
    const key = `2fa_fails:${userId}`;
    const raw = await env.KV.get(key);
    const next = (raw ? parseInt(raw, 10) : 0) + 1;
    await env.KV.put(key, String(next), { expirationTtl: TWO_FA_USER_LOCK_TTL_S });
  } catch { /* ignore */ }
}

async function clearTwoFactorUserFails(env: Env, userId: string): Promise<void> {
  try { await env.KV.delete(`2fa_fails:${userId}`); } catch { /* ignore */ }
}

/** Το πρώτο βήμα τελείωσε σωστά: δίνουμε την απόδειξη και σταματάμε εδώ. */
async function startTwoFactorChallenge(
  c: Context<{ Bindings: Env; Variables: { user: AuthUser } }>,
  userId: string,
) {
  const challenge = generateId('2fa');
  try {
    await c.env.KV.put(
      `2fa_ch:${challenge}`,
      JSON.stringify({ userId, fails: 0 }),
      { expirationTtl: TWO_FA_CHALLENGE_TTL_S },
    );
  } catch {
    // Χωρίς KV δεν μπορούμε να κρατήσουμε την απόδειξη. Λέμε την αλήθεια αντί
    // να παρακάμψουμε σιωπηλά τη διπλή επαλήθευση.
    return error(c, 'SERVICE_UNAVAILABLE', 'Η επαλήθευση δεν είναι διαθέσιμη αυτή τη στιγμή. Δοκιμάστε ξανά.', 503);
  }
  return success(c, {
    twoFactorRequired: true,
    challenge,
    expiresIn: TWO_FA_CHALLENGE_TTL_S,
    serverTime: new Date().toISOString(),
  });
}

/**
 * Διαβάζει την απόδειξη, μετράει την αποτυχία και σβήνει την απόδειξη μόλις
 * γεμίσουν οι 5 προσπάθειες — οπότε ο χρήστης ξαναρχίζει από τον κωδικό.
 */
async function readChallenge(
  env: Env,
  challenge: string,
): Promise<{ userId: string; fails: number } | null> {
  try {
    const raw = await env.KV.get(`2fa_ch:${challenge}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { userId?: string; fails?: number };
    if (!parsed.userId) return null;
    return { userId: parsed.userId, fails: parsed.fails || 0 };
  } catch {
    return null;
  }
}

async function bumpChallengeFails(env: Env, challenge: string, current: { userId: string; fails: number }) {
  const next = current.fails + 1;
  try {
    if (next >= TWO_FA_MAX_FAILS_PER_CHALLENGE) {
      await env.KV.delete(`2fa_ch:${challenge}`);
    } else {
      await env.KV.put(
        `2fa_ch:${challenge}`,
        JSON.stringify({ userId: current.userId, fails: next }),
        { expirationTtl: TWO_FA_CHALLENGE_TTL_S },
      );
    }
  } catch { /* ignore */ }
  return next;
}

/**
 * Ο κωδικός δεν επιτρέπεται να ξαναδουλέψει μέσα στα 30 δευτερόλεπτά του.
 * Κρατάμε το τελευταίο αποδεκτό «βήμα» στη βάση (όχι στο KV: η βάση εγγυάται
 * σειρά, το KV όχι) και απορρίπτουμε οτιδήποτε είναι ίσο ή παλαιότερο.
 */
function stepAlreadyUsed(lastStep: string | null, step: number): boolean {
  if (!lastStep) return false;
  const previous = parseInt(lastStep, 10);
  return Number.isFinite(previous) && step <= previous;
}

// GET /2fa/status — τι ισχύει για τον λογαριασμό μου
auth.get('/2fa/status', requireAuth, async (c) => {
  const me = c.get('user');
  const row = await c.env.DB.prepare(TWO_FA_SELECT).bind(me.id).first<TwoFactorRow>();
  if (!row) return error(c, 'NOT_FOUND', 'Ο λογαριασμός δεν βρέθηκε.', 404);

  return success(c, {
    enabled: Boolean(row.totp_secret && row.totp_enabled_at),
    enabledAt: row.totp_enabled_at,
    recoveryCodesLeft: parseRecoveryHashes(row.totp_recovery_codes).length,
    recoveryCodesTotal: RECOVERY_CODE_COUNT,
    // Η ώρα του server: αν το ρολόι του κινητού έχει ξεφύγει, φαίνεται εδώ
    // αντί να είναι ανεξήγητο μυστήριο.
    serverTime: new Date().toISOString(),
  });
});

// POST /2fa/setup — γέννηση μυστικού ΥΠΟ ΔΟΚΙΜΗ (δεν αλλάζει τίποτα ακόμη)
auth.post('/2fa/setup', requireAuth, confirmCodeRateLimiter, async (c) => {
  const me = c.get('user');
  const body = await c.req.json<{ password?: string }>().catch(() => null);
  const password = body?.password || '';

  const row = await c.env.DB.prepare(TWO_FA_SELECT).bind(me.id).first<TwoFactorRow>();
  if (!row) return error(c, 'NOT_FOUND', 'Ο λογαριασμός δεν βρέθηκε.', 404);
  if (!row.password_hash) {
    return error(c, 'BAD_REQUEST', 'Ο λογαριασμός σας δεν έχει κωδικό. Συνδέεστε μέσω Google.', 400);
  }
  if (row.totp_secret && row.totp_enabled_at) {
    return error(c, 'ALREADY_ENABLED', 'Η διπλή επαλήθευση είναι ήδη ενεργή.', 400);
  }
  if (!(await verifyPassword(password, row.password_hash, c.env.PASSWORD_SALT))) {
    return error(c, 'VALIDATION_ERROR', 'Ο κωδικός δεν είναι σωστός.', 400);
  }

  const secret = generateSecret();
  const expiresAt = new Date(Date.now() + TWO_FA_SETUP_TTL_MS).toISOString();
  await c.env.DB
    .prepare(
      "UPDATE users SET totp_pending_secret = ?, totp_pending_expires_at = ?, updated_at = datetime('now') WHERE id = ?",
    )
    .bind(secret, expiresAt, me.id)
    .run();

  return success(c, {
    secret,
    otpauthUri: otpauthUri(row.email, secret),
    expiresAt,
    serverTime: new Date().toISOString(),
  });
});

// POST /2fa/enable — γίνεται ενεργό ΜΟΝΟ με σωστό ζωντανό κωδικό
auth.post('/2fa/enable', requireAuth, confirmCodeRateLimiter, async (c) => {
  const me = c.get('user');
  const body = await c.req.json<{ code?: string }>().catch(() => null);
  const code = (body?.code || '').replace(/\D/g, '');

  const row = await c.env.DB.prepare(TWO_FA_SELECT).bind(me.id).first<TwoFactorRow>();
  if (!row) return error(c, 'NOT_FOUND', 'Ο λογαριασμός δεν βρέθηκε.', 404);
  if (row.totp_secret && row.totp_enabled_at) {
    return error(c, 'ALREADY_ENABLED', 'Η διπλή επαλήθευση είναι ήδη ενεργή.', 400);
  }
  if (!row.totp_pending_secret || !row.totp_pending_expires_at) {
    return error(c, 'NO_SETUP', 'Ξεκίνησε πρώτα το στήσιμο.', 400);
  }
  if (new Date(row.totp_pending_expires_at).getTime() < Date.now()) {
    return error(c, 'SETUP_EXPIRED', 'Το στήσιμο έληξε. Ξεκίνησέ το από την αρχή.', 400);
  }

  const check = await verifyTotp(row.totp_pending_secret, code);
  if (!check.ok) {
    return error(c, 'CODE_INVALID', 'Ο κωδικός δεν είναι σωστός. Δες ότι η ώρα του κινητού είναι αυτόματη.', 400);
  }

  const { plain, hashes } = await buildRecoveryCodes(c.env.PASSWORD_SALT);
  await c.env.DB
    .prepare(
      `UPDATE users
       SET totp_secret = ?, totp_enabled_at = datetime('now'), totp_last_step = ?,
           totp_recovery_codes = ?, totp_pending_secret = NULL, totp_pending_expires_at = NULL,
           updated_at = datetime('now')
       WHERE id = ?`,
    )
    .bind(row.totp_pending_secret, String(check.step), JSON.stringify(hashes), me.id)
    .run();

  // Οι κωδικοί ανάκτησης φαίνονται ΕΔΩ και πουθενά αλλού, ποτέ ξανά.
  return success(c, { enabled: true, recoveryCodes: plain });
});

// POST /2fa/disable — χρειάζεται κωδικό ΚΑΙ δεύτερο παράγοντα
auth.post('/2fa/disable', requireAuth, confirmCodeRateLimiter, async (c) => {
  const me = c.get('user');
  const body = await c.req.json<{ password?: string; code?: string }>().catch(() => null);

  const row = await c.env.DB.prepare(TWO_FA_SELECT).bind(me.id).first<TwoFactorRow>();
  if (!row) return error(c, 'NOT_FOUND', 'Ο λογαριασμός δεν βρέθηκε.', 404);
  if (!row.totp_secret || !row.totp_enabled_at) {
    return success(c, { enabled: false });
  }
  if (!row.password_hash || !(await verifyPassword(body?.password || '', row.password_hash, c.env.PASSWORD_SALT))) {
    return error(c, 'VALIDATION_ERROR', 'Ο κωδικός δεν είναι σωστός.', 400);
  }
  if (!(await secondFactorAccepted(c.env, row, body?.code || ''))) {
    return error(c, 'CODE_INVALID', 'Ο κωδικός επαλήθευσης δεν είναι σωστός.', 400);
  }

  await c.env.DB
    .prepare(
      `UPDATE users
       SET totp_secret = NULL, totp_enabled_at = NULL, totp_recovery_codes = NULL,
           totp_last_step = NULL, totp_pending_secret = NULL, totp_pending_expires_at = NULL,
           updated_at = datetime('now')
       WHERE id = ?`,
    )
    .bind(me.id)
    .run();
  await clearTwoFactorUserFails(c.env, me.id);

  return success(c, { enabled: false });
});

// POST /2fa/recovery-codes/regenerate — 10 καινούριοι, οι παλιοί πεθαίνουν
auth.post('/2fa/recovery-codes/regenerate', requireAuth, confirmCodeRateLimiter, async (c) => {
  const me = c.get('user');
  const body = await c.req.json<{ password?: string; code?: string }>().catch(() => null);

  const row = await c.env.DB.prepare(TWO_FA_SELECT).bind(me.id).first<TwoFactorRow>();
  if (!row) return error(c, 'NOT_FOUND', 'Ο λογαριασμός δεν βρέθηκε.', 404);
  if (!row.totp_secret || !row.totp_enabled_at) {
    return error(c, 'NOT_ENABLED', 'Η διπλή επαλήθευση δεν είναι ενεργή.', 400);
  }
  if (!row.password_hash || !(await verifyPassword(body?.password || '', row.password_hash, c.env.PASSWORD_SALT))) {
    return error(c, 'VALIDATION_ERROR', 'Ο κωδικός δεν είναι σωστός.', 400);
  }
  if (!(await secondFactorAccepted(c.env, row, body?.code || ''))) {
    return error(c, 'CODE_INVALID', 'Ο κωδικός επαλήθευσης δεν είναι σωστός.', 400);
  }

  const { plain, hashes } = await buildRecoveryCodes(c.env.PASSWORD_SALT);
  await c.env.DB
    .prepare("UPDATE users SET totp_recovery_codes = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(JSON.stringify(hashes), me.id)
    .run();

  return success(c, { recoveryCodes: plain });
});

/**
 * Δέχεται είτε ζωντανό 6ψήφιο είτε κωδικό ανάκτησης. Το χρησιμοποιούν η
 * απενεργοποίηση και η ανανέωση κωδικών — ενέργειες όπου ο χρήστης είναι ήδη
 * συνδεδεμένος και έδωσε τον κωδικό του, οπότε το να μπορεί να ξεμπλοκάρει με
 * χαρτί όταν έχασε το κινητό είναι ακριβώς το ζητούμενο.
 *
 * Καταναλώνει τον κωδικό ανάκτησης, όπως και στη σύνδεση.
 */
async function secondFactorAccepted(env: Env, row: TwoFactorRow, rawCode: string): Promise<boolean> {
  const digits = rawCode.replace(/\D/g, '');
  if (digits.length === 6 && row.totp_secret) {
    const check = await verifyTotp(row.totp_secret, digits);
    if (check.ok && !stepAlreadyUsed(row.totp_last_step, check.step)) {
      await env.DB.prepare('UPDATE users SET totp_last_step = ? WHERE id = ?')
        .bind(String(check.step), row.id)
        .run();
      return true;
    }
    return false;
  }
  return consumeRecoveryCode(env, row, rawCode);
}

/** Βρίσκει τον κωδικό ανάκτησης, τον σβήνει, και λέει αν πέτυχε. */
async function consumeRecoveryCode(env: Env, row: TwoFactorRow, rawCode: string): Promise<boolean> {
  const candidate = rawCode.trim().toUpperCase();
  if (!candidate) return false;
  const hashes = parseRecoveryHashes(row.totp_recovery_codes);

  for (const stored of hashes) {
    if (await verifyPassword(candidate, stored, env.PASSWORD_SALT)) {
      const remaining = hashes.filter((h) => h !== stored);
      await env.DB
        .prepare("UPDATE users SET totp_recovery_codes = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(JSON.stringify(remaining), row.id)
        .run();
      return true;
    }
  }
  return false;
}

/**
 * Το δεύτερο βήμα της σύνδεσης. Κοινό για τον 6ψήφιο και για τον κωδικό
 * ανάκτησης — η μόνη διαφορά είναι ποια συνάρτηση κρίνει τον κωδικό.
 */
async function completeTwoFactorLogin(
  c: Context<{ Bindings: Env; Variables: { user: AuthUser } }>,
  kind: 'totp' | 'recovery',
) {
  const body = await c.req.json<{ challenge?: string; code?: string }>().catch(() => null);
  const challenge = body?.challenge || '';
  const rawCode = body?.code || '';

  // ΠΡΟΣΟΧΗ: παντού 400, ποτέ 401 — βλ. το σχόλιο στην κορυφή της ενότητας.
  if (!challenge) return error(c, 'VALIDATION_ERROR', 'Λείπουν στοιχεία. Ξεκινήστε ξανά τη σύνδεση.', 400);

  const state = await readChallenge(c.env, challenge);
  if (!state) {
    return error(c, 'CHALLENGE_EXPIRED', 'Η προσπάθεια έληξε. Συνδεθείτε ξανά με email και κωδικό.', 400);
  }

  if (await twoFactorUserLocked(c.env, state.userId)) {
    return error(c, 'LOCKED', 'Πολλές αποτυχημένες προσπάθειες. Δοκιμάστε ξανά σε 15 λεπτά.', 429);
  }

  const row = await c.env.DB.prepare(TWO_FA_SELECT).bind(state.userId).first<TwoFactorRow>();
  if (!row || row.status !== 'active' || !row.totp_secret || !row.totp_enabled_at) {
    return error(c, 'CHALLENGE_EXPIRED', 'Η προσπάθεια έληξε. Συνδεθείτε ξανά με email και κωδικό.', 400);
  }

  let accepted = false;
  if (kind === 'totp') {
    const digits = rawCode.replace(/\D/g, '');
    if (digits.length === 6) {
      const check = await verifyTotp(row.totp_secret, digits);
      if (check.ok && !stepAlreadyUsed(row.totp_last_step, check.step)) {
        await c.env.DB.prepare('UPDATE users SET totp_last_step = ? WHERE id = ?')
          .bind(String(check.step), row.id)
          .run();
        accepted = true;
      }
    }
  } else {
    accepted = await consumeRecoveryCode(c.env, row, rawCode);
  }

  if (!accepted) {
    await bumpTwoFactorUserFails(c.env, row.id);
    const fails = await bumpChallengeFails(c.env, challenge, state);
    if (fails >= TWO_FA_MAX_FAILS_PER_CHALLENGE) {
      return error(c, 'CHALLENGE_EXPIRED', 'Πολλές λάθος προσπάθειες. Συνδεθείτε ξανά με email και κωδικό.', 400);
    }
    return error(
      c,
      'CODE_INVALID',
      kind === 'totp' ? 'Ο κωδικός δεν είναι σωστός.' : 'Ο κωδικός ανάκτησης δεν είναι σωστός.',
      400,
    );
  }

  // Πέτυχε: η απόδειξη είναι μιας χρήσης και τα φρένα καθαρίζουν.
  try { await c.env.KV.delete(`2fa_ch:${challenge}`); } catch { /* ignore */ }
  await clearTwoFactorUserFails(c.env, row.id);

  return issueSession(c, { id: row.id, email: row.email, role: row.role, status: row.status });
}

// POST /2fa/verify — δεύτερο βήμα με τον 6ψήφιο του κινητού
auth.post('/2fa/verify', twoFactorRateLimiter, (c) => completeTwoFactorLogin(c, 'totp'));

// POST /2fa/recovery — δεύτερο βήμα με έναν από τους 10 κωδικούς ανάκτησης
auth.post('/2fa/recovery', twoFactorRateLimiter, (c) => completeTwoFactorLogin(c, 'recovery'));

// POST /sessions/revoke-others — «Αποσύνδεση από όλες τις άλλες συσκευές»
//
// Ίδιο μοτίβο με την αλλαγή κωδικού: ακυρώνουμε ό,τι εκδόθηκε πριν από τώρα
// και δίνουμε αμέσως καινούριο κλειδί στην τρέχουσα καρτέλα, ώστε αυτός που
// πάτησε το κουμπί να μη βρεθεί ο ίδιος έξω.
auth.post('/sessions/revoke-others', requireAuth, authRateLimiter, async (c) => {
  const me = c.get('user');
  await c.env.DB
    .prepare("UPDATE users SET sessions_valid_from = datetime('now') WHERE id = ?")
    .bind(me.id)
    .run();

  const token = await signJWT({ sub: me.id, email: me.email, role: me.role }, c.env.JWT_SECRET);
  const isProduction = c.env.ENVIRONMENT === 'production';
  c.header(
    'Set-Cookie',
    `staffnow_token=${token}; HttpOnly; ${isProduction ? 'Secure; ' : ''}SameSite=Lax; Path=/; Max-Age=${72 * 3600}`,
  );

  return success(c, { message: 'Όλες οι άλλες συσκευές αποσυνδέθηκαν.', token });
});

// ============================================================================
// GOOGLE OAUTH
// ============================================================================

/**
 * Ο ρόλος ταξιδεύει μέσα στο `state` του Google και γυρίζει πίσω αυτούσιος —
 * άρα τον ελέγχει ο επισκέπτης, όχι εμείς. Χωρίς αυτό το φίλτρο ένα απλό
 * `?role=admin` έφτιαχνε λογαριασμό διαχειριστή. Ό,τι δεν είναι ακριβώς
 * 'business' γίνεται 'worker'.
 */
function safeOAuthRole(raw: string | undefined): 'worker' | 'business' {
  return raw === 'business' ? 'business' : 'worker';
}

// GET /google — redirect to Google OAuth
auth.get('/google', (c) => {
  const role = safeOAuthRole(c.req.query('role'));
  const clientId = c.env.GOOGLE_CLIENT_ID;
  const redirectUri = `https://staffnow-api-production.siteinside53.workers.dev/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state: role, // pass role in state
  });

  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// GET /google/callback — handle Google OAuth callback
auth.get('/google/callback', async (c) => {
  const code = c.req.query('code');
  // Το `state` έρχεται πίσω από τον browser του επισκέπτη — ποτέ εμπιστοσύνη.
  const role = safeOAuthRole(c.req.query('state'));

  if (!code) {
    return c.redirect(`https://staffnow.gr/auth/login?error=google_failed`);
  }

  const clientId = c.env.GOOGLE_CLIENT_ID;
  const clientSecret = c.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `https://staffnow-api-production.siteinside53.workers.dev/auth/google/callback`;

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json() as { access_token?: string; id_token?: string; error?: string };

    if (!tokenData.access_token) {
      console.error('Google token error:', tokenData);
      return c.redirect(`https://staffnow.gr/auth/login?error=google_token_failed`);
    }

    // Get user info
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const googleUser = await userInfoRes.json() as { id: string; email: string; name: string; picture: string };

    if (!googleUser.email) {
      return c.redirect(`https://staffnow.gr/auth/login?error=google_no_email`);
    }

    const db = c.env.DB;
    const now = new Date().toISOString();

    // Check if user exists
    let user = await db
      .prepare('SELECT id, email, role, status FROM users WHERE email = ?')
      .bind(googleUser.email)
      .first<{ id: string; email: string; role: string; status: string }>();

    if (!user) {
      // Create new user
      const userId = generateId('usr');
      await db
        .prepare(
          `INSERT INTO users (id, email, password_hash, role, status, email_verified, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'active', 1, ?, ?)`
        )
        .bind(userId, googleUser.email, `google_oauth_${googleUser.id}`, role, now, now)
        .run();

      // Create profile
      if (role === 'worker') {
        await db
          .prepare(
            `INSERT INTO worker_profiles (id, user_id, full_name, profile_completeness, created_at, updated_at)
             VALUES (?, ?, ?, 20, ?, ?)`
          )
          .bind(generateId('wp'), userId, googleUser.name || '', now, now)
          .run();
      } else {
        await db
          .prepare(
            `INSERT INTO business_profiles (id, user_id, company_name, business_type, description, created_at, updated_at)
             VALUES (?, ?, ?, 'other', '', ?, ?)`
          )
          .bind(generateId('bp'), userId, googleUser.name || '', now, now)
          .run();
      }

      user = { id: userId, email: googleUser.email, role, status: 'active' };
    }

    // Generate JWT
    const token = await signJWT({ sub: user.id, email: user.email, role: user.role }, c.env.JWT_SECRET);

    // Redirect to frontend with token in URL hash (not query param)
    // Using hash so it works even if RSC doesn't render properly
    return c.redirect(`https://staffnow.gr/auth/google-callback#token=${token}`);

  } catch (err) {
    console.error('Google OAuth error:', err);
    return c.redirect(`https://staffnow.gr/auth/login?error=google_error`);
  }
});

export default auth;
