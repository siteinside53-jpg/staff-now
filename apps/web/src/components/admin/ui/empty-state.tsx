import type { ReactNode } from 'react';

interface Props {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon = '📭', title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white/50 px-6 py-16 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
