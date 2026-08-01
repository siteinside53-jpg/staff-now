-- Backfill migration: the `credits` and `credit_transactions` tables were created
-- directly in production and never written down as a migration, even though
-- src/routes/credits.ts reads and writes both on every credit balance, purchase
-- and spend call. A database built from scratch was missing them entirely.
--
-- The definitions below are copied verbatim from the production schema, so this
-- is a no-op there (guarded by IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS credits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  balance INTEGER NOT NULL DEFAULT 0,
  total_purchased INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('purchase','spend','bonus','refund')),
  description TEXT,
  reference_id TEXT,
  reference_type TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
