-- =====================================================================
-- 0021_error_logs.sql
-- Server-side error capture for the StaffNow API.
--
-- Every unhandled error in the request pipeline is appended here with
-- enough context to debug a production incident without spelunking
-- through `wrangler tail`:
--   * who triggered the error (user_id + role + email snapshot)
--   * where it happened (method, path, query, status_code)
--   * why it happened (error code, message, truncated stack)
--   * from where (ip, user-agent, country/city via Cloudflare CF object)
--
-- The page /admin/security surfaces this table in real time via SSE.
-- =====================================================================

CREATE TABLE IF NOT EXISTS error_logs (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL DEFAULT 'error',  -- 'error' | 'warn' | 'fatal'
  code TEXT,                            -- AppError code, 'VALIDATION_ERROR', 'INTERNAL_ERROR' ...
  message TEXT,
  stack TEXT,                           -- truncated to ~4kB
  status_code INTEGER,
  -- request context
  method TEXT,
  path TEXT,
  query TEXT,
  body_snippet TEXT,                    -- first ~500 chars, secrets masked
  -- actor
  user_id TEXT,
  user_role TEXT,
  user_email TEXT,
  -- network / geo
  ip_address TEXT,
  user_agent TEXT,
  country TEXT,
  city TEXT,
  region TEXT,
  request_id TEXT,
  -- triage
  resolved INTEGER NOT NULL DEFAULT 0,  -- 0 = open, 1 = resolved
  resolved_by TEXT,
  resolved_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_error_logs_created  ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_level    ON error_logs(level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_code     ON error_logs(code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_user     ON error_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_path     ON error_logs(path, created_at DESC);
