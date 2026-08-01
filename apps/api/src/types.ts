import type { Context } from 'hono';

// Cloudflare native Rate Limiting binding (configured via unsafe.bindings in
// wrangler.toml). Avoids per-request KV writes.
export interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  KV: KVNamespace;
  RATE_LIMITER?: RateLimitBinding;
  AI: any; // Cloudflare Workers AI binding
  JWT_SECRET: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRICE_BUSINESS_BASIC_MONTHLY: string;
  STRIPE_PRICE_BUSINESS_BASIC_YEARLY: string;
  STRIPE_PRICE_BUSINESS_PRO_MONTHLY: string;
  STRIPE_PRICE_BUSINESS_PRO_YEARLY: string;
  STRIPE_PRICE_BUSINESS_ELITE_MONTHLY: string;
  STRIPE_PRICE_BUSINESS_ELITE_YEARLY: string;
  STRIPE_PRICE_WORKER_PREMIUM_MONTHLY: string;
  STRIPE_PRICE_WORKER_PREMIUM_YEARLY: string;
  /** One-time (lifetime) Stripe Price for Worker Premium. */
  STRIPE_PRICE_WORKER_PREMIUM_LIFETIME: string;
  STRIPE_PRICE_FOUNDING_PRO_MONTHLY: string;
  STRIPE_PRICE_FOUNDING_PRO_YEARLY: string;
  /**
   * Optional Stripe Tax Rate ID (e.g. `txr_...`) for the Greek 24% VAT, created
   * as *inclusive*. When set, it is attached to checkout so Stripe invoices show
   * the net + VAT breakdown without adding tax on top of the gross price. When
   * unset, checkout behaves exactly as before (total only, no split line).
   */
  STRIPE_TAX_RATE_ID?: string;
  /**
   * Optional Stripe Tax Rate ID (`txr_...`) for the Greek 24% VAT, created as
   * *exclusive*. Attached to business SUBSCRIPTION checkouts, whose prices are
   * now NET — Stripe adds 24% on top and shows net + VAT + gross. Worker Premium
   * (lifetime, gross) keeps STRIPE_TAX_RATE_ID (inclusive) instead.
   */
  STRIPE_TAX_RATE_ID_EXCL?: string;
  PASSWORD_SALT: string;
  OPENAI_API_KEY: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  ENVIRONMENT: string;
  CORS_ORIGIN: string;
  API_URL: string;
  DAILY_API_KEY: string;
  // Web Push (VAPID) + transactional email for off-site notifications.
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
  EMAIL_API_KEY: string;
  EMAIL_FROM: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: 'worker' | 'business' | 'admin';
  status: string;
}

export type AppContext = Context<{ Bindings: Env; Variables: { user?: AuthUser } }>;
