/**
 * Ειδοποιήσεις προς την ομάδα (διαχειριστές).
 *
 * Μέχρι τώρα δεν υπήρχε τίποτα: η σελίδα «Ειδοποιήσεις» του διαχειριστικού
 * συνέθετε 20 το πολύ γραμμές από τέσσερα ερωτήματα, οι εγγραφές έβγαιναν
 * πάντα «διαβασμένες», και καμία διαγραφή λογαριασμού, μήνυμα επικοινωνίας ή
 * επισκέπτης δεν έφτανε πουθενά.
 *
 * Τώρα: ΜΙΑ συνάρτηση, `recordAdminEvent`. Γράφει στον πίνακα admin_events
 * (τον διαβάζει η σελίδα) και, αν ο κάθε διαχειριστής το έχει ανοιχτό στις
 * ρυθμίσεις του, του στέλνει push στο κινητό μέσω του ίδιου μηχανισμού που
 * ειδοποιεί τους χρήστες.
 */

import type { Env } from '../types';
import { generateId } from './id';
import { notifyUser } from './notify';

export type AdminEventType =
  | 'signup'
  | 'account_deleted'
  | 'contact'
  | 'feedback'
  | 'visitor'
  | 'visitor_left'
  | 'payment_failed'
  | 'report'
  | 'verification'
  | 'error';

export type AdminSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface AdminAlertSettings {
  registrations: number;
  deletions: number;
  contact: number;
  feedback: number;
  visitors: number;
  visitor_left: number;
  payments: number;
  reports: number;
  errors: number;
}

export const DEFAULT_ALERT_SETTINGS: AdminAlertSettings = {
  registrations: 1,
  deletions: 1,
  contact: 1,
  feedback: 1,
  visitors: 0,
  visitor_left: 0,
  payments: 1,
  reports: 1,
  errors: 1,
};

/** Ποιος διακόπτης των ρυθμίσεων ελέγχει κάθε τύπο. */
const SETTING_FOR: Record<AdminEventType, keyof AdminAlertSettings> = {
  signup: 'registrations',
  account_deleted: 'deletions',
  contact: 'contact',
  feedback: 'feedback',
  visitor: 'visitors',
  visitor_left: 'visitor_left',
  payment_failed: 'payments',
  report: 'reports',
  verification: 'reports',
  error: 'errors',
};

export interface AdminEventInput {
  type: AdminEventType;
  severity?: AdminSeverity;
  title: string;
  body?: string;
  /** Σύνδεσμος μέσα στο διαχειριστικό, π.χ. /admin/users?focus=usr_… */
  url?: string;
  data?: Record<string, unknown>;
  /** Χωρίς push — μόνο στη λίστα. Για ό,τι είναι πολύ συχνό. */
  silent?: boolean;
}

export async function loadAlertSettings(env: Env, adminId: string): Promise<AdminAlertSettings> {
  try {
    const row = await env.DB.prepare(
      'SELECT registrations, deletions, contact, feedback, visitors, visitor_left, payments, reports, errors FROM admin_alert_settings WHERE user_id = ?',
    )
      .bind(adminId)
      .first<AdminAlertSettings>();
    return row || DEFAULT_ALERT_SETTINGS;
  } catch {
    return DEFAULT_ALERT_SETTINGS;
  }
}

/**
 * Γράφει το γεγονός και ειδοποιεί όποιον διαχειριστή το θέλει.
 * Ποτέ δεν πετάει σφάλμα — μια χαμένη ειδοποίηση δεν πρέπει να χαλάσει την
 * ενέργεια που την προκάλεσε (εγγραφή, πληρωμή…).
 */
export async function recordAdminEvent(env: Env, input: AdminEventInput): Promise<void> {
  const now = new Date().toISOString();
  const id = generateId('aev');
  const data = { ...(input.data || {}), url: input.url || '/admin/notifications' };
  try {
    await env.DB.prepare(
      'INSERT INTO admin_events (id, type, severity, title, body, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
      .bind(id, input.type, input.severity || 'low', input.title, input.body || '', JSON.stringify(data), now)
      .run();
  } catch (err) {
    console.error('[admin-events] insert failed', err);
    return;
  }
  if (input.silent) return;

  try {
    const admins = await env.DB.prepare("SELECT id FROM users WHERE role = 'admin' AND status = 'active'")
      .all<{ id: string }>();
    const key = SETTING_FOR[input.type];
    await Promise.allSettled(
      (admins.results || []).map(async (a) => {
        const prefs = await loadAlertSettings(env, a.id);
        if (prefs[key] !== 1) return;
        await notifyUser(env, {
          userId: a.id,
          title: input.title,
          body: input.body || '',
          url: input.url || '/admin/notifications',
          pushOnly: true,
        });
      }),
    );
  } catch (err) {
    console.error('[admin-events] push failed', err);
  }
}

/**
 * Το ίδιο σφάλμα δεν ξαναειδοποιεί μέσα σε λίγα λεπτά — ένας βρόχος σφαλμάτων
 * θα γέμιζε το κινητό του διαχειριστή.
 */
export async function recordAdminErrorEvent(
  env: Env,
  input: { code: string; message: string; path: string; status: number; userEmail?: string | null },
): Promise<void> {
  try {
    const recent = await env.DB.prepare(
      `SELECT id FROM admin_events
        WHERE type = 'error' AND created_at >= ? AND data LIKE ?
        LIMIT 1`,
    )
      .bind(new Date(Date.now() - 10 * 60_000).toISOString(), `%"path":${JSON.stringify(input.path)}%`)
      .first();
    if (recent) return;
  } catch {
    /* αν αποτύχει ο έλεγχος, στέλνουμε κανονικά */
  }
  await recordAdminEvent(env, {
    type: 'error',
    severity: input.status >= 500 ? 'high' : 'medium',
    title: `🐞 Σφάλμα ${input.status} στο ${input.path}`,
    body: `${input.code}: ${input.message.slice(0, 160)}${input.userEmail ? ` — χρήστης ${input.userEmail}` : ''}`,
    url: '/admin/security',
    data: { path: input.path, code: input.code, status: input.status },
  });
}
