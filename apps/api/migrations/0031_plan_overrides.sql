-- Plan overrides: admin-editable settings on top of the static PLANS config.
-- Each row = one plan. We store the FULL feature set so a plan can be wholly
-- redefined without touching code, but the admin UI typically only changes
-- price + limits + boolean feature toggles.
--
-- Why a separate table instead of mutating code: deploys of the static config
-- would otherwise require a full app rebuild + Pages deploy. Storing in D1
-- means the admin can flex pricing intra-day without redeploys.

CREATE TABLE IF NOT EXISTS plan_overrides (
  plan_id TEXT PRIMARY KEY,
  -- pricing
  name_el TEXT,
  price_monthly REAL,
  price_yearly REAL,
  badge TEXT,                 -- 'popular' | 'founding' | NULL
  -- limits (NULL = unlimited)
  max_job_listings INTEGER,
  max_active_matches INTEGER,
  max_swipes_per_month INTEGER,
  monthly_credits INTEGER,
  -- boolean features (0/1)
  advanced_filters INTEGER,
  boosted_visibility INTEGER,
  verified_badge INTEGER,
  favorite_lists INTEGER,
  priority_support INTEGER,
  ai_shortlist INTEGER,
  ai_hiring_chat INTEGER,
  api_access INTEGER,
  -- worker-only feature flags
  premium_tick INTEGER,
  unlimited_boosts INTEGER,
  profile_views_stats INTEGER,
  read_receipts INTEGER,
  monthly_credits_bonus INTEGER,
  -- bookkeeping
  updated_by TEXT REFERENCES users(id),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
