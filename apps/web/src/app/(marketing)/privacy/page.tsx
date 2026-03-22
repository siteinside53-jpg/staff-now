export const metadata = {
  title: 'Πολιτική Απορρήτου - StaffNow',
  description: 'Πολιτική απορρήτου και προστασίας προσωπικών δεδομένων του StaffNow.',
};

export default function PrivacyPage() {
  return (
    <div className="py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900">
          Πολιτική Απορρήτου
        </h1>
        <p className="mt-4 text-sm text-gray-500">
          Τελευταία ενημέρωση: Μάρτιος 2026
        </p>

        <div className="prose prose-gray mt-10 max-w-none">
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              1. Εισαγωγή
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              Η προστασία των προσωπικών σας δεδομένων είναι σημαντική για εμάς.
              Η παρούσα Πολιτική Απορρήτου εξηγεί πώς συλλέγουμε,
              χρησιμοποιούμε, αποθηκεύουμε και προστατεύουμε τα δεδομένα σας
              κατά τη χρήση της πλατφόρμας StaffNow, σύμφωνα με τον Γενικό
              Κανονισμό Προστασίας Δεδομένων (GDPR) και την ελληνική νομοθεσία.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              2. Υπεύθυνος Επεξεργασίας
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              Υπεύθυνος επεξεργασίας των δεδομένων σας είναι η εταιρεία
              StaffNow, με έδρα την Αθήνα, Ελλάδα. Για θέματα προστασίας
              δεδομένων μπορείτε να επικοινωνήσετε μαζί μας στο
              privacy@staffnow.gr.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              3. Δεδομένα που Συλλέγουμε
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              Συλλέγουμε τα ακόλουθα δεδομένα:
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-gray-700">
              <li>
                <strong>Στοιχεία εγγραφής:</strong> Ονοματεπώνυμο, email,
                τηλέφωνο, ρόλος (εργαζόμενος/επιχείρηση).
              </li>
              <li>
                <strong>Στοιχεία προφίλ:</strong> Εμπειρία, δεξιότητες,
                γλώσσες, τοποθεσία, διαθεσιμότητα, φωτογραφία προφίλ.
              </li>
              <li>
                <strong>Δεδομένα χρήσης:</strong> Ενέργειες στην πλατφόρμα
                (swipes, matches, μηνύματα), ώρες πρόσβασης, συσκευή.
              </li>
              <li>
                <strong>Δεδομένα πληρωμών:</strong> Πληροφορίες τιμολόγησης
                (επεξεργάζονται από πιστοποιημένο πάροχο πληρωμών).
              </li>
              <li>
                <strong>Τεχνικά δεδομένα:</strong> Διεύθυνση IP, τύπος
                browser, λειτουργικό σύστημα.
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              4. Σκοπός Επεξεργασίας
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              Χρησιμοποιούμε τα δεδομένα σας για:
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-gray-700">
              <li>Παροχή και βελτίωση της Υπηρεσίας.</li>
              <li>Λειτουργία του συστήματος matching.</li>
              <li>Επικοινωνία μαζί σας (ειδοποιήσεις, ενημερώσεις).</li>
              <li>Διαχείριση πληρωμών και συνδρομών.</li>
              <li>Ανάλυση χρήσης και στατιστικά.</li>
              <li>Πρόληψη κατάχρησης και ασφάλεια.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              5. Νομική Βάση Επεξεργασίας
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              Η επεξεργασία βασίζεται σε: εκτέλεση σύμβασης (παροχή
              Υπηρεσίας), συγκατάθεση (marketing, cookies), έννομο συμφέρον
              (ασφάλεια, βελτίωση), και νομική υποχρέωση (φορολογικά
              παραστατικά).
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              6. Κοινοποίηση Δεδομένων
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              Δεν πωλούμε τα δεδομένα σας. Μπορεί να μοιραστούμε δεδομένα με:
              πιστοποιημένους παρόχους υπηρεσιών (hosting, πληρωμές, email),
              άλλους χρήστες (μόνο τα δεδομένα που εμφανίζονται στο δημόσιο
              προφίλ σας), και δημόσιες αρχές (όπου απαιτείται από τη
              νομοθεσία).
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              7. Διατήρηση Δεδομένων
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              Διατηρούμε τα δεδομένα σας όσο ο λογαριασμός σας είναι ενεργός.
              Μετά τη διαγραφή του λογαριασμού, τα δεδομένα σας διαγράφονται
              εντός 30 ημερών, εκτός αν υπάρχει νομική υποχρέωση διατήρησης.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              8. Τα Δικαιώματά σας
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              Σύμφωνα με τον GDPR, έχετε δικαίωμα:
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-gray-700">
              <li>Πρόσβασης στα δεδομένα σας.</li>
              <li>Διόρθωσης ανακριβών δεδομένων.</li>
              <li>Διαγραφής δεδομένων (&laquo;δικαίωμα λήθης&raquo;).</li>
              <li>Περιορισμού της επεξεργασίας.</li>
              <li>Φορητότητας δεδομένων.</li>
              <li>Εναντίωσης στην επεξεργασία.</li>
              <li>Ανάκλησης συγκατάθεσης.</li>
            </ul>
            <p className="mt-4 leading-relaxed text-gray-700">
              Για άσκηση των δικαιωμάτων σας, επικοινωνήστε στο
              privacy@staffnow.gr.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              9. Ασφάλεια Δεδομένων
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              Εφαρμόζουμε κατάλληλα τεχνικά και οργανωτικά μέτρα ασφαλείας,
              συμπεριλαμβανομένων κρυπτογράφησης TLS/SSL, ελέγχου πρόσβασης,
              τακτικών αντιγράφων ασφαλείας και ελέγχων ασφαλείας.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              10. Επικοινωνία
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              Για ερωτήσεις σχετικά με την πολιτική απορρήτου, επικοινωνήστε
              μαζί μας: email privacy@staffnow.gr. Έχετε επίσης δικαίωμα
              υποβολής καταγγελίας στην Αρχή Προστασίας Δεδομένων Προσωπικού
              Χαρακτήρα (www.dpa.gr).
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
