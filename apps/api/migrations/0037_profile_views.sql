-- Real profile-view tracking.
-- One row each time a business opens a worker's profile. Counts are derived as
-- COUNT(DISTINCT viewer_id) so repeat visits by the same business don't inflate
-- the "how many businesses viewed this profile" number shown to both sides.
--   • worker_id  = the viewed worker's user_id
--   • viewer_id  = the business user_id that opened the profile
--   • viewer_role = viewer's role at view time (currently always 'business')

CREATE TABLE IF NOT EXISTS profile_views (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL,
  viewer_id TEXT NOT NULL,
  viewer_role TEXT NOT NULL DEFAULT 'business',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_profile_views_worker ON profile_views (worker_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_worker_viewer ON profile_views (worker_id, viewer_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_created ON profile_views (created_at);
