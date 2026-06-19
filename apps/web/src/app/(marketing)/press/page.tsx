export const metadata = { title: 'Τύπος', description: 'Το StaffNow στα μέσα ενημέρωσης. Press kit, άρθρα και media resources.' };

// Set `url` to an actual article URL to enable the link. Empty/undefined = non-clickable card.
interface PressArticle {
  source: string;
  date: string;
  title: string;
  excerpt: string;
  url?: string;
}

const articles: PressArticle[] = [];

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

      {articles.length > 0 && (
        <section className="py-20 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Αρθρογραφία</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {articles.map((a) => {
                const card = (
                  <>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{a.source}</span>
                      <span className="text-xs text-gray-400">{a.date}</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{a.title}</h3>
                    <p className="mt-2 text-sm text-gray-600 leading-relaxed">{a.excerpt}</p>
                  </>
                );
                return a.url ? (
                  <a
                    key={a.title}
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:border-blue-200 transition-all"
                  >
                    {card}
                  </a>
                ) : (
                  <div key={a.title} className="rounded-2xl border border-gray-100 p-6">
                    {card}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Press Kit</h2>
              <p className="text-gray-600 mb-6">Για λογότυπα, screenshots και brand guidelines επικοινώνησε μαζί μας.</p>
              <a href="mailto:press@staffnow.gr?subject=Press%20Kit%20Request" className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-6 py-3 text-white font-semibold hover:bg-gray-800 transition-colors">
                📦 Ζήτα Press Kit
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
