-- Δικές μας βιντεοκλήσεις μέσα στις συνομιλίες.
--
-- Μέχρι τώρα η «κλήση» ήταν ένα μήνυμα με σύνδεσμο προς ξένη, δημόσια υπηρεσία
-- (Jitsi). Δύο προβλήματα: η ξένη υπηρεσία έδειχνε τα δικά της μηνύματα και
-- λογότυπα μέσα στη σελίδα μας, και ο παραλήπτης έπαιρνε είδηση μόνο αν είχε
-- ήδη ανοιχτή ΑΚΡΙΒΩΣ εκείνη τη συνομιλία.
--
-- Τώρα η εικόνα και ο ήχος πηγαίνουν απευθείας από συσκευή σε συσκευή (WebRTC).
-- Ο server δεν βλέπει ποτέ εικόνα ή ήχο — κρατάει μόνο τα «χειραψίας» κείμενα
-- που χρειάζονται οι δύο browsers για να βρουν ο ένας τον άλλον.
--
-- ΣΗΜΕΙΩΣΗ: το db:migrate ξανατρέχει ΟΛΑ τα αρχεία κάθε φορά, οπότε εδώ μέσα
-- υπάρχουν μόνο εντολές με IF NOT EXISTS. Κανένα ALTER.

CREATE TABLE IF NOT EXISTS calls (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  caller_id       TEXT NOT NULL,
  callee_id       TEXT NOT NULL,

  -- ringing → ο παραλήπτης δεν έχει απαντήσει ακόμη
  -- accepted → μιλάνε
  -- ended    → τέλος (ο λόγος στο end_reason)
  status          TEXT NOT NULL DEFAULT 'ringing',
  -- declined | hangup | missed | failed | busy
  end_reason      TEXT,

  -- Οι δύο «προτάσεις σύνδεσης». Κείμενο, όχι περιεχόμενο κλήσης.
  offer_sdp       TEXT,
  answer_sdp      TEXT,

  created_at      TEXT NOT NULL,
  answered_at     TEXT,
  ended_at        TEXT,
  updated_at      TEXT NOT NULL
);

-- Το ερώτημα που τρέχει συχνότερα απ' όλα: «έχω κλήση που χτυπάει τώρα;».
CREATE INDEX IF NOT EXISTS idx_calls_callee_ringing
  ON calls(callee_id, status, created_at);

-- «Ποια είναι η τελευταία κλήση αυτής της συνομιλίας;»
CREATE INDEX IF NOT EXISTS idx_calls_conversation
  ON calls(conversation_id, created_at);

-- Οι πιθανοί δρόμοι σύνδεσης που ανακαλύπτει κάθε πλευρά. Έρχονται σταδιακά,
-- γι' αυτό είναι ξεχωριστός πίνακας: η κάθε πλευρά διαβάζει «ό,τι νεότερο από
-- το τελευταίο που είδα», με το αύξοντα αριθμό ως σελιδοδείκτη.
CREATE TABLE IF NOT EXISTS call_candidates (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  call_id    TEXT NOT NULL,
  sender_id  TEXT NOT NULL,
  candidate  TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_call_candidates_call
  ON call_candidates(call_id, id);
