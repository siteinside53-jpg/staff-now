-- Swipes
CREATE TABLE IF NOT EXISTS swipes (
  id TEXT PRIMARY KEY,
  swiper_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK(target_type IN ('worker', 'job')),
  direction TEXT NOT NULL CHECK(direction IN ('like', 'skip')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(swiper_id, target_id, target_type)
);

CREATE INDEX idx_swipes_swiper ON swipes(swiper_id);
CREATE INDEX idx_swipes_target ON swipes(target_id, target_type);
CREATE INDEX idx_swipes_direction ON swipes(direction);

-- Matches (bidirectional interest confirmed)
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id TEXT REFERENCES job_listings(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived', 'expired')),
  matched_at TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT,
  UNIQUE(worker_id, business_id, job_id)
);

CREATE INDEX idx_matches_worker ON matches(worker_id);
CREATE INDEX idx_matches_business ON matches(business_id);
CREATE INDEX idx_matches_status ON matches(status);

-- Favorites
CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK(target_type IN ('worker', 'job')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, target_id, target_type)
);

CREATE INDEX idx_favorites_user ON favorites(user_id);

-- Blocks
CREATE TABLE IF NOT EXISTS blocks (
  id TEXT PRIMARY KEY,
  blocker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX idx_blocks_blocked ON blocks(blocked_id);
