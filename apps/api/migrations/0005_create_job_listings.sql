-- Job listings
CREATE TABLE IF NOT EXISTS job_listings (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  region TEXT,
  city TEXT,
  employment_type TEXT NOT NULL CHECK(employment_type IN ('full_time', 'part_time', 'seasonal')),
  salary_min REAL,
  salary_max REAL,
  salary_type TEXT NOT NULL DEFAULT 'monthly' CHECK(salary_type IN ('hourly', 'monthly')),
  housing_provided INTEGER NOT NULL DEFAULT 0,
  meals_provided INTEGER NOT NULL DEFAULT 0,
  start_date TEXT,
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived', 'filled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_job_listings_business_id ON job_listings(business_id);
CREATE INDEX idx_job_listings_status ON job_listings(status);
CREATE INDEX idx_job_listings_region ON job_listings(region);
CREATE INDEX idx_job_listings_employment_type ON job_listings(employment_type);

-- Job listing roles (many-to-many)
CREATE TABLE IF NOT EXISTS job_listing_roles (
  id TEXT PRIMARY KEY,
  job_listing_id TEXT NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('waiter', 'barista', 'chef', 'maid', 'receptionist', 'bartender', 'cleaner', 'kitchen_assistant', 'lifeguard', 'tour_guide', 'driver', 'host', 'sommelier', 'dj', 'animator', 'other')),
  UNIQUE(job_listing_id, role)
);

CREATE INDEX idx_job_listing_roles_job ON job_listing_roles(job_listing_id);
CREATE INDEX idx_job_listing_roles_role ON job_listing_roles(role);
