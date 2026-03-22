'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

interface DashboardStats {
  totalMatches: number;
  unreadMessages: number;
  profileViews: number;
  activeJobs?: number;
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [matchesRes, conversationsRes, notificationsRes] = await Promise.all([
          api.matches.list({ limit: 0 }),
          api.conversations.list({ limit: 0 }),
          api.notifications.list({ unread: true, limit: 0 }),
        ]);

        const dashStats: DashboardStats = {
          totalMatches: matchesRes.total || 0,
          unreadMessages: conversationsRes.unreadCount || 0,
          profileViews: notificationsRes.total || 0,
        };

        if (profile?.role === 'business') {
          const jobsRes = await api.jobs.list({ limit: 0 });
          dashStats.activeJobs = jobsRes.total || 0;
        }

        setStats(dashStats);
      } catch {
        setStats({
          totalMatches: 0,
          unreadMessages: 0,
          profileViews: 0,
          activeJobs: 0,
        });
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [profile?.role]);

  const isWorker = profile?.role === 'worker';
  const isBusiness = profile?.role === 'business';

  const statCards = [
    {
      label: 'Matches',
      value: stats?.totalMatches ?? 0,
      href: '/dashboard/matches',
      color: 'bg-blue-500',
      icon: (
        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
        </svg>
      ),
    },
    {
      label: 'Αδιάβαστα Μηνύματα',
      value: stats?.unreadMessages ?? 0,
      href: '/dashboard/messages',
      color: 'bg-emerald-500',
      icon: (
        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
        </svg>
      ),
    },
    {
      label: 'Προβολές Προφίλ',
      value: stats?.profileViews ?? 0,
      href: '/dashboard/profile',
      color: 'bg-purple-500',
      icon: (
        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      ),
    },
    ...(isBusiness
      ? [
          {
            label: 'Ενεργές Αγγελίες',
            value: stats?.activeJobs ?? 0,
            href: '/dashboard/jobs',
            color: 'bg-amber-500',
            icon: (
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            ),
          },
        ]
      : []),
  ];

  const quickLinks = isWorker
    ? [
        { label: 'Ανακάλυψη Θέσεων', href: '/dashboard/discover', description: 'Κάνε swipe σε νέες ευκαιρίες' },
        { label: 'Επεξεργασία Προφίλ', href: '/dashboard/profile', description: 'Ενημέρωσε τις δεξιότητές σου' },
        { label: 'Αναβάθμιση Πλάνου', href: '/dashboard/billing', description: 'Ξεκλείδωσε περισσότερες δυνατότητες' },
      ]
    : [
        { label: 'Δημοσίευσε Αγγελία', href: '/dashboard/jobs', description: 'Βρες προσωπικό γρήγορα' },
        { label: 'Ανακάλυψη Υποψηφίων', href: '/dashboard/discover', description: 'Κάνε swipe σε υποψηφίους' },
        { label: 'Επεξεργασία Προφίλ', href: '/dashboard/profile', description: 'Ενημέρωσε τα στοιχεία σου' },
      ];

  return (
    <div>
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Καλώς ήρθες{profile?.name ? `, ${profile.name}` : ''}!
        </h1>
        <p className="mt-1 text-gray-600">
          {isWorker
            ? 'Δες τα τελευταία ταιριάσματα και ξεκίνα να ανακαλύπτεις θέσεις.'
            : 'Διαχειρίσου τις αγγελίες σου και βρες υποψηφίους.'}
        </p>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Link key={stat.label} href={stat.href}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-5">
                  <div
                    className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg ${stat.color}`}
                  >
                    {stat.icon}
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Quick Links */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">Γρήγορες Ενέργειες</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-gray-900">{link.label}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {link.description}
                  </p>
                  <span className="mt-3 inline-flex items-center text-sm font-medium text-blue-600">
                    Μετάβαση
                    <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
