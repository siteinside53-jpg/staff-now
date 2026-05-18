'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: number | string;
  section?: string;
}

const NAV: NavItem[] = [
  { href: '/admin/overview', label: 'Επισκόπηση', icon: '📊', section: 'Κεντρικά' },
  { href: '/admin/users', label: 'Χρήστες', icon: '👥', section: 'Κεντρικά' },
  { href: '/admin/employers', label: 'Επιχειρήσεις', icon: '🏢', section: 'Κεντρικά' },
  { href: '/admin/workers', label: 'Εργαζόμενοι', icon: '👤', section: 'Κεντρικά' },

  { href: '/admin/jobs', label: 'Αγγελίες', icon: '💼', section: 'Marketplace' },
  { href: '/admin/matches', label: 'Matches', icon: '🎯', section: 'Marketplace' },
  { href: '/admin/messages', label: 'Μηνύματα', icon: '💬', section: 'Marketplace' },

  { href: '/admin/reports', label: 'Αναφορές', icon: '🚨', section: 'Trust & Safety' },
  { href: '/admin/notifications', label: 'Ειδοποιήσεις', icon: '🔔', section: 'Trust & Safety' },
  { href: '/admin/security', label: 'Ασφάλεια', icon: '🛡️', section: 'Trust & Safety' },
  { href: '/admin/audit-log', label: 'Audit Log', icon: '📜', section: 'Trust & Safety' },
  { href: '/admin/data-changes', label: 'Αλλαγές Δεδομένων', icon: '🗂️', section: 'Trust & Safety' },

  { href: '/admin/subscriptions', label: 'Συνδρομές', icon: '🎟️', section: 'Οικονομικά' },
  { href: '/admin/payments', label: 'Πληρωμές', icon: '💳', section: 'Οικονομικά' },
  { href: '/admin/analytics', label: 'KPIs / Analytics', icon: '📈', section: 'Οικονομικά' },

  { href: '/admin/settings', label: 'Ρυθμίσεις Πλατφόρμας', icon: '⚙️', section: 'Διαχείριση' },
  { href: '/admin/admin-users', label: 'Ομάδα Admin', icon: '🛡️', section: 'Διαχείριση' },
];

export function AdminSidebar({ onNavigate, badges = {} }: { onNavigate?: () => void; badges?: Record<string, number> }) {
  const pathname = usePathname();

  // Group by section preserving order
  const sections: { name: string; items: NavItem[] }[] = [];
  for (const item of NAV) {
    const sectionName = item.section || 'Άλλα';
    let section = sections.find((s) => s.name === sectionName);
    if (!section) {
      section = { name: sectionName, items: [] };
      sections.push(section);
    }
    section.items.push(item);
  }

  return (
    <aside className="flex h-full flex-col bg-[#0B1020] text-gray-300">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 border-b border-white/5 px-6">
        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="12" fill="#3B82F6" />
          <path d="M7.5 12.5l3 3 6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div>
          <p className="text-sm font-extrabold text-white">StaffNow</p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-blue-400">Admin Panel</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {sections.map((sec) => (
          <div key={sec.name}>
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-white/40">{sec.name}</p>
            <div className="space-y-0.5">
              {sec.items.map((item) => {
                const active = pathname === item.href || (pathname || '').startsWith(item.href + '/');
                const badge = badges[item.href];
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base">{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </span>
                    {badge != null && badge > 0 && (
                      <span className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${active ? 'bg-white/20 text-white' : 'bg-red-500 text-white'}`}>
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/5 p-4">
        <Link href="/dashboard" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-gray-400 hover:text-white">
          ← Πίσω στο user dashboard
        </Link>
      </div>
    </aside>
  );
}
