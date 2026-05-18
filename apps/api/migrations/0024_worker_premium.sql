-- =====================================================================
-- 0024_worker_premium.sql
-- Worker monetization (optional, additive):
--   * users.is_premium / premium_until — persistent Premium Tick badge
--     and "30 monthly credits + unlimited boosts" perks
--   * worker_boosts — pay-as-you-go visibility lifts in /discover and on
--     specific job applications
-- =====================================================================

ALTER TABLE users ADD COLUMN is_premium INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN premium_until TEXT;

CREATE INDEX IF NOT EXISTS idx_users_is_premium ON users(is_premium) WHERE is_premium = 1;

-- ---------------------------------------------------------------------
-- worker_boosts — short-lived ranking lifts.
-- kind = 'discover'  → top placement στο /discover για 24 ώρες.
-- kind = 'application' → η αίτηση εμφανίζεται πρώτη στους applicants
--                        μιας συγκεκριμένης αγγελίας (target_id = job_listing.id).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS worker_boosts (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,                                -- 'discover' | 'application'
  target_id   TEXT,                                         -- nullable for 'discover'
  expires_at  TEXT NOT NULL,
  credit_cost INTEGER NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_worker_boosts_user_kind   ON worker_boosts(user_id, kind, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_worker_boosts_active      ON worker_boosts(kind, expires_at DESC) WHERE expires_at > datetime('now');
CREATE INDEX IF NOT EXISTS idx_worker_boosts_target      ON worker_boosts(target_id, kind, expires_at DESC) WHERE target_id IS NOT NULL;
