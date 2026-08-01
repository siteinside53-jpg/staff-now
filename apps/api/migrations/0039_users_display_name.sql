-- Backfill migration: `users.display_name` and `users.avatar_url` were added
-- directly to the production database without ever being written down as a
-- migration. Fresh databases therefore lacked both columns, and every query
-- joining on them failed with `no such column: u.display_name` — which took out
-- /admin/presence, /admin/live-visitors and /admin/activity/live locally.
--
-- Production already has both columns, so do NOT re-run this there: SQLite has
-- no `ADD COLUMN IF NOT EXISTS` and it would fail with "duplicate column name".
-- This file exists so a database built from scratch matches production.

ALTER TABLE users ADD COLUMN display_name TEXT;
ALTER TABLE users ADD COLUMN avatar_url TEXT;
