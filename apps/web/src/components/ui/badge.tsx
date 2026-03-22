import { type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-blue-100 text-blue-700',
        secondary: 'bg-gray-100 text-gray-700',
        success: 'bg-green-100 text-green-700',
        warning: 'bg-amber-100 text-amber-700',
        destructive: 'bg-red-100 text-red-700',
        outline: 'border border-gray-300 text-gray-700 bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
