-- Recreate job_listings with 'paused' in the status CHECK constraint
CREATE TABLE IF NOT EXISTS job_listings_new (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  region TEXT,
  city TEXT,
  employment_type TEXT NOT NULL CHECK(employment_type IN ('full_time', 'part_time', 'seasonal', 'freelancer')),
  salary_min REAL,
  salary_max REAL,
  salary_type TEXT NOT NULL DEFAULT 'monthly' CHECK(salary_type IN ('hourly', 'monthly', 'negotiable')),
  housing_provided INTEGER NOT NULL DEFAULT 0,
  meals_provided INTEGER NOT NULL DEFAULT 0,
  start_date TEXT,
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'paused', 'archived', 'filled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  branch_id TEXT REFERENCES business_branches(id)
);

INSERT INTO job_listings_new (id, business_id, title, description, region, city, employment_type, salary_min, salary_max, salary_type, housing_provided, meals_provided, start_date, end_date, status, created_at, updated_at, branch_id)
SELECT id, business_id, title, description, region, city, employment_type, salary_min, salary_max, salary_type, housing_provided, meals_provided, start_date, end_date, status, created_at, updated_at, branch_id FROM job_listings;

DROP TABLE job_listings;
ALTER TABLE job_listings_new RENAME TO job_listings;

CREATE INDEX idx_job_listings_business_id ON job_listings(business_id);
CREATE INDEX idx_job_listings_status ON job_listings(status);
CREATE INDEX idx_job_listings_region ON job_listings(region);
CREATE INDEX idx_job_listings_employment_type ON job_listings(employment_type);
