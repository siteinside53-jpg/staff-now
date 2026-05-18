'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { auth, getToken, type User, stats as statsApi } from '../_lib/api';
import { haptic } from '../_lib/haptics';
import { FullPageSpinner } from '../_lib/ui';

interface NavItem {
  href: string;
  label: string;
  match: (pathname: string) => boolean;
  icon: React.ReactNode;
  badgeKey?: 'unread_messages' | 'pending_interests' | 'total_matches';
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || '';
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState<{
    unread_messages: number;
    pending_interests: number;
    total_matches: number;
  }>({ unread_messages: 0, pending_interests: 0, total_matches: 0 });

  // Auth guard
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!getToken()) {
        router.replace('/app2/version6/login');
        return;
      }
      try {
        const me = await auth.me();
        if (!cancelled) setUser(me.user);
      } catch {
        router.replace('/app2/version6/login');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Periodic badge refresh
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const fetchBadges = async () => {
      try {
        const s = await statsApi.dashboard();
        if (!cancelled)
          setBadges({
            unread_messages: s.unread_messages || 0,
            pending_interests: s.pending_interests || 0,
            total_matches: s.total_matches || 0,
          });
      } catch {}
    };
    fetchBadges();
    const id = setInterval(fetchBadges, 20000);
    const handler = () => fetchBadges();
    window.addEventListener('staffnow:refresh-badges', handler);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener('staffnow:refresh-badges', handler);
    };
  }, [user]);

  if (loading || !user) {
    return <FullPageSpinner />;
  }

  const isWorker = user.role === 'worker';

  const items: NavItem[] = isWorker
    ? [
        { href: '/app2/version6/dashboard', label: 'Αρχική', match: (p) => p === '/app2/version6/dashboard', icon: <IconHome /> },
        { href: '/app2/version6/dashboard/swipe', label: 'Swipe', match: (p) => p.startsWith('/app2/version6/dashboard/swipe'), icon: <IconSwipe /> },
        { href: '/app2/version6/dashboard/matches', label: 'Ταίρια', match: (p) => p.startsWith('/app2/version6/dashboard/matches'), icon: <IconHeart />, badgeKey: 'pending_interests' },
        { href: '/app2/version6/dashboard/chat', label: 'Chat', match: (p) => p.startsWith('/app2/version6/dashboard/chat'), icon: <IconChat />, badgeKey: 'unread_messages' },
        { href: '/app2/version6/dashboard/profile', label: 'Εγώ', match: (p) => p.startsWith('/app2/version6/dashboard/profile') || p.startsWith('/app2/version6/dashboard/settings'), icon: <IconUser /> },
      ]
    : [
        { href: '/app2/version6/dashboard', label: 'Αρχική', match: (p) => p === '/app2/version6/dashboard', icon: <IconHome /> },
        { href: '/app2/version6/dashboard/swipe', label: 'Discover', match: (p) => p.startsWith('/app2/version6/dashboard/swipe'), icon: <IconSwipe /> },
        { href: '/app2/version6/dashboard/jobs', label: 'Αγγελίες', match: (p) => p.startsWith('/app2/version6/dashboard/jobs'), icon: <IconBriefcase /> },
        { href: '/app2/version6/dashboard/chat', label: 'Chat', match: (p) => p.startsWith('/app2/version6/dashboard/chat'), icon: <IconChat />, badgeKey: 'unread_messages' },
        { href: '/app2/version6/dashboard/profile', label: 'Εγώ', match: (p) => p.startsWith('/app2/version6/dashboard/profile') || p.startsWith('/app2/version6/dashboard/settings'), icon: <IconUser /> },
      ];

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50">
      <main className="flex-1 overflow-y-auto" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {children}
      </main>
      <nav
        className="flex-shrink-0 flex items-stretch border-t border-gray-100 bg-white"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {items.map((item) => {
          const active = item.match(pathname);
          const badge = item.badgeKey ? badges[item.badgeKey] : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => haptic('light')}
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition-colors ${
                active ? 'text-blue-600' : 'text-gray-500'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <span className={`relative inline-flex h-6 w-6 items-center justify-center transition-transform ${active ? 'scale-110' : ''}`}>
                {item.icon}
                {badge > 0 && (
                  <span className="absolute -top-1 -right-2 inline-flex min-w-[16px] h-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-extrabold text-white">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </span>
              <span>{item.label}</span>
              {active && <span className="absolute top-0 inset-x-6 h-0.5 rounded-b bg-blue-600" />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function IconHome() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10h4v-6h6v6h4V10" />
    </svg>
  );
}
function IconSwipe() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h12M4 17h8" />
    </svg>
  );
}
function IconHeart() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  );
}
function IconChat() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 0 1-3.99-.832L3 21l1.832-5.01A8.95 8.95 0 0 1 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z" />
    </svg>
  );
}
function IconBriefcase() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0 1 12 15c-3.183 0-6.22-.62-9-1.745M16 6V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v1m12 0H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2Z" />
    </svg>
  );
}
function IconUser() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm-4 7a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7Z" />
    </svg>
  );
}
