'use client';

/**
 * v7 UI primitives — mobile-first, matching the iOS-style mockups.
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode, ButtonHTMLAttributes } from 'react';

// ──────────────────────────────────────────────────────────────
// Layout shells
// ──────────────────────────────────────────────────────────────

export function Screen({ children, bg = 'bg-[#F5F7FB]' }: { children: ReactNode; bg?: string }) {
  return (
    <div className={`fixed inset-0 flex flex-col ${bg}`}>
      {children}
    </div>
  );
}

/**
 * Top app bar with title, optional back button and right slot.
 */
export function AppBar({
  title,
  subtitle,
  back,
  onBack,
  right,
  variant = 'default',
}: {
  title?: string;
  subtitle?: string;
  back?: boolean;
  onBack?: () => void;
  right?: ReactNode;
  variant?: 'default' | 'gradient' | 'plain';
}) {
  const router = useRouter();
  const handleBack = () => (onBack ? onBack() : router.back());
  const base = variant === 'gradient'
    ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white'
    : variant === 'plain'
      ? 'bg-transparent text-gray-900'
      : 'bg-white text-gray-900 border-b border-gray-100';
  return (
    <header
      className={`flex-shrink-0 ${base}`}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center gap-2 px-4 py-3 min-h-[56px]">
        {back && (
          <button
            type="button"
            onClick={handleBack}
            aria-label="Πίσω"
            className={`flex h-9 w-9 items-center justify-center rounded-full ${
              variant === 'gradient' ? 'bg-white/15 active:bg-white/25' : 'bg-gray-100 active:bg-gray-200'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div className="min-w-0 flex-1">
          {title && <h1 className="text-base font-extrabold tracking-tight truncate">{title}</h1>}
          {subtitle && (
            <p className={`text-[11px] truncate ${variant === 'gradient' ? 'text-white/80' : 'text-gray-500'}`}>
              {subtitle}
            </p>
          )}
        </div>
        {right && <div className="flex-shrink-0">{right}</div>}
      </div>
    </header>
  );
}

export function Body({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <main className={`flex-1 overflow-y-auto overscroll-contain ${className}`}>
      <div className="px-4 py-4 pb-24">{children}</div>
    </main>
  );
}

// ──────────────────────────────────────────────────────────────
// Buttons & inputs
// ──────────────────────────────────────────────────────────────

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  full?: boolean;
};

export function Btn({
  variant = 'primary',
  size = 'md',
  loading,
  full,
  className = '',
  disabled,
  children,
  ...rest
}: BtnProps) {
  const v = {
    primary: 'bg-blue-600 text-white active:bg-blue-700 shadow-md shadow-blue-600/20',
    secondary: 'bg-blue-50 text-blue-700 active:bg-blue-100',
    ghost: 'bg-transparent text-blue-600 active:bg-blue-50',
    danger: 'bg-rose-500 text-white active:bg-rose-600',
    success: 'bg-emerald-500 text-white active:bg-emerald-600',
  }[variant];
  const s = {
    sm: 'h-9 px-4 text-xs rounded-full',
    md: 'h-11 px-5 text-sm rounded-full',
    lg: 'h-13 px-6 text-base rounded-full',
  }[size];
  return (
    <button
      {...rest}
      disabled={loading || disabled}
      className={`inline-flex items-center justify-center gap-2 font-bold transition-transform active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 ${v} ${s} ${full ? 'w-full' : ''} ${className}`}
    >
      {loading && <Spinner className="h-4 w-4 border-white/40 border-t-white" />}
      {children}
    </button>
  );
}

export function TextField({
  label,
  hint,
  error,
  icon,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  icon?: ReactNode;
}) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-[12px] font-bold text-gray-700">{label}</span>}
      <span className="relative block">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </span>
        )}
        <input
          {...rest}
          className={`w-full rounded-2xl border bg-white px-4 ${icon ? 'pl-10' : ''} h-12 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
            error ? 'border-rose-300 focus:ring-rose-200' : 'border-gray-200 focus:ring-blue-200 focus:border-blue-400'
          }`}
        />
      </span>
      {error ? (
        <span className="mt-1 block text-[11px] font-semibold text-rose-600">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[11px] text-gray-500">{hint}</span>
      ) : null}
    </label>
  );
}

export function TextArea({
  label,
  hint,
  error,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
  error?: string;
}) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-[12px] font-bold text-gray-700">{label}</span>}
      <textarea
        {...rest}
        className={`w-full rounded-2xl border bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
          error ? 'border-rose-300 focus:ring-rose-200' : 'border-gray-200 focus:ring-blue-200 focus:border-blue-400'
        }`}
        rows={rest.rows || 4}
      />
      {error ? (
        <span className="mt-1 block text-[11px] font-semibold text-rose-600">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[11px] text-gray-500">{hint}</span>
      ) : null}
    </label>
  );
}

export function Select({
  label,
  options,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-[12px] font-bold text-gray-700">{label}</span>}
      <select
        {...rest}
        className="w-full appearance-none rounded-2xl border border-gray-200 bg-white px-4 h-12 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// ──────────────────────────────────────────────────────────────
// Cards & lists
// ──────────────────────────────────────────────────────────────

export function Card({
  children,
  className = '',
  onClick,
  href,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  href?: string;
}) {
  const cls = `rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04] ${onClick || href ? 'active:scale-[0.99] transition-transform' : ''} ${className}`;
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={`${cls} text-left w-full`}>
        {children}
      </button>
    );
  return <div className={cls}>{children}</div>;
}

export function Section({
  title,
  action,
  children,
  className = '',
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`mt-5 ${className}`}>
      {(title || action) && (
        <div className="mb-2.5 flex items-center justify-between px-1">
          {title && <h2 className="text-sm font-extrabold tracking-tight text-gray-900">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Chip({
  active,
  children,
  onClick,
  icon,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors ${
        active
          ? 'bg-blue-600 text-white shadow-sm'
          : 'bg-white text-gray-700 ring-1 ring-gray-200 active:bg-gray-50'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = 'blue',
}: {
  children: ReactNode;
  tone?: 'blue' | 'green' | 'amber' | 'rose' | 'gray' | 'cyan';
}) {
  const t = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
    gray: 'bg-gray-100 text-gray-700',
    cyan: 'bg-cyan-50 text-cyan-700',
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${t}`}>
      {children}
    </span>
  );
}

export function Avatar({
  src,
  name,
  size = 'md',
  ring = false,
}: {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  ring?: boolean;
}) {
  const sz = {
    xs: 'h-7 w-7 text-[10px]',
    sm: 'h-9 w-9 text-xs',
    md: 'h-11 w-11 text-sm',
    lg: 'h-14 w-14 text-base',
    xl: 'h-20 w-20 text-xl',
  }[size];
  const ini = (name || '?')
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span
      className={`relative inline-flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 font-bold text-white ${sz} ${ring ? 'ring-2 ring-white' : ''}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name || ''} className="h-full w-full object-cover" />
      ) : (
        <span>{ini}</span>
      )}
    </span>
  );
}

export function Stat({
  label,
  value,
  delta,
  icon,
  tone = 'blue',
}: {
  label: string;
  value: string | number;
  delta?: string;
  icon?: ReactNode;
  tone?: 'blue' | 'green' | 'amber' | 'rose' | 'cyan';
}) {
  const bgs: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    cyan: 'bg-cyan-50 text-cyan-600',
  };
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-black/[0.04] shadow-sm">
      <div className="flex items-center gap-2">
        {icon && (
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${bgs[tone]}`}>
            {icon}
          </span>
        )}
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</span>
      </div>
      <p className="mt-1.5 text-xl font-extrabold tracking-tight text-gray-900">{value}</p>
      {delta && <p className="text-[10px] font-semibold text-emerald-600">{delta}</p>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// State views
// ──────────────────────────────────────────────────────────────

export function Spinner({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-[3px] border-gray-200 border-t-blue-600 ${className}`}
    />
  );
}

export function FullPageSpinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white">
      <Spinner className="h-10 w-10" />
    </div>
  );
}

export function EmptyState({
  icon = '✨',
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center justify-center px-6 py-16 text-center">
      <div className="text-5xl">{icon}</div>
      <h2 className="mt-4 text-lg font-bold text-gray-900">{title}</h2>
      {description && <p className="mt-1.5 text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Bottom tab bar
// ──────────────────────────────────────────────────────────────

export interface TabItem {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: number;
  match?: (path: string) => boolean;
}

export function BottomTabs({
  items,
  pathname,
}: {
  items: TabItem[];
  pathname: string;
}) {
  return (
    <nav
      className="flex-shrink-0 flex items-stretch border-t border-gray-100 bg-white"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {items.map((item) => {
        const active = item.match ? item.match(pathname) : pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-bold transition-colors ${
              active ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <span className={`relative inline-flex h-6 w-6 items-center justify-center transition-transform ${active ? 'scale-110' : ''}`}>
              {item.icon}
              {item.badge != null && item.badge > 0 && (
                <span className="absolute -top-1.5 -right-2 inline-flex min-w-[16px] h-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-extrabold text-white">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </span>
            <span>{item.label}</span>
            {active && <span className="absolute top-0 inset-x-6 h-0.5 rounded-b bg-blue-600" />}
          </Link>
        );
      })}
    </nav>
  );
}

// Standard tab icons (24x24)
export const TabIcons = {
  home: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10h4v-6h6v6h4V10" />
    </svg>
  ),
  search: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z" />
    </svg>
  ),
  briefcase: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0 1 12 15c-3.183 0-6.22-.62-9-1.745M16 6V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v1m12 0H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2Z" />
    </svg>
  ),
  heart: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  ),
  // Handshake — used for "Matches" / Deals tab
  handshake: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l2 2a1 1 0 1 0 1.41-1.42m-1.41-.58.42-.42a1 1 0 0 1 1.41 0l.59.59a1 1 0 1 0 1.41-1.42m-3.42 1.83.42-.42a1 1 0 0 1 1.41 0l.59.59a1 1 0 1 0 1.42-1.42L13 14m-2 3-2.5-2.5a1 1 0 0 1 0-1.41l1.06-1.06a1.5 1.5 0 0 1 2.12 0l3.79 3.79a1 1 0 0 1 0 1.41L13 19" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12V5a1 1 0 0 1 1-1h3m14 8V5a1 1 0 0 0-1-1h-3m-9 0 2.5 2.5m0 0L11 8.5l1.5-1.5L15 9.5l3-3M9.5 7 6 10.5 3 8m18 4-3-3M7 4l-2 2" />
    </svg>
  ),
  // Swipe — center action for the Discover/Αναζήτηση tab (deck cards)
  swipe: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <rect x="6" y="3" width="12" height="16" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6M9 11h6M9 15h3" />
    </svg>
  ),
  chat: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 0 1-3.99-.832L3 21l1.832-5.01A8.95 8.95 0 0 1 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z" />
    </svg>
  ),
  user: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm-4 7a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7Z" />
    </svg>
  ),
  bell: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75v-.7V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
    </svg>
  ),
  plus: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  ),
};

// ──────────────────────────────────────────────────────────────
// FAB
// ──────────────────────────────────────────────────────────────

export function FAB({
  onClick,
  href,
  children,
  label,
}: {
  onClick?: () => void;
  href?: string;
  children: ReactNode;
  label?: string;
}) {
  const cls =
    'fixed right-4 z-30 flex items-center gap-2 rounded-full bg-blue-600 px-5 h-14 font-bold text-white shadow-xl shadow-blue-600/40 active:scale-95 transition-transform';
  const style = { bottom: 'calc(72px + env(safe-area-inset-bottom))' };
  if (href) return <Link href={href} className={cls} style={style}>{children}{label && <span>{label}</span>}</Link>;
  return (
    <button type="button" onClick={onClick} className={cls} style={style}>
      {children}
      {label && <span>{label}</span>}
    </button>
  );
}

// ──────────────────────────────────────────────────────────────
// Row (for settings lists)
// ──────────────────────────────────────────────────────────────

export function Row({
  icon,
  iconBg = 'bg-blue-50',
  iconColor = 'text-blue-600',
  label,
  hint,
  right,
  href,
  onClick,
  danger,
  last,
}: {
  icon?: ReactNode;
  iconBg?: string;
  iconColor?: string;
  label: string;
  hint?: string;
  right?: ReactNode;
  href?: string;
  onClick?: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  const inner = (
    <div className={`flex items-center gap-3 px-4 py-3 ${last ? '' : 'border-b border-gray-100'}`}>
      {icon && (
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}>
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-bold ${danger ? 'text-rose-600' : 'text-gray-900'}`}>{label}</p>
        {hint && <p className="text-[11px] text-gray-500">{hint}</p>}
      </div>
      {right ? (
        <div className="flex-shrink-0 text-gray-400">{right}</div>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 flex-shrink-0 text-gray-300">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      )}
    </div>
  );
  if (href) return <Link href={href} className="block active:bg-gray-50">{inner}</Link>;
  if (onClick)
    return (
      <button type="button" onClick={onClick} className="block w-full text-left active:bg-gray-50">
        {inner}
      </button>
    );
  return inner;
}

export function FieldGroup({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.04] overflow-hidden">{children}</div>;
}
