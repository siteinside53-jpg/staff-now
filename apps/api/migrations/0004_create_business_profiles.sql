-- Business profiles
CREATE TABLE IF NOT EXISTS business_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  business_type TEXT NOT NULL CHECK(business_type IN ('hotel', 'restaurant', 'beach_bar', 'cafe', 'villa', 'tourism_company', 'bar', 'resort', 'cruise', 'other')),
  region TEXT,
  address TEXT,
  phone TEXT,
  website TEXT,
  description TEXT,
  logo_url TEXT,
  staff_housing INTEGER NOT NULL DEFAULT 0,
  meals_provided INTEGER NOT NULL DEFAULT 0,
  transportation_assistance INTEGER NOT NULL DEFAULT 0,
  salary_range_min REAL,
  salary_range_max REAL,
  verified INTEGER NOT NULL DEFAULT 0,
  is_visible INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_business_profiles_user_id ON business_profiles(user_id);
CREATE INDEX idx_business_profiles_region ON business_profiles(region);
CREATE INDEX idx_business_profiles_business_type ON business_profiles(business_type);
CREATE INDEX idx_business_profiles_verified ON business_profiles(verified);
