-- =====================================================================
-- 0018_activity_geo.sql
-- Adds geo-IP columns (country / city / region / timezone) sourced from
-- the Cloudflare request.cf object so the admin overview can show where
-- users connect from.
-- =====================================================================

ALTER TABLE user_activity_log ADD COLUMN country TEXT;
ALTER TABLE user_activity_log ADD COLUMN city TEXT;
ALTER TABLE user_activity_log ADD COLUMN region TEXT;
ALTER TABLE user_activity_log ADD COLUMN timezone TEXT;

ALTER TABLE user_sessions ADD COLUMN country TEXT;
ALTER TABLE user_sessions ADD COLUMN city TEXT;
ALTER TABLE user_sessions ADD COLUMN region TEXT;
ALTER TABLE user_sessions ADD COLUMN timezone TEXT;

CREATE INDEX IF NOT EXISTS idx_activity_country ON user_activity_log(country);
CREATE INDEX IF NOT EXISTS idx_activity_city ON user_activity_log(city);
CREATE INDEX IF NOT EXISTS idx_sessions_country ON user_sessions(country);
