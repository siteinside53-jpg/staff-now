-- Expand the CHECK constraint on reports.status to include 'resolved' and
-- 'action_taken' (used by the admin moderation flow).
-- The old constraint only allowed ('pending','reviewed','dismissed') which
-- caused every "Επίλυση" / "Προειδοποίηση" / "Αναστολή + Επίλυση" action
-- from the admin reports page to crash with a CHECK constraint error.
--
-- SQLite can't ALTER a CHECK constraint in place, so we recreate the table.

PRAGMA foreign_keys = OFF;

CREATE TABLE reports_new (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK(reason IN ('inappropriate_content', 'fake_profile', 'harassment', 'spam', 'other')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'resolved', 'dismissed', 'action_taken', 'reviewed')),
  reviewed_by TEXT REFERENCES users(id),
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Carry over existing rows. Any legacy 'reviewed' rows stay as 'reviewed'
-- (still allowed in the new constraint for backwards-compat).
INSERT INTO reports_new (id, reporter_id, target_user_id, reason, description, status, reviewed_by, reviewed_at, created_at)
SELECT id, reporter_id, target_user_id, reason, description, status, reviewed_by, reviewed_at, created_at
FROM reports;

DROP TABLE reports;
ALTER TABLE reports_new RENAME TO reports;

PRAGMA foreign_keys = ON;
