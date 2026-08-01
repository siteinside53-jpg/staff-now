-- Email throttle log for off-site notifications.
-- One row per (user, category). Records the last time we sent an EMAIL of that
-- category to the user, so notify.ts can enforce a per-category cooldown and
-- avoid flooding inboxes (and burning the sending domain's reputation).
--
-- Push notifications are NOT throttled here — they are cheap and instant. Only
-- the email channel consults this table. `category` is an opaque string chosen
-- by the caller, e.g. "interest", "match", or "msg:<conversationId>".

CREATE TABLE IF NOT EXISTS notification_email_log (
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  last_sent_at TEXT NOT NULL,
  PRIMARY KEY (user_id, category)
);
