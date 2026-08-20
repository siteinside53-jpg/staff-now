'use client';

/**
 * TaskNow μέσα στον πίνακα ελέγχου του χρήστη.
 *
 * Λεπτό περιτύλιγμα: όλη η οθόνη ζει στο component, ώστε να μπορεί να
 * παρουσιαστεί και ως μακέτα χωρίς σύνδεση, χωρίς αντιγραφή κώδικα.
 */

import { TaskNowDashboardHub } from '@/components/tasknow/dashboard-hub';

export default function DashboardTaskNowPage() {
  return <TaskNowDashboardHub />;
}
