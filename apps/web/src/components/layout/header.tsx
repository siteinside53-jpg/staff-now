'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useLoginModal } from '@/components/auth/login-modal';

const NAV_LINKS = [
  { href: '/how-it-works', label: 'Πώς λειτουργεί' },
  { href: '/for-businesses', label: 'Για επιχειρήσεις' },
  { href: '/for-workers', label: 'Για εργαζόμενους' },
  { href: '/#download-app', label: 'Κατέβασε το App' },
];

const MOBILE_EXTRA_LINKS = [
  { href: '/pricing', label: 'Τιμολόγηση' },
];

function StaffNowLogo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
      <svg viewBox="0 0 32 32" className="h-6 w-6 block" aria-label="StaffNow">
        <circle cx="16" cy="16" r="16" fill="#3b82f6" />
        <path d="M9 16.5l4.5 4.5L23 11" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span><span className={light ? 'text-white' : 'text-gray-800'}>Staff</span><span className="text-blue-500">Now</span></span>
    </span>
  );
}

function Header() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAuthenticated = !!user;
  const loginModal = useLoginModal();

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
              <Link
                href="/dashboard"
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
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
              <button
                onClick={() => loginModal.open('login')}
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Σύνδεση
              </button>
              <button
                onClick={() => loginModal.open('register')}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Ξεκίνα Δωρεάν
              </button>
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
            {[...NAV_LINKS, ...MOBILE_EXTRA_LINKS].map((link) => (
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
                <button onClick={() => { setMobileMenuOpen(false); loginModal.open('login'); }} className="rounded-lg border border-gray-300 px-4 py-2.5 text-center text-sm font-medium text-gray-700">Σύνδεση</button>
                <button onClick={() => { setMobileMenuOpen(false); loginModal.open('register'); }} className="rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white">Ξεκίνα Δωρεάν</button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export { Header, StaffNowLogo };
