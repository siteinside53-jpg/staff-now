import { createMiddleware } from 'hono/factory';
import type { Env, AuthUser } from '../types';
import { verifyJWT } from '../lib/jwt';

export const requireAuth = createMiddleware<{
  Bindings: Env;
  Variables: { user: AuthUser };
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  let token: string | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }
  if (!token) {
    const cookie = c.req.header('Cookie');
    if (cookie) {
      const match = cookie.match(/staffnow_token=([^;]+)/);
      token = match?.[1];
    }
  }

  if (!token) {
    return c.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Δεν είστε συνδεδεμένος.' } },
      401,
    );
  }

  const payload = await verifyJWT(token, c.env.JWT_SECRET);
  if (!payload) {
    return c.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Μη έγκυρο ή ληγμένο token.' } },
      401,
    );
  }

  const user = await c.env.DB.prepare(
    'SELECT id, email, role, status FROM users WHERE id = ? AND status = ?',
  )
    .bind(payload.sub, 'active')
    .first<{ id: string; email: string; role: string; status: string }>();

  if (!user) {
    return c.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Ο λογαριασμός δεν είναι ενεργός.' } },
      401,
    );
  }

  c.set('user', user as AuthUser);
  await next();
});

export const requireRole = (...roles: string[]) =>
  createMiddleware<{ Bindings: Env; Variables: { user: AuthUser } }>(async (c, next) => {
    const user = c.get('user');
    if (!user || !roles.includes(user.role)) {
      return c.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Δεν έχετε πρόσβαση.' } },
        403,
      );
    }
    await next();
  });

export const optionalAuth = createMiddleware<{
  Bindings: Env;
  Variables: { user?: AuthUser };
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  let token: string | undefined;
  if (authHeader?.startsWith('Bearer ')) token = authHeader.slice(7);
  if (!token) {
    const cookie = c.req.header('Cookie');
    if (cookie) {
      const match = cookie.match(/staffnow_token=([^;]+)/);
      token = match?.[1];
    }
  }
  if (token) {
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    if (payload) {
      const user = await c.env.DB.prepare(
        'SELECT id, email, role, status FROM users WHERE id = ? AND status = ?',
      )
        .bind(payload.sub, 'active')
        .first<{ id: string; email: string; role: string; status: string }>();
      if (user) c.set('user', user as AuthUser);
    }
  }
  await next();
});
