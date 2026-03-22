import { API_DOMAIN } from '@staffnow/config';

/**
 * Build a query string from a params object.
 * Undefined values are skipped.
 */
export function buildQueryString(
  params: Record<string, string | number | boolean | undefined>,
): string {
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);

  return entries.length > 0 ? `?${entries.join('&')}` : '';
}

/**
 * Build a full API URL with optional query parameters.
 */
export function buildApiUrl(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const qs = params ? buildQueryString(params) : '';
  return `https://${API_DOMAIN}${normalizedPath}${qs}`;
}
