import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: { value: number; label?: string };
  context?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  loading?: boolean;
}

const TONE_STYLES: Record<NonNullable<Props['tone']>, string> = {
  default: 'bg-white border-gray-200',
  success: 'bg-emerald-50 border-emerald-200',
  warning: 'bg-amber-50 border-amber-200',
  danger: 'bg-red-50 border-red-200',
  info: 'bg-blue-50 border-blue-200',
};

const ICON_TONE: Record<NonNullable<Props['tone']>, string> = {
  default: 'bg-gray-100 text-gray-600',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
};

export function MetricCard({ label, value, icon, trend, context, tone = 'default', loading }: Props) {
  const trendPositive = trend && trend.value >= 0;
  return (
    <div className={`rounded-xl border p-5 transition-shadow hover:shadow-sm ${TONE_STYLES[tone]}`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 tabular-nums">
            {loading ? (
              <span className="inline-block h-7 w-20 animate-pulse rounded bg-gray-200" />
            ) : (
              value
            )}
          </p>
          {context && !loading && (
            <p className="mt-1 text-xs text-gray-500 truncate">{context}</p>
          )}
        </div>
        {icon && (
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${ICON_TONE[tone]}`}>
            {icon}
          </div>
        )}
      </div>
      {trend && !loading && (
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              trendPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {trendPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
          <span className="text-[11px] text-gray-500">{trend.label || 'από χθες'}</span>
        </div>
      )}
    </div>
  );
}
