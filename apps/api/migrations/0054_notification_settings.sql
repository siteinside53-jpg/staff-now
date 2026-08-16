-- Ρυθμίσεις ειδοποιήσεων ανά χρήστη.
--
-- Μέχρι σήμερα η σελίδα «Ρυθμίσεις» είχε τους διακόπτες, αλλά το κουμπί
-- αποθήκευσης καλούσε λειτουργία που δεν υπήρχε: ο χρήστης έβλεπε πάντα
-- «Αποτυχία αποθήκευσης» και τίποτα δεν κρατιόταν. Σημασία έχει ιδιαίτερα το
-- email_marketing: ο χρήστης πρέπει να μπορεί να πει «όχι διαφημιστικά».
--
-- Δεν βάζουμε γραμμή για κάθε χρήστη — όποιος δεν έχει αποθηκεύσει ποτέ,
-- παίρνει τις προεπιλογές από τον κώδικα.
CREATE TABLE IF NOT EXISTS notification_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_matches INTEGER NOT NULL DEFAULT 1,
  email_messages INTEGER NOT NULL DEFAULT 1,
  email_marketing INTEGER NOT NULL DEFAULT 0,
  push_matches INTEGER NOT NULL DEFAULT 1,
  push_messages INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
