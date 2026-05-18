-- Job boosts: time-limited promotion of a specific job listing in worker discovery.
-- Mirrors the existing worker_boosts table.
-- Boost duration is 7 days from purchase.

CREATE TABLE IF NOT EXISTS job_boosts (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE,
  business_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  starts_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_job_boosts_job ON job_boosts(job_id);
CREATE INDEX IF NOT EXISTS idx_job_boosts_business ON job_boosts(business_user_id);
CREATE INDEX IF NOT EXISTS idx_job_boosts_expires ON job_boosts(expires_at);
