-- Drop the legacy CHECK(role IN (...)) constraints from job_listing_roles
-- and worker_profile_roles. The original constraint only allowed 17
-- hospitality-only role IDs and was breaking new business/worker signups
-- whenever they picked any role outside that list (e.g. customer_service,
-- sales_assistant, marketing_specialist).
--
-- Validation now lives in `packages/validation/src/worker.ts` (Zod), which
-- already enforces the full WORKER_JOB_ROLES list. Keeping a CHECK in the
-- DB is redundant and turns every product-side role addition into a
-- breaking schema change — so we drop it entirely.
--
-- SQLite cannot ALTER an existing CHECK constraint, so we rebuild each
-- table without it and copy the data over.

-- ---------------------------------------------------------------------------
-- job_listing_roles
-- ---------------------------------------------------------------------------
CREATE TABLE job_listing_roles_new (
  id TEXT PRIMARY KEY,
  job_listing_id TEXT NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  UNIQUE(job_listing_id, role)
);

INSERT INTO job_listing_roles_new (id, job_listing_id, role)
SELECT id, job_listing_id, role FROM job_listing_roles;

DROP TABLE job_listing_roles;
ALTER TABLE job_listing_roles_new RENAME TO job_listing_roles;

CREATE INDEX idx_job_listing_roles_job  ON job_listing_roles(job_listing_id);
CREATE INDEX idx_job_listing_roles_role ON job_listing_roles(role);

-- ---------------------------------------------------------------------------
-- worker_profile_roles
-- ---------------------------------------------------------------------------
CREATE TABLE worker_profile_roles_new (
  id TEXT PRIMARY KEY,
  worker_profile_id TEXT NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  UNIQUE(worker_profile_id, role)
);

INSERT INTO worker_profile_roles_new (id, worker_profile_id, role)
SELECT id, worker_profile_id, role FROM worker_profile_roles;

DROP TABLE worker_profile_roles;
ALTER TABLE worker_profile_roles_new RENAME TO worker_profile_roles;

CREATE INDEX idx_worker_profile_roles_profile ON worker_profile_roles(worker_profile_id);
CREATE INDEX idx_worker_profile_roles_role    ON worker_profile_roles(role);
