'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';

export default function DashV4Layout({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('staffnow_token');
    if (!token) {
      router.replace('/app2/version4/login');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json() as any;
        if (data?.success && data?.data?.user) {
          setUser(data.data.user);
        } else {
          localStorage.removeItem('staffnow_token');
          router.replace('/app2/version4/login');
        }
      } catch {
        router.replace('/app2/version4/login');
      } finally { setLoading(false); }
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-5xl mb-3">💼</div>
          <div className="h-7 w-7 mx-auto border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const isBusiness = user.role === 'business';

  const tabs = isBusiness
    ? [
        { href: '/app2/version4/dashboard', label: 'Home', icon: '🏠' },
        { href: '/app2/version4/dashboard/swipe', label: 'Discover', icon: '🔍' },
        { href: '/app2/version4/dashboard/jobs', label: 'Θέσεις', icon: '💼' },
        { href: '/app2/version4/dashboard/chat', label: 'Chat', icon: '💬' },
        { href: '/app2/version4/dashboard/profile', label: 'Εγώ', icon: '👤' },
      ]
    : [
        { href: '/app2/version4/dashboard', label: 'Home', icon: '🏠' },
        { href: '/app2/version4/dashboard/swipe', label: 'Swipe', icon: '🎯' },
        { href: '/app2/version4/dashboard/matches', label: 'Matches', icon: '💖' },
        { href: '/app2/version4/dashboard/chat', label: 'Chat', icon: '💬' },
        { href: '/app2/version4/dashboard/profile', label: 'Εγώ', icon: '👤' },
      ];

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50 overflow-hidden">
      <div className="flex-1 overflow-hidden">{children}</div>
      <nav className="flex-shrink-0 bg-white border-t border-gray-200 flex items-center justify-around" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {tabs.map((tab) => {
          const active = pathname === tab.href || (tab.href !== '/app2/version4/dashboard' && pathname.startsWith(tab.href));
          return (
            <Link key={tab.href} href={tab.href} className="flex-1 flex flex-col items-center gap-0.5 py-2 relative">
              <span className={`text-lg transition-transform ${active ? 'scale-110' : 'grayscale opacity-60'}`}>{tab.icon}</span>
              <span className={`text-[9px] font-semibold ${active ? 'text-gray-900' : 'text-gray-400'}`}>{tab.label}</span>
              {active && <span className="absolute top-0 h-1 w-6 rounded-full bg-blue-600" />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
