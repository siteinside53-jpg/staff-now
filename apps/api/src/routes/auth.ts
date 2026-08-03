import { Hono } from 'hono';
import type { Env, AuthUser } from '../types';
import { requireAuth } from '../middleware/auth';
import { authRateLimiter, passwordResetRateLimiter } from '../middleware/rate-limiter';
import { hashPassword, verifyPassword } from '../lib/password';
import { signJWT } from '../lib/jwt';
import { generateId } from '../lib/id';
import { success, error } from '../lib/response';
import { recordActivity, startSession, endSession, getRequestIp, getGeoFromRequest } from '../lib/activity';
import { sendEmail, emailLayout } from '../lib/email';
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
    .prepare('SELECT id, email, password_hash, role, status FROM users WHERE email = ?')
    .bind(email)
    .first<{ id: string; email: string; password_hash: string; role: string; status: string }>();

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

  // Update last login
  await db
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
});

// POST /logout
auth.post('/logout', requireAuth, async (c) => {
  const u = c.get('user');
  c.header('Set-Cookie', 'staffnow_token=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
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
  const fullUser = await db.prepare('SELECT id, email, role, status, display_name, avatar_url FROM users WHERE id = ?').bind(user.id).first();
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

  await db
    .prepare("UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires_at = NULL, updated_at = datetime('now') WHERE id = ?")
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
  await db
    .prepare("UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires_at = NULL, updated_at = datetime('now') WHERE id = ?")
    .bind(passwordHash, user.id)
    .run();

  return success(c, { message: 'Ο κωδικός σας άλλαξε επιτυχώς.' });
});

// ============================================================================
// GOOGLE OAUTH
// ============================================================================

// GET /google — redirect to Google OAuth
auth.get('/google', (c) => {
  const role = c.req.query('role') || 'worker';
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
  const role = (c.req.query('state') as 'worker' | 'business') || 'worker';

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
