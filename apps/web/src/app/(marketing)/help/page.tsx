import Link from 'next/link';

export const metadata = { title: 'Κέντρο Βοήθειας | StaffNow', description: 'Βρες απαντήσεις σε συχνές ερωτήσεις και λύσεις σε προβλήματα.' };

const categories = [
  {
    icon: '🚀',
    title: 'Ξεκινώντας',
    articles: [
      'Πώς δημιουργώ λογαριασμό;',
      'Πώς επιλέγω αν είμαι εργαζόμενος ή επιχείρηση;',
      'Πώς συμπληρώνω το προφίλ μου;',
      'Πώς ανεβάζω φωτογραφία προφίλ;',
    ],
  },
  {
    icon: '💼',
    title: 'Για Επιχειρήσεις',
    articles: [
      'Πώς δημοσιεύω αγγελία;',
      'Πώς βρίσκω υποψηφίους;',
      'Πώς λειτουργεί το matching;',
      'Πώς επικοινωνώ μετά το match;',
    ],
  },
  {
    icon: '👤',
    title: 'Για Εργαζόμενους',
    articles: [
      'Πώς βρίσκω θέσεις εργασίας;',
      'Πώς κάνω like σε μια αγγελία;',
      'Τι γίνεται μετά το match;',
      'Πώς αυξάνω την ορατότητά μου;',
    ],
  },
  {
    icon: '💳',
    title: 'Συνδρομές & Πληρωμές',
    articles: [
      'Ποια πλάνα υπάρχουν;',
      'Πώς αναβαθμίζω τη συνδρομή μου;',
      'Πώς ακυρώνω τη συνδρομή μου;',
      'Τι μέθοδοι πληρωμής γίνονται δεκτές;',
    ],
  },
  {
    icon: '🔒',
    title: 'Ασφάλεια & Απόρρητο',
    articles: [
      'Πώς προστατεύονται τα δεδομένα μου;',
      'Πώς αλλάζω τον κωδικό μου;',
      'Πώς διαγράφω τον λογαριασμό μου;',
      'Ποια δεδομένα μου βλέπουν οι άλλοι;',
    ],
  },
  {
    icon: '📱',
    title: 'Mobile App',
    articles: [
      'Από πού κατεβάζω την εφαρμογή;',
      'Η εφαρμογή είναι δωρεάν;',
      'Πώς συνδέομαι στο κινητό;',
      'Λαμβάνω ειδοποιήσεις στο κινητό;',
    ],
  },
];

const popularQuestions = [
  { q: 'Πόσο κοστίζει το StaffNow;', a: 'Η βασική χρήση είναι δωρεάν. Υπάρχουν premium πλάνα για επιχειρήσεις (από 29€/μήνα) και εργαζόμενους (9€/μήνα) με επιπλέον δυνατότητες.' },
  { q: 'Πώς γίνεται ένα match;', a: 'Όταν μια επιχείρηση κάνει like σε έναν εργαζόμενο ΚΑΙ ο εργαζόμενος κάνει like σε αγγελία της ίδιας επιχείρησης, δημιουργείται αυτόματα match και ξεκινάει η επικοινωνία.' },
  { q: 'Είναι ασφαλές;', a: 'Απόλυτα. Χρησιμοποιούμε κρυπτογράφηση, verified προφίλ και τα προσωπικά στοιχεία αποκαλύπτονται μόνο μετά από match.' },
  { q: 'Μπορώ να χρησιμοποιήσω το StaffNow από κινητό;', a: 'Ναι! Η εφαρμογή είναι διαθέσιμη για iOS και Android, και το website είναι πλήρως responsive.' },
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
          <div className="mt-8 max-w-lg mx-auto">
            <div className="flex rounded-xl bg-white/10 border border-white/20 overflow-hidden">
              <input type="text" placeholder="Αναζήτηση στο κέντρο βοήθειας..." className="flex-1 bg-transparent px-5 py-3.5 text-white placeholder-gray-400 text-sm outline-none" />
              <button className="px-5 text-blue-400 hover:text-blue-300">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Κατηγορίες</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => (
              <div key={cat.title} className="rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:border-blue-200 transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{cat.icon}</span>
                  <h3 className="text-lg font-bold text-gray-900">{cat.title}</h3>
                </div>
                <ul className="space-y-2.5">
                  {cat.articles.map((article) => (
                    <li key={article}>
                      <a href="#" className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors group">
                        <svg className="h-4 w-4 text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                        {article}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Questions */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Συχνές Ερωτήσεις</h2>
          <div className="space-y-4">
            {popularQuestions.map((item) => (
              <details key={item.q} className="group rounded-2xl bg-white border border-gray-100 shadow-sm">
                <summary className="flex items-center justify-between cursor-pointer px-6 py-4 text-gray-900 font-semibold hover:text-blue-600 transition-colors">
                  {item.q}
                  <svg className="h-5 w-5 text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </summary>
                <div className="px-6 pb-5 text-sm text-gray-600 leading-relaxed">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Δεν βρήκες αυτό που ψάχνεις;</h2>
          <p className="mt-4 text-gray-600">Η ομάδα υποστήριξης μας είναι εδώ για να βοηθήσει.</p>
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
