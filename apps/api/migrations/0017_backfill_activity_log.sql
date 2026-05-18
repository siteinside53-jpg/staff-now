-- =====================================================================
-- 0017_backfill_activity_log.sql
-- One-shot backfill of historical user actions into user_activity_log so
-- the admin per-user timeline isn't empty for users that existed before
-- 0016 was applied.
--
-- Idempotent-ish: each row uses a deterministic ID derived from the source
-- row, so re-running the script just collides on PRIMARY KEY (no dupes).
-- =====================================================================

-- ---- swipes -> swipe_like / swipe_skip ----
INSERT OR IGNORE INTO user_activity_log
  (id, user_id, activity_type, entity_type, entity_id, metadata, created_at)
SELECT
  'bf_sw_' || id,
  swiper_id,
  CASE WHEN direction = 'like' THEN 'swipe_like' ELSE 'swipe_skip' END,
  target_type,
  target_id,
  NULL,
  created_at
FROM swipes;

-- ---- matches -> match (one row per side) ----
INSERT OR IGNORE INTO user_activity_log
  (id, user_id, activity_type, entity_type, entity_id, metadata, created_at)
SELECT
  'bf_mw_' || id,
  worker_id,
  'match',
  'match',
  id,
  CASE WHEN job_id IS NOT NULL THEN json_object('jobId', job_id) ELSE NULL END,
  matched_at
FROM matches;

INSERT OR IGNORE INTO user_activity_log
  (id, user_id, activity_type, entity_type, entity_id, metadata, created_at)
SELECT
  'bf_mb_' || id,
  business_id,
  'match',
  'match',
  id,
  CASE WHEN job_id IS NOT NULL THEN json_object('jobId', job_id) ELSE NULL END,
  matched_at
FROM matches;

-- ---- messages -> message_send ----
INSERT OR IGNORE INTO user_activity_log
  (id, user_id, activity_type, entity_type, entity_id, metadata, created_at)
SELECT
  'bf_ms_' || id,
  sender_id,
  'message_send',
  'conversation',
  conversation_id,
  NULL,
  created_at
FROM messages;

-- ---- jobs -> job_post (creator inferred via business_profile) ----
INSERT OR IGNORE INTO user_activity_log
  (id, user_id, activity_type, entity_type, entity_id, metadata, created_at)
SELECT
  'bf_jp_' || j.id,
  bp.user_id,
  'job_post',
  'job',
  j.id,
  json_object('title', j.title),
  j.created_at
FROM job_listings j
JOIN business_profiles bp ON bp.id = j.business_id;

-- ---- users -> register (only those without a register row already) ----
INSERT OR IGNORE INTO user_activity_log
  (id, user_id, activity_type, entity_type, entity_id, metadata, created_at)
SELECT
  'bf_rg_' || id,
  id,
  'register',
  NULL,
  NULL,
  json_object('role', role, 'email', email),
  created_at
FROM users
WHERE role IN ('worker', 'business');

-- ---- last_seen_at: bump from the most recent activity per user ----
UPDATE users
SET last_seen_at = COALESCE(
  last_seen_at,
  (SELECT MAX(created_at) FROM user_activity_log WHERE user_id = users.id)
);
