'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

const NAV_LINKS = [
  { href: '/#how-it-works', label: 'Πώς λειτουργεί' },
  { href: '/#categories', label: 'Κατηγορίες' },
  { href: '/for-businesses', label: 'Για επιχειρήσεις' },
  { href: '/for-workers', label: 'Για εργαζόμενους' },
];

function StaffNowLogo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-2xl font-extrabold tracking-tight">
      <svg className="h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className={light ? 'text-white' : 'text-gray-900'}>Staff</span><span className="text-blue-600">Now</span>
    </span>
  );
}

function Header() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAuthenticated = !!user;

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
              className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-3 lg:flex">
          {isAuthenticated ? (
            <>
              <Link href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Πίνακας Ελέγχου
              </Link>
              <button
                onClick={() => logout()}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Αποσύνδεση
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Σύνδεση
              </Link>
              <Link
                href="/auth/register"
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Ξεκίνα τώρα
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
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
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50" onClick={() => setMobileMenuOpen(false)}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2 border-t pt-4">
            {isAuthenticated ? (
              <>
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white">
                  Πίνακας Ελέγχου
                </Link>
                <button onClick={() => { setMobileMenuOpen(false); logout(); }} className="rounded-md px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50">
                  Αποσύνδεση
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)} className="rounded-lg border border-gray-300 px-4 py-2.5 text-center text-sm font-medium text-gray-700">Σύνδεση</Link>
                <Link href="/auth/register" onClick={() => setMobileMenuOpen(false)} className="rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white">Ξεκίνα τώρα</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export { Header, StaffNowLogo };
