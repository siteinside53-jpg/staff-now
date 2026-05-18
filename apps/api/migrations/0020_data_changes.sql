-- =====================================================================
-- 0020_data_changes.sql
-- Trust & Safety / forensic log: every meaningful data mutation lands
-- here with the full diff (before / after), the actor (user or admin),
-- their IP/country, and the timestamp.
--
-- This is separate from `audit_logs` (admin-only actions) and from
-- `user_activity_log` (page views / swipes / heartbeats) so admins can
-- query "who changed what and from where" without sifting noise.
-- =====================================================================

CREATE TABLE IF NOT EXISTS data_changes (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT,                  -- who performed the change (NULL for system)
  actor_role TEXT,                     -- 'worker' | 'business' | 'admin' | 'system'
  actor_email TEXT,                    -- snapshot for fast filtering
  actor_name TEXT,                     -- snapshot
  action TEXT NOT NULL,                -- 'file_upload','profile_update','job_create','job_update','job_delete','branch_create','branch_update','branch_delete','admin_action'
  entity_type TEXT,                    -- 'file' | 'worker_profile' | 'business_profile' | 'job_listing' | 'business_branch' | 'user'
  entity_id TEXT,                      -- e.g. job id, branch id
  entity_owner_id TEXT,                -- the user the entity belongs to (helpful for filtering "all changes for user X")
  field_changes TEXT,                  -- JSON: { field: { before, after } }
  metadata TEXT,                       -- JSON: extra context (filename, size, content_type, ...)
  ip_address TEXT,
  user_agent TEXT,
  country TEXT,
  city TEXT,
  region TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_dc_created ON data_changes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dc_actor ON data_changes(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dc_entity ON data_changes(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dc_owner ON data_changes(entity_owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dc_action ON data_changes(action, created_at DESC);
