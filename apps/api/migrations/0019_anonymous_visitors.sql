-- =====================================================================
-- 0019_anonymous_visitors.sql
-- Adds support for tracking anonymous (non-logged-in) visitors so the
-- admin overview can show live presence in real time, regardless of
-- whether a user has registered.
-- =====================================================================

-- One row per page view / heartbeat from an anonymous visitor.
CREATE TABLE IF NOT EXISTS anonymous_activity_log (
  id TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  activity_type TEXT NOT NULL,        -- 'page_view' | 'heartbeat' | 'click' | ...
  entity_id TEXT,                      -- e.g. page path
  metadata TEXT,
  ip_address TEXT,
  user_agent TEXT,
  country TEXT,
  city TEXT,
  region TEXT,
  timezone TEXT,
  referrer TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_anon_visitor ON anonymous_activity_log(visitor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_anon_created ON anonymous_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_anon_type ON anonymous_activity_log(activity_type, created_at DESC);

-- Aggregate per visitor: when they first arrived, when last seen, page count.
CREATE TABLE IF NOT EXISTS anonymous_sessions (
  visitor_id TEXT PRIMARY KEY,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  current_path TEXT,
  ip_address TEXT,
  user_agent TEXT,
  country TEXT,
  city TEXT,
  region TEXT,
  timezone TEXT,
  page_views INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_anon_sess_last ON anonymous_sessions(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_anon_sess_country ON anonymous_sessions(country);

-- Add `current_path` to user_sessions so we can show "now on page X" for
-- logged-in users too.
ALTER TABLE user_sessions ADD COLUMN current_path TEXT;
