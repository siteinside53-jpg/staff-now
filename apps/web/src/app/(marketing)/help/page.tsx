'use client';

import { useState } from 'react';
import Link from 'next/link';

const categories = [
  {
    icon: '🚀', title: 'Ξεκινώντας',
    articles: [
      { q: 'Πώς δημιουργώ λογαριασμό;', a: 'Πήγαινε στη σελίδα Εγγραφής (staffnow.gr/auth/register). Μπορείς να εγγραφείς με email ή με τον Google λογαριασμό σου. Επίλεξε Εργαζόμενος ή Επιχείρηση, συμπλήρωσε τα στοιχεία σου και πάτα "Δημιουργία Λογαριασμού". Ο κωδικός χρειάζεται τουλάχιστον 8 χαρακτήρες, κεφαλαίο, πεζό και αριθμό.' },
      { q: 'Πώς επιλέγω αν είμαι εργαζόμενος ή επιχείρηση;', a: 'Κατά την εγγραφή θα δεις δύο επιλογές: "Εργαζόμενος" και "Επιχείρηση". Αν ψάχνεις δουλειά, επίλεξε Εργαζόμενος. Αν ψάχνεις προσωπικό, επίλεξε Επιχείρηση. Η επιλογή καθορίζει τι βλέπεις στην πλατφόρμα.' },
      { q: 'Πώς συμπληρώνω το προφίλ μου;', a: 'Dashboard → Προφίλ. Συμπλήρωσε: ονοματεπώνυμο, bio, πόλη, περιοχή, διαθεσιμότητα (εργαζόμενος) ή επωνυμία, περιγραφή, τύπο (επιχείρηση). Πάτα "Αποθήκευση Αλλαγών".' },
      { q: 'Μπορώ να αλλάξω τύπο λογαριασμού;', a: 'Δεν μπορείς να αλλάξεις τύπο μετά την εγγραφή. Δημιούργησε νέο λογαριασμό με διαφορετικό email ή επικοινώνησε στο support@staffnow.gr.' },
    ],
  },
  {
    icon: '💼', title: 'Για Επιχειρήσεις',
    articles: [
      { q: 'Πώς δημοσιεύω αγγελία;', a: 'Dashboard → Αγγελίες → "+ Νέα Αγγελία". Συμπλήρωσε τίτλο, περιγραφή, πόλη, περιοχή, τύπο εργασίας και μισθό. Πάτα "Δημοσίευση" και η αγγελία γίνεται αμέσως ορατή στους εργαζόμενους.' },
      { q: 'Πώς βρίσκω υποψηφίους;', a: 'Dashboard → Ανακάλυψη. Βλέπεις κάρτες εργαζομένων με στοιχεία (ρόλοι, εμπειρία, τοποθεσία, μισθός). Πάτα "♥ Ενδιαφέρομαι" ή "✕ Πέρασε".' },
      { q: 'Πώς λειτουργεί το matching;', a: 'Αμοιβαίο: εσύ κάνεις like σε εργαζόμενο + ο εργαζόμενος κάνει like σε αγγελία σου = Match! Δημιουργείται αυτόματα συνομιλία.' },
      { q: 'Πώς επικοινωνώ μετά το match;', a: 'Dashboard → Μηνύματα. Βλέπεις τις συνομιλίες, στέλνεις μηνύματα, ανταλλάσσεις στοιχεία και κανονίζεις πρόσληψη.' },
    ],
  },
  {
    icon: '👤', title: 'Για Εργαζόμενους',
    articles: [
      { q: 'Πώς βρίσκω θέσεις εργασίας;', a: 'Dashboard → Ανακάλυψη. Βλέπεις κάρτες αγγελιών (τίτλος, περιγραφή, τοποθεσία, μισθός, τύπος, στέγαση/σίτιση).' },
      { q: 'Πώς κάνω like σε αγγελία;', a: 'Στην Ανακάλυψη, πάτα "♥ Ενδιαφέρομαι" στην αγγελία που θέλεις. Αν η επιχείρηση σε έχει ήδη κάνει like, γίνεται Match!' },
      { q: 'Τι γίνεται μετά το match;', a: 'Λαμβάνεις ειδοποίηση, δημιουργείται chat, πηγαίνεις στα Μηνύματα και ξεκινάς επικοινωνία με την επιχείρηση.' },
      { q: 'Πώς αυξάνω την ορατότητά μου;', a: 'Συμπλήρωσε πλήρως το προφίλ, ενεργοποίησε verified badge, αναβάθμισε σε Premium (9€/μήνα) για boosted ranking.' },
    ],
  },
  {
    icon: '💳', title: 'Συνδρομές & Πληρωμές',
    articles: [
      { q: 'Ποια πλάνα υπάρχουν;', a: 'Business Basic (29€/μήνα) — 50 swipes, 10 matches. Business Pro (79€/μήνα) — απεριόριστα, advanced φίλτρα, priority. Worker Premium (9€/μήνα) — boosted visibility, verified badge. Βασική χρήση δωρεάν.' },
      { q: 'Πώς αναβαθμίζω;', a: 'Dashboard → Συνδρομή → πάτα "Αναβάθμιση" στο πλάνο που θέλεις. Πληρωμή μέσω Stripe (Visa, Mastercard, Apple Pay).' },
      { q: 'Πώς ακυρώνω;', a: 'Dashboard → Συνδρομή → "Ακύρωση". Παραμένει ενεργή μέχρι το τέλος της περιόδου. Δεν χρεώνεσαι ξανά.' },
      { q: 'Τι μέθοδοι πληρωμής;', a: 'Visa, Mastercard, American Express, Apple Pay μέσω Stripe. Ασφαλείς πληρωμές SSL. Δεν αποθηκεύουμε κάρτες.' },
    ],
  },
  {
    icon: '🔒', title: 'Ασφάλεια & Απόρρητο',
    articles: [
      { q: 'Πώς προστατεύονται τα δεδομένα μου;', a: 'HTTPS κρυπτογράφηση, PBKDF2 password hashing, JWT tokens, Cloudflare D1 storage. Προσωπικά στοιχεία δεν εμφανίζονται πριν το match.' },
      { q: 'Πώς αλλάζω κωδικό;', a: 'Συνδεδεμένος: Dashboard → Ρυθμίσεις → Αλλαγή κωδικού. Ξεχασμένος: Σύνδεση → "Ξέχασες τον κωδικό;" → email επαναφοράς.' },
      { q: 'Πώς διαγράφω λογαριασμό;', a: 'Email στο support@staffnow.gr με θέμα "Διαγραφή λογαριασμού". Επεξεργασία σε 48 ώρες. Μόνιμη — όλα τα δεδομένα αφαιρούνται.' },
      { q: 'Τι βλέπουν οι άλλοι;', a: 'Πριν match: όνομα, ρόλους, περιοχή, εμπειρία, bio. ΟΧΙ email/τηλέφωνο. Μετά match: επικοινωνία μέσω chat.' },
    ],
  },
  {
    icon: '📱', title: 'Mobile App',
    articles: [
      { q: 'Από πού κατεβάζω;', a: 'App Store (iOS) και Google Play (Android). Αναζήτησε "StaffNow" ή κατέβασε από τα links στο staffnow.gr. Δωρεάν.' },
      { q: 'Είναι δωρεάν;', a: 'Ναι! Βασική χρήση δωρεάν. Premium πλάνα προαιρετικά in-app purchases.' },
      { q: 'Πώς συνδέομαι στο κινητό;', a: 'Άνοιξε app → Σύνδεση → Email/κωδικός ή Google. Ο λογαριασμός είναι ο ίδιος σε web και mobile.' },
      { q: 'Ειδοποιήσεις στο κινητό;', a: 'Push notifications για: matches, μηνύματα, ενημερώσεις συνδρομής. Διαχείριση από Ρυθμίσεις app.' },
    ],
  },
];

export default function HelpPage() {
  const [search, setSearch] = useState('');

  const query = search.toLowerCase().trim();

  const filtered = query
    ? categories.map((cat) => ({
        ...cat,
        articles: cat.articles.filter(
          (a) => a.q.toLowerCase().includes(query) || a.a.toLowerCase().includes(query)
        ),
      })).filter((cat) => cat.articles.length > 0)
    : categories;

  const totalResults = filtered.reduce((sum, cat) => sum + cat.articles.length, 0);

  return (
    <>
      {/* Hero + Search */}
      <section className="bg-gray-950 text-white py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-400">Υποστήριξη</p>
          <h1 className="mt-4 text-4xl font-extrabold sm:text-5xl">Κέντρο Βοήθειας</h1>
          <p className="mt-6 text-lg text-gray-400">Βρες γρήγορα απαντήσεις στις ερωτήσεις σου.</p>
          <div className="mt-8 max-w-lg mx-auto">
            <div className="flex rounded-xl bg-white/10 border border-white/20 overflow-hidden">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Αναζήτηση π.χ. λογαριασμό, matching, πληρωμή..."
                className="flex-1 bg-transparent px-5 py-3.5 text-white placeholder-gray-400 text-sm outline-none"
              />
              {search && (
                <button onClick={() => setSearch('')} className="px-3 text-gray-400 hover:text-white">
                  ✕
                </button>
              )}
              <div className="px-4 flex items-center text-blue-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </div>
            </div>
            {query && (
              <p className="mt-3 text-sm text-gray-400">
                {totalResults > 0
                  ? `${totalResults} αποτέλεσμα${totalResults > 1 ? 'τα' : ''} για "${search}"`
                  : `Κανένα αποτέλεσμα για "${search}"`}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Category Cards Grid */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {!query && <h2 className="text-2xl font-bold text-gray-900 mb-8">Κατηγορίες</h2>}

          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-5xl mb-4">🔍</p>
              <p className="text-xl font-bold text-gray-900">Δεν βρέθηκαν αποτελέσματα</p>
              <p className="mt-2 text-gray-500">Δοκίμασε διαφορετική αναζήτηση ή επικοινώνησε μαζί μας.</p>
              <button onClick={() => setSearch('')} className="mt-6 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                Δες όλα τα άρθρα
              </button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((cat) => (
                <div key={cat.title} className="rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:border-blue-200 transition-all">
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-3xl">{cat.icon}</span>
                    <h3 className="text-lg font-bold text-gray-900">{cat.title}</h3>
                    {query && (
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        {cat.articles.length}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {cat.articles.map((article) => (
                      <details key={article.q} className="group" open={!!query}>
                        <summary className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors cursor-pointer py-1.5">
                          <svg className="h-4 w-4 text-gray-300 group-hover:text-blue-500 group-open:rotate-90 transition-all flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                          <span className="group-open:text-blue-600 group-open:font-medium">{article.q}</span>
                        </summary>
                        <div className="ml-6 mt-1 mb-3 text-xs text-gray-500 leading-relaxed bg-gray-50 rounded-lg p-3">
                          {article.a}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Contact */}
      <section className="py-20 bg-gray-50">
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
