-- Update subscriptions.plan_id CHECK constraint to include the new plans:
--   business_elite (Pricing tier added 2026-04)
--   founding_pro   (Founding Members early-bird tier added 2026-05)
--
-- SQLite doesn't allow altering CHECK constraints in-place, so we recreate
-- the table.

CREATE TABLE IF NOT EXISTS subscriptions_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL CHECK(plan_id IN (
    'business_basic',
    'business_pro',
    'business_elite',
    'founding_pro',
    'worker_premium'
  )),
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'past_due', 'canceled', 'trialing', 'incomplete')),
  current_period_start TEXT,
  current_period_end TEXT,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  grace_period_until TEXT,
  is_founding_member INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO subscriptions_new
  (id, user_id, plan_id, stripe_subscription_id, stripe_customer_id, status,
   current_period_start, current_period_end, cancel_at_period_end,
   grace_period_until, is_founding_member, created_at, updated_at)
SELECT id, user_id, plan_id, stripe_subscription_id, stripe_customer_id, status,
       current_period_start, current_period_end, cancel_at_period_end,
       COALESCE(grace_period_until, NULL),
       COALESCE(is_founding_member, 0),
       created_at, updated_at
FROM subscriptions;

DROP TABLE subscriptions;
ALTER TABLE subscriptions_new RENAME TO subscriptions;

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
