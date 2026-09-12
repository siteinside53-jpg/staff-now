'use client';

import Link from 'next/link';
import { WORKER_JOB_ROLE_GROUPS } from '@staffnow/config';
import { useLabels } from '@/i18n/labels';
import { useT } from '@/i18n/locale-provider';

const TOTAL_ROLES = WORKER_JOB_ROLE_GROUPS.reduce((s, g) => s + g.roles.length, 0);

const CATEGORY_ICONS: Record<string, string> = {
  tourism_hotels: '🏨',
  food_service: '🍽️',
  retail_sales: '🛍️',
  logistics_transport: '📦',
  health: '🏥',
  beauty_fitness: '💅',
  it: '💻',
  engineering: '🛠️',
  office_admin: '📋',
  tech_iek: '🔧',
  finance: '💼',
  wholesale_b2b: '🤝',
  production_workers: '🏭',
  security_cleaning: '🧹',
  phone_services: '📞',
  marketing_advertising: '📣',
  education: '🎓',
  insurance_realestate: '🏢',
  business_hr: '👥',
  design_arts: '🎨',
  digital_ecom: '🛒',
  agriculture: '🌾',
  legal: '⚖️',
  maritime: '⚓',
  other: '✨',
};

export function CategoriesContent() {
  const t = useT();
  const labels = useLabels();

  return (
    <>
      {/* HERO */}
      <section className="bg-gray-950 text-white py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-400">{t('categoriesPage.hero.eyebrow')}</p>
          <h1 className="mt-4 text-3xl font-extrabold sm:text-5xl">
            {t('categoriesPage.hero.title')}
          </h1>
          <p
            className="mt-6 text-base text-gray-300 sm:text-lg"
            dangerouslySetInnerHTML={{
              __html: t('categoriesPage.hero.subtitle', {
                groups: WORKER_JOB_ROLE_GROUPS.length,
                roles: TOTAL_ROLES,
              }),
            }}
          />
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/auth/register"
              className="rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition-colors"
            >
              {t('categoriesPage.hero.startFree')}
            </Link>
            <Link
              href="/for-businesses"
              className="rounded-xl border border-white/20 hover:border-white/50 px-6 py-3 text-sm font-semibold text-white transition-colors"
            >
              {t('categoriesPage.hero.forBusinesses')}
            </Link>
          </div>
        </div>
      </section>

      {/* CATEGORIES — full list */}
      <section className="bg-gray-50 py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2">
            {WORKER_JOB_ROLE_GROUPS.map((group) => (
              <article
                key={group.id}
                id={group.id}
                className="scroll-mt-32 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <header className="mb-4 flex items-center justify-between gap-3 border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden="true">
                      {CATEGORY_ICONS[group.id] || '📌'}
                    </span>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{labels.roleGroup(group.id, group.label)}</h2>
                      <p className="text-xs text-gray-500">{group.roles.length} {t('categoriesPage.rolesCount')}</p>
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/discover?category=${group.id}`}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 whitespace-nowrap"
                  >
                    {t('categoriesPage.viewJobs')}
                  </Link>
                </header>
                <ul className="flex flex-wrap gap-1.5">
                  {group.roles.map((roleId) => (
                    <li key={roleId}>
                      <span className="inline-block rounded-md bg-gray-50 border border-gray-200 px-2.5 py-1 text-xs text-gray-700">
                        {labels.role(roleId)}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            {t('categoriesPage.cta.title')}
          </h2>
          <p className="mt-3 text-gray-600">
            {t('categoriesPage.cta.subtitle')}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition-colors"
            >
              {t('categoriesPage.cta.message')}
            </Link>
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 hover:bg-gray-50 px-6 py-3 text-sm font-semibold text-gray-700 transition-colors"
            >
              {t('categoriesPage.cta.start')}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
