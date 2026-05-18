/**
 * <PremiumTick /> — μικρό μπλε ✓ badge που εμφανίζεται δίπλα στο όνομα
 * των Worker Premium subscribers. Το επιδεικνύει social proof σε businesses
 * όταν φιλτράρουν στο Discover.
 *
 * Usage:
 *   {worker.is_premium === 1 && <PremiumTick />}
 *
 * Variants:
 *   - sm  (default) → εμφανίζεται inline δίπλα σε όνομα
 *   - lg            → για headers / profile pages
 */

interface Props {
  size?: 'sm' | 'md' | 'lg';
  /** Show "Premium" text label after the tick (default: true on md/lg, false on sm). */
  withLabel?: boolean;
  /** Optional pill-style background instead of plain inline icon. */
  pill?: boolean;
  className?: string;
}

export function PremiumTick({ size = 'sm', withLabel, pill = false, className = '' }: Props) {
  const showLabel = withLabel ?? (size === 'md' || size === 'lg');
  const dim = size === 'lg' ? 'h-6 w-6' : size === 'md' ? 'h-4.5 w-4.5' : 'h-3.5 w-3.5';
  const labelSize = size === 'lg' ? 'text-sm' : size === 'md' ? 'text-xs' : 'text-[10px]';

  // Unique gradient id per render so multiple ticks on the same page don't
  // collide if Tailwind purges or React re-renders.
  const gradId = `pt-grad-${size}`;

  const inner = (
    <>
      <svg
        viewBox="0 0 24 24"
        className={`${dim} flex-shrink-0 drop-shadow`}
        aria-label="Premium"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        <path
          d="M12 1.6l2.39 1.78 2.96-.45.83 2.86 2.43 1.78-1.18 2.74 1.18 2.74-2.43 1.78-.83 2.86-2.96-.45L12 22.4l-2.39-1.78-2.96.45-.83-2.86L3.39 16.43l1.18-2.74-1.18-2.74 2.43-1.78.83-2.86 2.96.45L12 1.6z"
          fill={`url(#${gradId})`}
        />
        <path
          d="M8.5 12.2l2.4 2.4 4.6-5.2"
          fill="none"
          stroke="white"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showLabel && (
        <span className={`font-extrabold uppercase tracking-wider ${labelSize} text-blue-700`}>
          Premium
        </span>
      )}
    </>
  );

  if (pill) {
    return (
      <span
        title="Worker Premium — επαληθευμένος ενεργός χρήστης"
        className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-50 to-cyan-50 ring-1 ring-blue-200 px-2.5 py-0.5 align-middle ${className}`}
      >
        {inner}
      </span>
    );
  }

  return (
    <span
      title="Worker Premium — επαληθευμένος ενεργός χρήστης"
      className={`inline-flex items-center gap-1 align-middle ${className}`}
    >
      {inner}
    </span>
  );
}
