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
