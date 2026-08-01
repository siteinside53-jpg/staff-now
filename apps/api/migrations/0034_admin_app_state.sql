-- Generic key/value store for small admin-only state that was previously kept
-- in Workers KV. KV has a 1000 writes/day quota on the current plan; the admin
-- sidebar "nav seen" markers write on every section open and were exhausting it,
-- which left the unread badges stuck. D1 has no such daily write cap, so we move
-- that state here. Single-row-per-key, value is JSON.

CREATE TABLE IF NOT EXISTS admin_app_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
