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
      `SELECT c.id, c.match_id, c.created_at, c.updated_at,
         m.worker_id, m.business_id, m.job_id, m.status as match_status,
         wp.first_name as worker_first_name, wp.last_name as worker_last_name,
         wp.avatar_url as worker_avatar,
         bp.company_name as business_name, bp.logo_url as business_logo,
         j.title as job_title
       FROM conversations c
       JOIN matches m ON m.id = c.match_id
       LEFT JOIN worker_profiles wp ON wp.user_id = m.worker_id
       LEFT JOIN business_profiles bp ON bp.user_id = m.business_id
       LEFT JOIN jobs j ON j.id = m.job_id
       WHERE ${roleCondition}
       ORDER BY c.updated_at DESC
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
           WHERE conversation_id = ? AND sender_id != ? AND read = 0`
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
              name: `${conv.worker_first_name} ${conv.worker_last_name}`.trim(),
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
        updatedAt: conv.updated_at,
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
      `SELECT msg.id, msg.sender_id, msg.content, msg.type, msg.attachment_url,
         msg.read, msg.created_at,
         CASE
           WHEN msg.sender_id = wp.user_id THEN wp.first_name || ' ' || wp.last_name
           WHEN msg.sender_id = bp.user_id THEN bp.company_name
           ELSE 'Άγνωστος'
         END as sender_name,
         CASE
           WHEN msg.sender_id = wp.user_id THEN wp.avatar_url
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
      `UPDATE messages SET read = 1, updated_at = ?
       WHERE conversation_id = ? AND sender_id != ? AND read = 0`
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
      `INSERT INTO messages (id, conversation_id, sender_id, content, type, attachment_url, read, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`
    )
    .bind(
      messageId,
      conversationId,
      user.id,
      body.content.trim(),
      messageType,
      body.attachmentUrl || null,
      now,
      now
    )
    .run();

  // Update conversation's updated_at
  await db
    .prepare('UPDATE conversations SET updated_at = ? WHERE id = ?')
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
        "SELECT first_name, last_name FROM worker_profiles WHERE user_id = ?"
      )
      .bind(user.id)
      .first<{ first_name: string; last_name: string }>();
    if (wp) senderName = `${wp.first_name} ${wp.last_name}`.trim();
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
      `INSERT INTO notifications (id, user_id, type, title, body, data, read, created_at, updated_at)
       VALUES (?, ?, 'message', ?, ?, ?, 0, ?, ?)`
    )
    .bind(
      generateId(),
      recipientId,
      'Νέο μήνυμα',
      `${senderName}: ${body.content.trim().substring(0, 100)}${body.content.trim().length > 100 ? '...' : ''}`,
      JSON.stringify({ conversationId, messageId, matchId: conversation.match_id }),
      now,
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
