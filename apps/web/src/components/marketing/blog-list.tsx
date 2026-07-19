'use client';

import { useEffect, useMemo, useState } from 'react';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://staffnow-api-production.siteinside53.workers.dev';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  coverImageUrl: string;
  author: string;
  readTime: string;
  publishedAt: string | null;
  createdAt: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  Νέα: 'bg-blue-100 text-blue-700',
  Συμβουλές: 'bg-emerald-100 text-emerald-700',
  Product: 'bg-purple-100 text-purple-700',
  'Αγορά Εργασίας': 'bg-amber-100 text-amber-700',
};

function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('el-GR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export function BlogList() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState('Όλα');
  const [selected, setSelected] = useState<BlogPost | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/blog/posts`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && Array.isArray(d.data?.items)) {
          setPosts(d.data.items as BlogPost[]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => p.category && set.add(p.category));
    return ['Όλα', ...Array.from(set)];
  }, [posts]);

  const filtered = active === 'Όλα' ? posts : posts.filter((p) => p.category === active);

  return (
    <section className="py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="grid gap-8 md:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-56 rounded-2xl border border-gray-100 bg-gray-50 animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-24 text-center">
            <div className="mb-4 text-5xl">📝</div>
            <h2 className="text-2xl font-bold text-gray-900">Δεν υπάρχουν άρθρα ακόμη</h2>
            <p className="mt-3 max-w-md text-gray-600">
              Ετοιμάζουμε χρήσιμα άρθρα, συμβουλές και νέα για την εργασία και τη στελέχωση.
              Γράψου στο newsletter μας για να ενημερωθείς πρώτος.
            </p>
          </div>
        ) : (
          <>
            {/* Categories */}
            {categories.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-12">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActive(cat)}
                    className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                      active === cat
                        ? 'bg-gray-950 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Posts Grid */}
            <div className="grid gap-8 md:grid-cols-2">
              {filtered.map((post) => (
                <article
                  key={post.id}
                  onClick={() => setSelected(post)}
                  className="cursor-pointer rounded-2xl border border-gray-100 overflow-hidden transition-shadow hover:shadow-lg"
                >
                  {post.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.coverImageUrl} alt="" className="h-44 w-full object-cover" />
                  ) : (
                    <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />
                  )}
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      {post.category && (
                        <span
                          className={`text-xs font-semibold px-3 py-1 rounded-full ${
                            CATEGORY_COLORS[post.category] || 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {post.category}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {formatDate(post.publishedAt || post.createdAt)}
                      </span>
                      {post.readTime && (
                        <span className="text-xs text-gray-400">&middot; {post.readTime}</span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">{post.title}</h2>
                    {post.excerpt && (
                      <p className="mt-3 text-gray-600 text-sm leading-relaxed">{post.excerpt}</p>
                    )}
                    {post.author && (
                      <div className="mt-4 flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                          {post.author.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </div>
                        <span className="text-xs font-medium text-gray-500">{post.author}</span>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Reader modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {selected.coverImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selected.coverImageUrl} alt="" className="h-56 w-full rounded-t-2xl object-cover" />
            )}
            <div className="p-6 sm:p-8">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selected.category && (
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        CATEGORY_COLORS[selected.category] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {selected.category}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {formatDate(selected.publishedAt || selected.createdAt)}
                  </span>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Κλείσιμο"
                >
                  ✕
                </button>
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">{selected.title}</h1>
              {selected.author && (
                <p className="mt-2 text-sm text-gray-500">
                  από {selected.author}
                  {selected.readTime ? ` · ${selected.readTime}` : ''}
                </p>
              )}
              <div className="mt-6 whitespace-pre-wrap text-[15px] leading-relaxed text-gray-700">
                {selected.content}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
