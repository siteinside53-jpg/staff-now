import { createMiddleware } from 'hono/factory';
import type { Env } from '../types';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 60,
  keyPrefix: 'rl',
};

export const rateLimiter = (config?: Partial<RateLimitConfig>) =>
  createMiddleware<{ Bindings: Env }>(async (c, next) => {
    const { windowMs, maxRequests, keyPrefix } = { ...DEFAULT_CONFIG, ...config };
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
    const window = Math.floor(Date.now() / windowMs);
    const key = `${keyPrefix}:${ip}:${window}`;

    try {
      const current = await c.env.KV.get(key);
      const count = current ? parseInt(current, 10) : 0;

      if (count >= maxRequests) {
        return c.json(
          { success: false, error: { code: 'RATE_LIMITED', message: 'Πολλές προσπάθειες. Δοκιμάστε αργότερα.' } },
          429,
        );
      }

      c.executionCtx.waitUntil(
        c.env.KV.put(key, String(count + 1), { expirationTtl: Math.ceil(windowMs / 1000) + 1 }),
      );
    } catch {
      // If KV fails, allow through
    }

    await next();
  });

// Global limiter backed by Cloudflare's native Rate Limiting binding.
// Unlike the KV-based limiter above, this performs NO KV writes, so it does not
// consume the daily KV-write quota on every request. Falls back to allowing the
// request through if the binding is unavailable (e.g. local dev without it).
export const globalRateLimiter = () =>
  createMiddleware<{ Bindings: Env }>(async (c, next) => {
    const limiter = c.env.RATE_LIMITER;
    if (limiter) {
      const ip =
        c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
      try {
        const { success } = await limiter.limit({ key: ip });
        if (!success) {
          return c.json(
            { success: false, error: { code: 'RATE_LIMITED', message: 'Πολλές προσπάθειες. Δοκιμάστε αργότερα.' } },
            429,
          );
        }
      } catch {
        // If the limiter fails, allow the request through.
      }
    }
    await next();
  });

// Auth-specific limiters stay on KV: their windows (15min / 1hr) exceed the
// native binding's max period (60s), and they only fire on a handful of auth
// endpoints, so they don't meaningfully consume the KV-write quota.
export const authRateLimiter = rateLimiter({
  windowMs: 900_000,
  maxRequests: 10,
  keyPrefix: 'rl_auth',
});

export const passwordResetRateLimiter = rateLimiter({
  windowMs: 3_600_000,
  maxRequests: 3,
  keyPrefix: 'rl_pwd_reset',
});

// Κωδικός επιβεβαίωσης email: ξεχωριστό prefix από το password reset ώστε το
// «ξαναστείλε» να μη μπλοκάρεται επειδή ο χρήστης έκανε νωρίτερα reset κωδικού.
export const emailCodeRateLimiter = rateLimiter({
  windowMs: 900_000,
  maxRequests: 5,
  keyPrefix: 'rl_email_code',
});
