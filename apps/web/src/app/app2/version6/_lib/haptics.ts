/**
 * Lightweight haptics shim. Uses the navigator.vibrate API when available
 * (good enough for browser preview). On iOS via Capacitor, this is replaced
 * automatically once @capacitor/haptics is installed (TODO).
 */

type Style = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

const PATTERN: Record<Style, number | number[]> = {
  light: 8,
  medium: 14,
  heavy: 25,
  success: [10, 30, 10],
  warning: [12, 60, 12],
  error: [20, 60, 20, 60, 20],
};

export function haptic(style: Style = 'light') {
  if (typeof window === 'undefined') return;
  try {
    // @ts-expect-error - injected by Capacitor when bridged
    const cap = window.Capacitor;
    if (cap?.isNativePlatform?.()) {
      // The @capacitor/haptics plugin bridges via window.Capacitor
      // @ts-expect-error optional plugin
      const plugin = cap.Plugins?.Haptics;
      if (plugin?.impact) {
        const map: Record<Style, string> = {
          light: 'LIGHT',
          medium: 'MEDIUM',
          heavy: 'HEAVY',
          success: 'MEDIUM',
          warning: 'MEDIUM',
          error: 'HEAVY',
        };
        plugin.impact({ style: map[style] }).catch(() => {});
        return;
      }
    }
  } catch {
    // ignore
  }
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(PATTERN[style] as any);
  }
}
