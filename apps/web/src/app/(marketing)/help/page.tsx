'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useT } from '@/i18n/locale-provider';

const CATEGORIES = [
  { key: 'gettingStarted', icon: '🚀', count: 5 },
  { key: 'businesses', icon: '💼', count: 7 },
  { key: 'videoCall', icon: '🎥', count: 5 },
  { key: 'tasknow', icon: '🧰', count: 6 },
  { key: 'workers', icon: '👤', count: 6 },
  { key: 'subscriptions', icon: '💳', count: 7 },
  { key: 'security', icon: '🔒', count: 6 },
  { key: 'mobile', icon: '📱', count: 4 },
  { key: 'updates', icon: '🆕', count: 15 },
] as const;

export default function HelpPage() {
  const t = useT();
  const [search, setSearch] = useState('');

  const query = search.toLowerCase().trim();

  const categories = CATEGORIES.map((cat) => ({
    ...cat,
    title: t(`help.categories.${cat.key}.title`),
    articles: Array.from({ length: cat.count }, (_, i) => ({
      q: t(`help.categories.${cat.key}.articles.${i}.q`),
      a: t(`help.categories.${cat.key}.articles.${i}.a`),
    })),
  }));

  const filtered = query
    ? categories
        .map((cat) => ({
          ...cat,
          articles: cat.articles.filter(
            (a) => a.q.toLowerCase().includes(query) || a.a.toLowerCase().includes(query)
          ),
        }))
        .filter((cat) => cat.articles.length > 0)
    : categories;

  const totalResults = filtered.reduce((sum, cat) => sum + cat.articles.length, 0);

  return (
    <>
      {/* Hero + Search */}
      <section className="bg-gray-950 text-white py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-400">{t('help.hero.eyebrow')}</p>
          <h1 className="mt-4 text-4xl font-extrabold sm:text-5xl">{t('help.hero.title')}</h1>
          <p className="mt-6 text-lg text-gray-400">{t('help.hero.subtitle')}</p>
          <div className="mt-8 max-w-lg mx-auto">
            <div className="flex rounded-xl bg-white/10 border border-white/20 overflow-hidden">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('help.hero.searchPlaceholder')}
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
                  ? t('help.resultsCount', {
                      count: totalResults,
                      suffix: totalResults > 1 ? t('help.resultsSuffixPlural') : '',
                      q: search,
                    })
                  : t('help.noResultsFor', { q: search })}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Category Cards Grid */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {!query && <h2 className="text-2xl font-bold text-gray-900 mb-8">{t('help.categoriesTitle')}</h2>}

          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-5xl mb-4">🔍</p>
              <p className="text-xl font-bold text-gray-900">{t('help.noResults.title')}</p>
              <p className="mt-2 text-gray-500">{t('help.noResults.subtitle')}</p>
              <button onClick={() => setSearch('')} className="mt-6 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                {t('help.noResults.reset')}
              </button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((cat) => (
                <div key={cat.key} className="rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:border-blue-200 transition-all">
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
          <h2 className="text-2xl font-bold text-gray-900">{t('help.contact.title')}</h2>
          <p className="mt-4 text-gray-600">{t('help.contact.subtitle')}</p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/contact" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-4 font-semibold text-white hover:bg-blue-700 transition-all">
              {t('help.contact.message')}
            </Link>
            <a href="mailto:info@staffnow.gr" className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-8 py-4 font-semibold text-gray-700 hover:bg-gray-50 transition-all">
              {t('help.contact.email')}
            </a>
          </div>
          <p className="mt-4 text-sm text-gray-400">{t('help.contact.response')}</p>
        </div>
      </section>
    </>
  );
}
