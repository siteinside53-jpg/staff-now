-- Worker profiles
CREATE TABLE IF NOT EXISTS worker_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  photo_url TEXT,
  city TEXT,
  region TEXT,
  willing_to_relocate INTEGER NOT NULL DEFAULT 0,
  years_of_experience INTEGER NOT NULL DEFAULT 0,
  expected_hourly_rate REAL,
  expected_monthly_salary REAL,
  availability TEXT CHECK(availability IN ('immediate', 'within_7_days', 'seasonal', 'part_time', 'full_time')),
  bio TEXT,
  verified INTEGER NOT NULL DEFAULT 0,
  profile_completeness INTEGER NOT NULL DEFAULT 0,
  badges TEXT DEFAULT '[]',
  is_visible INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_worker_profiles_user_id ON worker_profiles(user_id);
CREATE INDEX idx_worker_profiles_region ON worker_profiles(region);
CREATE INDEX idx_worker_profiles_availability ON worker_profiles(availability);
CREATE INDEX idx_worker_profiles_verified ON worker_profiles(verified);
CREATE INDEX idx_worker_profiles_is_visible ON worker_profiles(is_visible);

-- Worker job roles (many-to-many)
CREATE TABLE IF NOT EXISTS worker_profile_roles (
  id TEXT PRIMARY KEY,
  worker_profile_id TEXT NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('waiter', 'barista', 'chef', 'maid', 'receptionist', 'bartender', 'cleaner', 'kitchen_assistant', 'lifeguard', 'tour_guide', 'driver', 'host', 'sommelier', 'dj', 'animator', 'other')),
  UNIQUE(worker_profile_id, role)
);

CREATE INDEX idx_worker_profile_roles_profile ON worker_profile_roles(worker_profile_id);
CREATE INDEX idx_worker_profile_roles_role ON worker_profile_roles(role);

-- Worker languages (many-to-many)
CREATE TABLE IF NOT EXISTS worker_profile_languages (
  id TEXT PRIMARY KEY,
  worker_profile_id TEXT NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  UNIQUE(worker_profile_id, language)
);

CREATE INDEX idx_worker_profile_languages_profile ON worker_profile_languages(worker_profile_id);
