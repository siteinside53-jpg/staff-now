import { Hono } from 'hono';
import type { Env, AuthUser } from '../types';
import { requireAuth } from '../middleware/auth';
import { success, error, paginated } from '../lib/response';
import { generateId } from '../lib/id';
import { recordActivity, getRequestIp, getGeoFromRequest } from '../lib/activity';

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
       WHERE ${roleCondition}
       AND (c.hidden_by IS NULL OR c.hidden_by NOT LIKE ?)`
    )
    .bind(user.id, `%${user.id}%`)
    .first<{ total: number }>();

  const total = countResult?.total || 0;

  const results = await db
    .prepare(
      `SELECT c.id, c.match_id, c.created_at, c.last_message_at,
         m.worker_id, m.business_id, m.job_id, m.status as match_status,
         u_w.role as worker_role,
         u_b.role as business_role,
         CASE WHEN u_w.role = 'admin' THEN 'StaffNow' ELSE COALESCE(NULLIF(wp.full_name, ''), u_w.display_name, u_w.email) END as worker_name,
         CASE WHEN u_w.role = 'admin' THEN NULL ELSE COALESCE(wp.photo_url, u_w.avatar_url) END as worker_avatar,
         CASE WHEN u_b.role = 'admin' THEN 'StaffNow' ELSE COALESCE(NULLIF(br.name, ''), NULLIF(bp.company_name, ''), u_b.display_name, u_b.email) END as business_name,
         CASE WHEN u_b.role = 'admin' THEN NULL ELSE COALESCE(br.logo_url, bp.logo_url, u_b.avatar_url) END as business_logo,
         j.title as job_title
       FROM conversations c
       JOIN matches m ON m.id = c.match_id
       LEFT JOIN worker_profiles wp ON wp.user_id = m.worker_id
       LEFT JOIN users u_w ON u_w.id = m.worker_id
       LEFT JOIN business_profiles bp ON bp.user_id = m.business_id
       LEFT JOIN users u_b ON u_b.id = m.business_id
       LEFT JOIN business_branches br ON br.user_id = m.business_id
       LEFT JOIN job_listings j ON j.id = m.job_id
       WHERE ${roleCondition}
       AND (c.hidden_by IS NULL OR c.hidden_by NOT LIKE ?)
       ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .bind(user.id, `%${user.id}%`, limit, offset)
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

      // Check if blocked and who blocked whom
      const otherUserId = otherParty.id as string;
      const iBlockedThem = await db.prepare('SELECT id FROM blocks WHERE blocker_id = ? AND blocked_id = ?').bind(user.id, otherUserId).first();
      const theyBlockedMe = await db.prepare('SELECT id FROM blocks WHERE blocker_id = ? AND blocked_id = ?').bind(otherUserId, user.id).first();

      return {
        id: conv.id,
        matchId: conv.match_id,
        matchStatus: conv.match_status,
        isBlocked: !!(iBlockedThem || theyBlockedMe),
        blockedByMe: !!iBlockedThem,
        blockedByThem: !!theyBlockedMe,
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

  // Count total messages (excluding deleted for this user)
  const countResult = await db
    .prepare(
      `SELECT COUNT(*) as total FROM messages
       WHERE conversation_id = ?
       AND (deleted_for_all = 0 OR deleted_for_all IS NULL)
       AND (deleted_by IS NULL OR deleted_by NOT LIKE ?)`
    )
    .bind(conversationId, `%${user.id}%`)
    .first<{ total: number }>();

  const total = countResult?.total || 0;

  // Get messages ordered by newest first, excluding deleted
  const messages = await db
    .prepare(
      `SELECT msg.id, msg.sender_id, msg.content,
         msg.read_at, msg.created_at, msg.deleted_for_all,
         CASE
           WHEN u_s.role = 'admin' THEN 'StaffNow'
           WHEN msg.sender_id = wp.user_id THEN wp.full_name
           WHEN msg.sender_id = bp.user_id THEN bp.company_name
           ELSE COALESCE(u_s.display_name, 'Χρήστης')
         END as sender_name,
         CASE
           WHEN u_s.role = 'admin' THEN NULL
           WHEN msg.sender_id = wp.user_id THEN wp.photo_url
           WHEN msg.sender_id = bp.user_id THEN bp.logo_url
           ELSE NULL
         END as sender_avatar
       FROM messages msg
       LEFT JOIN users u_s ON u_s.id = msg.sender_id
       LEFT JOIN worker_profiles wp ON wp.user_id = msg.sender_id
       LEFT JOIN business_profiles bp ON bp.user_id = msg.sender_id
       WHERE msg.conversation_id = ?
       AND (msg.deleted_for_all = 0 OR msg.deleted_for_all IS NULL)
       AND (msg.deleted_by IS NULL OR msg.deleted_by NOT LIKE ?)
       ORDER BY msg.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .bind(conversationId, `%${user.id}%`, limit, offset)
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

  // Update conversation's last_message_at + unhide for both users (if hidden)
  await db
    .prepare('UPDATE conversations SET last_message_at = ?, hidden_by = NULL WHERE id = ?')
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
      `💬 Έχεις νέο μήνυμα από ${senderName}`,
      `${senderName}: ${body.content.trim().substring(0, 100)}${body.content.trim().length > 100 ? '...' : ''}`,
      JSON.stringify({ conversationId, messageId, matchId: conversation.match_id }),
      now
    )
    .run();

  const message = await db
    .prepare('SELECT * FROM messages WHERE id = ?')
    .bind(messageId)
    .first();

  c.executionCtx.waitUntil(
    recordActivity(c.env, {
      userId: user.id,
      type: 'message_send',
      entityType: 'conversation',
      entityId: conversationId,
      ip: getRequestIp(c),
      userAgent: c.req.header('User-Agent') || null,
      geo: getGeoFromRequest(c),
    }),
  );

  return success(c, { message }, 201);
});

// DELETE /:convId/messages/:msgId — delete a message
conversations.delete('/:convId/messages/:msgId', requireAuth, async (c) => {
  const user = c.get('user');
  const conversationId = c.req.param('convId');
  const messageId = c.req.param('msgId');
  const db = c.env.DB;
  const body = await c.req.json<{ forAll?: boolean }>().catch(() => ({ forAll: false }));

  // Verify user is part of conversation
  const conv = await db
    .prepare(
      `SELECT c.id, m.worker_id, m.business_id
       FROM conversations c JOIN matches m ON m.id = c.match_id
       WHERE c.id = ?`
    )
    .bind(conversationId)
    .first<{ id: string; worker_id: string; business_id: string }>();

  if (!conv || (conv.worker_id !== user.id && conv.business_id !== user.id)) {
    return error(c, 'Δεν βρέθηκε', 404);
  }

  // Verify message exists
  const msg = await db
    .prepare('SELECT id, sender_id, deleted_by FROM messages WHERE id = ? AND conversation_id = ?')
    .bind(messageId, conversationId)
    .first<{ id: string; sender_id: string; deleted_by: string | null }>();

  if (!msg) {
    return error(c, 'Το μήνυμα δεν βρέθηκε', 404);
  }

  if (body.forAll && msg.sender_id === user.id) {
    // Delete for all — only sender can do this
    await db
      .prepare('UPDATE messages SET deleted_for_all = 1, content = ? WHERE id = ?')
      .bind('Αυτό το μήνυμα διαγράφηκε', messageId)
      .run();
  } else {
    // Delete for me — add user to deleted_by list
    const deletedBy: string[] = msg.deleted_by ? JSON.parse(msg.deleted_by) : [];
    if (!deletedBy.includes(user.id)) {
      deletedBy.push(user.id);
    }
    await db
      .prepare('UPDATE messages SET deleted_by = ? WHERE id = ?')
      .bind(JSON.stringify(deletedBy), messageId)
      .run();
  }

  return success(c, { deleted: true });
});

// PATCH /:id — mark conversation as read / archive / restore
conversations.patch('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const conversationId = c.req.param('id');
  const db = c.env.DB;

  // Verify access
  const conv = await db
    .prepare(`SELECT c.id, c.match_id, m.worker_id, m.business_id, m.status as match_status
       FROM conversations c JOIN matches m ON m.id = c.match_id WHERE c.id = ?`)
    .bind(conversationId)
    .first<{ id: string; match_id: string; worker_id: string; business_id: string; match_status: string }>();

  if (!conv || (conv.worker_id !== user.id && conv.business_id !== user.id)) {
    return error(c, 'Δεν βρέθηκε', 404);
  }

  let body: { action?: string } = {};
  try { body = await c.req.json(); } catch {}

  const now = new Date().toISOString();

  if (body.action === 'archive') {
    await db.prepare("UPDATE matches SET status = 'archived', archived_at = ? WHERE id = ?").bind(now, conv.match_id).run();
    return success(c, { archived: true });
  }

  if (body.action === 'restore') {
    // Check if the OTHER user blocked this user (can't restore)
    const otherUserId = conv.worker_id === user.id ? conv.business_id : conv.worker_id;
    const blockedByOther = await db.prepare('SELECT id FROM blocks WHERE blocker_id = ? AND blocked_id = ?').bind(otherUserId, user.id).first();
    if (blockedByOther) {
      return error(c, 'Δεν μπορεί να γίνει επαναφορά - ο χρήστης σας έχει αποκλείσει', 400);
    }
    // If THIS user blocked the other, remove the block first (unblock)
    await db.prepare('DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?').bind(user.id, otherUserId).run();
    // Restore ALL matches between these two users
    await db.prepare("UPDATE matches SET status = 'active', archived_at = NULL WHERE worker_id = ? AND business_id = ?").bind(conv.worker_id, conv.business_id).run();
    return success(c, { restored: true });
  }

  // Default: mark as read
  await db
    .prepare('UPDATE messages SET read_at = ? WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL')
    .bind(now, conversationId, user.id)
    .run();

  return success(c, { read: true });
});

// DELETE /:id — delete conversation (hide for user permanently)
conversations.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const conversationId = c.req.param('id');
  const db = c.env.DB;

  const conv = await db
    .prepare(`SELECT c.id, c.match_id, c.hidden_by, m.worker_id, m.business_id
       FROM conversations c JOIN matches m ON m.id = c.match_id WHERE c.id = ?`)
    .bind(conversationId)
    .first<{ id: string; match_id: string; hidden_by: string | null; worker_id: string; business_id: string }>();

  if (!conv || (conv.worker_id !== user.id && conv.business_id !== user.id)) {
    return error(c, 'Δεν βρέθηκε', 404);
  }

  // Add user to hidden_by list
  const hiddenBy: string[] = conv.hidden_by ? JSON.parse(conv.hidden_by) : [];
  if (!hiddenBy.includes(user.id)) hiddenBy.push(user.id);
  await db.prepare('UPDATE conversations SET hidden_by = ? WHERE id = ?').bind(JSON.stringify(hiddenBy), conversationId).run();

  return success(c, { deleted: true });
});

// POST /:id/clear-messages — delete all messages for this user
conversations.post('/:id/clear-messages', requireAuth, async (c) => {
  const user = c.get('user');
  const conversationId = c.req.param('id');
  const db = c.env.DB;

  const conv = await db
    .prepare(`SELECT c.id, m.worker_id, m.business_id
       FROM conversations c JOIN matches m ON m.id = c.match_id WHERE c.id = ?`)
    .bind(conversationId)
    .first<{ id: string; worker_id: string; business_id: string }>();

  if (!conv || (conv.worker_id !== user.id && conv.business_id !== user.id)) {
    return error(c, 'Δεν βρέθηκε', 404);
  }

  // Mark all messages as deleted for this user
  const msgs = await db.prepare('SELECT id, deleted_by FROM messages WHERE conversation_id = ?').bind(conversationId).all();
  for (const msg of msgs.results) {
    const m = msg as { id: string; deleted_by: string | null };
    const deletedBy: string[] = m.deleted_by ? JSON.parse(m.deleted_by) : [];
    if (!deletedBy.includes(user.id)) {
      deletedBy.push(user.id);
      await db.prepare('UPDATE messages SET deleted_by = ? WHERE id = ?').bind(JSON.stringify(deletedBy), m.id).run();
    }
  }

  return success(c, { cleared: true });
});

// POST /:id/block — block the other user
conversations.post('/:id/block', requireAuth, async (c) => {
  const user = c.get('user');
  const conversationId = c.req.param('id');
  const db = c.env.DB;

  const conv = await db
    .prepare(`SELECT c.id, c.match_id, m.worker_id, m.business_id
       FROM conversations c JOIN matches m ON m.id = c.match_id WHERE c.id = ?`)
    .bind(conversationId)
    .first<{ id: string; match_id: string; worker_id: string; business_id: string }>();

  if (!conv || (conv.worker_id !== user.id && conv.business_id !== user.id)) {
    return error(c, 'Δεν βρέθηκε', 404);
  }

  const otherUserId = conv.worker_id === user.id ? conv.business_id : conv.worker_id;
  const now = new Date().toISOString();

  // Check if already blocked
  const existing = await db.prepare('SELECT id FROM blocks WHERE blocker_id = ? AND blocked_id = ?').bind(user.id, otherUserId).first();
  if (!existing) {
    await db.prepare('INSERT INTO blocks (id, blocker_id, blocked_id, created_at) VALUES (?, ?, ?, ?)').bind(generateId(), user.id, otherUserId, now).run();
  }

  // Archive the match
  await db.prepare("UPDATE matches SET status = 'archived', archived_at = ? WHERE id = ?").bind(now, conv.match_id).run();

  return success(c, { blocked: true });
});

// POST /:id/report — report the other user
conversations.post('/:id/report', requireAuth, async (c) => {
  const user = c.get('user');
  const conversationId = c.req.param('id');
  const db = c.env.DB;
  const body = await c.req.json<{ reason?: string; description?: string }>().catch(() => ({}));

  const conv = await db
    .prepare(`SELECT c.id, c.match_id, m.worker_id, m.business_id
       FROM conversations c JOIN matches m ON m.id = c.match_id WHERE c.id = ?`)
    .bind(conversationId)
    .first<{ id: string; match_id: string; worker_id: string; business_id: string }>();

  if (!conv || (conv.worker_id !== user.id && conv.business_id !== user.id)) {
    return error(c, 'Δεν βρέθηκε', 404);
  }

  const otherUserId = conv.worker_id === user.id ? conv.business_id : conv.worker_id;
  const now = new Date().toISOString();

  const validReasons = ['inappropriate_content', 'fake_profile', 'harassment', 'spam', 'other'];
  const reason = validReasons.includes(body.reason || '') ? body.reason : 'other';

  await db.prepare(
    `INSERT INTO reports (id, reporter_id, target_user_id, reason, description, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?)`
  ).bind(generateId(), user.id, otherUserId, reason, body.description || '', now).run();

  return success(c, { reported: true });
});

export default conversations;
