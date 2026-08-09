import { createMiddleware } from 'hono/factory';
import type { Env, AuthUser } from '../types';
import { verifyJWT } from '../lib/jwt';

/**
 * Ίδιο SELECT με πριν, συν τη στήλη ακύρωσης συνεδριών. Επειδή το requireAuth
 * έκανε ήδη αυτό το ερώτημα σε κάθε αίτημα, ο νέος έλεγχος δεν κοστίζει τίποτα.
 */
const USER_SELECT =
  'SELECT id, email, role, status, sessions_valid_from FROM users WHERE id = ? AND status = ?';

interface UserRow {
  id: string;
  email: string;
  role: string;
  status: string;
  sessions_valid_from: string | null;
}

/**
 * Ζει ακόμη αυτό το token;
 *
 * Κάθε token κουβαλάει τη στιγμή έκδοσής του (`iat`, σε δευτερόλεπτα). Όταν ο
 * χρήστης αποσυνδεθεί ή αλλάξει κωδικό, γράφουμε στη βάση τη στιγμή εκείνη.
 * Ό,τι εκδόθηκε πριν από αυτήν θεωρείται νεκρό — έτσι ένα κλεμμένο token
 * σταματάει να δουλεύει ακαριαία αντί να ζει μέχρι 72 ώρες.
 *
 * NULL = δεν έχει γίνει ποτέ ακύρωση, άρα όλα ισχύουν.
 *
 * Εξάγεται επειδή οι δύο «ζωντανές ροές» του πίνακα ελέγχου
 * (`/admin/security/stream`, `/admin/analytics/stream`) δεν περνάνε από το
 * `requireAuth` — ο browser δεν μπορεί να στείλει `Authorization` σε
 * `EventSource`, οπότε ελέγχουν το token μόνες τους. Πρέπει να καλούν
 * **αυτήν ακριβώς** τη συνάρτηση, όχι ένα αντίγραφό της.
 */
export function sessionStillValid(validFrom: string | null, issuedAt: number): boolean {
  if (!validFrom) return true;
  const cutoff = Date.parse(validFrom.includes('T') ? validFrom : validFrom.replace(' ', 'T') + 'Z');
  if (Number.isNaN(cutoff)) return true; // Αλλοιωμένη τιμή: δεν πετάμε κανέναν έξω.
  return issuedAt >= Math.floor(cutoff / 1000);
}

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

  const user = await c.env.DB.prepare(USER_SELECT)
    .bind(payload.sub, 'active')
    .first<UserRow>();

  if (!user) {
    return c.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Ο λογαριασμός δεν είναι ενεργός.' } },
      401,
    );
  }

  if (!sessionStillValid(user.sessions_valid_from, payload.iat)) {
    return c.json(
      {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Η συνεδρία έληξε. Συνδεθείτε ξανά.' },
      },
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
      const user = await c.env.DB.prepare(USER_SELECT)
        .bind(payload.sub, 'active')
        .first<UserRow>();
      if (user && sessionStillValid(user.sessions_valid_from, payload.iat)) {
        c.set('user', user as AuthUser);
      }
    }
  }
  await next();
});
