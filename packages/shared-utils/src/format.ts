/**
 * Format a number as currency (EUR by default).
 */
export function formatCurrency(amount: number, locale: string = 'el-GR'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a date string or Date object for display.
 */
export function formatDate(date: string | Date, locale: string = 'el-GR'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

/**
 * Format a date as a relative time string in Greek.
 * Returns strings like "πριν 5 λεπτά", "πριν 2 ώρες", etc.
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSeconds < 60) {
    return 'μόλις τώρα';
  }
  if (diffMinutes < 60) {
    return diffMinutes === 1 ? 'πριν 1 λεπτό' : `πριν ${diffMinutes} λεπτά`;
  }
  if (diffHours < 24) {
    return diffHours === 1 ? 'πριν 1 ώρα' : `πριν ${diffHours} ώρες`;
  }
  if (diffDays < 7) {
    return diffDays === 1 ? 'πριν 1 μέρα' : `πριν ${diffDays} μέρες`;
  }
  if (diffWeeks < 4) {
    return diffWeeks === 1 ? 'πριν 1 εβδομάδα' : `πριν ${diffWeeks} εβδομάδες`;
  }
  if (diffMonths < 12) {
    return diffMonths === 1 ? 'πριν 1 μήνα' : `πριν ${diffMonths} μήνες`;
  }

  const diffYears = Math.floor(diffMonths / 12);
  return diffYears === 1 ? 'πριν 1 χρόνο' : `πριν ${diffYears} χρόνια`;
}

/**
 * Truncate text to maxLength characters, appending "..." if truncated.
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength).trimEnd() + '...';
}
