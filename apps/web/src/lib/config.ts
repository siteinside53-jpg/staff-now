/**
 * Central API base URL helper.
 *
 * Resolves in this order:
 *   1. NEXT_PUBLIC_API_URL  (whatever the deployment sets)
 *   2. Production fallback  (when NODE_ENV === 'production')
 *   3. Local dev fallback   (http://localhost:8787)
 *
 * Use this everywhere instead of hard-coding the workers.dev URL.
 */
export const API_URL: string =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === 'production'
    ? 'https://staffnow-api-production.siteinside53.workers.dev'
    : 'http://localhost:8787');
