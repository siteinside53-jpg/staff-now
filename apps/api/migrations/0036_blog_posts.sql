-- Blog CMS: admin-authored posts surfaced on the public /blog page.
-- The API also provisions this table lazily (routes/blog.ts → ensureTable) since
-- CI does not run migrations automatically; this file keeps local D1 in parity.

CREATE TABLE IF NOT EXISTS blog_posts (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL DEFAULT '',
  category TEXT,
  cover_image_url TEXT,
  author TEXT,
  read_time TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'published'
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_status
  ON blog_posts (status, published_at DESC);
