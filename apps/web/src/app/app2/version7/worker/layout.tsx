'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { auth, getToken, stats as statsApi, type User } from '../_lib/api';
import { BottomTabs, FullPageSpinner, TabIcons } from '../_lib/ui';

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || '';
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);
  const [interests, setInterests] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!getToken()) {
        router.replace('/app2/version7/login');
        return;
      }
      try {
        const me = await auth.me();
        if (cancelled) return;
        if (me.user.role !== 'worker') {
          router.replace(
            me.user.role === 'business'
              ? '/app2/version7/business/home'
              : '/app2/version7/login',
          );
          return;
        }
        setUser(me.user);
      } catch {
        router.replace('/app2/version7/login');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const s = await statsApi.dashboard();
        if (!cancelled) {
          setUnread(s.unread_messages || 0);
          setInterests(s.pending_interests || 0);
        }
      } catch {}
    };
    refresh();
    const t = setInterval(refresh, 25000);
    return () => { cancelled = true; clearInterval(t); };
  }, [user]);

  if (loading || !user) return <FullPageSpinner />;

  // Order: Matches (left) · Αρχική · Swipe (center) · Μηνύματα · Προφίλ
  const items = [
    { href: '/app2/version7/worker/matches', label: 'Matches', icon: TabIcons.handshake, badge: interests, match: (p: string) => p.startsWith('/app2/version7/worker/matches') },
    { href: '/app2/version7/worker/home', label: 'Αρχική', icon: TabIcons.home, match: (p: string) => p === '/app2/version7/worker/home' },
    { href: '/app2/version7/worker/discover', label: 'Swipe', icon: TabIcons.swipe, match: (p: string) => p.startsWith('/app2/version7/worker/discover') },
    { href: '/app2/version7/worker/messages', label: 'Μηνύματα', icon: TabIcons.chat, badge: unread, match: (p: string) => p.startsWith('/app2/version7/worker/messages') },
    { href: '/app2/version7/worker/profile', label: 'Προφίλ', icon: TabIcons.user, match: (p: string) => p.startsWith('/app2/version7/worker/profile') || p.startsWith('/app2/version7/worker/settings') },
  ];

  return (
    <div className="fixed inset-0 flex flex-col bg-[#F5F7FB]">
      <div className="flex-1 overflow-hidden flex flex-col">{children}</div>
      <BottomTabs items={items} pathname={pathname} />
    </div>
  );
}
