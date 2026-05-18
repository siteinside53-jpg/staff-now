-- =====================================================================
-- 0023_users_stripe_customer.sql
-- Adds the missing `users.stripe_customer_id` column. The original
-- billing.ts was reading/writing this column from day 1 but the column
-- itself was never created — every /billing/checkout and /billing/me
-- call therefore exploded with `no such column: stripe_customer_id`.
-- =====================================================================

ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;

CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
