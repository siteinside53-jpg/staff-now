type Severity = 'low' | 'medium' | 'high' | 'critical';

interface Props {
  severity: Severity;
  size?: 'sm' | 'md';
}

const CONFIG: Record<Severity, { label: string; classes: string; icon: string }> = {
  low:      { label: 'Χαμηλή',  classes: 'bg-blue-50 text-blue-700 border-blue-200',       icon: '●' },
  medium:   { label: 'Μεσαία',  classes: 'bg-amber-50 text-amber-700 border-amber-200',    icon: '●●' },
  high:     { label: 'Υψηλή',   classes: 'bg-orange-50 text-orange-700 border-orange-200', icon: '●●●' },
  critical: { label: 'Κρίσιμη', classes: 'bg-red-50 text-red-700 border-red-200',          icon: '⚠' },
};

export function SeverityBadge({ severity, size = 'md' }: Props) {
  const c = CONFIG[severity];
  const sizes = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs';
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border font-bold uppercase tracking-wide ${c.classes} ${sizes}`}>
      <span className="text-[9px] leading-none">{c.icon}</span>
      {c.label}
    </span>
  );
}

export type { Severity };
