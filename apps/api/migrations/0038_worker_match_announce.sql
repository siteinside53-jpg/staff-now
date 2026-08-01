-- Phase 2: announce a newly-matchable worker to businesses with matching open
-- jobs. This flag makes the announcement fire exactly once — the first time a
-- worker profile becomes matchable (has a region + at least one role) — so
-- editing the profile later never re-notifies businesses (domain-safe).
ALTER TABLE worker_profiles ADD COLUMN match_announced_at TEXT;
