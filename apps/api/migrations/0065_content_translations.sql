-- Μεταφράσεις κειμένων που γράφουν οι χρήστες (αγγελίες, μικροδουλειές).
--
-- Η ιστοσελίδα μεταφράζεται από λεξικά, αλλά ο τίτλος και η περιγραφή μιας
-- αγγελίας είναι γραμμένα από την επιχείρηση στα ελληνικά. Όταν ο επισκέπτης
-- διαλέγει αγγλικά, ο server τα μεταφράζει ΜΙΑ φορά (Workers AI) και τα κρατά
-- εδώ. Το source_hash λέει από ποιο ακριβώς ελληνικό κείμενο βγήκε η μετάφραση:
-- αν η επιχείρηση αλλάξει την αγγελία, η παλιά μετάφραση αγνοείται και
-- ξαναφτιάχνεται.
--
-- ΜΟΝΟ CREATE IF NOT EXISTS — το ανέβασμα ξανατρέχει όλες τις migrations.
CREATE TABLE IF NOT EXISTS content_translations (
  entity_type TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  locale      TEXT NOT NULL,
  field       TEXT NOT NULL,
  text        TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (entity_type, entity_id, locale, field)
);
CREATE INDEX IF NOT EXISTS idx_content_translations_entity
  ON content_translations (entity_type, entity_id);
