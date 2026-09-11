-- Μηνύματα από τη φόρμα επικοινωνίας και εγγραφές στο newsletter.
--
-- Γιατί υπάρχει: ο server έγραφε σε αυτόν τον πίνακα από την αρχή, αλλά ο
-- πίνακας δεν είχε φτιαχτεί ποτέ. Κάθε μήνυμα χανόταν σιωπηλά ενώ ο
-- επισκέπτης έβλεπε «Στάλθηκε επιτυχώς».
--
-- Γράφεται με IF NOT EXISTS ώστε να αντέχει δεύτερο τρέξιμο (βλ. deploy-api.yml).
CREATE TABLE IF NOT EXISTS contact_messages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  -- 'contact' από τη φόρμα επικοινωνίας, 'newsletter' από την εγγραφή στο newsletter
  kind TEXT NOT NULL DEFAULT 'contact',
  -- Πότε το είδε/απάντησε η ομάδα. NULL = εκκρεμεί.
  handled_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_handled ON contact_messages(handled_at);
