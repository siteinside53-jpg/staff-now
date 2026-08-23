-- TaskNow — οι μικροδουλειές γίνονται αληθινές.
--
-- Μέχρι τώρα ΟΛΑ ζούσαν μέσα στον browser του καθενός: ό,τι ανέβαζες το έβλεπες
-- μόνο εσύ, σε εκείνη τη συσκευή, και χανόταν με το καθάρισμα του browser.
-- Κανείς δεν μπορούσε να δει τη δουλειά σου, άρα καμία προσφορά δεν ερχόταν
-- ποτέ. Από εδώ και πέρα ζουν στη βάση, όπως οι αγγελίες εργασίας.
--
-- ΓΡΑΜΜΕΝΟ ΜΟΝΟ ΜΕ «CREATE ... IF NOT EXISTS»: το db:migrate ξανατρέχει ΟΛΑ τα
-- αρχεία κάθε φορά, και το SQLite δεν έχει «ADD COLUMN IF NOT EXISTS».
--
-- ΠΟΙΟΣ ΑΝΕΒΑΖΕΙ: ο ΙΔΙΟΣ πίνακας για εργαζόμενους και επιχειρήσεις. Ήταν ρητή
-- απαίτηση — στις μικροδουλειές δεν υπάρχουν «δύο πλευρές», ο καθένας ανεβάζει
-- όταν του χρειάζονται χέρια και αναλαμβάνει όταν του χρειάζονται χρήματα.

CREATE TABLE IF NOT EXISTS tasknow_tasks (
  id            TEXT PRIMARY KEY,
  owner_id      TEXT NOT NULL,

  title         TEXT NOT NULL,
  description   TEXT,
  category      TEXT NOT NULL,
  area          TEXT NOT NULL,

  -- Ακέραια ευρώ. Το ποσό είναι πρόταση του ιδιοκτήτη· η συμφωνία κλείνει με
  -- την προσφορά που θα δεχτεί.
  budget        INTEGER NOT NULL,
  -- «ανά βόλτα», «για όλη τη δουλειά». Δεν κόβεται ποτέ από την οθόνη: η στήλη
  -- προσκαλεί σύγκριση 10€ με 200€ και τα δύο δεν είναι το ίδιο πράγμα.
  budget_note   TEXT,

  when_text     TEXT NOT NULL,
  urgent        INTEGER NOT NULL DEFAULT 0,
  remote        INTEGER NOT NULL DEFAULT 0,

  -- open | paused | assigned | done | cancelled | disputed
  status        TEXT NOT NULL DEFAULT 'open',
  -- Κρυμμένη από τη δημόσια ροή με απόφαση διαχειριστή.
  hidden        INTEGER NOT NULL DEFAULT 0,
  flag_reason   TEXT,

  chosen_offer_id TEXT,
  -- «Πληρώθηκε»: χρειάζονται ΚΑΙ ΟΙ ΔΥΟ δηλώσεις για να μετρήσει.
  paid_by_owner   INTEGER NOT NULL DEFAULT 0,
  paid_by_worker  INTEGER NOT NULL DEFAULT 0,

  cancel_reason  TEXT,
  dispute_reason TEXT,
  dispute_by     TEXT,

  /*
    ΔΕΙΓΜΑ Ή ΑΛΗΘΙΝΗ ΔΟΥΛΕΙΑ.

    Το ταμπλό ξεκινάει άδειο, και άδειο ταμπλό σημαίνει ότι όποιος μπει δεν
    ξαναμπαίνει. Γι' αυτό μπαίνουν λίγα παραδείγματα — αλλά ΣΗΜΑΔΕΜΕΝΑ. Η
    οθόνη τα δείχνει καθαρά ως παραδείγματα και δεν δέχονται προσφορές: κανείς
    δεν πρέπει να στείλει προσφορά σε δουλειά που δεν υπάρχει, ούτε να
    περιμένει απάντηση που δεν θα έρθει ποτέ.

    Σβήνονται με μία εντολή όταν μπουν οι πρώτες αληθινές.
  */
  is_sample     INTEGER NOT NULL DEFAULT 0,

  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

-- Το ερώτημα που τρέχει συχνότερα: η δημόσια ροή, νεότερα πρώτα.
CREATE INDEX IF NOT EXISTS idx_tasknow_tasks_feed
  ON tasknow_tasks(status, hidden, created_at);
-- «Οι δουλειές μου»
CREATE INDEX IF NOT EXISTS idx_tasknow_tasks_owner
  ON tasknow_tasks(owner_id, created_at);

CREATE TABLE IF NOT EXISTS tasknow_offers (
  id          TEXT PRIMARY KEY,
  task_id     TEXT NOT NULL,
  worker_id   TEXT NOT NULL,
  amount      INTEGER NOT NULL,
  message     TEXT,
  -- pending | accepted | rejected
  status      TEXT NOT NULL DEFAULT 'pending',

  /*
    Η άδεια, όπου χρειάζεται (ηλεκτρολογικά, υδραυλικά, φυσικό αέριο, ψύξη).

    ΚΑΝΟΝΑΣ ΠΟΥ ΔΕΝ ΠΑΡΑΒΙΑΖΕΤΑΙ: ό,τι ανεβάζει ο χρήστης είναι «δηλωμένο».
    Γίνεται «ελεγμένο» ΜΟΝΟ αφού το κοιτάξει άνθρωπος από το διαχειριστικό.
    Ποτέ αδήλωτο ως ελεγμένο.
  */
  licence_label     TEXT,
  licence_file_name TEXT,
  licence_verified  INTEGER NOT NULL DEFAULT 0,

  created_at  TEXT NOT NULL,

  -- Μία προσφορά ανά άτομο ανά δουλειά.
  UNIQUE (task_id, worker_id)
);

CREATE INDEX IF NOT EXISTS idx_tasknow_offers_task
  ON tasknow_offers(task_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tasknow_offers_worker
  ON tasknow_offers(worker_id, created_at);

-- Η συνομιλία ανοίγει μόλις ο ιδιοκτήτης διαλέξει κάποιον.
CREATE TABLE IF NOT EXISTS tasknow_messages (
  id         TEXT PRIMARY KEY,
  task_id    TEXT NOT NULL,
  sender_id  TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasknow_messages_task
  ON tasknow_messages(task_id, created_at);

/*
  Η ΔΗΛΩΣΗ ΝΟΜΙΜΟΤΗΤΑΣ — δεν είναι διακοσμητική.

  Ρητή απαίτηση: το StaffNow δεν πρέπει να στοχευτεί για φοροαποφυγή. Δεν
  είμαστε συμβαλλόμενο μέρος, δεν κρατάμε χρήματα, και η επιλογή του ατόμου
  γίνεται με ευθύνη αυτού που ανεβάζει. Γι' αυτό κρατάμε ΠΟΙΟΣ αποδέχτηκε,
  ΠΟΤΕ και ΑΠΟ ΠΟΥ — μία φορά, πριν την πρώτη του ενέργεια.
*/
CREATE TABLE IF NOT EXISTS tasknow_consents (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL UNIQUE,
  accepted_at TEXT NOT NULL,
  ip          TEXT,
  user_agent  TEXT
);
