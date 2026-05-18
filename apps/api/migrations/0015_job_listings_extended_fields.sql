-- Extended job listings fields: location, salary details, benefits, schedule, requirements, languages
CREATE TABLE IF NOT EXISTS job_listings_new (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  region TEXT,
  city TEXT,
  address TEXT,
  postal_code TEXT,
  requires_relocation INTEGER NOT NULL DEFAULT 0,
  employment_type TEXT NOT NULL CHECK(employment_type IN ('full_time', 'part_time', 'seasonal')),
  salary_min REAL,
  salary_max REAL,
  salary_type TEXT NOT NULL DEFAULT 'monthly' CHECK(salary_type IN ('hourly', 'monthly', 'daily', 'negotiable')),
  salary_gross INTEGER NOT NULL DEFAULT 1,
  housing_provided INTEGER NOT NULL DEFAULT 0,
  meals_provided INTEGER NOT NULL DEFAULT 0,
  transport_provided INTEGER NOT NULL DEFAULT 0,
  bonus_provided INTEGER NOT NULL DEFAULT 0,
  insurance_provided INTEGER NOT NULL DEFAULT 0,
  no_benefits INTEGER NOT NULL DEFAULT 0,
  hours_per_day REAL,
  days_per_week INTEGER,
  has_day_off INTEGER NOT NULL DEFAULT 0,
  day_off_description TEXT,
  shift_type TEXT CHECK(shift_type IN ('morning', 'evening', 'split', 'flexible')),
  experience_required TEXT CHECK(experience_required IN ('none', '1_2_years', '3_plus_years')),
  requires_drivers_license INTEGER NOT NULL DEFAULT 0,
  requires_physical_fitness INTEGER NOT NULL DEFAULT 0,
  requires_communication_skills INTEGER NOT NULL DEFAULT 0,
  languages TEXT,
  start_date TEXT,
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'paused', 'archived', 'filled')),
  branch_id TEXT REFERENCES business_branches(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO job_listings_new (id, business_id, title, description, region, city,
  employment_type, salary_min, salary_max, salary_type,
  housing_provided, meals_provided, start_date, end_date, status, branch_id, created_at, updated_at)
SELECT id, business_id, title, description, region, city,
  CASE WHEN employment_type = 'freelancer' THEN 'seasonal' ELSE employment_type END,
  salary_min, salary_max, salary_type,
  housing_provided, meals_provided, start_date, end_date, status, branch_id, created_at, updated_at
FROM job_listings;

DROP TABLE job_listings;
ALTER TABLE job_listings_new RENAME TO job_listings;

CREATE INDEX idx_job_listings_business_id ON job_listings(business_id);
CREATE INDEX idx_job_listings_status ON job_listings(status);
CREATE INDEX idx_job_listings_region ON job_listings(region);
CREATE INDEX idx_job_listings_employment_type ON job_listings(employment_type);
