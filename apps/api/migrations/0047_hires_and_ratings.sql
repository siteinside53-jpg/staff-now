-- Πρόσληψη σε 4 βήματα + αμοιβαίες αξιολογήσεις.
--
-- Σχεδιαστική απόφαση: ΔΕΝ πειράζουμε τους υπάρχοντες πίνακες. Ο `matches` έχει
-- CHECK(status IN ('active','archived','expired')) και ο `notifications` έχει
-- CHECK στο `type` — η SQLite δεν αλλάζει CHECK χωρίς πλήρες ξαναχτίσιμο του
-- πίνακα πάνω σε ζωντανά δεδομένα. Οπότε η πρόσληψη ζει σε δικό της πίνακα και
-- οι ειδοποιήσεις χρησιμοποιούν το υπάρχον type='system' με subtype στο `data`.
--
-- Το `job_listings.status` επιτρέπει ΗΔΗ την τιμή 'filled' (απλώς κανένα endpoint
-- δεν την έβαζε), άρα το κλείσιμο της αγγελίας δεν χρειάζεται αλλαγή σχήματος.
--
-- ΠΡΟΣΟΧΗ: όπως στα 0041/0042, η SQLite δεν έχει ADD COLUMN IF NOT EXISTS. Σε
-- re-run το τελευταίο statement αποτυγχάνει με "duplicate column name" — γι' αυτό
-- είναι τελευταίο, ώστε όλα τα υπόλοιπα να έχουν ήδη περάσει.

CREATE TABLE IF NOT EXISTS hires (
  id TEXT PRIMARY KEY,
  worker_id       TEXT NOT NULL REFERENCES users(id),
  business_id     TEXT NOT NULL REFERENCES users(id),
  job_id          TEXT REFERENCES job_listings(id) ON DELETE SET NULL,
  conversation_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','confirmed','declined','cancelled')),
  -- Βήμα 1: πάτησε «Τον/την προσέλαβα» η επιχείρηση.
  declared_at   TEXT NOT NULL DEFAULT (datetime('now')),
  -- Βήμα 2: επιβεβαίωσε «Ναι, ξεκίνησα» ο εργαζόμενος. Χωρίς αυτό δεν μετράει.
  confirmed_at  TEXT,
  -- Βήμα 4: πότε ανοίγει η αξιολόγηση (confirmed_at + 15 μέρες) και πότε
  -- αποκαλύπτεται ούτως ή άλλως η αξιολόγηση του άλλου (+14 μέρες ακόμη).
  rating_opens_at  TEXT,
  rating_reveal_at TEXT,
  -- Πότε στάλθηκε η (μία) υπενθύμιση αξιολόγησης, ώστε να μη γίνει σπαμ.
  reminded_at   TEXT,
  UNIQUE(worker_id, business_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_hires_business ON hires(business_id, status);
CREATE INDEX IF NOT EXISTS idx_hires_worker   ON hires(worker_id, status);
CREATE INDEX IF NOT EXISTS idx_hires_job      ON hires(job_id, status);
CREATE INDEX IF NOT EXISTS idx_hires_conv     ON hires(conversation_id);
CREATE INDEX IF NOT EXISTS idx_hires_due      ON hires(status, rating_opens_at);

CREATE TABLE IF NOT EXISTS hire_ratings (
  id TEXT PRIMARY KEY,
  hire_id  TEXT NOT NULL REFERENCES hires(id) ON DELETE CASCADE,
  rater_id TEXT NOT NULL REFERENCES users(id),
  ratee_id TEXT NOT NULL REFERENCES users(id),
  rater_role TEXT NOT NULL CHECK(rater_role IN ('worker','business')),
  overall INTEGER NOT NULL CHECK(overall BETWEEN 1 AND 5),
  -- Τρεις υποβαθμολογίες. Η σημασία τους αλλάζει ανάλογα με το ποιος βαθμολογεί:
  --   επιχείρηση  → εργαζόμενο : Επαγγελματισμός | Συνέπεια             | Επικοινωνία
  --   εργαζόμενος → επιχείρηση : Οργάνωση        | Πληρωμή στην ώρα της | Επικοινωνία
  score_a INTEGER CHECK(score_a IS NULL OR score_a BETWEEN 1 AND 5),
  score_b INTEGER CHECK(score_b IS NULL OR score_b BETWEEN 1 AND 5),
  score_c INTEGER CHECK(score_c IS NULL OR score_c BETWEEN 1 AND 5),
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  -- Μία αξιολόγηση ανά πρόσληψη ανά πλευρά. Δεν διορθώνεται εκ των υστέρων.
  UNIQUE(hire_id, rater_id)
);

CREATE INDEX IF NOT EXISTS idx_hire_ratings_ratee ON hire_ratings(ratee_id);
CREATE INDEX IF NOT EXISTS idx_hire_ratings_hire  ON hire_ratings(hire_id);

-- Πόσα άτομα ζητάει η αγγελία. Ο χρήστης το γράφει ήδη στη φόρμα («Άτομα» ανά
-- ειδικότητα) αλλά το web δεν το έστελνε ποτέ στον server. Χρειάζεται για το
-- «1 από 3» του Βήματος 3. Ασφαλές ADD COLUMN με default — οι υπάρχουσες
-- αγγελίες γίνονται 1.
ALTER TABLE job_listings ADD COLUMN positions INTEGER NOT NULL DEFAULT 1;
