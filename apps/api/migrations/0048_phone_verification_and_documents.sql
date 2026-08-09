-- Επαλήθευση κινητού με πραγματικό SMS + έγγραφο ταυτοποίησης με δύο όψεις.
--
-- 1) Κινητό: μέχρι τώρα το τηλέφωνο αποθηκευόταν σαν σκέτο κείμενο στο
--    `worker_profiles.phone` (workers.ts) χωρίς κανέναν έλεγχο ότι ανήκει όντως
--    στον χρήστη. Ακολουθούμε ΑΚΡΙΒΩΣ το μοτίβο του email (0045): ο 6ψήφιος
--    κωδικός και η λήξη του ζουν στον `users`, και το `phone_confirmed_at`
--    γράφεται μόνο όταν ο χρήστης βάλει σωστά τον κωδικό που έλαβε με SMS.
--    Το `worker_profiles.phone` ΔΕΝ καταργείται — συνεχίζει να γράφεται, ώστε
--    ο πίνακας ελέγχου και ό,τι άλλο το διαβάζει σήμερα να δουλεύει αμετάβλητο.
--
-- 2) Έγγραφο: ο χρήστης διαλέγει πλέον ταυτότητα / διαβατήριο / δίπλωμα και
--    ανεβάζει μπροστινή και πίσω όψη. Το υπάρχον `document_type` ΔΕΝ πειράζεται
--    — κρατάει 'id'/'business' και ξεχωρίζει τον εργαζόμενο από την επιχείρηση.
--    Ο τύπος εγγράφου πάει σε νέα στήλη `document_kind`.
--
-- Σημείωση: η SQLite δεν έχει ADD COLUMN IF NOT EXISTS. Σε επανεκτέλεση αυτά τα
-- ALTER αποτυγχάνουν — αναμενόμενο και ακίνδυνο, όπως στα 0044/0045.
ALTER TABLE users ADD COLUMN phone TEXT;
ALTER TABLE users ADD COLUMN phone_verification_token TEXT;
ALTER TABLE users ADD COLUMN phone_verify_expires_at TEXT;
ALTER TABLE users ADD COLUMN phone_confirmed_at TEXT;

-- Πόσα SMS έχουν σταλεί συνολικά σε αυτόν τον λογαριασμό. Το SMS είναι το μόνο
-- σημείο του StaffNow που κοστίζει χρήματα ανά πάτημα κουμπιού, οπότε εκτός από
-- το χρονικό φρένο (3/15 λεπτά) υπάρχει και σκληρό όριο συνολικών αποστολών.
ALTER TABLE users ADD COLUMN phone_sms_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE verification_requests ADD COLUMN document_kind TEXT;
ALTER TABLE verification_requests ADD COLUMN document_back_url TEXT;
