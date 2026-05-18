-- =====================================================================
-- 0016_session_tracking.sql
-- Adds session tracking + per-user activity log so admins can see who is
-- online, who logged in/out, who registered, and what each user did.
-- =====================================================================

ALTER TABLE users ADD COLUMN last_seen_at TEXT;

-- ---------------------------------------------------------------------
-- user_sessions: one row per active login session
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL,
  last_activity_at TEXT NOT NULL,
  ended_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON user_sessions(is_active, last_activity_at);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON user_sessions(started_at);

-- ---------------------------------------------------------------------
-- user_activity_log: per-user actions/timeline
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_activity_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,        -- 'login','logout','register','page_view','swipe_like','swipe_skip','match','message_send','profile_update','job_post','job_pause'
  entity_type TEXT,                    -- 'user','job','match','conversation','page'
  entity_id TEXT,                      -- e.g. job_id, match_id, page path
  metadata TEXT,                       -- JSON
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_activity_user ON user_activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_type ON user_activity_log(activity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_created ON user_activity_log(created_at DESC);
