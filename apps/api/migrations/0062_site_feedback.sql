-- «Πείτε μας την εμπειρία σας» — αξιολόγηση της ίδιας της πλατφόρμας.
--
-- Ξεχωριστό από τις αξιολογήσεις προσλήψεων (hire_ratings): εδώ ο χρήστης
-- βαθμολογεί το StaffNow, όχι τον συνεργάτη του. Το βλέπει μόνο η ομάδα στο
-- διαχειριστικό. Γράφεται με IF NOT EXISTS ώστε να αντέχει δεύτερο τρέξιμο.
CREATE TABLE IF NOT EXISTS site_feedback (
  id TEXT PRIMARY KEY,
  -- NULL όταν το στέλνει ανώνυμος επισκέπτης
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  user_role TEXT,
  -- 1-5 αστέρια· προαιρετικό, κάποιοι θέλουν μόνο να γράψουν
  rating INTEGER CHECK(rating IS NULL OR rating BETWEEN 1 AND 5),
  message TEXT NOT NULL,
  -- σε ποια σελίδα ήταν όταν το έγραψε
  page TEXT,
  user_agent TEXT,
  -- πότε το είδε/απάντησε η ομάδα. NULL = εκκρεμεί.
  handled_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_site_feedback_created ON site_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_feedback_handled ON site_feedback(handled_at);
