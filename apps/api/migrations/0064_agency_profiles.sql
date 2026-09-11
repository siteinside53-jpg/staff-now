-- Γραφεία εύρεσης εργασίας (recruitment agencies).
--
-- Είναι λογαριασμοί επιχείρησης (role = business) που δουλεύουν για λογαριασμό
-- ΑΛΛΩΝ εταιρειών. Οι πελάτες τους είναι οι «business_branches» του
-- λογαριασμού (μία γραμμή ανά εταιρεία-πελάτη) και οι αγγελίες βγαίνουν με
-- branch_id. Εδώ κρατάμε μόνο ό,τι ξεχωρίζει το γραφείο.
-- Μόνο CREATE IF NOT EXISTS — αντέχει ξανατρέξιμο.
CREATE TABLE IF NOT EXISTS agency_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  agency_name TEXT,
  -- αριθμός άδειας ΙΓΕΕ / ΓΕΜΗ, προαιρετικό
  license_no TEXT,
  website TEXT,
  contact_person TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
