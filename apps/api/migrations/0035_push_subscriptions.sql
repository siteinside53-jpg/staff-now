-- Web Push subscriptions for off-site notifications.
-- One row per browser/device subscription. A user may have several (e.g. laptop
-- + phone). `endpoint` is the unique push-service URL; `p256dh` + `auth` are the
-- client encryption keys (base64url) needed to encrypt the payload (RFC 8291).
-- Stale endpoints (HTTP 404/410 from the push service) are deleted on send.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions (user_id);
