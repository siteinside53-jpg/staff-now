import Link from 'next/link';

export const metadata = { title: 'Τύπος | StaffNow', description: 'Το StaffNow στα μέσα ενημέρωσης. Press kit, άρθρα και media resources.' };

const articles = [
  { source: 'Καθημερινή', date: '15 Μαρ 2026', title: 'StaffNow: Η startup που αλλάζει τις προσλήψεις στον τουρισμό', excerpt: 'Μια ελληνική startup φέρνει το swipe-style matching στην αγορά εργασίας του τουρισμού, με πάνω από 10,000 εγγεγραμμένους χρήστες.', url: '#' },
  { source: 'Capital.gr', date: '8 Μαρ 2026', title: 'Πώς το StaffNow λύνει το πρόβλημα της εποχικής εργασίας', excerpt: 'Η πλατφόρμα που συνδέει επιχειρήσεις και εργαζόμενους σε λίγες ώρες αντί εβδομάδων.', url: '#' },
  { source: 'Startup.gr', date: '20 Φεβ 2026', title: 'StaffNow: Από την ιδέα στους 10K χρήστες σε 6 μήνες', excerpt: 'Η ιστορία πίσω από τη γρηγορότερα αναπτυσσόμενη HR-tech πλατφόρμα στην Ελλάδα.', url: '#' },
  { source: 'TechCrunch Greece', date: '5 Φεβ 2026', title: 'Greek startup StaffNow raises seed funding for tourism staffing platform', excerpt: 'StaffNow secures funding to expand its Tinder-style hiring platform across Greek tourism.', url: '#' },
];

const brandColors = [
  { name: 'Primary Blue', hex: '#2563EB', tw: 'bg-blue-600' },
  { name: 'Dark', hex: '#030712', tw: 'bg-gray-950' },
  { name: 'White', hex: '#FFFFFF', tw: 'bg-white border border-gray-200' },
  { name: 'Success Green', hex: '#059669', tw: 'bg-emerald-600' },
];

export default function PressPage() {
  return (
    <>
      <section className="bg-gray-950 text-white py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-400">Τύπος</p>
          <h1 className="mt-4 text-4xl font-extrabold sm:text-5xl">StaffNow στα Μέσα</h1>
          <p className="mt-6 text-lg text-gray-400">Τα τελευταία νέα, press kit και media resources.</p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Αρθρογραφία</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {articles.map((a) => (
              <a key={a.title} href={a.url} className="group block rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:border-blue-200 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{a.source}</span>
                  <span className="text-xs text-gray-400">{a.date}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{a.title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{a.excerpt}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Press Kit</h2>
              <p className="text-gray-600 mb-6">Κατέβασε λογότυπα, screenshots και brand guidelines για δημοσιεύσεις.</p>
              <a href="#" className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-6 py-3 text-white font-semibold hover:bg-gray-800 transition-colors">
                📦 Κατέβασε Press Kit
              </a>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Brand Colors</h2>
              <div className="grid grid-cols-2 gap-4">
                {brandColors.map((c) => (
                  <div key={c.name} className="flex items-center gap-3">
                    <div className={`h-12 w-12 rounded-lg ${c.tw}`} />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.hex}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Επικοινωνία Τύπου</h2>
          <p className="mt-4 text-gray-600">Για ερωτήσεις τύπου, συνεντεύξεις ή media inquiries:</p>
          <a href="mailto:press@staffnow.gr" className="mt-4 inline-block text-lg font-semibold text-blue-600 hover:text-blue-700">press@staffnow.gr</a>
          <p className="mt-6 text-sm text-gray-400">Απαντάμε εντός 24 ωρών.</p>
        </div>
      </section>
    </>
  );
}
