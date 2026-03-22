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
    .prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0')
    .bind(user.id)
    .first<{ count: number }>();

  const unreadCount = unreadResult?.count || 0;

  // Get notifications
  const results = await db
    .prepare(
      `SELECT id, user_id, type, title, body, data, read, created_at
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
    .prepare('SELECT id, user_id, read FROM notifications WHERE id = ?')
    .bind(notificationId)
    .first<{ id: string; user_id: string; read: number }>();

  if (!notification) {
    return error(c, 'Η ειδοποίηση δεν βρέθηκε', 404);
  }

  if (notification.user_id !== user.id) {
    return error(c, 'Δεν έχετε πρόσβαση σε αυτή την ειδοποίηση', 403);
  }

  if (notification.read === 1) {
    return success(c, { message: 'Η ειδοποίηση είναι ήδη αναγνωσμένη' });
  }

  const now = new Date().toISOString();
  await db
    .prepare('UPDATE notifications SET read = 1, updated_at = ? WHERE id = ?')
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
      'UPDATE notifications SET read = 1, updated_at = ? WHERE user_id = ? AND read = 0'
    )
    .bind(now, user.id)
    .run();

  return success(c, {
    message: 'Όλες οι ειδοποιήσεις σημειώθηκαν ως αναγνωσμένες',
    updatedCount: result.meta.changes || 0,
  });
});

export default notifications;
