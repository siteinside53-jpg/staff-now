/**
 * Role-based permission system for StaffNow admin panel.
 *
 * Permissions use `domain:action` format (e.g. `reports:resolve`).
 * A `*` wildcard grants all actions within a domain (or globally for super_admin).
 */

export type AdminRole =
  | 'super_admin'
  | 'ops_admin'
  | 'moderation_admin'
  | 'support_admin'
  | 'finance_admin'
  | 'analytics_viewer';

export const ADMIN_ROLE_LABELS_EL: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  ops_admin: 'Operations',
  moderation_admin: 'Moderation',
  support_admin: 'Υποστήριξη',
  finance_admin: 'Οικονομικά',
  analytics_viewer: 'Analytics',
};

export const ADMIN_ROLE_COLORS: Record<AdminRole, string> = {
  super_admin: 'bg-purple-100 text-purple-700 border-purple-200',
  ops_admin: 'bg-blue-100 text-blue-700 border-blue-200',
  moderation_admin: 'bg-red-100 text-red-700 border-red-200',
  support_admin: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  finance_admin: 'bg-amber-100 text-amber-700 border-amber-200',
  analytics_viewer: 'bg-gray-100 text-gray-700 border-gray-200',
};

const PERMISSIONS: Record<AdminRole, string[]> = {
  super_admin: ['*'],
  ops_admin: [
    'overview:read',
    'users:read', 'users:edit', 'users:verify',
    'employers:*',
    'workers:*',
    'jobs:*',
    'matches:read',
    'notifications:read',
    'analytics:read',
    'audit:read',
  ],
  moderation_admin: [
    'overview:read',
    'users:read', 'users:suspend', 'users:unsuspend',
    'reports:*',
    'messages:read', 'messages:moderate',
    'jobs:read', 'jobs:moderate', 'jobs:delete',
    'workers:read', 'workers:hide',
    'employers:read', 'employers:suspend',
    'audit:read',
  ],
  support_admin: [
    'overview:read',
    'users:read',
    'reports:read',
    'messages:read',
    'payments:read',
    'subscriptions:read',
    'notifications:read',
  ],
  finance_admin: [
    'overview:read',
    'subscriptions:*',
    'payments:*',
    'users:read',
    'analytics:read',
    'audit:read',
  ],
  analytics_viewer: [
    'overview:read',
    'analytics:read',
    'users:read',
  ],
};

/**
 * Check whether a role can perform a given `domain:action`.
 */
export function can(role: AdminRole | null | undefined, permission: string): boolean {
  if (!role) return false;
  const perms = PERMISSIONS[role];
  if (!perms) return false;
  if (perms.includes('*')) return true;

  const [domain, action] = permission.split(':');
  return perms.some((p) => {
    if (p === permission) return true;
    if (p === `${domain}:*`) return true;
    return false;
  });
}

/**
 * List of navigation sections, keyed by required permission.
 * Used by the sidebar to filter what the current admin sees.
 */
export const ADMIN_NAV_PERMISSIONS: Record<string, string> = {
  '/admin/overview': 'overview:read',
  '/admin/users': 'users:read',
  '/admin/employers': 'employers:read',
  '/admin/workers': 'workers:read',
  '/admin/jobs': 'jobs:read',
  '/admin/matches': 'matches:read',
  '/admin/messages': 'messages:read',
  '/admin/reports': 'reports:read',
  '/admin/subscriptions': 'subscriptions:read',
  '/admin/payments': 'payments:read',
  '/admin/analytics': 'analytics:read',
  '/admin/notifications': 'notifications:read',
  '/admin/settings': 'settings:read',
  '/admin/admin-users': 'admin_users:read',
  '/admin/audit-log': 'audit:read',
};
