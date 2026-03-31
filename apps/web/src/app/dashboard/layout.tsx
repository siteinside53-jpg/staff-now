'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';

const workerNavItems = [
  { href: '/dashboard', label: 'Αρχική', icon: HomeIcon },
  { href: '/dashboard/discover', label: 'Ανακάλυψη', icon: DiscoverIcon },
  { href: '/dashboard/matches', label: 'Matches', icon: MatchIcon },
  { href: '/dashboard/messages', label: 'Μηνύματα', icon: MessageIcon },
  { href: '/dashboard/profile', label: 'Προφίλ', icon: ProfileIcon },
  { href: '/dashboard/interests', label: 'Ενδιαφέρον', icon: HeartIcon },
  { href: '/dashboard/billing', label: 'Συνδρομή', icon: BillingIcon },
  { href: '/dashboard/settings', label: 'Ρυθμίσεις', icon: SettingsIcon },
];

const businessNavItems = [
  { href: '/dashboard', label: 'Αρχική', icon: HomeIcon },
  { href: '/dashboard/jobs', label: 'Αγγελίες', icon: JobsIcon },
  { href: '/dashboard/discover', label: 'Ανακάλυψη', icon: DiscoverIcon },
  { href: '/dashboard/matches', label: 'Matches', icon: MatchIcon },
  { href: '/dashboard/messages', label: 'Μηνύματα', icon: MessageIcon },
  { href: '/dashboard/interests', label: 'Ενδιαφέρον', icon: HeartIcon },
  { href: '/dashboard/profile', label: 'Προφίλ', icon: ProfileIcon },
  { href: '/dashboard/billing', label: 'Συνδρομή', icon: BillingIcon },
  { href: '/dashboard/settings', label: 'Ρυθμίσεις', icon: SettingsIcon },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [badges, setBadges] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/auth/login';
    }
  }, [user, loading]);

  // Fetch notification badges
  useEffect(() => {
    if (!user) return;
    async function fetchBadges() {
      try {
        const token = localStorage.getItem('staffnow_token');
        const headers = { 'Authorization': `Bearer ${token}` };
        const base = 'https://staffnow-api-production.siteinside53.workers.dev';
        const [matchesRes, convosRes, interestsRes] = await Promise.all([
          fetch(`${base}/matches`, { headers }).then(r => r.json()) as Promise<any>,
          fetch(`${base}/conversations`, { headers }).then(r => r.json()) as Promise<any>,
          fetch(`${base}/interests/received`, { headers }).then(r => r.json()) as Promise<any>,
        ]);
        const matches = matchesRes?.data || [];
        const convos = convosRes?.data || [];
        const interests = interestsRes?.data || [];
        setBadges({
          matches: 0, // matches are not "unread" — no badge needed
          messages: Array.isArray(convos) ? convos.filter((c: any) => c.unreadCount > 0).length : 0,
          interests: Array.isArray(interests) ? interests.filter((i: any) => !i.is_matched && i.is_matched !== 1).length : 0,
        });
      } catch {}
    }
    fetchBadges();
    const interval = setInterval(fetchBadges, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [user]);

  const totalNotifs = (badges.matches || 0) + (badges.messages || 0) + (badges.interests || 0);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const navItems = user.role === 'business' ? businessNavItems : workerNavItems;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-gray-200 bg-white lg:flex">
        {/* Logo */}
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xl font-extrabold">
            <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span><span className="text-gray-900">Staff</span><span className="text-blue-600">Now</span></span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <item.icon
                      className={`h-5 w-5 ${
                        isActive ? 'text-blue-600' : 'text-gray-400'
                      }`}
                    />
                    <span className="flex-1">{item.label}</span>
                    {item.label === 'Matches' && badges.matches > 0 && <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{badges.matches}</span>}
                    {item.label === 'Μηνύματα' && badges.messages > 0 && <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{badges.messages}</span>}
                    {item.label === 'Ενδιαφέρον' && badges.interests > 0 && <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{badges.interests}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="border-t p-4">
          <div className="flex items-center gap-3">
            {((user as any)?.avatar_url || (profile as any)?.photo_url || (profile as any)?.logo_url) ? (
              <img src={(user as any)?.avatar_url || (profile as any)?.photo_url || (profile as any)?.logo_url} alt="" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                {((user as any)?.display_name || (profile as any)?.full_name || (profile as any)?.company_name || user.email || '?').trim()[0]?.toUpperCase() || '?'}
              </div>
            )}
            <div className="flex-1 truncate">
              <p className="truncate text-sm font-medium text-gray-900">
                {((user as any)?.display_name || '').trim() || ((profile as any)?.full_name || '').trim() || ((profile as any)?.company_name || '').trim() || user.email}
              </p>
              <p className="truncate text-xs text-gray-500">
                {user.role === 'business' ? 'Επιχείρηση' : 'Εργαζόμενος'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full"
            onClick={() => logout()}
          >
            Αποσύνδεση
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b bg-white px-4 lg:hidden">
        <Link href="/" className="inline-flex items-center gap-1.5 text-lg font-extrabold">
          <svg className="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span><span className="text-gray-900">Staff</span><span className="text-blue-600">Now</span></span>
        </Link>
        <div className="flex items-center gap-2">
          {/* Notification bell with dropdown */}
          <div className="relative">
            <button onClick={() => setNotifOpen(!notifOpen)} className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
              {totalNotifs > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {totalNotifs}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-11 z-50 w-72 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
                <div className="border-b border-gray-100 px-4 py-2.5"><p className="text-sm font-semibold text-gray-900">Ειδοποιήσεις</p></div>
                <div className="max-h-64 overflow-y-auto">
                  {totalNotifs === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-400">Δεν υπάρχουν ειδοποιήσεις</div>
                  ) : (<>
                    {badges.messages > 0 && (
                      <Link href="/dashboard/messages" onClick={() => setNotifOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-50">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm">💬</span>
                        <div className="flex-1"><p className="text-sm font-medium text-gray-900">{badges.messages} αδιάβαστα μηνύματα</p><p className="text-xs text-gray-400">Πατήστε για να δείτε</p></div>
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{badges.messages}</span>
                      </Link>
                    )}
                    {badges.matches > 0 && (
                      <Link href="/dashboard/matches" onClick={() => setNotifOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-50">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm">🤝</span>
                        <div className="flex-1"><p className="text-sm font-medium text-gray-900">{badges.matches} matches</p><p className="text-xs text-gray-400">Δείτε τα ταιριάσματά σας</p></div>
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{badges.matches}</span>
                      </Link>
                    )}
                    {badges.interests > 0 && (
                      <Link href="/dashboard/interests" onClick={() => setNotifOpen(false)} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-50">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-100 text-sm">❤️</span>
                        <div className="flex-1"><p className="text-sm font-medium text-gray-900">{badges.interests} ενδιαφερόμενοι</p><p className="text-xs text-gray-400">Κάποιος ενδιαφέρθηκε για εσάς</p></div>
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{badges.interests}</span>
                      </Link>
                    )}
                  </>)}
                </div>
              </div>
            )}
          </div>
          <div className="relative">
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            {mobileMenuOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
            )}
          </button>
          {mobileMenuOpen && (
            <div className="absolute right-0 top-12 z-50 w-56 rounded-xl border border-gray-200 bg-white py-2 shadow-xl">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm ${pathname.startsWith(item.href) && item.href !== '/dashboard' ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
              <div className="my-1 border-t border-gray-100" />
              <button onClick={() => { setMobileMenuOpen(false); logout(); }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
                Αποσύνδεση
              </button>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-white lg:hidden safe-area-inset-bottom">
        {navItems.slice(0, 5).map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);
          const shortLabels: Record<string, string> = {
            'Αρχική': 'Αρχική',
            'Ανακάλυψη': 'Εύρεση',
            'Ενδιαφέρον': '❤️',
            'Matches': 'Match',
            'Μηνύματα': 'Chat',
            'Αγγελίες': 'Αγγελ.',
            'Προφίλ': 'Προφίλ',
            'Συνδρομή': 'Πλάνο',
            'Ρυθμίσεις': 'Ρυθμ.',
          };
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] ${
                isActive ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              <div className="relative">
                <item.icon className="h-5 w-5" />
                {item.label === 'Matches' && badges.matches > 0 && <span className="absolute -top-1.5 -right-2.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-bold text-white">{badges.matches}</span>}
                {item.label === 'Μηνύματα' && badges.messages > 0 && <span className="absolute -top-1.5 -right-2.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-bold text-white">{badges.messages}</span>}
              </div>
              <span className="truncate">{shortLabels[item.label] || item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Main content */}
      <main className="flex-1 pt-14 lg:ml-64 lg:pt-0">
        <div className="mx-auto max-w-7xl px-4 py-8 pb-20 sm:px-6 lg:px-8 lg:pb-8">
          {children}
        </div>
      </main>
    </div>
  );
}

/* Icon components */
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function DiscoverIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  );
}

function MatchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
  );
}

function MessageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
    </svg>
  );
}

function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  );
}

function BillingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  );
}

function JobsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
    </svg>
  );
}
