import type { Context } from 'hono';

export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  KV: KVNamespace;
  JWT_SECRET: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRICE_BUSINESS_BASIC_MONTHLY: string;
  STRIPE_PRICE_BUSINESS_BASIC_YEARLY: string;
  STRIPE_PRICE_BUSINESS_PRO_MONTHLY: string;
  STRIPE_PRICE_BUSINESS_PRO_YEARLY: string;
  STRIPE_PRICE_WORKER_PREMIUM_MONTHLY: string;
  STRIPE_PRICE_WORKER_PREMIUM_YEARLY: string;
  PASSWORD_SALT: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  ENVIRONMENT: string;
  CORS_ORIGIN: string;
  API_URL: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: 'worker' | 'business' | 'admin';
  status: string;
}

export type AppContext = Context<{ Bindings: Env; Variables: { user?: AuthUser } }>;
