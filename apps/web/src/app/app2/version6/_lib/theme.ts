/**
 * StaffNow v6 — design tokens.
 * Two role themes (worker/business) + brand neutral.
 * Use these constants instead of inlining colors per component.
 */

export const theme = {
  brand: {
    bg: 'bg-blue-600',
    bgHover: 'hover:bg-blue-700',
    text: 'text-blue-600',
    border: 'border-blue-600',
    ring: 'ring-blue-500/30',
    gradient: 'bg-gradient-to-br from-blue-600 to-indigo-700',
  },
  worker: {
    bg: 'bg-emerald-600',
    bgHover: 'hover:bg-emerald-700',
    text: 'text-emerald-700',
    border: 'border-emerald-500',
    ring: 'ring-emerald-500/30',
    gradient: 'bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600',
    soft: 'bg-emerald-50',
    softText: 'text-emerald-700',
  },
  business: {
    bg: 'bg-indigo-600',
    bgHover: 'hover:bg-indigo-700',
    text: 'text-indigo-700',
    border: 'border-indigo-500',
    ring: 'ring-indigo-500/30',
    gradient: 'bg-gradient-to-br from-indigo-600 via-blue-700 to-blue-800',
    soft: 'bg-indigo-50',
    softText: 'text-indigo-700',
  },
  neutral: {
    bg: 'bg-gray-50',
    surface: 'bg-white',
    border: 'border-gray-200',
    text: 'text-gray-900',
    textMuted: 'text-gray-500',
    textSubtle: 'text-gray-400',
  },
  status: {
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    danger: 'text-rose-600',
    info: 'text-sky-600',
  },
} as const;

export type RoleTheme = typeof theme.worker | typeof theme.business;

export function roleTheme(role: 'worker' | 'business' | 'admin' | undefined | null): RoleTheme {
  return role === 'business' ? theme.business : theme.worker;
}
