'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useLoginModal } from '@/components/auth/login-modal';
import { TaskNowMark } from '@/components/tasknow/logo';
import { StaffNowLogo } from '@/components/staffnow-logo';
import { useLocale } from '@/i18n/locale-provider';
import type { Locale } from '@/i18n';
import { ThemeToggle } from '@/components/theme-provider';

const NAV_LINKS: { href: string; labelKey: string; accent?: boolean }[] = [
  { href: '/how-it-works', labelKey: 'header.howItWorks' },
  { href: '/for-businesses', labelKey: 'header.forBusinesses' },
  // Οι μικροδουλειές κάθονται ανάμεσα στις δύο πλευρές της αγοράς:
  // και οι επιχειρήσεις και οι εργαζόμενοι ανεβάζουν και αναλαμβάνουν.
  { href: '/tasknow', labelKey: 'TaskNow', accent: true },
  { href: '/for-workers', labelKey: 'header.forWorkers' },
  { href: '/#download-app', labelKey: 'header.downloadApp' },
];

const MOBILE_EXTRA_LINKS = [
  { href: '/pricing', labelKey: 'header.pricing' },
];

const LOCALES: Locale[] = ['el', 'en'];

/** Συμπαγής εναλλαγή γλώσσας «EL | EN». */
function LanguageToggle({ className = '' }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();
  return (
    <div
      role="group"
      aria-label={t('header.language')}
      className={`inline-flex items-center rounded-lg border border-gray-200 bg-white p-0.5 text-xs font-semibold ${className}`}
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          aria-label={l === 'el' ? t('header.switchToGreek') : t('header.switchToEnglish')}
          lang={l}
          className={`rounded-md px-2 py-1 uppercase transition-colors ${
            locale === l
              ? 'bg-gray-900 text-white'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

// Το σήμα ζει πια σε ΕΝΑ αρχείο (components/staffnow-logo.tsx) — εδώ υπήρχε
// το ένα από τα επτά αντίγραφά του. Η επανεξαγωγή από κάτω μένει ώστε να μη
// χρειαστεί να αλλάξει όποιος το εισάγει από εδώ.

function Header() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAuthenticated = !!user;
  const loginModal = useLoginModal();
  const { t } = useLocale();

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur border-b border-gray-100">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <StaffNowLogo />
        </Link>

        {/* Desktop Nav — always show main links */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                link.accent
                  ? 'inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-extrabold tracking-tight ring-1 ring-amber-200/70 transition-colors hover:bg-amber-100'
                  : 'rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900'
              }
            >
              {link.accent ? (
                <>
                  <TaskNowMark className="h-[18px] w-[18px]" />
                  <span>
                    <span className="text-gray-800">Task</span>
                    <span className="text-amber-500">Now</span>
                  </span>
                </>
              ) : (
                t(link.labelKey)
              )}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-3 lg:flex">
          <ThemeToggle />
          <LanguageToggle />
          {isAuthenticated ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                {t('header.dashboard')}
              </Link>
              <button
                onClick={() => logout()}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
              >
                {t('header.logout')}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => loginModal.open('login')}
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                {t('header.login')}
              </button>
              <button
                onClick={() => loginModal.open('register')}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                {t('header.startFree')}
              </button>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? t('header.closeMenu') : t('header.openMenu')}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t bg-white px-4 pb-4 pt-2 lg:hidden">
          <nav className="flex flex-col gap-1">
            {[...NAV_LINKS, ...MOBILE_EXTRA_LINKS].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  'accent' in link && link.accent
                    ? 'inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm font-extrabold tracking-tight ring-1 ring-amber-200/70 hover:bg-amber-100'
                    : 'rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50'
                }
                onClick={() => setMobileMenuOpen(false)}
              >
                {'accent' in link && link.accent ? (
                  <>
                    <TaskNowMark className="h-5 w-5" />
                    <span>
                      <span className="text-gray-800">Task</span>
                      <span className="text-amber-500">Now</span>
                    </span>
                  </>
                ) : (
                  t(link.labelKey)
                )}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex items-center justify-between border-t pt-4">
            <span className="text-xs font-medium text-gray-500">{t('header.language')}</span>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LanguageToggle />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 border-t pt-4">
            {isAuthenticated ? (
              <>
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white">
                  {t('header.dashboard')}
                </Link>
                <button onClick={() => { setMobileMenuOpen(false); logout(); }} className="rounded-md px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50">
                  {t('header.logout')}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => { setMobileMenuOpen(false); loginModal.open('login'); }} className="rounded-lg border border-gray-300 px-4 py-2.5 text-center text-sm font-medium text-gray-700">{t('header.login')}</button>
                <button onClick={() => { setMobileMenuOpen(false); loginModal.open('register'); }} className="rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white">{t('header.startFree')}</button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export { Header, StaffNowLogo };
