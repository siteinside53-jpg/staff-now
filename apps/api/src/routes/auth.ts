import { Hono } from 'hono';
import type { Env, AuthUser } from '../types';
import { requireAuth } from '../middleware/auth';
import { authRateLimiter, passwordResetRateLimiter } from '../middleware/rate-limiter';
import { hashPassword, verifyPassword } from '../lib/password';
import { signJWT } from '../lib/jwt';
import { generateId } from '../lib/id';
import { success, error } from '../lib/response';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '@staffnow/validation';

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

  const user = await db
    .prepare('SELECT id, email, password_hash, role, status FROM users WHERE email = ?')
    .bind(email)
    .first<{ id: string; email: string; password_hash: string; role: string; status: string }>();

  if (!user) {
    return error(c, 'UNAUTHORIZED', 'Λάθος email ή κωδικός.', 401);
  }

  if (user.status === 'suspended') {
    return error(c, 'FORBIDDEN', 'Ο λογαριασμός σας έχει ανασταλεί.', 403);
  }

  const valid = await verifyPassword(password, user.password_hash, c.env.PASSWORD_SALT);
  if (!valid) {
    return error(c, 'UNAUTHORIZED', 'Λάθος email ή κωδικός.', 401);
  }

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

  return success(c, {
    user: { id: user.id, email: user.email, role: user.role, status: user.status },
    token,
  });
});

// POST /logout
auth.post('/logout', (c) => {
  c.header('Set-Cookie', 'staffnow_token=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
  return success(c, { message: 'Αποσυνδεθήκατε επιτυχώς.' });
});

// GET /me
auth.get('/me', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  let profile = null;
  if (user.role === 'worker') {
    profile = await db.prepare('SELECT * FROM worker_profiles WHERE user_id = ?').bind(user.id).first();
  } else if (user.role === 'business') {
    profile = await db.prepare('SELECT * FROM business_profiles WHERE user_id = ?').bind(user.id).first();
  }

  const subscription = await db
    .prepare("SELECT plan_id, status, current_period_end, cancel_at_period_end FROM subscriptions WHERE user_id = ? AND status IN ('active', 'trialing')")
    .bind(user.id)
    .first();

  return success(c, { user: { ...user, display_name: (user as any).display_name, avatar_url: (user as any).avatar_url }, profile, subscription });
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

    console.log(`[DEV] Password reset token for ${email}: ${resetToken}`);
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

    // Redirect to frontend with token
    return c.redirect(`https://staffnow.gr/auth/google-callback?token=${token}`);

  } catch (err) {
    console.error('Google OAuth error:', err);
    return c.redirect(`https://staffnow.gr/auth/login?error=google_error`);
  }
});

export default auth;
