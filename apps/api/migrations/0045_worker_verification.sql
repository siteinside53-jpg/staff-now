-- Επαλήθευση εργαζομένου.
--
-- 1) Email: το `users.email_verified` μπαίνει 1 κατά την εγγραφή (auth.ts:44),
--    δηλαδή ΔΕΝ αποδεικνύει ότι κάποιος επιβεβαίωσε το email του. Δεν το
--    πειράζουμε (το διαβάζει το admin panel) — προσθέτουμε ξεχωριστό
--    `email_confirmed_at` που γράφεται ΜΟΝΟ όταν ο χρήστης βάλει τον κωδικό
--    που του στείλαμε. Έτσι το σήμα «Επαληθευμένο email» λέει την αλήθεια.
--    Ο 6ψήφιος κωδικός αποθηκεύεται στο υπάρχον `email_verification_token`.
--
-- 2) Τηλέφωνο: το worker_profiles δεν είχε καθόλου στήλη τηλεφώνου.
--
-- Σημείωση: η SQLite δεν έχει ADD COLUMN IF NOT EXISTS. Σε επανεκτέλεση του
-- db:migrate αυτά τα ALTER αποτυγχάνουν — αναμενόμενο και ακίνδυνο.
ALTER TABLE users ADD COLUMN email_confirmed_at TEXT;
ALTER TABLE users ADD COLUMN email_verify_expires_at TEXT;
ALTER TABLE worker_profiles ADD COLUMN phone TEXT;
