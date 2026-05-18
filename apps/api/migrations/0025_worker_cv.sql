-- =====================================================================
-- 0025_worker_cv.sql
-- Stores the worker's CV (AI-generated ή χειροκίνητο) πάνω στο
-- worker_profiles. Έτσι:
--   * o εργαζόμενος μπορεί να επεξεργαστεί / αποθηκεύσει χωρίς να
--     ξαναπληρώσει 5 credits
--   * οι businesses μπορούν να το διαβάσουν όταν υπάρχει match
--   * βγαίνει σε PDF/print-friendly HTML
-- =====================================================================

ALTER TABLE worker_profiles ADD COLUMN cv_text TEXT;
ALTER TABLE worker_profiles ADD COLUMN cv_updated_at TEXT;
ALTER TABLE worker_profiles ADD COLUMN cv_source TEXT; -- 'ai' | 'manual'
