/**
 * Δικαιώματα ανά ρόλο διαχειριστή.
 *
 * Μέχρι τώρα οι ρόλοι (super, operations, moderation, support, finance,
 * analytics) ήταν μόνο ετικέτες: όλοι μπορούσαν τα πάντα — να φτιάξουν άλλους
 * διαχειριστές, να αλλάξουν τιμές, να κάνουν επιστροφές χρημάτων.
 *
 * Κανόνας: ό,τι αλλάζει χρήματα, τιμές, ρυθμίσεις ή την ίδια την ομάδα
 * είναι ΜΟΝΟ για «super». Ο «analytics» βλέπει μόνο (καμία αλλαγή).
 * Οι υπόλοιποι κάνουν τη δουλειά τους κανονικά.
 */

import type { Env } from '../types';

const SUPER_ONLY: RegExp[] = [
  /^\/admin\/admins(\/|$)/, // ομάδα διαχειριστών
  /^\/admin\/settings(\/|$)/, // feature flags, moderation settings
  /^\/admin\/plans(\/|$)/, // τιμές πλάνων
  /\/refund(\/|$)/, // επιστροφές χρημάτων
  /^\/admin\/billing\/manual-transfers\/[^/]+\/(confirm|reject)/, // τραπεζικές καταθέσεις
];

/** Τι επιτρέπεται στον «analytics» εκτός από ανάγνωση (τα δικά του «είδα»). */
const READ_ONLY_ALLOWED_WRITES: RegExp[] = [/^\/admin\/nav-seen\//, /^\/admin\/events(\/|$)/, /^\/admin\/alert-settings(\/|$)/];

const roleCache = new Map<string, { role: string | null; at: number }>();

export async function loadAdminRole(env: Env, userId: string): Promise<string | null> {
  const cached = roleCache.get(userId);
  if (cached && Date.now() - cached.at < 60_000) return cached.role;
  let role: string | null = null;
  try {
    const row = await env.DB.prepare('SELECT admin_role FROM users WHERE id = ?').bind(userId).first<{ admin_role: string | null }>();
    role = row?.admin_role || null;
  } catch {
    role = null;
  }
  roleCache.set(userId, { role, at: Date.now() });
  return role;
}

/**
 * null = επιτρέπεται. Αλλιώς το μήνυμα άρνησης.
 * Χωρίς δηλωμένο ρόλο (παλιοί λογαριασμοί) θεωρείται «super», για να μην
 * κλειδωθεί έξω κανείς από την αλλαγή αυτή.
 */
export function adminDenial(role: string | null, method: string, path: string): string | null {
  const r = role || 'super';
  if (r === 'super') return null;
  const write = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
  if (SUPER_ONLY.some((re) => re.test(path)) && (write || /^\/admin\/admins/.test(path))) {
    return 'Αυτή η ενέργεια επιτρέπεται μόνο στον κύριο διαχειριστή (super).';
  }
  if (r === 'analytics' && write && !READ_ONLY_ALLOWED_WRITES.some((re) => re.test(path))) {
    return 'Ο ρόλος «analytics» βλέπει μόνο — δεν κάνει αλλαγές.';
  }
  return null;
}
