import { Hono } from 'hono';
import type { Env, AuthUser } from '../types';
import { requireAuth } from '../middleware/auth';
import { success, error, paginated } from '../lib/response';
import { generateId } from '../lib/id';

const conversations = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// GET / — list conversations with last message and unread count
conversations.get('/', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 50);
  const offset = (page - 1) * limit;

  // Get conversations where the user is part of the match
  const roleCondition =
    user.role === 'worker' ? 'm.worker_id = ?' : 'm.business_id = ?';

  const countResult = await db
    .prepare(
      `SELECT COUNT(*) as total
       FROM conversations c
       JOIN matches m ON m.id = c.match_id
       WHERE ${roleCondition}`
    )
    .bind(user.id)
    .first<{ total: number }>();

  const total = countResult?.total || 0;

  const results = await db
    .prepare(
      `SELECT c.id, c.match_id, c.created_at, c.last_message_at,
         m.worker_id, m.business_id, m.job_id, m.status as match_status,
         COALESCE(NULLIF(wp.full_name, ''), u_w.display_name, u_w.email) as worker_name,
         COALESCE(wp.photo_url, u_w.avatar_url) as worker_avatar,
         COALESCE(NULLIF(bp.company_name, ''), u_b.display_name, u_b.email) as business_name,
         COALESCE(bp.logo_url, u_b.avatar_url) as business_logo,
         j.title as job_title
       FROM conversations c
       JOIN matches m ON m.id = c.match_id
       LEFT JOIN worker_profiles wp ON wp.user_id = m.worker_id
       LEFT JOIN users u_w ON u_w.id = m.worker_id
       LEFT JOIN business_profiles bp ON bp.user_id = m.business_id
       LEFT JOIN users u_b ON u_b.id = m.business_id
       LEFT JOIN job_listings j ON j.id = m.job_id
       WHERE ${roleCondition}
       ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .bind(user.id, limit, offset)
    .all();

  // Enrich with last message and unread count
  const enriched = await Promise.all(
    results.results.map(async (conv: Record<string, unknown>) => {
      const lastMessage = await db
        .prepare(
          `SELECT id, sender_id, content, created_at
           FROM messages
           WHERE conversation_id = ?
           ORDER BY created_at DESC LIMIT 1`
        )
        .bind(conv.id as string)
        .first();

      const unread = await db
        .prepare(
          `SELECT COUNT(*) as count FROM messages
           WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL`
        )
        .bind(conv.id as string, user.id)
        .first<{ count: number }>();

      // Determine the other party
      const otherParty =
        user.role === 'worker'
          ? {
              id: conv.business_id,
              name: conv.business_name,
              avatar: conv.business_logo,
              type: 'business' as const,
            }
          : {
              id: conv.worker_id,
              name: conv.worker_name || '',
              avatar: conv.worker_avatar,
              type: 'worker' as const,
            };

      return {
        id: conv.id,
        matchId: conv.match_id,
        matchStatus: conv.match_status,
        jobTitle: conv.job_title,
        otherParty,
        lastMessage,
        unreadCount: unread?.count || 0,
        createdAt: conv.created_at,
        updatedAt: conv.last_message_at || conv.created_at,
      };
    })
  );

  return paginated(c, enriched, total, page, limit);
});

// GET /:id/messages — paginated messages, mark as read
conversations.get('/:id/messages', requireAuth, async (c) => {
  const user = c.get('user');
  const conversationId = c.req.param('id');
  const db = c.env.DB;

  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);
  const offset = (page - 1) * limit;

  // Verify user is part of this conversation
  const conversation = await db
    .prepare(
      `SELECT c.id, m.worker_id, m.business_id, m.status as match_status
       FROM conversations c
       JOIN matches m ON m.id = c.match_id
       WHERE c.id = ?`
    )
    .bind(conversationId)
    .first<{
      id: string;
      worker_id: string;
      business_id: string;
      match_status: string;
    }>();

  if (!conversation) {
    return error(c, 'Η συνομιλία δεν βρέθηκε', 404);
  }

  if (conversation.worker_id !== user.id && conversation.business_id !== user.id) {
    return error(c, 'Δεν έχετε πρόσβαση σε αυτή τη συνομιλία', 403);
  }

  // Count total messages
  const countResult = await db
    .prepare('SELECT COUNT(*) as total FROM messages WHERE conversation_id = ?')
    .bind(conversationId)
    .first<{ total: number }>();

  const total = countResult?.total || 0;

  // Get messages ordered by newest first
  const messages = await db
    .prepare(
      `SELECT msg.id, msg.sender_id, msg.content,
         msg.read_at, msg.created_at,
         CASE
           WHEN msg.sender_id = wp.user_id THEN wp.full_name
           WHEN msg.sender_id = bp.user_id THEN bp.company_name
           ELSE 'Άγνωστος'
         END as sender_name,
         CASE
           WHEN msg.sender_id = wp.user_id THEN wp.photo_url
           WHEN msg.sender_id = bp.user_id THEN bp.logo_url
           ELSE NULL
         END as sender_avatar
       FROM messages msg
       LEFT JOIN worker_profiles wp ON wp.user_id = msg.sender_id
       LEFT JOIN business_profiles bp ON bp.user_id = msg.sender_id
       WHERE msg.conversation_id = ?
       ORDER BY msg.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .bind(conversationId, limit, offset)
    .all();

  // Mark unread messages from the other party as read
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE messages SET read_at = ?
       WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL`
    )
    .bind(now, conversationId, user.id)
    .run();

  return paginated(c, messages.results, total, page, limit);
});

// POST /:id/messages — send a message
conversations.post('/:id/messages', requireAuth, async (c) => {
  const user = c.get('user');
  const conversationId = c.req.param('id');
  const db = c.env.DB;
  const body = await c.req.json<{
    content: string;
    type?: string;
    attachmentUrl?: string;
  }>();

  if (!body.content || body.content.trim().length === 0) {
    return error(c, 'Το μήνυμα δεν μπορεί να είναι κενό', 400);
  }

  if (body.content.length > 5000) {
    return error(c, 'Το μήνυμα είναι πολύ μεγάλο (μέγιστο 5000 χαρακτήρες)', 400);
  }

  // Verify user is part of this conversation and match is active
  const conversation = await db
    .prepare(
      `SELECT c.id, c.match_id, m.worker_id, m.business_id, m.status as match_status
       FROM conversations c
       JOIN matches m ON m.id = c.match_id
       WHERE c.id = ?`
    )
    .bind(conversationId)
    .first<{
      id: string;
      match_id: string;
      worker_id: string;
      business_id: string;
      match_status: string;
    }>();

  if (!conversation) {
    return error(c, 'Η συνομιλία δεν βρέθηκε', 404);
  }

  if (conversation.worker_id !== user.id && conversation.business_id !== user.id) {
    return error(c, 'Δεν έχετε πρόσβαση σε αυτή τη συνομιλία', 403);
  }

  if (conversation.match_status !== 'active') {
    return error(c, 'Δεν μπορείτε να στείλετε μήνυμα σε αρχειοθετημένο ταίριασμα', 400);
  }

  const now = new Date().toISOString();
  const messageId = generateId();
  const messageType = body.type || 'text';

  await db
    .prepare(
      `INSERT INTO messages (id, conversation_id, sender_id, content, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(
      messageId,
      conversationId,
      user.id,
      body.content.trim(),
      now
    )
    .run();

  // Update conversation's updated_at
  await db
    .prepare('UPDATE conversations SET last_message_at = ? WHERE id = ?')
    .bind(now, conversationId)
    .run();

  // Determine recipient
  const recipientId =
    conversation.worker_id === user.id
      ? conversation.business_id
      : conversation.worker_id;

  // Get sender display name
  let senderName = 'Χρήστης';
  if (user.role === 'worker') {
    const wp = await db
      .prepare(
        "SELECT full_name FROM worker_profiles WHERE user_id = ?"
      )
      .bind(user.id)
      .first<{ full_name: string }>();
    if (wp) senderName = wp.full_name || '';
  } else {
    const bp = await db
      .prepare('SELECT company_name FROM business_profiles WHERE user_id = ?')
      .bind(user.id)
      .first<{ company_name: string }>();
    if (bp) senderName = bp.company_name;
  }

  // Create notification for recipient
  await db
    .prepare(
      `INSERT INTO notifications (id, user_id, type, title, body, data, created_at)
       VALUES (?, ?, 'new_message', ?, ?, ?, ?)`
    )
    .bind(
      generateId(),
      recipientId,
      'Νέο μήνυμα',
      `${senderName}: ${body.content.trim().substring(0, 100)}${body.content.trim().length > 100 ? '...' : ''}`,
      JSON.stringify({ conversationId, messageId, matchId: conversation.match_id }),
      now
    )
    .run();

  const message = await db
    .prepare('SELECT * FROM messages WHERE id = ?')
    .bind(messageId)
    .first();

  return success(c, { message }, 201);
});

export default conversations;
