// Seed script for local development
// Run with: npx wrangler d1 execute staffnow-db --local --file=./src/db/seed.sql

const SEED_SQL = `
-- Admin user (password: Admin123!)
INSERT OR IGNORE INTO users (id, email, password_hash, role, status, email_verified) VALUES
('usr_admin_001', 'admin@staffnow.gr', '$argon2id$v=19$m=65536,t=3,p=4$placeholder_admin_hash', 'admin', 'active', 1);

-- Sample business users
INSERT OR IGNORE INTO users (id, email, password_hash, role, status, email_verified) VALUES
('usr_biz_001', 'info@sunrisehotel.gr', '$argon2id$v=19$m=65536,t=3,p=4$placeholder_hash', 'business', 'active', 1),
('usr_biz_002', 'contact@poseidonbeach.gr', '$argon2id$v=19$m=65536,t=3,p=4$placeholder_hash', 'business', 'active', 1),
('usr_biz_003', 'hr@mykonosresort.gr', '$argon2id$v=19$m=65536,t=3,p=4$placeholder_hash', 'business', 'active', 1);

-- Sample worker users
INSERT OR IGNORE INTO users (id, email, password_hash, role, status, email_verified) VALUES
('usr_wrk_001', 'maria.k@gmail.com', '$argon2id$v=19$m=65536,t=3,p=4$placeholder_hash', 'worker', 'active', 1),
('usr_wrk_002', 'giorgos.p@gmail.com', '$argon2id$v=19$m=65536,t=3,p=4$placeholder_hash', 'worker', 'active', 1),
('usr_wrk_003', 'elena.s@gmail.com', '$argon2id$v=19$m=65536,t=3,p=4$placeholder_hash', 'worker', 'active', 1),
('usr_wrk_004', 'nikos.d@gmail.com', '$argon2id$v=19$m=65536,t=3,p=4$placeholder_hash', 'worker', 'active', 1),
('usr_wrk_005', 'anna.m@gmail.com', '$argon2id$v=19$m=65536,t=3,p=4$placeholder_hash', 'worker', 'active', 1);

-- Business profiles
INSERT OR IGNORE INTO business_profiles (id, user_id, company_name, business_type, region, phone, description, staff_housing, meals_provided, transportation_assistance, salary_range_min, salary_range_max, verified) VALUES
('bp_001', 'usr_biz_001', 'Sunrise Hotel & Spa', 'hotel', 'Κρήτη', '+302810123456', 'Πολυτελές ξενοδοχείο 5 αστέρων στο Ηράκλειο Κρήτης με 200 δωμάτια. Αναζητούμε αξιόπιστο προσωπικό για τη σεζόν.', 1, 1, 1, 900, 2500, 1),
('bp_002', 'usr_biz_002', 'Poseidon Beach Bar', 'beach_bar', 'Κυκλάδες', '+302286071234', 'Δημοφιλές beach bar στη Μύκονο. Ψάχνουμε ενεργητικό προσωπικό για τη θερινή σεζόν.', 1, 1, 0, 800, 2000, 1),
('bp_003', 'usr_biz_003', 'Aegean Luxury Resort', 'resort', 'Δωδεκάνησα', '+302241098765', 'All-inclusive resort στη Ρόδο. Προσφέρουμε εξαιρετικές συνθήκες εργασίας.', 1, 1, 1, 1000, 3000, 0);

-- Worker profiles
INSERT OR IGNORE INTO worker_profiles (id, user_id, full_name, city, region, willing_to_relocate, years_of_experience, expected_hourly_rate, expected_monthly_salary, availability, bio, verified, profile_completeness) VALUES
('wp_001', 'usr_wrk_001', 'Μαρία Καραγιάννη', 'Ηράκλειο', 'Κρήτη', 1, 5, 10, 1400, 'immediate', 'Έμπειρη σερβιτόρα με 5 χρόνια εμπειρία σε ξενοδοχεία και εστιατόρια. Μιλάω Ελληνικά, Αγγλικά και Γερμανικά.', 1, 90),
('wp_002', 'usr_wrk_002', 'Γιώργος Παπαδόπουλος', 'Θεσσαλονίκη', 'Θεσσαλονίκη', 1, 8, 12, 1800, 'within_7_days', 'Σεφ με ειδίκευση στη μεσογειακή κουζίνα. Εμπειρία σε ξενοδοχεία 5 αστέρων.', 1, 95),
('wp_003', 'usr_wrk_003', 'Ελένη Σταματίου', 'Αθήνα', 'Αττική', 0, 3, 9, 1200, 'seasonal', 'Ρεσεψιονίστ με γνώσεις 4 γλωσσών. Αναζητώ θέση σε ξενοδοχείο ή resort.', 0, 80),
('wp_004', 'usr_wrk_004', 'Νίκος Δημητρίου', 'Ρόδος', 'Δωδεκάνησα', 0, 6, 11, 1500, 'immediate', 'Bartender και barista. Δημιουργικός με κοκτέιλ, φιλικός με τους πελάτες.', 1, 85),
('wp_005', 'usr_wrk_005', 'Άννα Μιχαηλίδου', 'Κέρκυρα', 'Ιόνια Νησιά', 1, 2, 8, 1100, 'full_time', 'Καμαριέρα με εμπειρία σε βίλες και boutique ξενοδοχεία. Αξιόπιστη και προσεκτική.', 0, 75);

-- Worker roles
INSERT OR IGNORE INTO worker_profile_roles (id, worker_profile_id, role) VALUES
('wpr_001', 'wp_001', 'waiter'),
('wpr_002', 'wp_001', 'host'),
('wpr_003', 'wp_002', 'chef'),
('wpr_004', 'wp_003', 'receptionist'),
('wpr_005', 'wp_004', 'bartender'),
('wpr_006', 'wp_004', 'barista'),
('wpr_007', 'wp_005', 'maid'),
('wpr_008', 'wp_005', 'cleaner');

-- Worker languages
INSERT OR IGNORE INTO worker_profile_languages (id, worker_profile_id, language) VALUES
('wpl_001', 'wp_001', 'Ελληνικά'),
('wpl_002', 'wp_001', 'English'),
('wpl_003', 'wp_001', 'Deutsch'),
('wpl_004', 'wp_002', 'Ελληνικά'),
('wpl_005', 'wp_002', 'English'),
('wpl_006', 'wp_002', 'Français'),
('wpl_007', 'wp_003', 'Ελληνικά'),
('wpl_008', 'wp_003', 'English'),
('wpl_009', 'wp_003', 'Deutsch'),
('wpl_010', 'wp_003', 'Italiano'),
('wpl_011', 'wp_004', 'Ελληνικά'),
('wpl_012', 'wp_004', 'English'),
('wpl_013', 'wp_005', 'Ελληνικά'),
('wpl_014', 'wp_005', 'English');

-- Job listings
INSERT OR IGNORE INTO job_listings (id, business_id, title, description, region, city, employment_type, salary_min, salary_max, salary_type, housing_provided, meals_provided, start_date, status) VALUES
('job_001', 'bp_001', 'Σερβιτόρος/α Εστιατορίου', 'Ζητείται έμπειρος/η σερβιτόρος/α για το εστιατόριο του ξενοδοχείου μας. Απαιτείται γνώση Αγγλικών.', 'Κρήτη', 'Ηράκλειο', 'seasonal', 1200, 1600, 'monthly', 1, 1, '2026-04-01', 'published'),
('job_002', 'bp_001', 'Σεφ Κουζίνας', 'Αναζητούμε σεφ με εμπειρία στη μεσογειακή κουζίνα για τη θερινή σεζόν.', 'Κρήτη', 'Ηράκλειο', 'seasonal', 1800, 2500, 'monthly', 1, 1, '2026-04-01', 'published'),
('job_003', 'bp_002', 'Bartender', 'Ψάχνουμε bartender με εμπειρία σε κοκτέιλ για δημοφιλές beach bar.', 'Κυκλάδες', 'Μύκονος', 'seasonal', 10, 14, 'hourly', 1, 1, '2026-05-01', 'published'),
('job_004', 'bp_002', 'Barista', 'Θέση barista σε beach bar. Απαιτείται εμπειρία και θετική ενέργεια.', 'Κυκλάδες', 'Μύκονος', 'seasonal', 9, 12, 'hourly', 1, 1, '2026-05-01', 'published'),
('job_005', 'bp_003', 'Ρεσεψιονίστ', 'Ζητείται ρεσεψιονίστ με γνώσεις ξένων γλωσσών για all-inclusive resort.', 'Δωδεκάνησα', 'Ρόδος', 'full_time', 1400, 1800, 'monthly', 1, 1, '2026-03-15', 'published'),
('job_006', 'bp_003', 'Καμαριέρα', 'Θέσεις καμαριέρας σε luxury resort. Προσφέρουμε στέγαση και γεύματα.', 'Δωδεκάνησα', 'Ρόδος', 'seasonal', 1000, 1300, 'monthly', 1, 1, '2026-04-15', 'published');

-- Job listing roles
INSERT OR IGNORE INTO job_listing_roles (id, job_listing_id, role) VALUES
('jlr_001', 'job_001', 'waiter'),
('jlr_002', 'job_002', 'chef'),
('jlr_003', 'job_003', 'bartender'),
('jlr_004', 'job_004', 'barista'),
('jlr_005', 'job_005', 'receptionist'),
('jlr_006', 'job_006', 'maid');

-- Subscriptions
INSERT OR IGNORE INTO subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end) VALUES
('sub_001', 'usr_biz_001', 'business_pro', 'active', '2026-03-01', '2026-04-01'),
('sub_002', 'usr_biz_002', 'business_basic', 'active', '2026-03-01', '2026-04-01'),
('sub_003', 'usr_wrk_002', 'worker_premium', 'active', '2026-03-01', '2026-04-01');

-- Some swipes (for demo)
INSERT OR IGNORE INTO swipes (id, swiper_id, target_id, target_type, direction) VALUES
('sw_001', 'usr_biz_001', 'usr_wrk_001', 'worker', 'like'),
('sw_002', 'usr_wrk_001', 'job_001', 'job', 'like'),
('sw_003', 'usr_biz_002', 'usr_wrk_004', 'worker', 'like'),
('sw_004', 'usr_wrk_004', 'job_003', 'job', 'like');

-- Matches (where both sides liked)
INSERT OR IGNORE INTO matches (id, worker_id, business_id, job_id, status) VALUES
('match_001', 'usr_wrk_001', 'usr_biz_001', 'job_001', 'active'),
('match_002', 'usr_wrk_004', 'usr_biz_002', 'job_003', 'active');

-- Conversations
INSERT OR IGNORE INTO conversations (id, match_id, worker_id, business_id, last_message_at) VALUES
('conv_001', 'match_001', 'usr_wrk_001', 'usr_biz_001', '2026-03-15T10:30:00Z'),
('conv_002', 'match_002', 'usr_wrk_004', 'usr_biz_002', '2026-03-16T14:00:00Z');

-- Messages
INSERT OR IGNORE INTO messages (id, conversation_id, sender_id, content) VALUES
('msg_001', 'conv_001', 'usr_biz_001', 'Γεια σας Μαρία! Μας ενδιαφέρει το προφίλ σας. Πότε θα μπορούσατε να ξεκινήσετε;'),
('msg_002', 'conv_001', 'usr_wrk_001', 'Γεια σας! Ευχαριστώ πολύ. Μπορώ να ξεκινήσω άμεσα, ακόμα και αυτή την εβδομάδα.'),
('msg_003', 'conv_002', 'usr_biz_002', 'Νίκο γεια! Είδαμε ότι είσαι bartender. Θα ήθελες να μας γνωρίσεις;'),
('msg_004', 'conv_002', 'usr_wrk_004', 'Φυσικά! Θα χαρώ πολύ. Πότε μπορώ να περάσω;');

-- Notifications
INSERT OR IGNORE INTO notifications (id, user_id, type, title, body) VALUES
('notif_001', 'usr_wrk_001', 'new_match', 'Νέο ταίριασμα!', 'Ταιριάξατε με Sunrise Hotel & Spa για τη θέση Σερβιτόρος/α.'),
('notif_002', 'usr_wrk_004', 'new_match', 'Νέο ταίριασμα!', 'Ταιριάξατε με Poseidon Beach Bar για τη θέση Bartender.'),
('notif_003', 'usr_biz_001', 'new_match', 'Νέο ταίριασμα!', 'Η Μαρία Καραγιάννη ενδιαφέρεται για τη θέση σας.');
`;

export default SEED_SQL;
