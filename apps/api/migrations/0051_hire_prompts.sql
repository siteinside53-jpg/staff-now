-- «Έγινε πρόσληψη;» — η προτροπή που βρίσκει τον χρήστη μόνη της.
--
-- Μέχρι τώρα η δήλωση πρόσληψης ήταν θαμμένη στο μενού των τριών τελειών της
-- συνομιλίας (2η από 7 επιλογές, δίπλα σε Αρχειοθέτηση/Διαγραφή/Αποκλεισμό).
-- Κανείς δεν την έβρισκε. Τώρα ρωτάμε εμείς, 2 μέρες μετά το τελευταίο μήνυμα.
--
-- ΠΡΟΣΟΧΗ: όπως στα 0041/0047, η SQLite δεν έχει ADD COLUMN IF NOT EXISTS. Σε
-- re-run το ALTER αποτυγχάνει με "duplicate column name" — γι' αυτό μπαίνει
-- τελευταίο, ώστε όλα τα υπόλοιπα να έχουν ήδη περάσει.

-- Μία γραμμή ανά συνομιλία. Κρατάμε ΞΕΧΩΡΙΣΤΑ τις δύο πλευρές: η επιχείρηση
-- μπορεί να πατήσει «Όχι ακόμη» ενώ ο εργαζόμενος όχι, και το αντίστροφο.
CREATE TABLE IF NOT EXISTS hire_prompts (
  conversation_id TEXT PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,

  -- «Όχι ακόμη» από την επιχείρηση: μέχρι πότε σιωπούμε και πόσες φορές το
  -- πάτησε. Στη 2η φορά σταματάμε οριστικά (δεν ρωτάμε τρίτη).
  business_snoozed_until TEXT,
  business_snooze_count  INTEGER NOT NULL DEFAULT 0,

  -- Το ίδιο για τον εργαζόμενο.
  worker_snoozed_until   TEXT,
  worker_snooze_count    INTEGER NOT NULL DEFAULT 0,

  -- Πότε στάλθηκε το (ένα) email υπενθύμισης σε κάθε πλευρά. Σημειώνεται ΠΡΙΝ
  -- την αποστολή: αν το cron σκάσει στη μέση, το χειρότερο σενάριο είναι «δεν
  -- στάλθηκε ένα email» αντί για «στάλθηκε πέντε φορές».
  business_emailed_at TEXT,
  worker_emailed_at   TEXT,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Το cron διαβάζει «ποιες συνομιλίες δεν έχουν ακόμη email στην επιχείρηση».
CREATE INDEX IF NOT EXISTS idx_hire_prompts_biz_email
  ON hire_prompts(business_emailed_at);

-- Δύο ταυτόχρονες δηλώσεις στην ΙΔΙΑ συνομιλία — τώρα που τη δηλώνουν και οι
-- δύο πλευρές, το «ποιος πάτησε πρώτος» πρέπει να το κρίνει η βάση, όχι ο
-- κώδικας.
--
-- Το υπάρχον UNIQUE(worker_id, business_id, job_id) στο 0047 ΔΕΝ αρκεί: η
-- SQLite θεωρεί κάθε NULL διαφορετικό, οπότε όταν η συνομιλία δεν έχει αγγελία
-- (job_id IS NULL) ο κανόνας δεν πιάνει καθόλου — και τέτοιες είναι οι
-- περισσότερες συνομιλίες μας. Το μερικό ευρετήριο καλύπτει ακριβώς αυτό το κενό
-- και μόνο για τις ΖΩΝΤΑΝΕΣ προσλήψεις: μια ακυρωμένη ή απορριφθείσα πρόσληψη
-- δεν πρέπει να μπλοκάρει νέα δήλωση στην ίδια συνομιλία.
CREATE UNIQUE INDEX IF NOT EXISTS ux_hires_live_conversation
  ON hires(conversation_id)
  WHERE conversation_id IS NOT NULL AND status IN ('pending','confirmed');

-- Ποιος δήλωσε την πρόσληψη. Μέχρι σήμερα ήταν πάντα η επιχείρηση, οπότε οι
-- υπάρχουσες γραμμές γεμίζουν με το business_id. Ο κώδικας κάνει fallback σε
-- `declared_by || business_id`, ώστε η μετανάστευση και το ανέβασμα του server
-- να μη χρειάζεται να γίνουν την ίδια στιγμή.
ALTER TABLE hires ADD COLUMN declared_by TEXT;
UPDATE hires SET declared_by = business_id WHERE declared_by IS NULL;
