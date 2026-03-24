import Link from 'next/link';

export const metadata = { title: 'Κέντρο Βοήθειας | StaffNow', description: 'Βρες απαντήσεις σε συχνές ερωτήσεις και λύσεις σε προβλήματα.' };

const categories = [
  {
    icon: '🚀', title: 'Ξεκινώντας',
    articles: [
      { q: 'Πώς δημιουργώ λογαριασμό;', a: 'Πήγαινε στη σελίδα Εγγραφής (staffnow.gr/auth/register). Μπορείς να εγγραφείς με το email σου ή απευθείας με τον Google λογαριασμό σου. Επίλεξε αν είσαι Εργαζόμενος ή Επιχείρηση, συμπλήρωσε τα στοιχεία σου και πάτα "Δημιουργία Λογαριασμού". Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες, ένα κεφαλαίο, ένα πεζό και έναν αριθμό.' },
      { q: 'Πώς επιλέγω αν είμαι εργαζόμενος ή επιχείρηση;', a: 'Κατά την εγγραφή, θα δεις δύο επιλογές: "Εργαζόμενος" και "Επιχείρηση". Αν ψάχνεις δουλειά στον τουρισμό/εστίαση, επίλεξε Εργαζόμενος. Αν είσαι ξενοδοχείο, εστιατόριο, μπαρ ή άλλη επιχείρηση που ψάχνει προσωπικό, επίλεξε Επιχείρηση. Η επιλογή καθορίζει τι βλέπεις στην πλατφόρμα.' },
      { q: 'Πώς συμπληρώνω το προφίλ μου;', a: 'Μετά τη σύνδεση, πήγαινε στο Dashboard → Προφίλ. Εκεί μπορείς να συμπληρώσεις: ονοματεπώνυμο, περιγραφή/bio, πόλη, περιοχή και διαθεσιμότητα (αν είσαι εργαζόμενος) ή επωνυμία, περιγραφή και τύπο επιχείρησης (αν είσαι επιχείρηση). Πάτα "Αποθήκευση Αλλαγών" για να σώσεις.' },
      { q: 'Μπορώ να αλλάξω τον τύπο λογαριασμού μου;', a: 'Αυτή τη στιγμή δεν μπορείς να αλλάξεις τον τύπο (εργαζόμενος/επιχείρηση) μετά την εγγραφή. Αν χρειάζεται, μπορείς να δημιουργήσεις νέο λογαριασμό με διαφορετικό email ή να επικοινωνήσεις μαζί μας στο support@staffnow.gr.' },
    ],
  },
  {
    icon: '💼', title: 'Για Επιχειρήσεις',
    articles: [
      { q: 'Πώς δημοσιεύω αγγελία;', a: 'Σύνδεσε ως Επιχείρηση → Dashboard → Αγγελίες → πάτα "+ Νέα Αγγελία". Συμπλήρωσε τίτλο (π.χ. "Σερβιτόρος/α Full Time"), περιγραφή, πόλη, περιοχή, τύπο εργασίας (εποχιακή/πλήρης/μερική) και εύρος μισθού. Πάτα "Δημοσίευση Αγγελίας" και η αγγελία σου θα είναι αμέσως ορατή στους εργαζόμενους.' },
      { q: 'Πώς βρίσκω υποψηφίους;', a: 'Πήγαινε στο Dashboard → Ανακάλυψη. Θα δεις κάρτες εργαζομένων με τα στοιχεία τους (όνομα, ρόλοι, εμπειρία, τοποθεσία, μισθολογικές προσδοκίες). Πάτα "♥ Ενδιαφέρομαι" για να δείξεις ενδιαφέρον ή "✕ Πέρασε" για να προχωρήσεις στον επόμενο.' },
      { q: 'Πώς λειτουργεί το matching;', a: 'Το matching είναι αμοιβαίο. Εσύ ως επιχείρηση κάνεις like σε εργαζόμενους, και οι εργαζόμενοι κάνουν like σε αγγελίες σου. Αν μια επιχείρηση κάνει like σε έναν εργαζόμενο ΚΑΙ ο ίδιος εργαζόμενος κάνει like σε αγγελία αυτής της επιχείρησης, δημιουργείται Match! Μετά το match, μπορείτε να επικοινωνήσετε μέσω chat.' },
      { q: 'Πώς επικοινωνώ μετά το match;', a: 'Μόλις γίνει match, δημιουργείται αυτόματα μια συνομιλία. Πήγαινε στο Dashboard → Μηνύματα για να δεις τις συνομιλίες σου. Μπορείς να στείλεις μηνύματα, να ανταλλάξετε στοιχεία επικοινωνίας και να κανονίσετε συνέντευξη ή πρόσληψη.' },
    ],
  },
  {
    icon: '👤', title: 'Για Εργαζόμενους',
    articles: [
      { q: 'Πώς βρίσκω θέσεις εργασίας;', a: 'Σύνδεσε ως Εργαζόμενος → Dashboard → Ανακάλυψη. Θα δεις κάρτες με θέσεις εργασίας από επιχειρήσεις σε όλη την Ελλάδα. Κάθε κάρτα δείχνει: τίτλο θέσης, περιγραφή, τοποθεσία, μισθό, τύπο εργασίας και αν παρέχεται στέγαση/σίτιση.' },
      { q: 'Πώς κάνω like σε μια αγγελία;', a: 'Στην Ανακάλυψη, όταν βλέπεις μια αγγελία που σε ενδιαφέρει, πάτα το πράσινο κουμπί "♥ Ενδιαφέρομαι". Αν θέλεις να παραλείψεις, πάτα "✕ Πέρασε". Μόλις πατήσεις like, θα δεις ένα μήνυμα επιβεβαίωσης. Αν η επιχείρηση σε έχει ήδη κάνει like, θα γίνει Match!' },
      { q: 'Τι γίνεται μετά το match;', a: 'Μετά το match: 1) Λαμβάνεις ειδοποίηση "Νέο ταίριασμα!" 2) Δημιουργείται αυτόματα συνομιλία 3) Πηγαίνεις στα Μηνύματα για να ξεκινήσεις chat 4) Μπορείς να ανταλλάξεις τηλέφωνο/email και να κανονίσεις συνέντευξη.' },
      { q: 'Πώς αυξάνω την ορατότητά μου;', a: 'Για να εμφανίζεσαι ψηλότερα στις αναζητήσεις: 1) Συμπλήρωσε πλήρως το προφίλ σου (όνομα, bio, πόλη, περιοχή, διαθεσιμότητα) 2) Ενεργοποίησε τη "Verified" επαλήθευση 3) Αναβάθμισε σε Premium για αυξημένη ορατότητα και boosted ranking. Οι Premium χρήστες εμφανίζονται πρώτοι.' },
    ],
  },
  {
    icon: '💳', title: 'Συνδρομές & Πληρωμές',
    articles: [
      { q: 'Ποια πλάνα υπάρχουν;', a: 'Υπάρχουν 3 πλάνα: 1) Business Basic (29€/μήνα ή 290€/χρόνο) — 50 swipes/μήνα, 10 matches, βασικά φίλτρα 2) Business Pro (79€/μήνα ή 790€/χρόνο) — απεριόριστα swipes, 100 matches, advanced φίλτρα, verified badge, priority support 3) Worker Premium (9€/μήνα ή 90€/χρόνο) — boosted visibility, verified badge, advanced φίλτρα. Η βασική χρήση είναι δωρεάν για εργαζόμενους.' },
      { q: 'Πώς αναβαθμίζω τη συνδρομή μου;', a: 'Πήγαινε στο Dashboard → Συνδρομή. Θα δεις τα διαθέσιμα πλάνα με τις τιμές τους. Πάτα "Αναβάθμιση" στο πλάνο που θέλεις. Θα μεταφερθείς στη σελίδα πληρωμής (Stripe) για να ολοκληρώσεις την αγορά με πιστωτική/χρεωστική κάρτα.' },
      { q: 'Πώς ακυρώνω τη συνδρομή μου;', a: 'Πήγαινε στο Dashboard → Συνδρομή → πάτα "Ακύρωση Συνδρομής". Η συνδρομή θα παραμείνει ενεργή μέχρι το τέλος της τρέχουσας περιόδου πληρωμής. Δεν θα χρεωθείς ξανά. Μπορείς να επανενεργοποιήσεις ανά πάσα στιγμή.' },
      { q: 'Τι μέθοδοι πληρωμής γίνονται δεκτές;', a: 'Δεχόμαστε Visa, Mastercard, American Express και Apple Pay μέσω του Stripe. Οι πληρωμές είναι ασφαλείς με κρυπτογράφηση SSL. Δεν αποθηκεύουμε τα στοιχεία της κάρτας σου — αυτό το κάνει το Stripe.' },
    ],
  },
  {
    icon: '🔒', title: 'Ασφάλεια & Απόρρητο',
    articles: [
      { q: 'Πώς προστατεύονται τα δεδομένα μου;', a: 'Χρησιμοποιούμε κρυπτογράφηση HTTPS, ασφαλή αποθήκευση κωδικών (PBKDF2 hashing), JWT tokens για authentication, και τα δεδομένα αποθηκεύονται σε Cloudflare D1 με κρυπτογράφηση. Τα προσωπικά στοιχεία (τηλέφωνο, email) δεν εμφανίζονται σε τρίτους πριν το match.' },
      { q: 'Πώς αλλάζω τον κωδικό μου;', a: 'Αν είσαι συνδεδεμένος: Πήγαινε στο Dashboard → Ρυθμίσεις → Αλλαγή κωδικού. Αν ξέχασες τον κωδικό: Πήγαινε στη Σύνδεση → "Ξέχασες τον κωδικό;" → Βάλε το email σου και θα λάβεις link επαναφοράς.' },
      { q: 'Πώς διαγράφω τον λογαριασμό μου;', a: 'Για διαγραφή λογαριασμού, στείλε email στο support@staffnow.gr με θέμα "Διαγραφή λογαριασμού" και το email του λογαριασμού σου. Θα επεξεργαστούμε το αίτημα εντός 48 ωρών. Η διαγραφή είναι μόνιμη — όλα τα δεδομένα, matches και συνομιλίες θα αφαιρεθούν.' },
      { q: 'Ποια δεδομένα μου βλέπουν οι άλλοι;', a: 'Πριν το match: Οι επιχειρήσεις βλέπουν μόνο το όνομα, ρόλους, περιοχή, εμπειρία, bio και badges σου. ΔΕΝ βλέπουν email, τηλέφωνο ή ακριβή διεύθυνση. Μετά το match: Μπορείτε να ανταλλάξετε στοιχεία μέσω chat. Οι επιχειρήσεις φαίνονται με επωνυμία, τύπο, περιγραφή και αγγελίες.' },
    ],
  },
  {
    icon: '📱', title: 'Mobile App',
    articles: [
      { q: 'Από πού κατεβάζω την εφαρμογή;', a: 'Η εφαρμογή StaffNow είναι διαθέσιμη στο App Store (iOS) και στο Google Play (Android). Αναζήτησε "StaffNow" ή κατέβασέ την από τα links στην αρχική σελίδα μας (staffnow.gr). Η εφαρμογή είναι δωρεάν.' },
      { q: 'Η εφαρμογή είναι δωρεάν;', a: 'Ναι! Η εφαρμογή είναι εντελώς δωρεάν. Η βασική χρήση (εγγραφή, προφίλ, browsing, matching) είναι δωρεάν. Τα premium πλάνα (Business Basic/Pro, Worker Premium) είναι προαιρετικά in-app purchases για extra δυνατότητες.' },
      { q: 'Πώς συνδέομαι στο κινητό;', a: 'Άνοιξε την εφαρμογή → πάτα "Σύνδεση" → Βάλε το email και κωδικό σου ή πάτα "Σύνδεση με Google". Αν δεν έχεις λογαριασμό, πάτα "Εγγραφή" και δημιούργησε έναν. Ο λογαριασμός σου είναι ο ίδιος σε web και mobile.' },
      { q: 'Λαμβάνω ειδοποιήσεις στο κινητό;', a: 'Ναι! Η εφαρμογή στέλνει push notifications για: νέα matches, νέα μηνύματα, ενημερώσεις συνδρομής και σημαντικές ειδοποιήσεις. Μπορείς να τις διαχειριστείς από τις Ρυθμίσεις της εφαρμογής ή από τις ρυθμίσεις ειδοποιήσεων του κινητού σου.' },
    ],
  },
];

export default function HelpPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gray-950 text-white py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-400">Υποστήριξη</p>
          <h1 className="mt-4 text-4xl font-extrabold sm:text-5xl">Κέντρο Βοήθειας</h1>
          <p className="mt-6 text-lg text-gray-400">Βρες γρήγορα απαντήσεις στις ερωτήσεις σου.</p>
        </div>
      </section>

      {/* Categories with expandable articles */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-12">
            {categories.map((cat) => (
              <div key={cat.title} id={cat.title.toLowerCase().replace(/\s+/g, '-')}>
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-3xl">{cat.icon}</span>
                  <h2 className="text-2xl font-bold text-gray-900">{cat.title}</h2>
                </div>
                <div className="space-y-3">
                  {cat.articles.map((article) => (
                    <details key={article.q} className="group rounded-xl bg-gray-50 border border-gray-100 overflow-hidden">
                      <summary className="flex items-center justify-between cursor-pointer px-6 py-4 text-gray-900 font-medium hover:bg-gray-100 transition-colors">
                        <span className="pr-4">{article.q}</span>
                        <svg className="h-5 w-5 text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </summary>
                      <div className="px-6 pb-5 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
                        {article.a}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick nav */}
      <section className="py-12 bg-gray-50">
        <div className="mx-auto max-w-4xl px-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {categories.map((cat) => (
              <a key={cat.title} href={`#${cat.title.toLowerCase().replace(/\s+/g, '-')}`} className="flex flex-col items-center gap-2 rounded-xl bg-white p-4 border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all text-center">
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-xs font-semibold text-gray-700">{cat.title}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Δεν βρήκες αυτό που ψάχνεις;</h2>
          <p className="mt-4 text-gray-600">Η ομάδα υποστήριξής μας είναι εδώ για να βοηθήσει.</p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/contact" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-4 font-semibold text-white hover:bg-blue-700 transition-all">
              📧 Στείλε μήνυμα
            </Link>
            <a href="mailto:support@staffnow.gr" className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-8 py-4 font-semibold text-gray-700 hover:bg-gray-50 transition-all">
              ✉️ support@staffnow.gr
            </a>
          </div>
          <p className="mt-4 text-sm text-gray-400">Απαντάμε εντός 24 ωρών, Δευτέρα - Παρασκευή.</p>
        </div>
      </section>
    </>
  );
}
