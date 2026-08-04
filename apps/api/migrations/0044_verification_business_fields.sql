-- Επαλήθευση επιχείρησης: ο πίνακας verification_requests (0010) φτιάχτηκε για
-- ταυτότητα εργαζομένου και δεν κρατάει ΑΦΜ / ΓΕΜΗ / σχόλια. Τα προσθέτουμε
-- ώστε η επιχείρηση να μπορεί να υποβάλει πραγματικό αίτημα.
--
-- Σημείωση: η SQLite δεν έχει ADD COLUMN IF NOT EXISTS. Σε επανεκτέλεση του
-- db:migrate αυτά τα ALTER αποτυγχάνουν — αυτό είναι αναμενόμενο και ακίνδυνο.
ALTER TABLE verification_requests ADD COLUMN vat_number TEXT;
ALTER TABLE verification_requests ADD COLUMN registry_number TEXT;
ALTER TABLE verification_requests ADD COLUMN notes TEXT;
