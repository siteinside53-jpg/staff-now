import Link from 'next/link';

export const metadata = { title: 'Blog & Νέα | StaffNow', description: 'Άρθρα, συμβουλές και νέα για τον τουρισμό, την εργασία και το StaffNow.' };

const categories = ['Όλα', 'Νέα', 'Συμβουλές', 'Product', 'Τουρισμός'];

const posts = [
  {
    category: 'Νέα',
    title: 'Το StaffNow ξεπέρασε τους 10,000 εγγεγραμμένους χρήστες',
    excerpt: 'Ένα σημαντικό ορόσημο για εμάς! Σε μόλις 6 μήνες, η κοινότητα μας μεγάλωσε πέρα από κάθε προσδοκία.',
    date: '20 Μαρ 2026',
    readTime: '3 λεπτά',
    author: 'Αλέξανδρος Π.',
    color: 'bg-blue-100 text-blue-700',
  },
  {
    category: 'Συμβουλές',
    title: 'Πώς να βρεις προσωπικό τουρισμού σε 24 ώρες',
    excerpt: 'Ο πλήρης οδηγός για επιχειρήσεις που θέλουν να καλύψουν θέσεις γρήγορα χωρίς συμβιβασμούς στην ποιότητα.',
    date: '15 Μαρ 2026',
    readTime: '7 λεπτά',
    author: 'Ελένη Α.',
    color: 'bg-emerald-100 text-emerald-700',
  },
  {
    category: 'Συμβουλές',
    title: '5 τρόποι να ξεχωρίσεις ως εργαζόμενος στον τουρισμό',
    excerpt: 'Από το τέλειο προφίλ μέχρι τις σωστές δεξιότητες — τι κοιτάνε πραγματικά οι εργοδότες.',
    date: '10 Μαρ 2026',
    readTime: '5 λεπτά',
    author: 'Μαρίνα Κ.',
    color: 'bg-emerald-100 text-emerald-700',
  },
  {
    category: 'Product',
    title: 'Νέο: Matching με AI — Πώς λειτουργεί η νέα μηχανή αντιστοίχισης',
    excerpt: 'Χρησιμοποιούμε machine learning για να σας προτείνουμε τα πιο σχετικά ταιριάσματα βάσει προφίλ και προτιμήσεων.',
    date: '5 Μαρ 2026',
    readTime: '4 λεπτά',
    author: 'Δημήτρης Ν.',
    color: 'bg-purple-100 text-purple-700',
  },
  {
    category: 'Τουρισμός',
    title: 'Τουρισμός 2026: Οι τάσεις που θα καθορίσουν τη σεζόν',
    excerpt: 'Αύξηση ζήτησης, νέες τεχνολογίες και αλλαγές στην εργασιακή αγορά — τι περιμένουμε φέτος.',
    date: '28 Φεβ 2026',
    readTime: '6 λεπτά',
    author: 'Ελένη Α.',
    color: 'bg-amber-100 text-amber-700',
  },
  {
    category: 'Νέα',
    title: 'StaffNow mobile app: Διαθέσιμο σε iOS και Android',
    excerpt: 'Κατέβασε την εφαρμογή και βρες δουλειά ή προσωπικό απευθείας από το κινητό σου.',
    date: '20 Φεβ 2026',
    readTime: '3 λεπτά',
    author: 'Αλέξανδρος Π.',
    color: 'bg-blue-100 text-blue-700',
  },
];

export default function BlogPage() {
  return (
    <>
      <section className="bg-gray-950 text-white py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-400">Blog</p>
          <h1 className="mt-4 text-4xl font-extrabold sm:text-5xl">Blog &amp; Νέα</h1>
          <p className="mt-6 text-lg text-gray-400">Άρθρα, συμβουλές και νέα για τον τουρισμό και την εργασία.</p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Categories */}
          <div className="flex flex-wrap gap-2 mb-12">
            {categories.map((cat, i) => (
              <button key={cat} className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${i === 0 ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {cat}
              </button>
            ))}
          </div>

          {/* Posts Grid */}
          <div className="grid gap-8 md:grid-cols-2">
            {posts.map((post) => (
              <article key={post.title} className="group rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-blue-200 transition-all">
                {/* Color bar */}
                <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${post.color}`}>{post.category}</span>
                    <span className="text-xs text-gray-400">{post.date}</span>
                    <span className="text-xs text-gray-400">&middot; {post.readTime}</span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{post.title}</h2>
                  <p className="mt-3 text-gray-600 text-sm leading-relaxed">{post.excerpt}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                        {post.author.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="text-xs font-medium text-gray-500">{post.author}</span>
                    </div>
                    <span className="text-xs font-semibold text-blue-600 group-hover:underline">Διάβασε →</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Μείνε ενημερωμένος</h2>
          <p className="mt-3 text-gray-600">Γράψου στο newsletter μας για νέα, συμβουλές και ενημερώσεις.</p>
          <div className="mt-8 flex gap-3 max-w-md mx-auto">
            <input type="email" placeholder="Το email σου" className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none" />
            <button className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap">Εγγραφή</button>
          </div>
          <p className="mt-3 text-xs text-gray-400">Χωρίς spam. Ακύρωση ανά πάσα στιγμή.</p>
        </div>
      </section>
    </>
  );
}
