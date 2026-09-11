export const metadata = {
  title: 'Πολιτική Cookies',
  description: 'Πληροφορίες σχετικά με τη χρήση cookies στο StaffNow.',
};

export default function CookiesPage() {
  return (
    <div className="py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900">Πολιτική Cookies</h1>
        <p className="mt-4 text-sm text-gray-500">
          Τελευταία ενημέρωση: Μάρτιος 2026
        </p>

        <div className="prose prose-gray mt-10 max-w-none">
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              1. Τι Είναι τα Cookies
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              Τα cookies είναι μικρά αρχεία κειμένου που αποθηκεύονται στη
              συσκευή σας κατά την επίσκεψή σας στην ιστοσελίδα μας. Μας
              βοηθούν να κάνουμε την πλατφόρμα να λειτουργεί σωστά, να είναι
              πιο ασφαλής και να σας προσφέρουμε καλύτερη εμπειρία.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              2. Τύποι Cookies που Χρησιμοποιούμε
            </h2>

            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900">
                2.1 Απαραίτητα Cookies
              </h3>
              <p className="mt-2 leading-relaxed text-gray-700">
                Είναι απολύτως απαραίτητα για τη λειτουργία της πλατφόρμας.
                Χωρίς αυτά, η ιστοσελίδα δεν μπορεί να λειτουργήσει σωστά.
                Περιλαμβάνουν cookies αυθεντικοποίησης, ασφαλείας και
                προτιμήσεων συνεδρίας.
              </p>

              <div className="mt-4 overflow-x-auto rounded-lg border">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Cookie</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Σκοπός</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Διάρκεια</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="px-4 py-3 text-gray-700">staffnow_token</td>
                      <td className="px-4 py-3 text-gray-600">Σύνδεση στον λογαριασμό σας (απαραίτητο)</td>
                      <td className="px-4 py-3 text-gray-600">72 ώρες</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-gray-700">staffnow_cookie_consent</td>
                      <td className="px-4 py-3 text-gray-600">Οι επιλογές σας σε αυτό το παράθυρο (απαραίτητο)</td>
                      <td className="px-4 py-3 text-gray-600">Μέχρι να τις αλλάξετε</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-gray-700">staffnow_locale</td>
                      <td className="px-4 py-3 text-gray-600">Γλώσσα (Ελληνικά / English) (απαραίτητο)</td>
                      <td className="px-4 py-3 text-gray-600">Μέχρι να την αλλάξετε</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-gray-700">staffnow_visitor_id, staffnow_utm</td>
                      <td className="px-4 py-3 text-gray-600">Στατιστικά επισκεψιμότητας — ΜΟΝΟ αν συμφωνήσετε στα «Στατιστικά»</td>
                      <td className="px-4 py-3 text-gray-600">Μέχρι να αρνηθείτε / τέλος επίσκεψης</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-gray-700">staffnow_push_optin, staffnow_interests_seen, staffnow_ratings_seen</td>
                      <td className="px-4 py-3 text-gray-600">Τι έχετε ήδη δει/απαντήσει, για να μη σας ξαναρωτάμε (απαραίτητο)</td>
                      <td className="px-4 py-3 text-gray-600">Μέχρι να καθαρίσετε τον browser</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900">
                2.2 Cookies Λειτουργικότητας
              </h3>
              <p className="mt-2 leading-relaxed text-gray-700">
                Μας βοηθούν να θυμόμαστε τις προτιμήσεις σας (γλώσσα,
                τοποθεσία, ρυθμίσεις εμφάνισης) για μια πιο εξατομικευμένη
                εμπειρία. Δεν συλλέγουν πληροφορίες που μπορούν να σας
                ταυτοποιήσουν.
              </p>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900">
                2.3 Cookies Ανάλυσης
              </h3>
              <p className="mt-2 leading-relaxed text-gray-700">
                Μας επιτρέπουν να κατανοήσουμε πώς χρησιμοποιείτε την πλατφόρμα
                (σελίδες που επισκέπτεστε, χρόνος παραμονής). Τα δεδομένα
                είναι ανώνυμα και μας βοηθούν να βελτιώνουμε συνεχώς την
                Υπηρεσία.
              </p>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900">
                2.4 Cookies Marketing
              </h3>
              <p className="mt-2 leading-relaxed text-gray-700">
                Χρησιμοποιούνται για να σας εμφανίσουμε σχετικές διαφημίσεις
                εντός και εκτός της πλατφόρμας. Τοποθετούνται μόνο με τη ρητή
                συγκατάθεσή σας.
              </p>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              3. Διαχείριση Cookies
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              Μπορείτε να διαχειριστείτε τις προτιμήσεις σας για cookies
              οποιαδήποτε στιγμή. Κατά την πρώτη επίσκεψή σας, θα σας
              εμφανιστεί banner με τις επιλογές σας. Μπορείτε επίσης να
              αλλάξετε τις ρυθμίσεις cookies μέσω του browser σας.
              Σημειώστε ότι η απενεργοποίηση ορισμένων cookies μπορεί να
              επηρεάσει τη λειτουργικότητα της πλατφόρμας.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              4. Cookies Τρίτων
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              Δεν χρησιμοποιούμε Google Analytics ούτε διαφημιστικά cookies.
              Μόνο κατά την πληρωμή, η σελίδα πληρωμής της Stripe θέτει δικά
              της cookies ασφαλείας, που υπόκεινται στην πολιτική απορρήτου της
              Stripe. Αν συνδεθείτε μέσω Google, ισχύει η πολιτική της Google
              για τη διαδικασία σύνδεσης.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              5. Ενημερώσεις Πολιτικής
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              Η παρούσα πολιτική μπορεί να ενημερωθεί κατά καιρούς. Σε
              περίπτωση ουσιαστικών αλλαγών, θα σας ειδοποιήσουμε μέσω
              banner στην πλατφόρμα. Η ημερομηνία τελευταίας ενημέρωσης
              αναγράφεται στην αρχή αυτής της σελίδας.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              6. Επικοινωνία
            </h2>
            <p className="mt-4 leading-relaxed text-gray-700">
              Για ερωτήσεις σχετικά με τη χρήση cookies, επικοινωνήστε μαζί
              μας στο privacy@staffnow.gr.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
