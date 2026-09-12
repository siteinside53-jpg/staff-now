'use client';

import Link from 'next/link';
import { useT } from '@/i18n/locale-provider';

const VALUE_KEYS = ['speed', 'trust', 'innovation', 'simplicity'] as const;

const VALUE_ICONS: Record<(typeof VALUE_KEYS)[number], React.ReactNode> = {
  speed: (
    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
  trust: (
    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
  innovation: (
    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  ),
  simplicity: (
    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  ),
};

const TEAM = [
  { key: 'eu', name: 'Ευγένιος Αφεντουλίδης', role: 'CEO & Co-founder', initials: 'ΕΑ', color: 'bg-blue-100 text-blue-700' },
  { key: 'el', name: 'Ελένη Κωνσταντίνου', role: 'CTO & Co-founder', initials: 'ΕΚ', color: 'bg-emerald-100 text-emerald-700' },
  { key: 'gi', name: 'Γιώργος Αλεξίου', role: 'Head of Growth', initials: 'ΓΑ', color: 'bg-amber-100 text-amber-700' },
  { key: 'ma', name: 'Μαρία Νικολάου', role: 'Head of Operations', initials: 'ΜΝ', color: 'bg-pink-100 text-pink-700' },
] as const;

const STAT_KEYS = ['free', 'ai', 'instant', 'greek'] as const;

export function AboutContent() {
  const t = useT();

  return (
    <>
      {/* ====== HERO ====== */}
      <section className="relative overflow-hidden bg-gray-950 text-white">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/95 to-gray-950/70" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-blue-400">
              {t('about.hero.eyebrow')}
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl leading-[1.1]">
              {t('about.hero.titleLead')}{' '}
              <span className="text-blue-500">{t('about.hero.titleHighlight')}</span>
            </h1>
            <p className="mt-6 text-lg text-gray-400 leading-relaxed">{t('about.hero.subtitle')}</p>
          </div>
        </div>
      </section>

      {/* ====== MISSION ====== */}
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                {t('about.mission.eyebrow')}
              </p>
              <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">{t('about.mission.title')}</h2>
              <p className="mt-6 text-gray-600 leading-relaxed">{t('about.mission.p1')}</p>
              <p className="mt-4 text-gray-600 leading-relaxed">{t('about.mission.p2')}</p>
            </div>
            <div className="rounded-2xl bg-blue-50 p-8 sm:p-10">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{t('about.mission.vision.title')}</h3>
                    <p className="mt-1 text-sm text-gray-600">{t('about.mission.vision.description')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.58-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{t('about.mission.goal.title')}</h3>
                    <p className="mt-1 text-sm text-gray-600">{t('about.mission.goal.description')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.05 4.575a1.575 1.575 0 1 0-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 0 1 3.15 0v1.5m-3.15 0 .075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 0 1 3.15 0V15M6.9 7.575a1.575 1.575 0 1 0-3.15 0v8.175a6.75 6.75 0 0 0 6.75 6.75h2.018a5.25 5.25 0 0 0 3.712-1.538l1.732-1.732a5.25 5.25 0 0 0 1.538-3.712l.003-2.024a.668.668 0 0 1 .198-.471 1.575 1.575 0 1 0-2.228-2.228 3.818 3.818 0 0 0-1.12 2.687M6.9 7.575V12m6.27 4.318A4.49 4.49 0 0 1 16.35 15m.002 0h-.002" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{t('about.mission.value.title')}</h3>
                    <p className="mt-1 text-sm text-gray-600">{t('about.mission.value.description')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== STORY ====== */}
      <section className="bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">{t('about.story.eyebrow')}</p>
            <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">{t('about.story.title')}</h2>
          </div>
          <div className="mx-auto mt-12 max-w-3xl space-y-6 text-gray-600 leading-relaxed">
            <p dangerouslySetInnerHTML={{ __html: t('about.story.p1') }} />
            <p dangerouslySetInnerHTML={{ __html: t('about.story.p2') }} />
            <p dangerouslySetInnerHTML={{ __html: t('about.story.p3') }} />
            <p dangerouslySetInnerHTML={{ __html: t('about.story.p4') }} />
          </div>
        </div>
      </section>

      {/* ====== VALUES ====== */}
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">{t('about.values.eyebrow')}</p>
            <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">{t('about.values.title')}</h2>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {VALUE_KEYS.map((key) => (
              <div
                key={key}
                className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                  {VALUE_ICONS[key]}
                </div>
                <h3 className="mt-5 text-lg font-bold text-gray-900">{t(`about.values.${key}.title`)}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{t(`about.values.${key}.description`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== TEAM ====== */}
      <section className="bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">{t('about.team.eyebrow')}</p>
            <h2 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">{t('about.team.title')}</h2>
            <p className="mt-4 mx-auto max-w-2xl text-gray-600">{t('about.team.subtitle')}</p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {TEAM.map((member) => (
              <div
                key={member.name}
                className="group rounded-2xl bg-white p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all text-center"
              >
                <div
                  className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold ${member.color}`}
                >
                  {member.initials}
                </div>
                <h3 className="mt-5 text-lg font-bold text-gray-900">{member.name}</h3>
                <p className="text-sm font-medium text-blue-600">{member.role}</p>
                <p className="mt-3 text-sm text-gray-600 leading-relaxed">{t(`about.team.bios.${member.key}`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== STATS ====== */}
      <section className="bg-blue-600 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {STAT_KEYS.map((key) => (
              <div key={key} className="text-center">
                <p className="text-4xl font-extrabold text-white sm:text-5xl">{t(`about.stats.${key}.value`)}</p>
                <p className="mt-2 text-sm font-medium text-blue-100">{t(`about.stats.${key}.label`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== CTA ====== */}
      <section className="bg-gray-950 py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">{t('about.cta.title')}</h2>
          <p className="mt-4 text-lg text-gray-400">{t('about.cta.subtitle')}</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/auth/register"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-all"
            >
              {t('about.cta.register')}
            </Link>
            <Link
              href="/careers"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-gray-600 px-8 py-4 text-base font-semibold text-white hover:bg-white/5 transition-all"
            >
              {t('about.cta.careers')}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
