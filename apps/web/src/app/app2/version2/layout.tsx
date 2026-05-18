'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const TABS = [
  {
    href: '/app2/version2/swipe',
    label: 'Swipe',
    icon: (active: boolean) => (
      <svg className={`h-6 w-6 ${active ? 'text-blue-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 8l-4 4 4 4" />
      </svg>
    ),
  },
  {
    href: '/app2/version2/matches',
    label: 'Matches',
    icon: (active: boolean) => (
      <svg className={`h-6 w-6 ${active ? 'text-pink-600' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733C11.285 4.876 9.624 3.75 7.688 3.75 5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    ),
  },
  {
    href: '/app2/version2/chat',
    label: 'Chat',
    icon: (active: boolean) => (
      <svg className={`h-6 w-6 ${active ? 'text-emerald-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.51c.88.28 1.5 1.12 1.5 2.1v4.28c0 1.13-.85 2.1-1.98 2.19-.34.03-.68.05-1.02.07v3.09l-3-3c-1.36 0-2.7-.05-4.02-.16a2.12 2.12 0 01-.83-.24m9.35-8.33c-.15-.03-.31-.06-.47-.08a48 48 0 00-8.05 0c-1.13.09-1.98 1.06-1.98 2.19v4.29c0 .84.46 1.58 1.16 1.95m9.35-8.33V6.64c0-1.62-1.15-3.03-2.76-3.24A48 48 0 0011.25 3c-2.12 0-4.2.14-6.24.4C3.4 3.63 2.25 5.03 2.25 6.64v6.23c0 1.62 1.15 3.03 2.76 3.24.58.07 1.16.14 1.74.19V21l4.15-4.15" />
      </svg>
    ),
  },
  {
    href: '/app2/version2/profile',
    label: 'Εγώ',
    icon: (active: boolean) => (
      <svg className={`h-6 w-6 ${active ? 'text-purple-600' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.12a7.5 7.5 0 0114.99 0A17.93 17.93 0 0112 21.75c-2.68 0-5.22-.58-7.5-1.63z" />
      </svg>
    ),
  },
];

export default function AppV2Layout({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '';

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50 overflow-hidden">
      {/* Content */}
      <div className="flex-1 overflow-hidden">{children}</div>

      {/* Bottom Nav */}
      <nav className="flex-shrink-0 bg-white border-t border-gray-200 flex items-center justify-around pb-safe" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 flex flex-col items-center gap-0.5 py-2.5"
            >
              {tab.icon(active)}
              <span className={`text-[10px] font-semibold ${active ? 'text-gray-900' : 'text-gray-400'}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
