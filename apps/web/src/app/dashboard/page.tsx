'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { AIHiringChat } from '@/components/dashboard/ai-hiring-chat';

interface DashboardStats {
  totalMatches: number;
  unreadMessages: number;
  profileViews: number;
  pendingInterests: number;
  activeJobs?: number;
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const token = localStorage.getItem('staffnow_token');
        const API = process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';
        const res = await fetch(`${API}/stats/dashboard`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const json = await res.json() as any;

        if (json.success && json.data) {
          const d = json.data;
          setStats({
            totalMatches: d.total_matches || 0,
            unreadMessages: d.unread_messages || 0,
            profileViews: d.profile_views || 0,
            pendingInterests: d.pending_interests || 0,
            activeJobs: d.active_jobs || 0,
          });
        } else {
          throw new Error('no data');
        }
      } catch {
        setStats({ totalMatches: 0, unreadMessages: 0, profileViews: 0, pendingInterests: 0, activeJobs: 0 });
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [user?.role]);

  const isWorker = user?.role === 'worker';
  const isBusiness = user?.role === 'business';

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
      label: 'Μηνύματα',
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
      label: 'Αιτήματα',
      value: stats?.pendingInterests ?? 0,
      href: '/dashboard/interests',
      color: 'bg-amber-500',
      icon: (
        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
        </svg>
      ),
    },
    {
      label: 'Προβολές',
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

  // Onboarding steps — completion requires REAL data, not just whatever the
  // user put in the registration form. We check core fields + at least one
  // role/business-type so the «Δημιουργία Προφίλ» step can't auto-tick from
  // signup data alone.
  const prof = profile as any;
  const hasFullName = !!(prof?.full_name && prof.full_name.trim().length > 0);
  const hasLocation = !!(
    (prof?.city && prof.city.trim().length > 0) ||
    (prof?.region && prof.region.trim().length > 0)
  );
  const workerRoles = Array.isArray(prof?.roles)
    ? prof.roles
    : Array.isArray(prof?.job_roles)
      ? prof.job_roles
      : [];
  const hasAtLeastOneRole = workerRoles.length > 0;
  const hasCompanyName = !!(prof?.company_name && prof.company_name.trim().length > 0);
  const hasBusinessType = !!(prof?.business_type && prof.business_type.trim().length > 0);

  const hasProfile = isWorker
    ? hasFullName && hasLocation && hasAtLeastOneRole
    : hasCompanyName && (hasBusinessType || hasLocation);
  const hasJobs = (stats?.activeJobs || 0) > 0;
  const hasSwiped = (stats?.pendingInterests || 0) > 0 || (stats?.totalMatches || 0) > 0;
  const hasMatches = (stats?.totalMatches || 0) > 0;
  const hasSentMessage = hasMatches;

  const workerSteps = [
    { label: 'Δημιουργία Προφίλ', desc: 'Συμπλήρωσε το προφίλ σου με εμπειρία, δεξιότητες και τοποθεσία', done: hasProfile, href: '/dashboard/profile', icon: '👤' },
    { label: 'Βρες Εργασία', desc: 'Κάνε swipe σε θέσεις εργασίας που σε ενδιαφέρουν', done: hasSwiped, href: '/dashboard/discover', icon: '🔍' },
    { label: 'Αναμονή για Match', desc: 'Όταν και η επιχείρηση δείξει ενδιαφέρον, γίνεται match!', done: hasMatches, href: '/dashboard/matches', icon: '🎯' },
    { label: 'Στείλε Μήνυμα', desc: 'Ξεκίνα συνομιλία με την επιχείρηση και κλείσε τη θέση', done: hasSentMessage, href: '/dashboard/messages', icon: '💬' },
  ];

  const businessSteps = [
    { label: 'Δημιουργία Προφίλ', desc: 'Συμπλήρωσε τα στοιχεία της επιχείρησής σου', done: hasProfile, href: '/dashboard/profile', icon: '🏢' },
    { label: 'Δημοσίευση Αγγελίας', desc: 'Δημιούργησε και δημοσίευσε τη θέση εργασίας', done: hasJobs, href: '/dashboard/jobs', icon: '📋' },
    { label: 'Βρες Προσωπικό', desc: 'Κάνε swipe σε υποψήφιους εργαζόμενους', done: hasSwiped, href: '/dashboard/discover', icon: '🔍' },
    { label: 'Αναμονή για Match', desc: 'Όταν και ο εργαζόμενος δείξει ενδιαφέρον, γίνεται match!', done: hasMatches, href: '/dashboard/matches', icon: '🎯' },
    { label: 'Στείλε Μήνυμα', desc: 'Επικοινώνησε και κλείσε τη συνεργασία', done: hasSentMessage, href: '/dashboard/messages', icon: '💬' },
  ];

  const steps = isWorker ? workerSteps : businessSteps;
  const completedCount = steps.filter((s) => s.done).length;
  const nextStep = steps.find((s) => !s.done);
  const pendingSteps = steps.filter((s) => !s.done);
  const allDone = pendingSteps.length === 0;

  return (
    <div>
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Καλώς ήρθες{(profile as any)?.full_name || (profile as any)?.company_name ? `, ${(profile as any)?.full_name || (profile as any)?.company_name}` : ''}! 👋
        </h1>
        <p className="mt-1 text-gray-600">
          {completedCount === steps.length
            ? 'Έχεις ολοκληρώσει όλα τα βήματα! Συνέχισε να ανακαλύπτεις ευκαιρίες.'
            : `Βήμα ${completedCount + 1} από ${steps.length} — ${nextStep?.label || ''}`}
        </p>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner className="h-8 w-8" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {statCards.map((stat) => (
            <Link key={stat.label} href={stat.href}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg ${stat.color}`}>
                    {stat.icon}
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Onboarding Checklist — όλα τα βήματα ορατά συνέχεια (✓ τα ολοκληρωμένα).
          Η κάρτα φεύγει ΜΟΝΟ όταν τελειώσουν όλα. Στη θέση της εμφανίζεται
          το main CTA "Βρες Εργασία / Βρες Προσωπικό". */}
      {!allDone && (
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">📋 Τα βήματά σου</h2>
                <p className="text-sm text-gray-500">Ακολούθησε τα βήματα για να ξεκινήσεις</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-24 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${(completedCount / steps.length) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-gray-500">{completedCount}/{steps.length}</span>
              </div>
            </div>

            <div className="space-y-3">
              {steps.map((step, i) => {
                const isNext = !step.done && steps.slice(0, i).every((s) => s.done);
                return (
                  <Link key={step.label} href={step.href}>
                    <div className={`flex items-center gap-4 rounded-xl p-4 transition-all ${
                      step.done
                        ? 'bg-emerald-50 border border-emerald-200'
                        : isNext
                          ? 'bg-blue-50 border-2 border-blue-300 shadow-sm'
                          : 'bg-gray-50 border border-gray-200 opacity-60'
                    }`}>
                      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold ${
                        step.done
                          ? 'bg-emerald-500 text-white'
                          : isNext
                            ? 'bg-blue-600 text-white animate-pulse'
                            : 'bg-gray-300 text-white'
                      }`}>
                        {step.done ? '✓' : step.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold ${step.done ? 'text-emerald-700 line-through' : isNext ? 'text-blue-900' : 'text-gray-500'}`}>
                          {step.label}
                        </p>
                        <p className={`text-xs mt-0.5 ${step.done ? 'text-emerald-600' : isNext ? 'text-blue-700' : 'text-gray-400'}`}>
                          {step.done ? 'Ολοκληρώθηκε ✓' : step.desc}
                        </p>
                      </div>

                      {!step.done && (
                        <svg className={`h-5 w-5 flex-shrink-0 ${isNext ? 'text-blue-600' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Όταν όλα τα βήματα έχουν ολοκληρωθεί, εμφανίζουμε ένα subtle κουμπί
          για το main action (Βρες προσωπικό / Βρες δουλειά) στη θέση του
          checklist — διατηρώντας το υπάρχον design του dashboard. */}
      {allDone && (
        <>
          <Link
            href="/dashboard/discover"
            className={`relative mb-8 block rounded-3xl ${
              isWorker
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                : 'bg-gradient-to-br from-purple-500 to-pink-600'
            } text-white p-5 shadow-xl active:scale-[0.98] transition-transform overflow-hidden cta-pulse`}
          >
            {/* Pulse halo */}
            <span
              className={`absolute inset-0 rounded-3xl ${
                isWorker ? 'bg-emerald-400' : 'bg-pink-400'
              } opacity-40 cta-halo`}
            />
            {/* Shimmer */}
            <span
              className="absolute inset-0 pointer-events-none cta-shimmer"
              style={{
                background:
                  'linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%)',
              }}
            />

            <div className="relative flex items-center gap-4">
              <div className="text-4xl cta-icon">{isWorker ? '🎯' : '🔍'}</div>
              <div className="flex-1">
                <p className="text-lg font-black">
                  {isWorker ? 'Βρες Εργασία' : 'Βρες Προσωπικό'}
                </p>
                <p className="text-xs text-white/90">
                  {isWorker ? 'Πάτα εδώ για να δεις θέσεις' : 'Πάτα εδώ για να δεις υποψηφίους'}
                </p>
              </div>
              <span className="text-2xl font-black">→</span>
            </div>
          </Link>

          <style jsx>{`
            @keyframes ctaPulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.015); }
            }
            @keyframes ctaHalo {
              0%, 100% { transform: scale(1); opacity: 0; }
              50% { transform: scale(1.06); opacity: 0.35; }
            }
            @keyframes ctaShimmer {
              0% { transform: translateX(-100%); }
              50% { transform: translateX(100%); }
              100% { transform: translateX(100%); }
            }
            @keyframes ctaIcon {
              0%, 100% { transform: scale(1) rotate(0deg); }
              50% { transform: scale(1.15) rotate(-8deg); }
            }
            .cta-pulse { animation: ctaPulse 2.4s ease-in-out infinite; }
            .cta-halo { animation: ctaHalo 2.4s ease-in-out infinite; }
            .cta-shimmer { animation: ctaShimmer 3s ease-in-out infinite; }
            .cta-icon { animation: ctaIcon 1.8s ease-in-out infinite; }
          `}</style>
        </>
      )}

      {/* AI Hiring Chat — businesses only (Pro+ gated server-side) */}
      {isBusiness && (
        <div className="mt-8">
          <AIHiringChat />
        </div>
      )}
    </div>
  );
}
