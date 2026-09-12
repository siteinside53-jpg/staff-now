'use client';

import Link from 'next/link';
import { localeHeaders } from '@/lib/api';
import { useEffect, useMemo, useRef, useState } from 'react';
import { WORKER_JOB_ROLE_LABELS_EL } from '@staffnow/config';
import { useT } from '@/i18n/locale-provider';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://staffnow-api-production.siteinside53.workers.dev';

/** Πόσες κάρτες μπορεί να δει ο επισκέπτης πριν το κλείδωμα εγγραφής. */
const FREE_SWIPES = 3;

type Mode = 'jobs' | 'workers';

interface Job {
  id: string;
  title: string;
  city: string | null;
  region: string | null;
  employment_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_type: string | null;
  housing_provided?: number;
  meals_provided?: number;
  created_at: string;
  display_company_name?: string | null;
  company_logo?: string | null;
  company_cover_photo?: string | null;
  roles?: string[];
}

interface Worker {
  user_id: string;
  full_name: string;
  photo_url: string | null;
  city: string | null;
  region: string | null;
  years_of_experience: number | null;
  availability: string | null;
  employment_type: string | null;
  verified?: number | boolean;
  bio?: string | null;
  roles?: string[];
}

/** Η κύρια εικόνα της κάρτας αγγελίας: cover φωτογραφία → λογότυπο → καμία. */
function heroImage(j: Job): string | null {
  return j.company_cover_photo || j.company_logo || null;
}

/** Στοιχεία με εικόνα πρώτα, μετά τα υπόλοιπα (σταθερή σειρά). */
function withImagesFirst<T>(list: T[], img: (x: T) => string | null): T[] {
  return [...list].sort((a, b) => (img(b) ? 1 : 0) - (img(a) ? 1 : 0));
}

/**
 * Demo δεδομένα ΜΟΝΟ για local development ώστε να φαίνεται το UX.
 * Το `process.env.NODE_ENV !== 'production'` γίνεται tree-shake στο production build,
 * οπότε ΠΟΤΕ δεν φτάνει στους πραγματικούς χρήστες — εκεί δείχνει μόνο πραγματικά.
 */
const DEV_DEMO_JOBS: Job[] =
  process.env.NODE_ENV !== 'production'
    ? [
        { id: 'demo-1', title: 'Σερβιτόρος/α', city: 'Μύκονος', region: 'Κυκλάδες', employment_type: 'seasonal', salary_min: 1200, salary_max: 1500, salary_type: 'monthly', housing_provided: 1, meals_provided: 1, created_at: new Date(Date.now() - 2 * 3600e3).toISOString(), display_company_name: 'Sunset Beach Bar', company_cover_photo: 'https://images.unsplash.com/photo-1544148103-0773bf10d330?w=600&h=400&fit=crop', roles: ['waiter'] },
        { id: 'demo-2', title: 'Πωλητής/τρια', city: 'Αθήνα', region: 'Αττική', employment_type: 'full_time', salary_min: 900, salary_max: 1200, salary_type: 'monthly', created_at: new Date(Date.now() - 5 * 3600e3).toISOString(), display_company_name: 'Fashion Store', company_cover_photo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=400&fit=crop', roles: ['retail_seller'] },
        { id: 'demo-3', title: 'Αποθηκάριος', city: 'Θεσσαλονίκη', region: 'Θεσσαλονίκη', employment_type: 'full_time', salary_min: 1100, salary_max: 1400, salary_type: 'monthly', created_at: new Date(Date.now() - 26 * 3600e3).toISOString(), display_company_name: 'Express Logistics', roles: ['warehouse'] },
        { id: 'demo-4', title: 'Barista', city: 'Πάτρα', region: 'Αχαΐα', employment_type: 'part_time', salary_min: 6, salary_max: 7, salary_type: 'hourly', created_at: new Date(Date.now() - 3 * 24 * 3600e3).toISOString(), display_company_name: 'Coffee Lab', company_cover_photo: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=400&fit=crop', roles: ['barista'] },
        { id: 'demo-5', title: 'Μάγειρας Σεφ', city: 'Χανιά', region: 'Κρήτη', employment_type: 'full_time', salary_min: 1600, salary_max: 2000, salary_type: 'monthly', meals_provided: 1, created_at: new Date(Date.now() - 6 * 3600e3).toISOString(), display_company_name: 'Ταβέρνα Ο Μανόλης', company_cover_photo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop', roles: ['chef'] },
      ]
    : [];

const DEV_DEMO_WORKERS: Worker[] =
  process.env.NODE_ENV !== 'production'
    ? [
        { user_id: 'demo-w1', full_name: 'Μαρία Κ.', photo_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=600&fit=crop', city: 'Μύκονος', region: 'Κυκλάδες', years_of_experience: 5, availability: 'immediate', employment_type: 'seasonal', verified: 1, roles: ['waiter', 'bartender'] },
        { user_id: 'demo-w2', full_name: 'Γιώργος Π.', photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop', city: 'Αθήνα', region: 'Αττική', years_of_experience: 8, availability: 'within_7_days', employment_type: 'full_time', verified: 1, roles: ['chef'] },
        { user_id: 'demo-w3', full_name: 'Ελένη Δ.', photo_url: null, city: 'Θεσσαλονίκη', region: 'Θεσσαλονίκη', years_of_experience: 2, availability: 'part_time', employment_type: 'part_time', verified: 0, roles: ['retail_seller'] },
        { user_id: 'demo-w4', full_name: 'Νίκος Α.', photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop', city: 'Πάτρα', region: 'Αχαΐα', years_of_experience: 3, availability: 'immediate', employment_type: 'full_time', verified: 0, roles: ['barista'] },
        { user_id: 'demo-w5', full_name: 'Σοφία Μ.', photo_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=600&fit=crop', city: 'Χανιά', region: 'Κρήτη', years_of_experience: 6, availability: 'seasonal', employment_type: 'seasonal', verified: 1, roles: ['receptionist', 'housekeeping'] },
      ]
    : [];

type TFn = (key: string, params?: Record<string, string | number>) => string;

const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'seasonal', 'contract', 'temporary'];
const AVAILABILITY_TYPES = ['immediate', 'within_7_days', 'seasonal', 'part_time', 'full_time'];

function employmentLabelOf(t: TFn, type: string | null | undefined): string | null {
  return type && EMPLOYMENT_TYPES.includes(type) ? t(`swipeTeaser.employment.${type}`) : null;
}

function availabilityLabelOf(t: TFn, type: string | null | undefined): string | null {
  return type && AVAILABILITY_TYPES.includes(type) ? t(`swipeTeaser.availability.${type}`) : null;
}

function timeAgo(iso: string, t: TFn): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('swipeTeaser.timeAgo.justNow');
  if (mins < 60) return t('swipeTeaser.timeAgo.minutes', { n: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t(hours === 1 ? 'swipeTeaser.timeAgo.hourOne' : 'swipeTeaser.timeAgo.hourMany', { n: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t(days === 1 ? 'swipeTeaser.timeAgo.dayOne' : 'swipeTeaser.timeAgo.dayMany', { n: days });
  const weeks = Math.floor(days / 7);
  return t(weeks === 1 ? 'swipeTeaser.timeAgo.weekOne' : 'swipeTeaser.timeAgo.weekMany', { n: weeks });
}

function salaryText(j: Job, t: TFn): string | null {
  if (j.salary_min == null && j.salary_max == null) return null;
  const suffix =
    j.salary_type === 'hourly' ? t('swipeTeaser.salary.hourly') :
    j.salary_type === 'daily' ? t('swipeTeaser.salary.daily') :
    j.salary_type === 'monthly' ? t('swipeTeaser.salary.monthly') : '€';
  if (j.salary_min != null && j.salary_max != null)
    return `${j.salary_min}–${j.salary_max} ${suffix}`;
  return `${j.salary_min ?? j.salary_max} ${suffix}`;
}

function initials(name?: string | null, fallback = '💼'): string {
  const n = (name || '').trim();
  if (!n) return fallback;
  const parts = n.split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || fallback;
}

function roleLabel(role: string): string {
  return WORKER_JOB_ROLE_LABELS_EL[role] || role;
}

/** Ενιαίο μοντέλο κάρτας ώστε το ίδιο JSX να δείχνει και αγγελία και προφίλ. */
interface CardView {
  hero: string | null;
  heroFallback: string;
  heroGradient: string;
  /**
   * Σημείο εστίασης του crop. Η κάρτα έχει πάντα τις ίδιες διαστάσεις και η
   * εικόνα μπαίνει με `object-cover`, οπότε ποτέ δεν παραμορφώνεται — απλώς
   * κόβεται. Στα προφίλ εστιάζουμε ψηλότερα, εκεί που βρίσκεται το πρόσωπο.
   */
  heroPosition: string;
  badgeLeft: { icon: string; text: string; tone: string } | null;
  badgeRight: string | null;
  avatar: string | null;
  avatarFallback: string;
  overlayTitle: string;
  overlaySub: string;
  title: string;
  highlight: { icon: string; text: string } | null;
  pills: { text: string; cls: string }[];
}

function jobToCard(j: Job, t: TFn): CardView {
  const pills: CardView['pills'] = [];
  if (j.housing_provided) pills.push({ text: `🏠 ${t('swipeTeaser.housing')}`, cls: 'bg-purple-50 text-purple-700' });
  if (j.meals_provided) pills.push({ text: `🍽️ ${t('swipeTeaser.meals')}`, cls: 'bg-emerald-50 text-emerald-700' });
  const salary = salaryText(j, t);
  return {
    hero: heroImage(j),
    heroFallback: initials(j.display_company_name),
    heroGradient: 'from-blue-500 to-indigo-600',
    heroPosition: 'object-center',
    badgeLeft: { icon: '🕒', text: timeAgo(j.created_at, t), tone: 'text-amber-700' },
    badgeRight: employmentLabelOf(t, j.employment_type),
    avatar: j.company_logo || null,
    avatarFallback: initials(j.display_company_name),
    overlayTitle: j.display_company_name || t('swipeTeaser.business'),
    overlaySub: [j.city, j.region].filter(Boolean).join(' · ') || t('swipeTeaser.greece'),
    title: j.title,
    highlight: salary ? { icon: '💶', text: salary } : null,
    pills,
  };
}

function workerToCard(w: Worker, t: TFn): CardView {
  const roles = w.roles || [];
  const years = w.years_of_experience || 0;
  const primaryRole = roles[0];
  const employmentLabel = employmentLabelOf(t, w.employment_type);
  const availabilityLabel = availabilityLabelOf(t, w.availability);
  const pills: CardView['pills'] = roles
    .slice(1, 3)
    .map((r) => ({ text: roleLabel(r), cls: 'bg-blue-50 text-blue-700' }));
  if (employmentLabel) {
    pills.push({ text: employmentLabel, cls: 'bg-gray-100 text-gray-700' });
  }
  return {
    hero: w.photo_url,
    heroFallback: initials(w.full_name, '👤'),
    heroGradient: 'from-emerald-500 to-teal-600',
    // Σε πορτραίτα το πρόσωπο πέφτει στο πάνω τρίτο· το 28% το κρατά ολόκληρο
    // στο κάδρο αντί να κόβεται το κεφάλι από ένα κεντραρισμένο crop.
    heroPosition: 'object-[50%_28%]',
    badgeLeft: availabilityLabel
      ? {
          icon: w.availability === 'immediate' ? '⚡' : '🗓️',
          text: availabilityLabel,
          tone: w.availability === 'immediate' ? 'text-emerald-700' : 'text-gray-700',
        }
      : null,
    badgeRight: w.verified ? `✓ ${t('swipeTeaser.verified')}` : null,
    avatar: null,
    avatarFallback: initials(w.full_name, '👤'),
    overlayTitle: w.full_name || t('swipeTeaser.worker'),
    overlaySub: [w.city, w.region].filter(Boolean).join(' · ') || t('swipeTeaser.greece'),
    title: primaryRole ? roleLabel(primaryRole) : t('swipeTeaser.worker'),
    highlight: years > 0
      ? { icon: '⭐', text: t(years === 1 ? 'swipeTeaser.experienceOne' : 'swipeTeaser.experienceMany', { years }) }
      : null,
    pills,
  };
}

export function SwipeTeaser() {
  const t = useT();
  const [mode, setMode] = useState<Mode>('jobs');
  const [jobs, setJobs] = useState<Job[]>(() => withImagesFirst(DEV_DEMO_JOBS, heroImage));
  const [workers, setWorkers] = useState<Worker[]>(() =>
    withImagesFirst(DEV_DEMO_WORKERS, (w) => w.photo_url)
  );
  const [index, setIndex] = useState(0);
  const [seen, setSeen] = useState(0);
  const [gated, setGated] = useState(false);
  const [drag, setDrag] = useState(0);
  const [leaving, setLeaving] = useState<null | 'left' | 'right'>(null);
  const startX = useRef<number | null>(null);

  // Πραγματικά δεδομένα από το API (στο production). Στο localhost μπλοκάρει το CORS
  // και κρατάμε τα DEV_DEMO ώστε να φαίνεται το UX τοπικά.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [jobsRes, workersRes] = await Promise.allSettled([
        fetch(`${API_BASE}/public/jobs?limit=30`, { headers: localeHeaders() }).then((r) => (r.ok ? r.json() : null)),
        fetch(`${API_BASE}/public/workers?limit=30`).then((r) => (r.ok ? r.json() : null)),
      ]);
      if (cancelled) return;

      const jobData: Job[] =
        jobsRes.status === 'fulfilled' ? jobsRes.value?.data ?? [] : [];
      const workerData: Worker[] =
        workersRes.status === 'fulfilled' ? workersRes.value?.data ?? [] : [];

      if (jobData.length > 0) setJobs(withImagesFirst(jobData, heroImage));
      if (workerData.length > 0) setWorkers(withImagesFirst(workerData, (w) => w.photo_url));

      // Αν δεν υπάρχουν αγγελίες αλλά υπάρχουν προφίλ, ξεκινάμε από τα προφίλ.
      if (jobData.length === 0 && workerData.length > 0) setMode('workers');
      setIndex(0);
    })();
    return () => { cancelled = true; };
  }, []);

  const cards: CardView[] = useMemo(
    () => (mode === 'jobs' ? jobs.map((j) => jobToCard(j, t)) : workers.map((w) => workerToCard(w, t))),
    [mode, jobs, workers, t]
  );

  const total = cards.length;
  const current = cards[index];
  const next = cards[index + 1];
  const remaining = Math.max(total - seen, 0);

  const hasJobs = jobs.length > 0;
  const hasWorkers = workers.length > 0;
  const showToggle = hasJobs && hasWorkers;

  // κανένα fake — κρύβεται εντελώς αν δεν υπάρχουν δεδομένα
  if (!hasJobs && !hasWorkers) return null;
  if (total === 0) return null;

  function switchMode(m: Mode) {
    if (m === mode) return;
    setMode(m);
    setIndex(0);
    setSeen(0);
    setGated(false);
    setDrag(0);
    setLeaving(null);
    startX.current = null;
  }

  function commit(dir: 'left' | 'right') {
    if (leaving) return;
    setLeaving(dir);
    setDrag(0);
    startX.current = null;
    window.setTimeout(() => {
      const nextSeen = seen + 1;
      setSeen(nextSeen);
      setLeaving(null);
      if (nextSeen >= FREE_SWIPES || index + 1 >= total) {
        setGated(true);
      } else {
        setIndex((i) => i + 1);
      }
    }, 280);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (gated || leaving) return;
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (startX.current == null) return;
    setDrag(e.clientX - startX.current);
  }
  function onPointerUp() {
    if (startX.current == null) return;
    if (drag > 90) commit('right');
    else if (drag < -90) commit('left');
    else setDrag(0);
    startX.current = null;
  }

  const rotate = drag / 18;
  const likeOpacity = Math.min(Math.max(drag / 90, 0), 1);
  const nopeOpacity = Math.min(Math.max(-drag / 90, 0), 1);
  const isJobs = mode === 'jobs';

  // Λευκό: πάνω σε σκούρο χανόταν το πλαίσιο της κάρτας, και σε γκρι κολλούσε
  // οπτικά με την «Έκτακτη βάρδια» που ακολουθεί. Έτσι κρατιέται η εναλλαγή.
  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          {/* Left — pitch */}
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700 shadow-sm">
              🔥 {t('swipeTeaser.badge')}
            </span>
            <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl leading-tight">
              {t(isJobs ? 'swipeTeaser.titleJobs' : 'swipeTeaser.titleWorkers')}
            </h2>
            <p className="mt-4 text-lg text-gray-500 leading-relaxed max-w-md mx-auto lg:mx-0">
              {t(isJobs ? 'swipeTeaser.textJobs' : 'swipeTeaser.textWorkers')}
            </p>

            {/* Segmented control — ψάχνω εργασία / ψάχνω προσωπικό */}
            {showToggle && (
              <div
                role="tablist"
                aria-label={t('swipeTeaser.tablistAria')}
                className="mt-6 inline-flex rounded-2xl bg-gray-100 p-1 ring-1 ring-gray-200"
              >
                <button
                  role="tab"
                  aria-selected={isJobs}
                  onClick={() => switchMode('jobs')}
                  className={`whitespace-nowrap rounded-xl px-3 py-2.5 text-xs font-bold transition sm:px-5 sm:text-sm ${
                    isJobs
                      ? 'bg-white text-gray-900 shadow'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  🔎 {t('swipeTeaser.tabJobs')}
                </button>
                <button
                  role="tab"
                  aria-selected={!isJobs}
                  onClick={() => switchMode('workers')}
                  className={`whitespace-nowrap rounded-xl px-3 py-2.5 text-xs font-bold transition sm:px-5 sm:text-sm ${
                    !isJobs
                      ? 'bg-white text-gray-900 shadow'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  🏢 {t('swipeTeaser.tabWorkers')}
                </button>
              </div>
            )}

            <div className="mt-6 flex items-center justify-center gap-6 lg:justify-start text-sm text-gray-500">
              <span>👉 {t('swipeTeaser.hint')}</span>
            </div>
          </div>

          {/* Right — card stack */}
          <div className="relative mx-auto h-[480px] w-full max-w-sm select-none">
            {/* peek της επόμενης κάρτας */}
            {next && !gated && (
              <div className="absolute inset-x-3 top-4 h-full scale-[0.96] rounded-[26px] border border-slate-200 bg-white shadow-card" />
            )}

            {gated ? (
              <GateCard mode={mode} total={total} seen={seen} remaining={remaining} />
            ) : current ? (
              <div
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className="absolute inset-0 cursor-grab touch-none overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-card active:cursor-grabbing"
                style={{
                  transform: leaving
                    ? `translateX(${leaving === 'right' ? 600 : -600}px) rotate(${leaving === 'right' ? 24 : -24}deg)`
                    : `translateX(${drag}px) rotate(${rotate}deg)`,
                  transition: leaving || startX.current == null ? 'transform 280ms ease' : 'none',
                }}
              >
                {/* LIKE / NOPE stamps */}
                <div
                  className="pointer-events-none absolute left-5 top-6 rotate-[-14deg] rounded-lg border-4 border-emerald-500 px-3 py-1 text-xl font-black uppercase text-emerald-500"
                  style={{ opacity: likeOpacity }}
                >
                  {t('swipeTeaser.like')}
                </div>
                <div
                  className="pointer-events-none absolute right-5 top-6 rotate-[14deg] rounded-lg border-4 border-rose-500 px-3 py-1 text-xl font-black uppercase text-rose-500"
                  style={{ opacity: nopeOpacity }}
                >
                  {t('swipeTeaser.nope')}
                </div>

                <div className="flex h-full flex-col">
                  {/* Hero εικόνα (φωτογραφία → χρωματιστό fallback) */}
                  <div className={`relative h-52 w-full flex-shrink-0 overflow-hidden bg-gradient-to-br ${current.heroGradient}`}>
                    {current.hero ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={current.hero}
                        alt=""
                        draggable={false}
                        className={`h-full w-full object-cover ${current.heroPosition}`}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-5xl font-black text-white/90">
                        {current.heroFallback}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />

                    {/* Urgency badges πάνω στην εικόνα */}
                    <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
                      {current.badgeLeft && (
                        <span className={`inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold shadow-sm ${current.badgeLeft.tone}`}>
                          {current.badgeLeft.icon} {current.badgeLeft.text}
                        </span>
                      )}
                      {current.badgeRight && (
                        <span className="rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-blue-700 shadow-sm">
                          {current.badgeRight}
                        </span>
                      )}
                    </div>

                    {/* Όνομα + περιοχή κάτω αριστερά */}
                    <div className="absolute inset-x-3 bottom-2.5 flex items-center gap-2">
                      {(current.avatar || isJobs) && (
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white text-[11px] font-black text-blue-700 shadow">
                          {current.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={current.avatar} alt="" className="h-full w-full object-cover" />
                          ) : (
                            current.avatarFallback
                          )}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white drop-shadow">
                          {current.overlayTitle}
                        </p>
                        <p className="truncate text-[11px] text-white/80 drop-shadow">
                          {current.overlaySub}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Σώμα κάρτας */}
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-2xl font-extrabold leading-tight text-gray-900">
                      {current.title}
                    </h3>

                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      {current.highlight && (
                        <span className="inline-flex items-center gap-1 rounded-xl bg-gray-900 px-3 py-1.5 text-base font-bold text-white">
                          {current.highlight.icon} {current.highlight.text}
                        </span>
                      )}
                      {current.pills.map((p) => (
                        <span key={p.text} className={`rounded-full px-2.5 py-1 text-xs font-bold ${p.cls}`}>
                          {p.text}
                        </span>
                      ))}
                    </div>

                    <div className="mt-auto flex items-center justify-between pt-5">
                      <button
                        onClick={() => commit('left')}
                        aria-label={t('swipeTeaser.nope')}
                        className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl text-rose-500 shadow-lg ring-1 ring-gray-200 transition hover:scale-105 hover:bg-rose-50"
                      >
                        ✕
                      </button>
                      <span className="text-xs font-medium text-gray-400">
                        {Math.min(seen + 1, total)} / {total}
                      </span>
                      <button
                        onClick={() => commit('right')}
                        aria-label={t('swipeTeaser.like')}
                        className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-2xl text-white shadow-lg shadow-emerald-500/30 transition hover:scale-105 hover:bg-emerald-600"
                      >
                        ✓
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function GateCard({
  mode,
  total,
  seen,
  remaining,
}: {
  mode: Mode;
  total: number;
  seen: number;
  remaining: number;
}) {
  const t = useT();
  const isJobs = mode === 'jobs';
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[26px] bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-center shadow-card">
      <div className="text-5xl">🔥</div>
      <h3 className="mt-4 text-2xl font-extrabold text-white leading-tight">
        {t(isJobs ? 'swipeTeaser.gate.seenJobs' : 'swipeTeaser.gate.seenWorkers', { seen, total })}
      </h3>
      <p className="mt-2 text-blue-100">
        {remaining > 0
          ? t(isJobs ? 'swipeTeaser.gate.moreJobs' : 'swipeTeaser.gate.moreWorkers', { n: remaining })
          : t(isJobs ? 'swipeTeaser.gate.registerJobs' : 'swipeTeaser.gate.registerWorkers')}
      </p>
      <Link
        href={isJobs ? '/auth/register?role=worker' : '/auth/register?role=business'}
        className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-white px-6 py-3.5 text-base font-bold text-blue-700 shadow-lg transition hover:bg-blue-50"
      >
        {t('swipeTeaser.gate.cta')}
      </Link>
      <Link
        href={isJobs ? '/find-job' : '/find-staff'}
        className="mt-3 text-sm font-medium text-blue-100 underline-offset-2 hover:underline"
      >
        {t(isJobs ? 'swipeTeaser.gate.allJobs' : 'swipeTeaser.gate.allWorkers')}
      </Link>
    </div>
  );
}
