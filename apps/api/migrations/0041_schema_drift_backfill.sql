-- Backfill migration: these 18 columns exist in production but were never
-- recorded as migrations, so a database built from scratch was missing them.
-- Types, nullability and defaults below are copied from the production schema.
--
-- Production already has all of them, so do NOT re-run this there: SQLite has no
-- `ADD COLUMN IF NOT EXISTS` and it would fail with "duplicate column name".

-- business_branches: legal/contact details and the benefits flags used by the
-- branch editor and the job posting form.
ALTER TABLE business_branches ADD COLUMN legal_form TEXT;
ALTER TABLE business_branches ADD COLUMN tax_id TEXT;
ALTER TABLE business_branches ADD COLUMN postal_code TEXT;
ALTER TABLE business_branches ADD COLUMN area TEXT;
ALTER TABLE business_branches ADD COLUMN google_business_url TEXT;
ALTER TABLE business_branches ADD COLUMN operating_hours TEXT;
ALTER TABLE business_branches ADD COLUMN bonus_provided INTEGER NOT NULL DEFAULT 0;
ALTER TABLE business_branches ADD COLUMN insurance_provided INTEGER NOT NULL DEFAULT 0;
ALTER TABLE business_branches ADD COLUMN no_benefits INTEGER NOT NULL DEFAULT 0;

-- conversations: JSON array of user ids that archived the thread on their side.
ALTER TABLE conversations ADD COLUMN hidden_by TEXT;

-- messages: soft delete, either for one participant or for everyone.
ALTER TABLE messages ADD COLUMN deleted_by TEXT;
ALTER TABLE messages ADD COLUMN deleted_for_all INTEGER NOT NULL DEFAULT 0;

-- job_listings / worker_profiles: serialised vectors for semantic matching.
ALTER TABLE job_listings ADD COLUMN embedding TEXT;
ALTER TABLE worker_profiles ADD COLUMN embedding TEXT;

-- worker_profiles: CV handling and AI-generated summary.
ALTER TABLE worker_profiles ADD COLUMN employment_type TEXT DEFAULT 'seasonal';
ALTER TABLE worker_profiles ADD COLUMN cv_url TEXT;
ALTER TABLE worker_profiles ADD COLUMN skills TEXT;
ALTER TABLE worker_profiles ADD COLUMN ai_summary TEXT;
