'use client';

/**
 * StaffNow v6 — tiny reusable UI primitives.
 * Keeps each page slim and consistent.
 */

import Link from 'next/link';
import type { ReactNode } from 'react';
import { initials } from './format';

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
    <div className="flex h-full w-full items-center justify-center bg-white">
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
      {description && <p className="mt-2 text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon="⚠️"
      title="Κάτι πήγε στραβά"
      description={message || 'Δοκίμασε ξανά σε λίγο.'}
      action={
        onRetry ? (
          <button
            onClick={onRetry}
            className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Δοκίμασε ξανά
          </button>
        ) : null
      }
    />
  );
}

export function Avatar({
  src,
  name,
  size = 'md',
  ring,
}: {
  src?: string | null;
  name?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  ring?: boolean;
}) {
  const sizeClass =
    size === 'sm' ? 'h-9 w-9 text-xs'
    : size === 'lg' ? 'h-16 w-16 text-base'
    : size === 'xl' ? 'h-24 w-24 text-2xl'
    : 'h-12 w-12 text-sm';
  const ringClass = ring ? 'ring-4 ring-white shadow-md' : '';
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name || ''}
        className={`${sizeClass} ${ringClass} rounded-full object-cover bg-gray-100`}
      />
    );
  }
  return (
    <div
      className={`${sizeClass} ${ringClass} flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 font-bold text-white`}
    >
      {initials(name)}
    </div>
  );
}

export function Pill({
  children,
  tone = 'gray',
}: {
  children: ReactNode;
  tone?: 'gray' | 'green' | 'blue' | 'amber' | 'rose';
}) {
  const map: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    blue: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    rose: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${map[tone]}`}>
      {children}
    </span>
  );
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  href,
  type = 'button',
  disabled,
  onClick,
  className = '',
  full,
}: {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'worker' | 'business';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  full?: boolean;
}) {
  const sizeClass =
    size === 'sm' ? 'px-3 py-1.5 text-xs'
    : size === 'lg' ? 'px-6 py-3.5 text-base'
    : 'px-4 py-2.5 text-sm';
  const variantClass: Record<string, string> = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
    worker: 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800',
    business: 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800',
    secondary: 'bg-white text-gray-900 ring-1 ring-gray-200 hover:bg-gray-50',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
  };
  const cls = `inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none ${sizeClass} ${variantClass[variant]} ${full ? 'w-full' : ''} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

export function ScreenHeader({
  title,
  back,
  right,
  subtitle,
}: {
  title: string;
  back?: string | (() => void);
  right?: ReactNode;
  subtitle?: ReactNode;
}) {
  const BackEl =
    typeof back === 'string' ? (
      <Link href={back} aria-label="Πίσω" className="-ml-2 p-2 text-gray-700">
        <ChevronLeft />
      </Link>
    ) : back ? (
      <button onClick={back} aria-label="Πίσω" className="-ml-2 p-2 text-gray-700">
        <ChevronLeft />
      </button>
    ) : (
      <span className="w-8" />
    );
  return (
    <header className="flex-shrink-0 sticky top-0 z-20 bg-white border-b border-gray-100">
      <div className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+8px)] pb-3">
        {BackEl}
        <h1 className="text-base font-bold text-gray-900 truncate">{title}</h1>
        <div className="min-w-[2rem] flex justify-end">{right || <span className="w-8" />}</div>
      </div>
      {subtitle && <div className="px-4 pb-2 text-xs text-gray-500">{subtitle}</div>}
    </header>
  );
}

export function ChevronLeft() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

export function VerifiedBadge({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`${className} text-blue-500`} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M6.267 3.455a3.066 3.066 0 0 0 1.745-.723 3.066 3.066 0 0 1 3.976 0 3.066 3.066 0 0 0 1.745.723 3.066 3.066 0 0 1 2.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 0 1 0 3.976 3.066 3.066 0 0 0-.723 1.745 3.066 3.066 0 0 1-2.812 2.812 3.066 3.066 0 0 0-1.745.723 3.066 3.066 0 0 1-3.976 0 3.066 3.066 0 0 0-1.745-.723 3.066 3.066 0 0 1-2.812-2.812 3.066 3.066 0 0 0-.723-1.745 3.066 3.066 0 0 1 0-3.976 3.066 3.066 0 0 0 .723-1.745 3.066 3.066 0 0 1 2.812-2.812Zm7.44 5.252a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
