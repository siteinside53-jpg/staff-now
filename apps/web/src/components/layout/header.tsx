'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { t } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Navigation items
// ---------------------------------------------------------------------------

const NAV_LINKS = [
  { href: '/#how-it-works', labelKey: 'footer.howItWorks' },
  { href: '/pricing', labelKey: 'nav.pricing' },
  { href: '/about', labelKey: 'nav.about' },
  { href: '/contact', labelKey: 'nav.contact' },
] as const;

const AUTH_NAV_LINKS = [
  { href: '/dashboard/discover', labelKey: 'nav.discover' },
  { href: '/dashboard/matches', labelKey: 'nav.matches' },
  { href: '/dashboard/messages', labelKey: 'nav.messages' },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function Header() {
  const { user, profile, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const isAuthenticated = !!user;
  const displayName = profile?.name || profile?.businessName || user?.email?.split('@')[0] || '';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2">
          <span className="text-2xl font-extrabold tracking-tight text-blue-600">
            StaffNow
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {(isAuthenticated ? AUTH_NAV_LINKS : NAV_LINKS).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
            >
              {t(link.labelKey)}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-gray-50"
              >
                <Avatar
                  src={profile?.photoUrl}
                  name={displayName}
                  size="sm"
                />
                <span className="max-w-[120px] truncate text-sm font-medium text-gray-700">
                  {displayName}
                </span>
                <svg
                  className={cn(
                    'h-4 w-4 text-gray-400 transition-transform',
                    profileMenuOpen && 'rotate-180',
                  )}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {/* Profile dropdown */}
              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
                  <div className="border-b border-gray-100 px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900">
                      {displayName}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {user?.email}
                    </p>
                  </div>

                  <Link
                    href="/dashboard"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    {t('nav.dashboard')}
                  </Link>
                  <Link
                    href="/dashboard/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    {t('nav.profile')}
                  </Link>
                  <Link
                    href="/dashboard/billing"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    {t('nav.billing')}
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    {t('nav.settings')}
                  </Link>

                  <div className="border-t border-gray-100">
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        logout();
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      {t('nav.logout')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">
                  {t('nav.login')}
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm">{t('nav.register')}</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menu"
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

      {/* Mobile menu panel */}
      {mobileMenuOpen && (
        <div className="border-t border-gray-100 bg-white px-4 pb-4 pt-2 md:hidden">
          <nav className="flex flex-col gap-1">
            {(isAuthenticated ? AUTH_NAV_LINKS : NAV_LINKS).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t(link.labelKey)}
              </Link>
            ))}
          </nav>

          <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-4">
            {isAuthenticated ? (
              <>
                <Link
                  href="/dashboard/profile"
                  className="rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.profile')}
                </Link>
                <Link
                  href="/dashboard/billing"
                  className="rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.billing')}
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="rounded-md px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full">
                    {t('nav.login')}
                  </Button>
                </Link>
                <Link href="/auth/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button size="sm" className="w-full">
                    {t('nav.register')}
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export { Header };
