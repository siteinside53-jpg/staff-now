-- Έκτακτη βάρδια (urgent one-off shift).
-- Οι βάρδιες ζουν στο ίδιο job_listings με τις κανονικές αγγελίες, ξεχωρισμένες
-- από το listing_kind. Έτσι swipes / matches / conversations / favorites /
-- job_boosts / checkJobListingLimit δουλεύουν χωρίς αλλαγή.
--
-- Προσοχή: όπως και το 0041, η SQLite δεν έχει ADD COLUMN IF NOT EXISTS, οπότε
-- σε re-run αυτό το αρχείο αποτυγχάνει με "duplicate column name". Τα indexes
-- είναι σε ξεχωριστό 0043 γιατί το `wrangler d1 execute --file` σταματάει το
-- υπόλοιπο αρχείο στο πρώτο σφάλμα.

ALTER TABLE job_listings ADD COLUMN listing_kind TEXT NOT NULL DEFAULT 'job'
  CHECK(listing_kind IN ('job','shift'));

-- Ημερομηνία/ώρα βάρδιας σε τοπική ώρα Ελλάδας (αυτό που πληκτρολογεί ο χρήστης).
ALTER TABLE job_listings ADD COLUMN shift_date TEXT;        -- 'YYYY-MM-DD'
ALTER TABLE job_listings ADD COLUMN shift_days INTEGER DEFAULT 1;
ALTER TABLE job_listings ADD COLUMN shift_start_time TEXT;  -- 'HH:MM'
ALTER TABLE job_listings ADD COLUMN shift_end_time TEXT;    -- 'HH:MM', μπορεί να περνά μεσάνυχτα
ALTER TABLE job_listings ADD COLUMN shift_positions INTEGER DEFAULT 1;

-- Παράγωγο: η ώρα έναρξης σε UTC, μορφή D1 ('YYYY-MM-DD HH:MM:SS') ώστε να
-- συγκρίνεται σωστά με datetime('now'). Υπολογίζεται σε JS (Europe/Athens, DST).
ALTER TABLE job_listings ADD COLUMN shift_start_utc TEXT;
