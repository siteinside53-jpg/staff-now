import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 py-16 text-center',
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
          {icon}
        </div>
      )}

      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>

      {description && (
        <p className="mt-2 max-w-sm text-sm text-gray-500">{description}</p>
      )}

      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export { EmptyState };
