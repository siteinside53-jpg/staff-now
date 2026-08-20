'use client';

/**
 * TaskNow στο διαχειριστικό.
 *
 * Λεπτό περιτύλιγμα: όλη η κονσόλα ζει στο component, ώστε να μπορεί να
 * παρουσιαστεί και ως μακέτα χωρίς σύνδεση, χωρίς αντιγραφή κώδικα.
 */

import { TaskNowAdminConsole } from '@/components/tasknow/admin-console';

export default function AdminTaskNowPage() {
  return <TaskNowAdminConsole />;
}
