/**
 * StaffNow billing helpers — provider-agnostic primitives shared by
 *   - the Stripe webhook handler  (`routes/billing.ts`)
 *   - the manual-bank-transfer admin confirmation (`routes/admin.ts`)
 *   - the daily grace-period cron job (`scheduled` handler)
 *
 * Design goals
 *   1. **Idempotency**: every external event is funnelled through
 *      `acquireWebhookEvent()`. If we have already processed an event_id
 *      for a given provider, the helper returns null and the caller
 *      short-circuits — no duplicate payments, no double activation.
 *   2. **One source of truth**: `recordPayment()` writes the canonical
 *      `payments` row + (optionally) issues an invoice/receipt with
 *      sequential numbering and a customer snapshot.
 *   3. **No floats**: every monetary amount is an integer in cents.
 */

import type { Env } from '../types';
import { generateId } from './id';

// ---------- Plan catalog (mirrors @staffnow/config but typed for billing) ----------

export interface PlanSpec {
  id: string;
  name: string;
  nameEl: string;
  /** monthly price in cents (gross of VAT) */
  monthlyCents: number;
  /** yearly price in cents (gross of VAT) */
  yearlyCents: number;
  /** the Stripe Price ID env-var name; resolved at call site */
  stripePriceEnvMonthly: keyof Env;
  stripePriceEnvYearly: keyof Env;
}

export const BILLING_PLANS: Record<string, PlanSpec> = {
  business_basic: {
    id: 'business_basic',
    name: 'Business Basic',
    nameEl: 'Επιχείρηση Basic',
    monthlyCents: 2900,
    yearlyCents: 29000,
    stripePriceEnvMonthly: 'STRIPE_PRICE_BUSINESS_BASIC_MONTHLY',
    stripePriceEnvYearly: 'STRIPE_PRICE_BUSINESS_BASIC_YEARLY',
  },
  business_pro: {
    id: 'business_pro',
    name: 'Business Pro',
    nameEl: 'Επιχείρηση Pro',
    monthlyCents: 7900,
    yearlyCents: 71100, // -25%
    stripePriceEnvMonthly: 'STRIPE_PRICE_BUSINESS_PRO_MONTHLY',
    stripePriceEnvYearly: 'STRIPE_PRICE_BUSINESS_PRO_YEARLY',
  },
  // Founding Members early-bird: first 100 customers grandfather in Pro features
  // at 39€/month forever. Identical features to business_pro.
  founding_pro: {
    id: 'founding_pro',
    name: 'Founding Pro',
    nameEl: 'Pro (Founding)',
    monthlyCents: 3900,
    yearlyCents: 35100, // -25%
    stripePriceEnvMonthly: 'STRIPE_PRICE_FOUNDING_PRO_MONTHLY',
    stripePriceEnvYearly: 'STRIPE_PRICE_FOUNDING_PRO_YEARLY',
  },
  business_elite: {
    id: 'business_elite',
    name: 'Business Elite',
    nameEl: 'Επιχείρηση Elite',
    monthlyCents: 14900,
    yearlyCents: 134100, // -25%
    stripePriceEnvMonthly: 'STRIPE_PRICE_BUSINESS_ELITE_MONTHLY',
    stripePriceEnvYearly: 'STRIPE_PRICE_BUSINESS_ELITE_YEARLY',
  },
  worker_premium: {
    id: 'worker_premium',
    name: 'Worker Premium',
    nameEl: 'Εργαζόμενος Premium',
    monthlyCents: 499,
    yearlyCents: 4499, // -25%
    stripePriceEnvMonthly: 'STRIPE_PRICE_WORKER_PREMIUM_MONTHLY',
    stripePriceEnvYearly: 'STRIPE_PRICE_WORKER_PREMIUM_YEARLY',
  },
};

export const VAT_RATE_PERCENT = 24;

/** Greek-friendly VAT split. We treat plan prices as VAT-inclusive. */
export function splitVatInclusive(totalCents: number, vatPercent = VAT_RATE_PERCENT): {
  netCents: number;
  vatCents: number;
  totalCents: number;
} {
  const netCents = Math.round((totalCents * 100) / (100 + vatPercent));
  const vatCents = totalCents - netCents;
  return { netCents, vatCents, totalCents };
}

// ---------- Idempotency layer ---------------------------------------------------

/**
 * Atomically claim an event_id for a provider. Returns the freshly-inserted
 * row id on the first call. Subsequent calls for the same (provider,event_id)
 * receive `null` — the caller MUST treat that as "already handled" and bail.
 */
export async function acquireWebhookEvent(
  env: Env,
  provider: string,
  eventId: string,
  eventType: string,
  rawPayload: string,
): Promise<string | null> {
  const id = generateId('whe');
  try {
    // INSERT OR IGNORE — D1's UNIQUE(provider, event_id) handles dedup.
    const res = await env.DB.prepare(
      `INSERT OR IGNORE INTO webhook_events
        (id, provider, event_id, event_type, payload, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    )
      .bind(id, provider, eventId, eventType, rawPayload.slice(0, 100_000))
      .run();
    if (res.meta && (res.meta as any).changes === 0) return null;
    return id;
  } catch (err) {
    console.warn('[billing] acquireWebhookEvent failed', err);
    return null;
  }
}

export async function markWebhookProcessed(env: Env, whEventId: string, error?: string) {
  try {
    if (error) {
      await env.DB.prepare(
        `UPDATE webhook_events SET error = ? WHERE id = ?`,
      ).bind(error.slice(0, 1000), whEventId).run();
    } else {
      await env.DB.prepare(
        `UPDATE webhook_events SET processed_at = datetime('now'), error = NULL WHERE id = ?`,
      ).bind(whEventId).run();
    }
  } catch {}
}

// ---------- Document numbering --------------------------------------------------

/**
 * Atomically reserve the next sequence number for an invoice series in the
 * current calendar year. SQLite/D1 does not support RETURNING in UPDATE so
 * we use an upsert + SELECT in a single .batch() call.
 */
export async function nextDocSeq(
  env: Env,
  series: 'TIM' | 'AP',
  year: number,
): Promise<number> {
  // Ensure row exists.
  await env.DB.prepare(
    `INSERT OR IGNORE INTO document_counters (series, series_year, next_seq) VALUES (?, ?, 1)`,
  ).bind(series, year).run();

  // Bump and read. D1 does not support RETURNING reliably across versions —
  // so do it as two statements inside a transaction-ish batch.
  const stmts = [
    env.DB.prepare(
      `UPDATE document_counters SET next_seq = next_seq + 1 WHERE series = ? AND series_year = ?`,
    ).bind(series, year),
    env.DB.prepare(
      `SELECT next_seq FROM document_counters WHERE series = ? AND series_year = ?`,
    ).bind(series, year),
  ];
  const results = await env.DB.batch(stmts);
  const row = (results[1] as any)?.results?.[0] as { next_seq: number } | undefined;
  // We just incremented to N+1, so the issued value is N.
  const issued = (row?.next_seq ?? 2) - 1;
  return issued;
}

export function formatDocNumber(series: 'TIM' | 'AP', year: number, seq: number): string {
  return `${series}/${year}/${String(seq).padStart(4, '0')}`;
}

// ---------- Customer snapshot ---------------------------------------------------

export interface CustomerSnapshot {
  name: string | null;
  vat: string | null;
  doy: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
}

export async function getCustomerSnapshot(env: Env, userId: string): Promise<CustomerSnapshot> {
  const profile = await env.DB.prepare(
    `SELECT * FROM billing_profiles WHERE user_id = ?`,
  )
    .bind(userId)
    .first<any>();

  // Fallback to user/business_profile basic data.
  if (!profile) {
    const fallback = await env.DB.prepare(
      `SELECT u.email, COALESCE(bp.company_name, '') as legal_name,
              COALESCE(bp.address, '') as address, COALESCE(bp.region, '') as city
         FROM users u
         LEFT JOIN business_profiles bp ON bp.user_id = u.id
        WHERE u.id = ?`,
    )
      .bind(userId)
      .first<any>();
    return {
      name: fallback?.legal_name || null,
      vat: null,
      doy: null,
      address: fallback?.address || null,
      postalCode: null,
      city: fallback?.city || null,
      country: 'GR',
      email: fallback?.email || null,
    };
  }

  return {
    name: profile.legal_name || null,
    vat: profile.vat_number || null,
    doy: profile.doy || null,
    address: profile.address || null,
    postalCode: profile.postal_code || null,
    city: profile.city || null,
    country: profile.country || 'GR',
    email: profile.email || null,
  };
}

// ---------- Issue invoice / receipt --------------------------------------------

export interface IssueDocumentParams {
  paymentId: string;
  userId: string;
  /** 'invoice' = τιμολόγιο (needs VAT id), 'receipt' = απόδειξη παροχής υπηρεσιών */
  docType: 'invoice' | 'receipt';
  totalCents: number;
  currency?: string;
  description: string;
  planId?: string | null;
}

export async function issueDocument(env: Env, p: IssueDocumentParams): Promise<{
  invoiceId: string;
  docNumber: string;
}> {
  const series: 'TIM' | 'AP' = p.docType === 'invoice' ? 'TIM' : 'AP';
  const year = new Date().getUTCFullYear();
  const seq = await nextDocSeq(env, series, year);
  const docNumber = formatDocNumber(series, year, seq);

  const customer = await getCustomerSnapshot(env, p.userId);
  const { netCents, vatCents, totalCents } = splitVatInclusive(p.totalCents);

  const id = generateId('inv');
  const html = renderInvoiceHtml({
    docNumber,
    docType: p.docType,
    customer,
    netCents,
    vatCents,
    totalCents,
    currency: p.currency || 'EUR',
    description: p.description,
    issuedAt: new Date(),
  });

  await env.DB.prepare(
    `INSERT INTO invoices
      (id, payment_id, user_id, doc_type, doc_number, series, series_year, series_seq,
       customer_name, customer_vat, customer_doy, customer_address,
       customer_postal_code, customer_city, customer_country, customer_email,
       net_cents, vat_rate, vat_cents, total_cents, currency,
       description, plan_id, html, issued_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
  )
    .bind(
      id,
      p.paymentId,
      p.userId,
      p.docType,
      docNumber,
      series,
      year,
      seq,
      customer.name,
      customer.vat,
      customer.doy,
      customer.address,
      customer.postalCode,
      customer.city,
      customer.country,
      customer.email,
      netCents,
      VAT_RATE_PERCENT,
      vatCents,
      totalCents,
      p.currency || 'EUR',
      p.description,
      p.planId || null,
      html,
    )
    .run();

  // Link the payment row to this invoice.
  await env.DB.prepare(
    `UPDATE payments SET invoice_id = ?, updated_at = datetime('now') WHERE id = ?`,
  ).bind(id, p.paymentId).run();

  return { invoiceId: id, docNumber };
}

// ---------- Record payment ------------------------------------------------------

export interface RecordPaymentParams {
  userId: string;
  provider: string;
  providerRef: string | null;
  planId?: string | null;
  amountCents: number;
  currency?: string;
  status?: 'pending' | 'succeeded' | 'failed' | 'refunded';
  documentType: 'invoice' | 'receipt';
  metadata?: Record<string, any>;
}

export async function recordPayment(env: Env, p: RecordPaymentParams): Promise<{
  paymentId: string;
  isNew: boolean;
}> {
  // Idempotent on (provider, provider_ref).
  if (p.providerRef) {
    const existing = await env.DB.prepare(
      `SELECT id FROM payments WHERE provider = ? AND provider_ref = ?`,
    )
      .bind(p.provider, p.providerRef)
      .first<{ id: string }>();
    if (existing) return { paymentId: existing.id, isNew: false };
  }

  const id = generateId('pay');
  await env.DB.prepare(
    `INSERT INTO payments
      (id, user_id, provider, provider_ref, plan_id, amount_cents, currency,
       status, document_type, metadata, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
  )
    .bind(
      id,
      p.userId,
      p.provider,
      p.providerRef,
      p.planId || null,
      p.amountCents,
      p.currency || 'EUR',
      p.status || 'succeeded',
      p.documentType,
      p.metadata ? JSON.stringify(p.metadata) : null,
    )
    .run();

  return { paymentId: id, isNew: true };
}

// ---------- Subscription activation --------------------------------------------

export interface ActivateSubscriptionParams {
  userId: string;
  planId: string;
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  status?: string;
}

export async function activateSubscription(env: Env, p: ActivateSubscriptionParams) {
  const now = new Date().toISOString();
  const existing = await env.DB.prepare(
    `SELECT id FROM subscriptions WHERE user_id = ?`,
  ).bind(p.userId).first<{ id: string }>();

  if (existing) {
    await env.DB.prepare(
      `UPDATE subscriptions
          SET plan_id = ?, stripe_subscription_id = COALESCE(?, stripe_subscription_id),
              stripe_customer_id = COALESCE(?, stripe_customer_id),
              status = ?, current_period_start = ?, current_period_end = ?,
              grace_period_until = NULL, updated_at = ?
        WHERE user_id = ?`,
    )
      .bind(
        p.planId,
        p.stripeSubscriptionId || null,
        p.stripeCustomerId || null,
        p.status || 'active',
        p.currentPeriodStart,
        p.currentPeriodEnd,
        now,
        p.userId,
      )
      .run();
  } else {
    await env.DB.prepare(
      `INSERT INTO subscriptions
        (id, user_id, plan_id, stripe_subscription_id, stripe_customer_id,
         status, current_period_start, current_period_end, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        generateId('sub'),
        p.userId,
        p.planId,
        p.stripeSubscriptionId || null,
        p.stripeCustomerId || null,
        p.status || 'active',
        p.currentPeriodStart,
        p.currentPeriodEnd,
        now,
        now,
      )
      .run();
  }

  // Sync the cached `is_premium` flag for worker_premium subscribers.
  // Other surfaces (search ranking, profile cards) use the cached column
  // for cheap reads. Source of truth remains the subscriptions row.
  if (p.planId === 'worker_premium' && (p.status || 'active') === 'active') {
    try {
      await env.DB.prepare(
        `UPDATE users SET is_premium = 1, premium_until = ?, updated_at = ? WHERE id = ?`,
      ).bind(p.currentPeriodEnd, now, p.userId).run();
    } catch {}
  }

  // Auto-grant Verified Badge for plans whose features include verifiedBadge=true
  // (Pro, Founding Pro, Elite). Workers don't get a verified badge from the
  // worker_premium plan — they have a separate premium tick. We only grant for
  // active subscriptions; if the subscription is canceled we leave the existing
  // verified status untouched (admin can revoke manually if needed).
  const verifiedPlans = new Set(['business_pro', 'business_elite', 'founding_pro']);
  if (verifiedPlans.has(p.planId) && (p.status || 'active') === 'active') {
    try {
      await env.DB.prepare(
        `UPDATE business_profiles SET verified = 1, updated_at = ? WHERE user_id = ?`,
      ).bind(now, p.userId).run();
    } catch {}
  }
}

export async function setGracePeriod(env: Env, userId: string, days = 3) {
  await env.DB.prepare(
    `UPDATE subscriptions
        SET status = 'past_due',
            grace_period_until = datetime('now', ?),
            updated_at = datetime('now')
      WHERE user_id = ?`,
  )
    .bind(`+${days} days`, userId)
    .run();
}

/**
 * Cron entry-point. Downgrades any subscription whose grace_period_until
 * has elapsed. Logs a row in `subscription_events` so we can audit.
 */
export async function downgradeExpiredSubscriptions(env: Env): Promise<{ downgraded: number }> {
  const expired = await env.DB.prepare(
    `SELECT id, user_id FROM subscriptions
      WHERE grace_period_until IS NOT NULL
        AND grace_period_until < datetime('now')
        AND status != 'canceled'`,
  ).all<{ id: string; user_id: string }>();

  let count = 0;
  for (const row of (expired.results || []) as any[]) {
    await env.DB.prepare(
      `UPDATE subscriptions
          SET status = 'canceled', grace_period_until = NULL, updated_at = datetime('now')
        WHERE id = ?`,
    ).bind(row.id).run();

    try {
      await env.DB.prepare(
        `INSERT INTO subscription_events (id, subscription_id, event_type, data, created_at)
         VALUES (?, ?, 'auto_downgraded', ?, datetime('now'))`,
      )
        .bind(generateId('se'), row.id, JSON.stringify({ reason: 'grace_period_expired' }))
        .run();
    } catch {}

    // Notify the user.
    try {
      await env.DB.prepare(
        `INSERT INTO notifications (id, user_id, type, title, body, read, created_at, updated_at)
         VALUES (?, ?, 'billing', ?, ?, 0, datetime('now'), datetime('now'))`,
      )
        .bind(
          generateId('ntf'),
          row.user_id,
          'Η συνδρομή σας υποβαθμίστηκε',
          'Η περίοδος χάριτος έληξε χωρίς επιτυχή πληρωμή. Ο λογαριασμός σας υποβαθμίστηκε στο Free.',
        )
        .run();
    } catch {}

    count++;
  }
  return { downgraded: count };
}

// ---------- Manual bank transfer -----------------------------------------------

/**
 * Generates a human-friendly reference like "STAFF-7K3-9PQR".
 * Collisions are extremely unlikely but we retry up to 5 times to be safe.
 */
export function generateReferenceCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/I/1
  const block = (n: number) =>
    Array.from({ length: n }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  return `STAFF-${block(3)}-${block(4)}`;
}

export interface CreateManualTransferParams {
  userId: string;
  planId: string;
  billingPeriod?: 'monthly' | 'yearly';
  documentType: 'invoice' | 'receipt';
  amountCents: number;
  expiresInDays?: number;
}

export async function createManualBankTransfer(
  env: Env,
  p: CreateManualTransferParams,
): Promise<{ id: string; referenceCode: string; expiresAt: string }> {
  const id = generateId('mbt');
  const expiresAt = new Date(Date.now() + (p.expiresInDays ?? 7) * 86_400_000).toISOString();

  let referenceCode = '';
  for (let i = 0; i < 5; i++) {
    const candidate = generateReferenceCode();
    const dup = await env.DB.prepare(
      `SELECT 1 FROM manual_bank_transfers WHERE reference_code = ?`,
    ).bind(candidate).first();
    if (!dup) {
      referenceCode = candidate;
      break;
    }
  }
  if (!referenceCode) {
    throw new Error('Could not generate unique reference code');
  }

  await env.DB.prepare(
    `INSERT INTO manual_bank_transfers
      (id, user_id, plan_id, billing_period, amount_cents, reference_code,
       document_type, status, expires_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, datetime('now'), datetime('now'))`,
  )
    .bind(id, p.userId, p.planId, p.billingPeriod || 'monthly', p.amountCents, referenceCode, p.documentType, expiresAt)
    .run();

  return { id, referenceCode, expiresAt };
}

// ---------- Invoice rendering ---------------------------------------------------

export interface RenderInvoiceParams {
  docNumber: string;
  docType: 'invoice' | 'receipt';
  customer: CustomerSnapshot;
  netCents: number;
  vatCents: number;
  totalCents: number;
  currency: string;
  description: string;
  issuedAt: Date;
}

const COMPANY = {
  name: 'StaffNow',
  legalName: 'StaffNow',
  vat: '—',
  doy: '—',
  address: '—',
  email: 'billing@staffnow.gr',
  iban: 'GR16 0110 0000 0000 0000 0000 000', // placeholder — replace when available
};

function fmtMoney(cents: number, currency = 'EUR'): string {
  const v = (cents / 100).toFixed(2).replace('.', ',');
  return currency === 'EUR' ? `${v} €` : `${v} ${currency}`;
}

function escapeHtml(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderInvoiceHtml(p: RenderInvoiceParams): string {
  const titleEl = p.docType === 'invoice' ? 'Τιμολόγιο Παροχής Υπηρεσιών' : 'Απόδειξη Παροχής Υπηρεσιών';
  const issued = p.issuedAt.toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return `<!doctype html>
<html lang="el">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(titleEl)} ${escapeHtml(p.docNumber)}</title>
<style>
 body { font-family: -apple-system, system-ui, "Segoe UI", Helvetica, Arial, sans-serif; color: #111; max-width: 720px; margin: 32px auto; padding: 0 24px; }
 h1 { margin: 0 0 4px; font-size: 22px; }
 .muted { color: #666; font-size: 12px; }
 .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
 .col { flex: 1; }
 table { width: 100%; border-collapse: collapse; margin-top: 24px; }
 th, td { padding: 10px 8px; border-bottom: 1px solid #eee; text-align: left; }
 .totals { margin-top: 16px; width: 100%; }
 .totals td { border: 0; padding: 4px 8px; }
 .totals .label { text-align: right; color: #555; }
 .totals .value { text-align: right; font-variant-numeric: tabular-nums; }
 .total-row td { border-top: 2px solid #111; font-weight: 700; padding-top: 10px; }
 .badge { display: inline-block; background: #eef; color: #335; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: .5px; }
 .footer { margin-top: 32px; font-size: 11px; color: #888; }
</style>
</head>
<body>
  <div class="header">
    <div class="col">
      <h1>${escapeHtml(titleEl)}</h1>
      <p class="muted">Αρ. εγγράφου: <strong>${escapeHtml(p.docNumber)}</strong></p>
      <p class="muted">Ημερομηνία έκδοσης: ${escapeHtml(issued)}</p>
    </div>
    <div class="col" style="text-align:right;">
      <div class="badge">${p.docType === 'invoice' ? 'ΤΙΜΟΛΟΓΙΟ' : 'ΑΠΟΔΕΙΞΗ'}</div>
      <p class="muted" style="margin-top:8px;">
        ${escapeHtml(COMPANY.legalName)}<br/>
        ΑΦΜ: ${escapeHtml(COMPANY.vat)} · ΔΟΥ: ${escapeHtml(COMPANY.doy)}<br/>
        ${escapeHtml(COMPANY.address)}<br/>
        ${escapeHtml(COMPANY.email)}
      </p>
    </div>
  </div>

  <div style="margin-top:24px;">
    <p class="muted" style="margin-bottom:4px;"><strong>Χρεώνεται σε:</strong></p>
    <p style="margin:0;">
      ${escapeHtml(p.customer.name || '—')}<br/>
      ${
        p.docType === 'invoice'
          ? `ΑΦΜ: ${escapeHtml(p.customer.vat || '—')} · ΔΟΥ: ${escapeHtml(p.customer.doy || '—')}<br/>`
          : ''
      }
      ${escapeHtml(p.customer.address || '')}${p.customer.address && p.customer.city ? ', ' : ''}${escapeHtml(p.customer.city || '')}
      ${p.customer.postalCode ? ` ${escapeHtml(p.customer.postalCode)}` : ''}<br/>
      ${escapeHtml(p.customer.country || '')}<br/>
      ${escapeHtml(p.customer.email || '')}
    </p>
  </div>

  <table>
    <thead>
      <tr>
        <th>Περιγραφή</th>
        <th style="text-align:right; width:140px;">Σύνολο</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${escapeHtml(p.description)}</td>
        <td style="text-align:right;">${fmtMoney(p.netCents, p.currency)}</td>
      </tr>
    </tbody>
  </table>

  <table class="totals">
    <tr><td class="label">Καθαρή αξία</td><td class="value">${fmtMoney(p.netCents, p.currency)}</td></tr>
    <tr><td class="label">ΦΠΑ ${VAT_RATE_PERCENT}%</td><td class="value">${fmtMoney(p.vatCents, p.currency)}</td></tr>
    <tr class="total-row"><td class="label">Συνολικό ποσό</td><td class="value">${fmtMoney(p.totalCents, p.currency)}</td></tr>
  </table>

  <div class="footer">
    <p>Αυτό το έγγραφο εκδίδεται ηλεκτρονικά από το StaffNow και είναι έγκυρο χωρίς υπογραφή ή σφραγίδα.</p>
    <p>Για ερωτήσεις σχετικά με τη χρέωσή σας: ${escapeHtml(COMPANY.email)}</p>
  </div>
</body>
</html>`;
}

export const BANK_ACCOUNT = {
  beneficiary: 'StaffNow',
  bank: 'Eurobank',
  iban: 'GR16 0260 0000 0000 0000 0000 000', // placeholder — replace
  bic: 'ERBKGRAA',
};
