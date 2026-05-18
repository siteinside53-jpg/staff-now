import type { ReactNode } from 'react';

interface Props {
  title: string;
  value: string | number;
  series: number[];
  color?: 'blue' | 'emerald' | 'purple' | 'amber' | 'red';
  subtitle?: ReactNode;
}

const COLOR_MAP = {
  blue: { stroke: '#3B82F6', fill: 'rgba(59,130,246,0.15)' },
  emerald: { stroke: '#10B981', fill: 'rgba(16,185,129,0.15)' },
  purple: { stroke: '#A855F7', fill: 'rgba(168,85,247,0.15)' },
  amber: { stroke: '#F59E0B', fill: 'rgba(245,158,11,0.15)' },
  red: { stroke: '#EF4444', fill: 'rgba(239,68,68,0.15)' },
};

/** Lightweight SVG sparkline — no external charting lib */
export function KpiChartCard({ title, value, series, color = 'blue', subtitle }: Props) {
  const c = COLOR_MAP[color];
  const width = 280;
  const height = 80;
  const max = Math.max(...series, 1);
  const min = Math.min(...series, 0);
  const range = max - min || 1;
  const step = width / (series.length - 1 || 1);

  const points = series.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  });
  const path = `M ${points.join(' L ')}`;
  const area = `${path} L ${width},${height} L 0,${height} Z`;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
          {subtitle && <div className="mt-1 text-xs text-gray-500">{subtitle}</div>}
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-16" preserveAspectRatio="none">
        <path d={area} fill={c.fill} />
        <path d={path} stroke={c.stroke} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
