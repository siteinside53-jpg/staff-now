import { Hono } from 'hono';
import type { Env, AuthUser } from '../types';
import { requireAuth, requireRole } from '../middleware/auth';
import { success, error } from '../lib/response';
import { generateId } from '../lib/id';

/**
 * Blog CMS.
 *
 * Public:
 *   GET  /blog/posts            — published posts (marketing /blog page)
 * Admin (requireAuth + role=admin):
 *   GET    /blog/admin/posts    — all posts (drafts included)
 *   POST   /blog/admin/posts    — create
 *   PATCH  /blog/admin/posts/:id — update
 *   DELETE /blog/admin/posts/:id — delete
 *
 * The table is provisioned lazily on first use: CI does not run D1 migrations
 * automatically, so `ensureTable` self-heals the schema (same defensive pattern
 * the /contact endpoint relies on). The migration file exists for local parity.
 */
const blog = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

async function ensureTable(env: Env) {
  await env.DB.prepare(
    `CREATE TABLE IF NOT EXISTS blog_posts (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      excerpt TEXT,
      content TEXT NOT NULL DEFAULT '',
      category TEXT,
      cover_image_url TEXT,
      author TEXT,
      read_time TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      published_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  ).run();
  await env.DB.prepare(
    `CREATE INDEX IF NOT EXISTS idx_blog_posts_status
       ON blog_posts (status, published_at DESC)`,
  ).run();
}

interface PostRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  category: string | null;
  cover_image_url: string | null;
  author: string | null;
  read_time: string | null;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

function toDTO(r: PostRow) {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt || '',
    content: r.content || '',
    category: r.category || '',
    coverImageUrl: r.cover_image_url || '',
    author: r.author || '',
    readTime: r.read_time || '',
    status: r.status,
    publishedAt: r.published_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// Latin/greeklish-friendly slug. Greek letters are stripped, so we always
// append a short random suffix to guarantee uniqueness and URL-safety.
function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
    .replace(/^-|-$/g, '');
  const suffix = generateId().slice(0, 6);
  return base ? `${base}-${suffix}` : `post-${suffix}`;
}

function estimateReadTime(content: string): string {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} λεπτά`;
}

const str = (v: unknown, max: number) =>
  typeof v === 'string' ? v.trim().slice(0, max) : '';

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

// GET /blog/posts — published posts for the marketing blog page.
blog.get('/posts', async (c) => {
  await ensureTable(c.env);
  const category = c.req.query('category');
  const rows = category
    ? await c.env.DB.prepare(
        `SELECT * FROM blog_posts
          WHERE status = 'published' AND category = ?
          ORDER BY COALESCE(published_at, created_at) DESC`,
      )
        .bind(category)
        .all<PostRow>()
    : await c.env.DB.prepare(
        `SELECT * FROM blog_posts
          WHERE status = 'published'
          ORDER BY COALESCE(published_at, created_at) DESC`,
      ).all<PostRow>();
  return success(c, { items: (rows.results || []).map(toDTO) });
});

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

const adminGate = [requireAuth, requireRole('admin')] as const;

// GET /blog/admin/posts — every post, drafts included.
blog.get('/admin/posts', ...adminGate, async (c) => {
  await ensureTable(c.env);
  const rows = await c.env.DB.prepare(
    `SELECT * FROM blog_posts ORDER BY updated_at DESC`,
  ).all<PostRow>();
  return success(c, { items: (rows.results || []).map(toDTO) });
});

// POST /blog/admin/posts — create a post.
blog.post('/admin/posts', ...adminGate, async (c) => {
  await ensureTable(c.env);
  const body = await c.req.json<Record<string, unknown>>().catch(() => null);
  if (!body) return error(c, 'Μη έγκυρο σώμα αιτήματος', 400);

  const title = str(body.title, 200);
  const content = str(body.content, 50000);
  if (title.length < 3) return error(c, 'Ο τίτλος είναι υποχρεωτικός', 400);
  if (content.length < 1) return error(c, 'Το περιεχόμενο είναι υποχρεωτικό', 400);

  const status = body.status === 'published' ? 'published' : 'draft';
  const excerpt = str(body.excerpt, 500);
  const category = str(body.category, 60);
  const coverImageUrl = str(body.coverImageUrl, 1000);
  const author = str(body.author, 120) || 'StaffNow';
  const readTime = str(body.readTime, 30) || estimateReadTime(content);
  const now = new Date().toISOString();

  const id = generateId('blg');
  const slug = slugify(title);
  const publishedAt = status === 'published' ? now : null;

  await c.env.DB.prepare(
    `INSERT INTO blog_posts
       (id, slug, title, excerpt, content, category, cover_image_url, author,
        read_time, status, published_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id, slug, title, excerpt, content, category, coverImageUrl, author,
      readTime, status, publishedAt, now, now,
    )
    .run();

  const row = await c.env.DB.prepare('SELECT * FROM blog_posts WHERE id = ?')
    .bind(id)
    .first<PostRow>();
  return success(c, { post: row ? toDTO(row) : null }, 201);
});

// PATCH /blog/admin/posts/:id — update a post.
blog.patch('/admin/posts/:id', ...adminGate, async (c) => {
  await ensureTable(c.env);
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT * FROM blog_posts WHERE id = ?')
    .bind(id)
    .first<PostRow>();
  if (!existing) return error(c, 'Το άρθρο δεν βρέθηκε', 404);

  const body = await c.req.json<Record<string, unknown>>().catch(() => null);
  if (!body) return error(c, 'Μη έγκυρο σώμα αιτήματος', 400);

  const title = body.title !== undefined ? str(body.title, 200) : existing.title;
  const content = body.content !== undefined ? str(body.content, 50000) : existing.content;
  if (title.length < 3) return error(c, 'Ο τίτλος είναι υποχρεωτικός', 400);

  const excerpt = body.excerpt !== undefined ? str(body.excerpt, 500) : existing.excerpt;
  const category = body.category !== undefined ? str(body.category, 60) : existing.category;
  const coverImageUrl =
    body.coverImageUrl !== undefined ? str(body.coverImageUrl, 1000) : existing.cover_image_url;
  const author = body.author !== undefined ? str(body.author, 120) || 'StaffNow' : existing.author;
  const readTime = body.readTime !== undefined ? str(body.readTime, 30) : existing.read_time;
  const status =
    body.status === 'published' || body.status === 'draft' ? body.status : existing.status;

  // First time it becomes published, stamp published_at.
  const publishedAt =
    status === 'published' ? existing.published_at || new Date().toISOString() : existing.published_at;
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    `UPDATE blog_posts
        SET title = ?, excerpt = ?, content = ?, category = ?, cover_image_url = ?,
            author = ?, read_time = ?, status = ?, published_at = ?, updated_at = ?
      WHERE id = ?`,
  )
    .bind(
      title, excerpt, content, category, coverImageUrl, author, readTime,
      status, publishedAt, now, id,
    )
    .run();

  const row = await c.env.DB.prepare('SELECT * FROM blog_posts WHERE id = ?')
    .bind(id)
    .first<PostRow>();
  return success(c, { post: row ? toDTO(row) : null });
});

// DELETE /blog/admin/posts/:id — remove a post.
blog.delete('/admin/posts/:id', ...adminGate, async (c) => {
  await ensureTable(c.env);
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM blog_posts WHERE id = ?').bind(id).run();
  return success(c, { deleted: true });
});

export default blog;
