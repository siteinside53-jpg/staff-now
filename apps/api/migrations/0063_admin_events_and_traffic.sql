-- Διαχειριστικό: ειδοποιήσεις, ρυθμίσεις ειδοποιήσεων, επισκεψιμότητα, social.
--
-- ΟΛΑ με CREATE ... IF NOT EXISTS και ΧΩΡΙΣ ALTER TABLE: το ανέβασμα ξανατρέχει
-- τα αρχεία της λίστας σε κάθε deploy, και το ALTER θα έσκαγε τη δεύτερη φορά.
-- Γι' αυτό τα στοιχεία επισκέπτη (πηγή, utm) μπαίνουν σε ΝΕΟ πίνακα δίπλα στο
-- anonymous_sessions αντί για νέες στήλες.

-- Ό,τι πρέπει να δει η ομάδα: εγγραφή, διαγραφή λογαριασμού, μήνυμα
-- επικοινωνίας, αξιολόγηση πλατφόρμας, νέος επισκέπτης, αποτυχία πληρωμής,
-- αναφορά, αίτημα επαλήθευσης, σφάλμα server. Γράφεται μία φορά, το βλέπουν
-- όλοι οι διαχειριστές, το «διαβάστηκε» είναι κοινό.
CREATE TABLE IF NOT EXISTS admin_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'low',
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  -- JSON: user id/email, visitor id, σύνδεσμος κ.λπ.
  data TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_admin_events_created ON admin_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_events_unread ON admin_events(read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_events_type ON admin_events(type, created_at DESC);

-- Τι θέλει κάθε διαχειριστής στο κινητό του (push). 1 = ναι.
CREATE TABLE IF NOT EXISTS admin_alert_settings (
  user_id TEXT PRIMARY KEY,
  registrations INTEGER NOT NULL DEFAULT 1,
  deletions INTEGER NOT NULL DEFAULT 1,
  contact INTEGER NOT NULL DEFAULT 1,
  feedback INTEGER NOT NULL DEFAULT 1,
  visitors INTEGER NOT NULL DEFAULT 0,
  visitor_left INTEGER NOT NULL DEFAULT 0,
  payments INTEGER NOT NULL DEFAULT 1,
  reports INTEGER NOT NULL DEFAULT 1,
  errors INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Από πού ήρθε ο ανώνυμος επισκέπτης και τι έγινε με τη συνεδρία του.
-- Μία γραμμή ανά visitor_id (ίδιο κλειδί με το anonymous_sessions).
CREATE TABLE IF NOT EXISTS visitor_meta (
  visitor_id TEXT PRIMARY KEY,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  -- google / facebook / instagram / tiktok / linkedin / direct / other:<host>
  source TEXT NOT NULL DEFAULT 'direct',
  -- η πρώτη σελίδα που άνοιξε
  landing_path TEXT,
  -- mobile / desktop / tablet
  device TEXT,
  first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  -- πότε ειδοποιήθηκαν οι διαχειριστές ότι έφυγε (NULL = όχι ακόμη)
  notified_left_at TEXT,
  -- αν έκανε εγγραφή μέσα από αυτή την επίσκεψη
  registered_user_id TEXT,
  registered_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_visitor_meta_source ON visitor_meta(source);
CREATE INDEX IF NOT EXISTS idx_visitor_meta_first ON visitor_meta(first_seen_at DESC);

-- Ιστορικό αναρτήσεων στα social (το γράφει η ομάδα με το χέρι).
CREATE TABLE IF NOT EXISTS social_posts (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,          -- facebook / instagram / tiktok / linkedin / youtube / other
  kind TEXT NOT NULL DEFAULT 'post', -- post / video / reel / story / image / ad
  title TEXT NOT NULL,
  url TEXT,
  notes TEXT,
  posted_at TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_social_posts_posted ON social_posts(posted_at DESC);
