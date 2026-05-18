'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';

interface User { id: string; role: 'worker' | 'business' | 'admin'; email?: string; }

export default function AppV3Layout({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Routes that don't need auth
  const isPublic = pathname.startsWith('/app2/version3/login') || pathname.startsWith('/app2/version3/onboarding');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('staffnow_token') : null;
    if (!token) {
      if (!isPublic) router.replace('/app2/version3/login');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await res.json() as any;
        if (data?.success && data?.data?.user) {
          setUser(data.data.user);
          if (pathname === '/app2/version3/login') router.replace('/app2/version3/swipe');
        } else {
          localStorage.removeItem('staffnow_token');
          if (!isPublic) router.replace('/app2/version3/login');
        }
      } catch {
        if (!isPublic) router.replace('/app2/version3/login');
      } finally {
        setLoading(false);
      }
    })();
  }, [pathname, isPublic, router]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-5xl mb-3 animate-bounce">💼</div>
          <div className="text-2xl font-extrabold">Staff<span className="text-blue-200">Now</span></div>
          <div className="mt-4 h-7 w-7 mx-auto border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // On login/onboarding — no nav
  if (isPublic) {
    return <div className="fixed inset-0 overflow-y-auto bg-white">{children}</div>;
  }

  const isWorker = user?.role === 'worker';
  const isBusiness = user?.role === 'business';

  const tabs = isBusiness
    ? [
        { href: '/app2/version3/swipe', label: 'Discover', icon: '🔍' },
        { href: '/app2/version3/jobs', label: 'Θέσεις', icon: '💼' },
        { href: '/app2/version3/chat', label: 'Chat', icon: '💬' },
        { href: '/app2/version3/profile', label: 'Εγώ', icon: '👤' },
      ]
    : [
        { href: '/app2/version3/swipe', label: 'Swipe', icon: '🎯' },
        { href: '/app2/version3/matches', label: 'Matches', icon: '💖' },
        { href: '/app2/version3/chat', label: 'Chat', icon: '💬' },
        { href: '/app2/version3/profile', label: 'Εγώ', icon: '👤' },
      ];

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50 overflow-hidden">
      <div className="flex-1 overflow-hidden">{children}</div>

      <nav className="flex-shrink-0 bg-white border-t border-gray-200 flex items-center justify-around" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href} className="flex-1 flex flex-col items-center gap-0.5 py-2.5 relative">
              <span className={`text-xl transition-transform ${active ? 'scale-110' : 'grayscale opacity-60'}`}>{tab.icon}</span>
              <span className={`text-[10px] font-semibold ${active ? 'text-gray-900' : 'text-gray-400'}`}>{tab.label}</span>
              {active && <span className="absolute top-1 h-1 w-8 rounded-full bg-blue-600" />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
