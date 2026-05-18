-- Founding Members early-bird offer:
--   First 100 paying customers get the Pro plan @ 39€/month (instead of 79€)
--   Lifetime grandfathered (their subscription stays at the discounted rate).
--
-- We track spots in a singleton counter row (id=1). Spots are claimed atomically
-- on checkout creation (pending) and finalized on webhook activation. If checkout
-- fails / is abandoned, a cron / webhook releases the pending spot.

CREATE TABLE IF NOT EXISTS founding_members_counter (
  id INTEGER PRIMARY KEY,
  spots_total INTEGER NOT NULL DEFAULT 100,
  spots_pending INTEGER NOT NULL DEFAULT 0,   -- claimed at checkout, not yet paid
  spots_used INTEGER NOT NULL DEFAULT 0,      -- finalized on subscription.active
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO founding_members_counter (id, spots_total, spots_pending, spots_used)
VALUES (1, 100, 0, 0);

-- Track which subscriptions are grandfathered as founding members.
-- Note: SQLite ALTER TABLE doesn't support IF NOT EXISTS on ADD COLUMN, so this
-- migration assumes a clean run. Re-running on prod that already has the column
-- needs `wrangler d1 migrations` to skip (it does via _meta).
ALTER TABLE subscriptions ADD COLUMN is_founding_member INTEGER NOT NULL DEFAULT 0;

-- Track pending founding-member checkouts so we can release abandoned spots.
CREATE TABLE IF NOT EXISTS founding_member_pending_checkouts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'claimed', 'released', 'expired')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  finalized_at TEXT,
  UNIQUE(user_id, status) -- a user can only have one pending claim at a time
);

CREATE INDEX IF NOT EXISTS idx_founding_pending_status ON founding_member_pending_checkouts(status);
CREATE INDEX IF NOT EXISTS idx_founding_pending_session ON founding_member_pending_checkouts(stripe_session_id);
