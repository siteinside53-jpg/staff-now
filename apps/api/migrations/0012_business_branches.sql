-- Business branches / locations
-- A business owner can have multiple businesses (e.g. 5-6 locations)
CREATE TABLE IF NOT EXISTS business_branches (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  business_type TEXT NOT NULL DEFAULT 'other' CHECK(business_type IN ('hotel', 'restaurant', 'beach_bar', 'cafe', 'villa', 'tourism_company', 'bar', 'resort', 'cruise', 'other')),
  description TEXT,
  region TEXT,
  city TEXT,
  address TEXT,
  phone TEXT,
  website TEXT,
  logo_url TEXT,
  staff_housing INTEGER NOT NULL DEFAULT 0,
  meals_provided INTEGER NOT NULL DEFAULT 0,
  transportation_assistance INTEGER NOT NULL DEFAULT 0,
  is_visible INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_business_branches_user ON business_branches(user_id);

-- Job listing positions (multiple roles per job listing)
CREATE TABLE IF NOT EXISTS job_positions (
  id TEXT PRIMARY KEY,
  job_listing_id TEXT NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  description TEXT,
  salary_min REAL,
  salary_max REAL,
  salary_type TEXT NOT NULL DEFAULT 'monthly' CHECK(salary_type IN ('hourly', 'monthly', 'negotiable')),
  positions_count INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_job_positions_listing ON job_positions(job_listing_id);

-- Add branch_id to job_listings
ALTER TABLE job_listings ADD COLUMN branch_id TEXT REFERENCES business_branches(id);
