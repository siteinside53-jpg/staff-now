import { Hono } from 'hono';
import type { Env, AuthUser } from '../types';
import { requireAuth } from '../middleware/auth';
import { success, error, paginated } from '../lib/response';

const notifications = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// GET / — paginated notifications with unread count
notifications.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 50);
  const offset = (page - 1) * limit;
  const type = c.req.query('type'); // optional filter by type

  const conditions: string[] = ['user_id = ?'];
  const params: (string | number)[] = [user.id];

  if (type) {
    conditions.push('type = ?');
    params.push(type);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // Count total
  const countResult = await db
    .prepare(`SELECT COUNT(*) as total FROM notifications ${whereClause}`)
    .bind(...params)
    .first<{ total: number }>();

  const total = countResult?.total || 0;

  // Count unread (always for all notifications, not filtered by type)
  const unreadResult = await db
    .prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read_at IS NULL')
    .bind(user.id)
    .first<{ count: number }>();

  const unreadCount = unreadResult?.count || 0;

  // Get notifications
  const results = await db
    .prepare(
      `SELECT id, user_id, type, title, body, data, read_at, created_at
       FROM notifications
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    )
    .bind(...params, limit, offset)
    .all();

  // Parse data JSON for each notification
  const parsed = results.results.map((n: Record<string, unknown>) => {
    let parsedData = null;
    if (n.data && typeof n.data === 'string') {
      try {
        parsedData = JSON.parse(n.data as string);
      } catch {
        parsedData = null;
      }
    }
    return {
      ...n,
      data: parsedData,
    };
  });

  const response = paginated(c, parsed, total, page, limit);

  // Add unreadCount to the response body
  const responseBody = await response.json();
  return c.json({ ...responseBody, unreadCount });
});

// POST /:id/read — mark a single notification as read
notifications.post('/:id/read', requireAuth, async (c) => {
  const user = c.get('user');
  const notificationId = c.req.param('id');
  const db = c.env.DB;

  const notification = await db
    .prepare('SELECT id, user_id, read_at FROM notifications WHERE id = ?')
    .bind(notificationId)
    .first<{ id: string; user_id: string; read_at: string | null }>();

  if (!notification) {
    return error(c, 'NOT_FOUND', 'Η ειδοποίηση δεν βρέθηκε', 404);
  }

  if (notification.user_id !== user.id) {
    return error(c, 'FORBIDDEN', 'Δεν έχετε πρόσβαση σε αυτή την ειδοποίηση', 403);
  }

  if (notification.read_at) {
    return success(c, { message: 'Η ειδοποίηση είναι ήδη αναγνωσμένη' });
  }

  const now = new Date().toISOString();
  await db
    .prepare('UPDATE notifications SET read_at = ? WHERE id = ?')
    .bind(now, notificationId)
    .run();

  return success(c, { read: true, notificationId });
});

// POST /read-all — mark all notifications as read
notifications.post('/read-all', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const now = new Date().toISOString();
  const result = await db
    .prepare(
      'UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL'
    )
    .bind(now, user.id)
    .run();

  return success(c, {
    message: 'Όλες οι ειδοποιήσεις σημειώθηκαν ως αναγνωσμένες',
    updatedCount: result.meta.changes || 0,
  });
});

/**
 * Ρυθμίσεις ειδοποιήσεων.
 *
 * Έλειπαν εντελώς: η σελίδα «Ρυθμίσεις» καλούσε λειτουργία που δεν υπήρχε,
 * οπότε ο χρήστης έβλεπε πάντα «Αποτυχία αποθήκευσης». Όποιος δεν έχει
 * αποθηκεύσει ποτέ, παίρνει τις προεπιλογές από εδώ.
 */
const DEFAULT_SETTINGS = {
  emailMatches: true,
  emailMessages: true,
  emailMarketing: false,
  pushMatches: true,
  pushMessages: true,
};

type SettingsRow = {
  email_matches: number;
  email_messages: number;
  email_marketing: number;
  push_matches: number;
  push_messages: number;
};

notifications.get('/settings', requireAuth, async (c) => {
  const user = c.get('user');
  const row = await c.env.DB.prepare(
    'SELECT email_matches, email_messages, email_marketing, push_matches, push_messages FROM notification_settings WHERE user_id = ?'
  )
    .bind(user.id)
    .first<SettingsRow>();

  if (!row) return success(c, DEFAULT_SETTINGS);

  return success(c, {
    emailMatches: row.email_matches === 1,
    emailMessages: row.email_messages === 1,
    emailMarketing: row.email_marketing === 1,
    pushMatches: row.push_matches === 1,
    pushMessages: row.push_messages === 1,
  });
});

notifications.patch('/settings', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== 'object') return error(c, 'VALIDATION_ERROR', 'Λείπουν οι ρυθμίσεις', 400);

  // Δεχόμαστε μόνο τους πέντε γνωστούς διακόπτες, και μόνο ναι/όχι. Ό,τι
  // λείπει κρατάει την προεπιλογή του — δεν σβήνουμε ρυθμίσεις κατά λάθος.
  const merged = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof typeof DEFAULT_SETTINGS)[]) {
    if (typeof body[key] === 'boolean') merged[key] = body[key];
  }

  await c.env.DB.prepare(
    `INSERT INTO notification_settings
       (user_id, email_matches, email_messages, email_marketing, push_matches, push_messages, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       email_matches = excluded.email_matches,
       email_messages = excluded.email_messages,
       email_marketing = excluded.email_marketing,
       push_matches = excluded.push_matches,
       push_messages = excluded.push_messages,
       updated_at = excluded.updated_at`
  )
    .bind(
      user.id,
      merged.emailMatches ? 1 : 0,
      merged.emailMessages ? 1 : 0,
      merged.emailMarketing ? 1 : 0,
      merged.pushMatches ? 1 : 0,
      merged.pushMessages ? 1 : 0
    )
    .run();

  return success(c, merged);
});

export default notifications;
