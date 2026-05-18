-- =====================================================================
-- 0026_fix_worker_boosts_indexes.sql
-- The original 0024 migration tried to create partial indexes με
-- `WHERE expires_at > datetime('now')` — SQLite απορρίπτει non-
-- deterministic functions σε index expressions με σφάλμα:
--   "non-deterministic use of datetime() in an index"
-- και αυτό σπάει κάθε INSERT στο worker_boosts.
--
-- Αντικαθιστούμε με απλά full indexes που είναι αρκετά για το query
-- volume που έχουμε (μερικές χιλιάδες rows max).
-- =====================================================================

DROP INDEX IF EXISTS idx_worker_boosts_active;
DROP INDEX IF EXISTS idx_worker_boosts_target;

CREATE INDEX IF NOT EXISTS idx_worker_boosts_kind_expires
  ON worker_boosts(kind, expires_at);

CREATE INDEX IF NOT EXISTS idx_worker_boosts_target_expires
  ON worker_boosts(target_id, kind, expires_at);
