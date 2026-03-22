'use client';

import { useState, type ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sizeMap = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
} as const;

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Consistent fallback colour based on name hash
function getColor(name?: string): string {
  const colours = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-cyan-500',
    'bg-indigo-500',
    'bg-teal-500',
  ];
  if (!name) return colours[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colours[Math.abs(hash) % colours.length];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function Avatar({ src, alt, name, size = 'md', className, ...props }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const sizeClass = sizeMap[size];
  const showImage = src && !imgError;

  if (showImage) {
    return (
      <img
        src={src}
        alt={alt || name || 'Avatar'}
        className={cn(
          'inline-block shrink-0 rounded-full object-cover',
          sizeClass,
          className,
        )}
        onError={() => setImgError(true)}
        {...props}
      />
    );
  }

  // Fallback: initials on coloured background
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white',
        sizeClass,
        getColor(name),
        className,
      )}
      aria-label={alt || name || 'Avatar'}
      role="img"
    >
      {getInitials(name)}
    </span>
  );
}

export { Avatar };
