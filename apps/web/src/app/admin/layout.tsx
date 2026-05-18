'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Toaster } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { Spinner } from '@/components/ui/spinner';
import { AdminSidebar } from '@/components/admin/layout/admin-sidebar';
import { AdminTopbar } from '@/components/admin/layout/admin-topbar';
import { adminApi } from '@/components/admin/lib/admin-api';

const PAGE_META: Record<string, { title: string; subtitle?: string }> = {
  '/admin/overview': { title: 'Επισκόπηση', subtitle: 'Πλήρης εικόνα της πλατφόρμας σε πραγματικό χρόνο' },
  '/admin/users': { title: 'Χρήστες', subtitle: 'Διαχείριση όλων των χρηστών' },
  '/admin/employers': { title: 'Επιχειρήσεις', subtitle: 'Διαχείριση επιχειρήσεων και συνδρομών' },
  '/admin/workers': { title: 'Εργαζόμενοι', subtitle: 'Διαχείριση εργαζομένων και προφίλ' },
  '/admin/jobs': { title: 'Αγγελίες', subtitle: 'Μετριοπαθής διαχείριση περιεχομένου' },
  '/admin/matches': { title: 'Matches', subtitle: 'Παρακολούθηση matching και conversion' },
  '/admin/messages': { title: 'Μηνύματα', subtitle: 'Trust & Safety moderation' },
  '/admin/reports': { title: 'Αναφορές', subtitle: 'Κέντρο Trust & Safety' },
  '/admin/subscriptions': { title: 'Συνδρομές', subtitle: 'Plans, churn, conversion' },
  '/admin/payments': { title: 'Πληρωμές', subtitle: 'Συναλλαγές και επιστροφές' },
  '/admin/analytics': { title: 'KPIs / Analytics', subtitle: 'Metrics και funnels' },
  '/admin/notifications': { title: 'Ειδοποιήσεις', subtitle: 'System events feed' },
  '/admin/settings': { title: 'Ρυθμίσεις Πλατφόρμας', subtitle: 'Pricing, categories, feature flags' },
  '/admin/admin-users': { title: 'Ομάδα Admin', subtitle: 'Roles και permissions' },
  '/admin/audit-log': { title: 'Audit Log', subtitle: 'Πλήρες ιστορικό admin ενεργειών' },
  '/admin/data-changes': { title: 'Αλλαγές Δεδομένων', subtitle: 'Files, profiles & αγγελίες — με before/after' },
  '/admin/security': { title: 'Ασφάλεια', subtitle: 'Errors, ύποπτη δραστηριότητα & live monitoring' },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [badges, setBadges] = useState<Record<string, number>>({});

  // Auth gate: only admins
  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  // Load nav badges — "new since last visit" counts for every section.
  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const c = await adminApi.getNavCounts();
        if (cancelled) return;
        setBadges({
          '/admin/jobs': c.jobs,
          '/admin/users': c.users,
          '/admin/employers': c.employers,
          '/admin/workers': c.workers,
          '/admin/matches': c.matches,
          '/admin/messages': c.messages,
          '/admin/reports': c.reports,
          '/admin/security': c.security,
          '/admin/notifications': c.notifications,
        });
      } catch {}
    };
    refresh();
    const t = setInterval(refresh, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [user]);

  // Auto-mark current section as "seen" on navigation so the badge clears.
  useEffect(() => {
    if (!user || user.role !== 'admin' || !pathname) return;
    const map: Record<string, string> = {
      '/admin/jobs': 'jobs',
      '/admin/users': 'users',
      '/admin/employers': 'employers',
      '/admin/workers': 'workers',
      '/admin/matches': 'matches',
      '/admin/messages': 'messages',
      '/admin/reports': 'reports',
      '/admin/security': 'security',
      '/admin/notifications': 'notifications',
    };
    // Match either exact path or sub-route (e.g. /admin/jobs/123).
    const matched = Object.keys(map).find(
      (k) => pathname === k || pathname.startsWith(k + '/'),
    );
    if (!matched) return;
    const section = map[matched];
    // Optimistic clear so the user sees instant feedback.
    setBadges((prev) => ({ ...prev, [matched]: 0 }));
    adminApi.markNavSeen(section).catch(() => {});
  }, [pathname, user]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (user.role !== 'admin') {
    return null; // redirecting
  }

  const meta = PAGE_META[pathname || '/admin/overview'] || { title: 'Admin', subtitle: '' };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-shrink-0 lg:block">
        <AdminSidebar badges={badges} />
      </aside>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 lg:hidden">
            <AdminSidebar onNavigate={() => setMobileOpen(false)} badges={badges} />
          </aside>
        </>
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminTopbar
          title={meta.title}
          subtitle={meta.subtitle}
          adminEmail={user.email}
          onMobileMenu={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>

      <Toaster position="top-right" richColors />
    </div>
  );
}
