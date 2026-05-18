/**
 * StaffNow billing routes.
 *
 *   POST  /billing/webhook                — Stripe webhook (verified, idempotent)
 *   GET   /billing/plans                  — public plan catalogue
 *   GET   /billing/me                     — current sub + history + invoices (authed)
 *   GET   /billing/profile                — billing profile (authed)
 *   PUT   /billing/profile                — update billing profile (authed)
 *   POST  /billing/checkout               — Stripe Checkout session (authed, businesses only)
 *   POST  /billing/portal                 — Stripe Customer Portal (authed)
 *   POST  /billing/cancel                 — cancel-at-period-end (authed)
 *   POST  /billing/manual-transfer        — create pending bank transfer order (authed)
 *   GET   /billing/manual-transfer/:id    — view pending order (authed)
 *   GET   /billing/invoices/:id           — render the legal HTML document (authed)
 */

import { Hono } from 'hono';
import { PLANS } from '@staffnow/config';
import type { Env, AuthUser } from '../types';
import { requireAuth } from '../middleware/auth';
import { success, error } from '../lib/response';
import { generateId } from '../lib/id';
import {
  acquireWebhookEvent,
  markWebhookProcessed,
  recordPayment,
  issueDocument,
  activateSubscription,
  setGracePeriod,
  createManualBankTransfer,
  BILLING_PLANS,
  BANK_ACCOUNT,
  VAT_RATE_PERCENT,
} from '../lib/billing';

const billing = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// =====================================================================
// POST /webhook  (must come BEFORE auth-protected routes since Stripe
// will call us without a JWT). All bodies are read raw to verify HMAC.
// =====================================================================
billing.post('/webhook', async (c) => {
  const signature = c.req.header('stripe-signature');
  if (!signature) return error(c, 'BAD_SIGNATURE', 'Λείπει η υπογραφή Stripe.', 400);

  const rawBody = await c.req.text();

  // ---- 1) Verify signature (HMAC-SHA256) ------------------------------
  const parts = signature.split(',').reduce(
    (acc, part) => {
      const [key, value] = part.split('=');
      if (!value) return acc;
      if (key === 't') acc.timestamp = value;
      if (key === 'v1') acc.signatures.push(value);
      return acc;
    },
    { timestamp: '', signatures: [] as string[] },
  );

  if (!parts.timestamp || parts.signatures.length === 0) {
    return error(c, 'BAD_SIGNATURE', 'Μη έγκυρη υπογραφή webhook.', 400);
  }

  const tolerance = 300; // 5 min
  const ageSec = Math.floor(Date.now() / 1000) - parseInt(parts.timestamp, 10);
  if (Math.abs(ageSec) > tolerance) {
    return error(c, 'STALE_SIGNATURE', 'Η υπογραφή webhook έχει λήξει.', 400);
  }

  const signedPayload = `${parts.timestamp}.${rawBody}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(c.env.STRIPE_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const isValid = parts.signatures.some((sig) => {
    if (sig.length !== expectedSignature.length) return false;
    let result = 0;
    for (let i = 0; i < sig.length; i++) {
      result |= sig.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }
    return result === 0;
  });

  if (!isValid) return error(c, 'BAD_SIGNATURE', 'Μη έγκυρη υπογραφή webhook.', 400);

  // ---- 2) Parse + idempotency ------------------------------------------
  const event = JSON.parse(rawBody) as { id: string; type: string; data: { object: any } };
  const whEventRowId = await acquireWebhookEvent(c.env, 'stripe', event.id, event.type, rawBody);
  if (!whEventRowId) {
    // Already seen — Stripe retries are safe.
    return success(c, { received: true, duplicate: true });
  }

  // ---- 3) Dispatch -----------------------------------------------------
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(c.env, event.data.object);
        break;
      case 'invoice.paid':
      case 'invoice.payment_succeeded':
        await handleInvoicePaid(c.env, event.data.object);
        break;
      case 'invoice.payment_failed':
        await handleInvoiceFailed(c.env, event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(c.env, event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(c.env, event.data.object);
        break;
      case 'charge.refunded':
        await handleChargeRefunded(c.env, event.data.object);
        break;
      default:
        // Unhandled event types are kept in webhook_events for visibility.
        break;
    }
    await markWebhookProcessed(c.env, whEventRowId);
  } catch (err: any) {
    await markWebhookProcessed(c.env, whEventRowId, err?.message || 'unknown');
    return c.json(
      { success: false, error: { code: 'WEBHOOK_HANDLER_FAILED', message: 'retry' } },
      500,
    );
  }

  return success(c, { received: true });
});

// ---------------------------------------------------------------------
// Webhook handlers
// ---------------------------------------------------------------------

async function fetchStripe<T>(env: Env, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      ...((init?.headers || {}) as Record<string, string>),
    },
  });
  return (await res.json()) as T;
}

async function handleCheckoutCompleted(env: Env, session: any) {
  const userId: string | undefined = session.metadata?.user_id;
  const planId: string | undefined = session.metadata?.plan_id;
  const docType: 'invoice' | 'receipt' =
    session.metadata?.document_type === 'invoice' ? 'invoice' : 'receipt';
  if (!userId) return;

  // ---- One-off credit purchase (mode='payment') -----------------------
  const packageId: string | undefined = session.metadata?.package_id;
  const creditsRaw = session.metadata?.credits;
  if (packageId && creditsRaw) {
    await handleCreditPurchase(env, session, userId, packageId, parseInt(creditsRaw, 10) || 0, docType);
    return;
  }

  if (!planId) return;

  const stripeSubId: string | null = session.subscription || null;
  const customerId: string | null = session.customer || null;

  let stripeSub: any = null;
  if (stripeSubId) {
    stripeSub = await fetchStripe<any>(env, `/subscriptions/${stripeSubId}`);
  }
  const periodStart = stripeSub?.current_period_start
    ? new Date(stripeSub.current_period_start * 1000).toISOString()
    : new Date().toISOString();
  const periodEnd = stripeSub?.current_period_end
    ? new Date(stripeSub.current_period_end * 1000).toISOString()
    : new Date(Date.now() + 30 * 86_400_000).toISOString();

  await activateSubscription(env, {
    userId,
    planId,
    stripeSubscriptionId: stripeSubId,
    stripeCustomerId: customerId,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    status: 'active',
  });

  // Founding-Members finalization: if this checkout claimed a spot, mark it
  // claimed (decrement pending, increment used) and flag the subscription row.
  const foundingClaimId: string | undefined = session.metadata?.founding_claim_id;
  if (foundingClaimId && planId === 'founding_pro') {
    const claim = await env.DB.prepare(
      `SELECT status FROM founding_member_pending_checkouts WHERE id = ?`,
    ).bind(foundingClaimId).first<{ status: string }>();
    if (claim?.status === 'pending') {
      await env.DB.prepare(
        `UPDATE founding_members_counter
            SET spots_pending = MAX(0, spots_pending - 1),
                spots_used = spots_used + 1,
                updated_at = datetime('now')
          WHERE id = 1`,
      ).run();
      await env.DB.prepare(
        `UPDATE founding_member_pending_checkouts
            SET status = 'claimed', finalized_at = datetime('now')
          WHERE id = ?`,
      ).bind(foundingClaimId).run();
      // Mark subscription as a founding member (we look up by user_id since
      // activateSubscription upserts a single active row per user).
      await env.DB.prepare(
        `UPDATE subscriptions SET is_founding_member = 1, updated_at = datetime('now') WHERE user_id = ? AND status = 'active'`,
      ).bind(userId).run();
    }
  }

  if (customerId) {
    await env.DB.prepare(
      `UPDATE users SET stripe_customer_id = COALESCE(stripe_customer_id, ?), updated_at = datetime('now') WHERE id = ?`,
    ).bind(customerId, userId).run();
  }

  const plan = BILLING_PLANS[planId];
  const amountCents: number = (session.amount_total ?? plan?.monthlyCents ?? 0) as number;

  const { paymentId } = await recordPayment(env, {
    userId,
    provider: 'stripe',
    providerRef: session.payment_intent || session.id,
    planId,
    amountCents,
    currency: (session.currency || 'eur').toUpperCase(),
    status: 'succeeded',
    documentType: docType,
    metadata: { source: 'checkout.session.completed', session_id: session.id },
  });

  if (amountCents > 0) {
    await issueDocument(env, {
      paymentId,
      userId,
      docType,
      totalCents: amountCents,
      description: `Συνδρομή ${plan?.nameEl || planId}`,
      planId,
    });
  }

  // Worker Premium → grant 30 bonus credits on activation. Monthly
  // renewals also top up the same amount via handleInvoicePaid below.
  if (planId === 'worker_premium') {
    await grantPremiumMonthlyCredits(env, userId, 30);
  }
}

/**
 * Grants the monthly Premium credit bonus.
 * Idempotent within a 25-day window — guards against double-credit when
 * Stripe sends both `checkout.session.completed` AND `invoice.paid` for
 * the same activation, or when admins resend webhooks.
 */
async function grantPremiumMonthlyCredits(env: Env, userId: string, amount: number) {
  // Skip if we already credited a Premium bonus in the past 25 days.
  const recent = await env.DB.prepare(
    `SELECT id FROM credit_transactions
      WHERE user_id = ? AND type = 'bonus'
        AND description LIKE 'Worker Premium — %'
        AND created_at > datetime('now', '-25 days')
      LIMIT 1`,
  ).bind(userId).first();
  if (recent) return;

  const now = new Date().toISOString();
  const existing = await env.DB.prepare(`SELECT id FROM credits WHERE user_id = ?`)
    .bind(userId)
    .first();
  if (!existing) {
    await env.DB.prepare(
      `INSERT INTO credits (id, user_id, balance, total_purchased, total_spent, created_at, updated_at)
       VALUES (?, ?, 0, 0, 0, ?, ?)`,
    )
      .bind(generateId('crd'), userId, now, now)
      .run();
  }
  await env.DB.prepare(
    `UPDATE credits SET balance = balance + ?, updated_at = ? WHERE user_id = ?`,
  ).bind(amount, now, userId).run();

  await env.DB.prepare(
    `INSERT INTO credit_transactions (id, user_id, amount, type, description, created_at)
     VALUES (?, ?, ?, 'bonus', ?, ?)`,
  )
    .bind(
      generateId('ctx'),
      userId,
      amount,
      `Worker Premium — μηνιαία credits (${amount})`,
      now,
    )
    .run();

  try {
    await env.DB.prepare(
      `INSERT INTO notifications (id, user_id, type, title, body, read, created_at, updated_at)
       VALUES (?, ?, 'billing', ?, ?, 0, ?, ?)`,
    )
      .bind(
        generateId('ntf'),
        userId,
        '✨ Worker Premium ενεργό',
        `Προστέθηκαν ${amount} credits στον λογαριασμό σου ως μέρος του Premium.`,
        now,
        now,
      )
      .run();
  } catch {}
}

/**
 * One-off credit-pack purchase via Stripe Checkout (mode=payment).
 * The metadata is set in `routes/credits.ts` POST /credits/stripe/checkout:
 *   user_id, package_id, credits.
 *
 * We mirror the subscription flow:
 *   1) record an idempotent payment row,
 *   2) credit the user's balance,
 *   3) write a credit_transactions row,
 *   4) issue an invoice / receipt.
 */
async function handleCreditPurchase(
  env: Env,
  session: any,
  userId: string,
  packageId: string,
  credits: number,
  docType: 'invoice' | 'receipt',
) {
  if (credits <= 0) return;
  const amountCents: number = session.amount_total ?? 0;
  const currency = (session.currency || 'eur').toUpperCase();

  // Idempotent payment.
  const { paymentId, isNew } = await recordPayment(env, {
    userId,
    provider: 'stripe',
    providerRef: session.payment_intent || session.id,
    planId: null,
    amountCents,
    currency,
    status: 'succeeded',
    documentType: docType,
    metadata: { source: 'credits.checkout.completed', package_id: packageId, credits },
  });
  if (!isNew) return; // we have already credited this purchase

  const now = new Date().toISOString();
  // Make sure the credits row exists.
  const existing = await env.DB.prepare(`SELECT id FROM credits WHERE user_id = ?`)
    .bind(userId)
    .first();
  if (!existing) {
    await env.DB.prepare(
      `INSERT INTO credits (id, user_id, balance, total_purchased, total_spent, created_at, updated_at)
       VALUES (?, ?, 0, 0, 0, ?, ?)`,
    )
      .bind(generateId('crd'), userId, now, now)
      .run();
  }
  await env.DB.prepare(
    `UPDATE credits
        SET balance = balance + ?, total_purchased = total_purchased + ?, updated_at = ?
      WHERE user_id = ?`,
  )
    .bind(credits, credits, now, userId)
    .run();

  await env.DB.prepare(
    `INSERT INTO credit_transactions (id, user_id, amount, type, description, created_at)
     VALUES (?, ?, ?, 'purchase', ?, ?)`,
  )
    .bind(
      generateId('ctx'),
      userId,
      credits,
      `Αγορά πακέτου ${packageId} (${credits} credits)`,
      now,
    )
    .run();

  if (amountCents > 0) {
    await issueDocument(env, {
      paymentId,
      userId,
      docType,
      totalCents: amountCents,
      description: `Αγορά credits — πακέτο ${packageId} (${credits} credits)`,
      planId: null,
    });
  }

  // User-facing notification.
  try {
    await env.DB.prepare(
      `INSERT INTO notifications (id, user_id, type, title, body, read, created_at, updated_at)
       VALUES (?, ?, 'billing', ?, ?, 0, ?, ?)`,
    )
      .bind(
        generateId('ntf'),
        userId,
        '✅ Επιτυχής αγορά credits',
        `Προστέθηκαν ${credits} credits στον λογαριασμό σας.`,
        now,
        now,
      )
      .run();
  } catch {}
}

async function handleInvoicePaid(env: Env, invoice: any) {
  const customerId: string | null = invoice.customer || null;
  const stripeSubId: string | null = invoice.subscription || null;
  if (!customerId) return;

  const userRow = await env.DB.prepare(
    `SELECT id FROM users WHERE stripe_customer_id = ?`,
  ).bind(customerId).first<{ id: string }>();
  if (!userRow) return;
  const userId = userRow.id;

  const subRow = await env.DB.prepare(
    `SELECT plan_id FROM subscriptions WHERE user_id = ?`,
  ).bind(userId).first<{ plan_id: string }>();
  const planId = subRow?.plan_id || null;

  const profile = await env.DB.prepare(
    `SELECT document_type FROM billing_profiles WHERE user_id = ?`,
  ).bind(userId).first<{ document_type: string }>();
  const docType: 'invoice' | 'receipt' =
    profile?.document_type === 'invoice' ? 'invoice' : 'receipt';

  const amountCents = invoice.amount_paid ?? invoice.amount_due ?? 0;
  if (!amountCents) return;

  const { paymentId, isNew } = await recordPayment(env, {
    userId,
    provider: 'stripe',
    providerRef: invoice.id,
    planId,
    amountCents,
    currency: (invoice.currency || 'eur').toUpperCase(),
    status: 'succeeded',
    documentType: docType,
    metadata: { source: 'invoice.paid', subscription: stripeSubId },
  });
  if (!isNew) return;

  if (stripeSubId) {
    const stripeSub = await fetchStripe<any>(env, `/subscriptions/${stripeSubId}`);
    if (stripeSub?.current_period_end) {
      await env.DB.prepare(
        `UPDATE subscriptions
            SET current_period_start = ?, current_period_end = ?,
                status = 'active', grace_period_until = NULL,
                updated_at = datetime('now')
          WHERE user_id = ?`,
      )
        .bind(
          new Date(stripeSub.current_period_start * 1000).toISOString(),
          new Date(stripeSub.current_period_end * 1000).toISOString(),
          userId,
        )
        .run();
    }
  }

  await issueDocument(env, {
    paymentId,
    userId,
    docType,
    totalCents: amountCents,
    description: `Συνδρομή ${planId ? BILLING_PLANS[planId]?.nameEl || planId : ''}`,
    planId,
  });

  // Monthly renewal of Worker Premium → top up 30 credits.
  if (planId === 'worker_premium') {
    await grantPremiumMonthlyCredits(env, userId, 30);
  }
}

async function handleInvoiceFailed(env: Env, invoice: any) {
  const customerId: string | null = invoice.customer || null;
  if (!customerId) return;
  const user = await env.DB.prepare(
    `SELECT id FROM users WHERE stripe_customer_id = ?`,
  ).bind(customerId).first<{ id: string }>();
  if (!user) return;

  await recordPayment(env, {
    userId: user.id,
    provider: 'stripe',
    providerRef: invoice.id,
    planId: null,
    amountCents: invoice.amount_due ?? 0,
    currency: (invoice.currency || 'eur').toUpperCase(),
    status: 'failed',
    documentType: 'receipt',
    metadata: { source: 'invoice.payment_failed' },
  });

  await setGracePeriod(env, user.id, 3);

  await env.DB.prepare(
    `INSERT INTO notifications (id, user_id, type, title, body, read, created_at, updated_at)
     VALUES (?, ?, 'billing', ?, ?, 0, datetime('now'), datetime('now'))`,
  )
    .bind(
      generateId('ntf'),
      user.id,
      'Αποτυχία πληρωμής',
      'Η πληρωμή της συνδρομής σας απέτυχε. Έχετε 3 ημέρες περίοδο χάριτος για να ενημερώσετε τον τρόπο πληρωμής.',
    )
    .run();
}

async function handleSubscriptionUpdated(env: Env, subscription: any) {
  const map: Record<string, string> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'past_due',
    trialing: 'trialing',
    incomplete: 'past_due',
    incomplete_expired: 'canceled',
    paused: 'canceled',
  };
  await env.DB.prepare(
    `UPDATE subscriptions
        SET status = ?, current_period_start = ?, current_period_end = ?,
            cancel_at_period_end = ?, updated_at = datetime('now')
      WHERE stripe_subscription_id = ?`,
  )
    .bind(
      map[subscription.status] || subscription.status,
      new Date(subscription.current_period_start * 1000).toISOString(),
      new Date(subscription.current_period_end * 1000).toISOString(),
      subscription.cancel_at_period_end ? 1 : 0,
      subscription.id,
    )
    .run();
}

async function handleSubscriptionDeleted(env: Env, subscription: any) {
  await env.DB.prepare(
    `UPDATE subscriptions SET status = 'canceled', updated_at = datetime('now') WHERE stripe_subscription_id = ?`,
  ).bind(subscription.id).run();

  const sub = await env.DB.prepare(
    `SELECT user_id FROM subscriptions WHERE stripe_subscription_id = ?`,
  ).bind(subscription.id).first<{ user_id: string }>();
  if (sub) {
    await env.DB.prepare(
      `INSERT INTO notifications (id, user_id, type, title, body, read, created_at, updated_at)
       VALUES (?, ?, 'subscription', ?, ?, 0, datetime('now'), datetime('now'))`,
    )
      .bind(
        generateId('ntf'),
        sub.user_id,
        'Η συνδρομή σας ακυρώθηκε',
        'Η συνδρομή σας έχει ακυρωθεί. Μπορείτε να εγγραφείτε ξανά οποιαδήποτε στιγμή.',
      )
      .run();
  }
}

async function handleChargeRefunded(env: Env, charge: any) {
  const refunded = charge.amount_refunded ?? 0;
  const total = charge.amount ?? 0;
  const status = refunded >= total ? 'refunded' : 'partially_refunded';
  await env.DB.prepare(
    `UPDATE payments
        SET status = ?, refunded_cents = ?, updated_at = datetime('now')
      WHERE provider = 'stripe'
        AND (provider_ref = ? OR provider_ref = ?)`,
  )
    .bind(status, refunded, charge.payment_intent || charge.id, charge.id)
    .run();
}

// =====================================================================
// PUBLIC: GET /plans
// =====================================================================
billing.get('/plans', (c) => success(c, { plans: PLANS, vatPercent: VAT_RATE_PERCENT }));

/**
 * GET /billing/founding-spots — public counter for the Founding Members banner.
 * `pending` = checkouts in progress (user clicked "Πάρε τη θέση σου" but Stripe not yet confirmed).
 * `remaining` reflects spots still available right now (total - pending - used).
 */
billing.get('/founding-spots', async (c) => {
  const row = await c.env.DB
    .prepare('SELECT spots_total, spots_pending, spots_used FROM founding_members_counter WHERE id = 1')
    .first<{ spots_total: number; spots_pending: number; spots_used: number }>();
  const total = row?.spots_total ?? 100;
  const pending = row?.spots_pending ?? 0;
  const used = row?.spots_used ?? 0;
  const remaining = Math.max(0, total - pending - used);
  return success(c, { total, used, pending, remaining, available: remaining > 0 });
});

// =====================================================================
// AUTHED endpoints
// =====================================================================

billing.get('/me', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const [sub, payments, invoices, profile] = await Promise.all([
    db
      .prepare(
        `SELECT s.*, u.stripe_customer_id
           FROM subscriptions s
           JOIN users u ON u.id = s.user_id
          WHERE s.user_id = ?
          ORDER BY s.created_at DESC LIMIT 1`,
      )
      .bind(user.id)
      .first(),
    db
      .prepare(
        `SELECT id, provider, plan_id, amount_cents, currency, status, document_type,
                invoice_id, refunded_cents, created_at
           FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      )
      .bind(user.id)
      .all(),
    db
      .prepare(
        `SELECT id, doc_type, doc_number, total_cents, currency, issued_at
           FROM invoices WHERE user_id = ? ORDER BY issued_at DESC LIMIT 50`,
      )
      .bind(user.id)
      .all(),
    db.prepare(`SELECT * FROM billing_profiles WHERE user_id = ?`).bind(user.id).first(),
  ]);

  const planId = (sub as any)?.plan_id;
  const plan = planId ? (PLANS as any)[planId] : null;

  return success(c, {
    subscription: sub || null,
    plan,
    payments: payments.results || [],
    invoices: invoices.results || [],
    profile: profile || null,
  });
});

billing.get('/profile', requireAuth, async (c) => {
  const user = c.get('user');
  const row = await c.env.DB.prepare(`SELECT * FROM billing_profiles WHERE user_id = ?`)
    .bind(user.id)
    .first();
  return success(c, { profile: row || null });
});

billing.put('/profile', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json<any>().catch(() => ({}));

  const docType = body.documentType === 'invoice' ? 'invoice' : 'receipt';
  if (docType === 'invoice') {
    if (!body.legalName || !body.vatNumber) {
      return error(c, 'VALIDATION', 'Για τιμολόγιο απαιτούνται επωνυμία και ΑΦΜ.', 400);
    }
    if (!/^\d{8,12}$/.test(String(body.vatNumber).trim())) {
      return error(c, 'VALIDATION', 'Μη έγκυρος ΑΦΜ.', 400);
    }
  }

  const f = {
    legal_name: trim(body.legalName, 200),
    vat_number: trim(body.vatNumber, 20),
    doy: trim(body.doy, 100),
    address: trim(body.address, 200),
    postal_code: trim(body.postalCode, 20),
    city: trim(body.city, 100),
    country: trim(body.country, 2) || 'GR',
    phone: trim(body.phone, 30),
    email: trim(body.email, 200),
    notes: trim(body.notes, 500),
  };

  await c.env.DB.prepare(
    `INSERT INTO billing_profiles
       (user_id, document_type, legal_name, vat_number, doy, address, postal_code, city,
        country, phone, email, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       document_type = excluded.document_type,
       legal_name = excluded.legal_name,
       vat_number = excluded.vat_number,
       doy = excluded.doy,
       address = excluded.address,
       postal_code = excluded.postal_code,
       city = excluded.city,
       country = excluded.country,
       phone = excluded.phone,
       email = excluded.email,
       notes = excluded.notes,
       updated_at = datetime('now')`,
  )
    .bind(
      user.id, docType,
      f.legal_name, f.vat_number, f.doy, f.address,
      f.postal_code, f.city, f.country,
      f.phone, f.email, f.notes,
    )
    .run();

  return success(c, { ok: true });
});

billing.post('/checkout', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    planId: string;
    period?: 'monthly' | 'yearly';
    successUrl: string;
    cancelUrl: string;
    documentType?: 'invoice' | 'receipt';
  }>().catch(() => null as any);

  if (!body?.planId || !body.successUrl || !body.cancelUrl) {
    return error(c, 'VALIDATION', 'Λείπουν απαιτούμενα πεδία.', 400);
  }

  const plan = BILLING_PLANS[body.planId];
  if (!plan) return error(c, 'VALIDATION', 'Μη έγκυρο πλάνο.', 400);

  // Role-aware plan gating:
  //   • business plans (`business_*`) → επιχειρήσεις / admin
  //   • worker plans   (`worker_*`)   → εργαζόμενοι / admin
  // Earlier το route μπλόκαρε ΟΛΟΥΣ τους workers — οπότε το upgrade
  // button "Worker Premium" στο /dashboard/billing πέφτε σε
  // "Μόνο επιχειρήσεις". Bug fix.
  const isBusinessPlan = body.planId.startsWith('business_');
  const isWorkerPlan = body.planId.startsWith('worker_');
  if (isBusinessPlan && user.role !== 'business' && user.role !== 'admin') {
    return error(c, 'FORBIDDEN', 'Αυτό το πλάνο είναι μόνο για επιχειρήσεις.', 403);
  }
  if (isWorkerPlan && user.role !== 'worker' && user.role !== 'admin') {
    return error(c, 'FORBIDDEN', 'Αυτό το πλάνο είναι μόνο για εργαζόμενους.', 403);
  }

  const period = body.period === 'yearly' ? 'yearly' : 'monthly';
  const priceEnvKey = period === 'yearly' ? plan.stripePriceEnvYearly : plan.stripePriceEnvMonthly;
  const priceId = (c.env as any)[priceEnvKey];
  if (!priceId) return error(c, 'CONFIG_ERROR', 'Λείπει το Stripe Price ID στο config.', 500);

  // Founding Members: atomically claim a spot before launching the Stripe session.
  // We use a conditional UPDATE that only succeeds if remaining > 0. If it fails,
  // either we ran out of spots OR the user already has a pending claim.
  let foundingClaimId: string | null = null;
  if (body.planId === 'founding_pro') {
    // Only businesses can claim founding (they're the paying side).
    if (user.role !== 'business' && user.role !== 'admin') {
      return error(c, 'FORBIDDEN', 'Η προσφορά Founding Members ισχύει μόνο για επιχειρήσεις.', 403);
    }
    // Refuse if the user already has an active founding subscription
    const existingFounding = await c.env.DB.prepare(
      "SELECT id FROM subscriptions WHERE user_id = ? AND is_founding_member = 1 AND status IN ('active', 'trialing')",
    ).bind(user.id).first();
    if (existingFounding) {
      return error(c, 'ALREADY_FOUNDING', 'Είσαι ήδη Founding Member.', 409);
    }
    // Atomic claim: increment pending only if remaining > 0
    const upd = await c.env.DB.prepare(
      `UPDATE founding_members_counter
         SET spots_pending = spots_pending + 1, updated_at = datetime('now')
       WHERE id = 1
         AND (spots_total - spots_pending - spots_used) > 0`,
    ).run();
    const changed = (upd.meta as any)?.changes ?? 0;
    if (changed === 0) {
      return error(c, 'FOUNDING_FULL', 'Δυστυχώς εξαντλήθηκαν οι 100 θέσεις Founding Members.', 409);
    }
    foundingClaimId = generateId('fmc');
    await c.env.DB.prepare(
      `INSERT INTO founding_member_pending_checkouts (id, user_id, status, created_at)
       VALUES (?, ?, 'pending', datetime('now'))`,
    ).bind(foundingClaimId, user.id).run();
  }

  const documentType: 'invoice' | 'receipt' =
    body.documentType === 'invoice' ? 'invoice' : 'receipt';

  const userRow = await c.env.DB.prepare(
    `SELECT id, email, stripe_customer_id FROM users WHERE id = ?`,
  ).bind(user.id).first<{ id: string; email: string; stripe_customer_id: string | null }>();
  if (!userRow) return error(c, 'NOT_FOUND', 'Ο χρήστης δεν βρέθηκε.', 404);

  let customerId = userRow.stripe_customer_id;
  if (!customerId) {
    const r = await fetch('https://api.stripe.com/v1/customers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${c.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: userRow.email,
        'metadata[user_id]': userRow.id,
      }),
    });
    const j = (await r.json()) as { id: string; error?: { message: string } };
    if (j.error) return error(c, 'STRIPE_ERROR', 'Σφάλμα δημιουργίας πελάτη Stripe.', 500);
    customerId = j.id;
    await c.env.DB.prepare(
      `UPDATE users SET stripe_customer_id = ?, updated_at = datetime('now') WHERE id = ?`,
    ).bind(customerId, user.id).run();
  }

  const params = new URLSearchParams({
    customer: customerId!,
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    mode: 'subscription',
    success_url: body.successUrl,
    cancel_url: body.cancelUrl,
    'metadata[user_id]': user.id,
    'metadata[plan_id]': body.planId,
    'metadata[document_type]': documentType,
    'subscription_data[metadata][user_id]': user.id,
    'subscription_data[metadata][plan_id]': body.planId,
    allow_promotion_codes: 'true',
    billing_address_collection: 'required',
  });
  if (foundingClaimId) {
    params.append('metadata[founding_claim_id]', foundingClaimId);
    params.append('subscription_data[metadata][founding_claim_id]', foundingClaimId);
  }

  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${c.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  const j = (await r.json()) as { url: string; id: string; error?: { message: string } };
  if (j.error) {
    // If Stripe rejects, release the founding claim so the spot returns to the pool.
    if (foundingClaimId) {
      await c.env.DB.prepare(
        `UPDATE founding_members_counter SET spots_pending = MAX(0, spots_pending - 1), updated_at = datetime('now') WHERE id = 1`,
      ).run();
      await c.env.DB.prepare(
        `UPDATE founding_member_pending_checkouts SET status = 'released', finalized_at = datetime('now') WHERE id = ?`,
      ).bind(foundingClaimId).run();
    }
    return error(c, 'STRIPE_ERROR', j.error.message || 'Σφάλμα checkout.', 500);
  }
  // Persist the Stripe session id on the pending claim so the webhook can find it.
  if (foundingClaimId) {
    await c.env.DB.prepare(
      `UPDATE founding_member_pending_checkouts SET stripe_session_id = ? WHERE id = ?`,
    ).bind(j.id, foundingClaimId).run();
  }
  return success(c, { url: j.url, sessionId: j.id });
});

billing.post('/portal', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ returnUrl: string }>().catch(() => ({ returnUrl: '' } as any));
  const userRow = await c.env.DB.prepare(
    `SELECT stripe_customer_id FROM users WHERE id = ?`,
  ).bind(user.id).first<{ stripe_customer_id: string | null }>();
  if (!userRow?.stripe_customer_id) {
    return error(c, 'NO_CUSTOMER', 'Δεν βρέθηκε πελάτης Stripe.', 404);
  }
  const r = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${c.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      customer: userRow.stripe_customer_id,
      return_url: body.returnUrl || 'https://staffnow.gr/dashboard/billing',
    }),
  });
  const j = (await r.json()) as { url: string; error?: { message: string } };
  if (j.error) return error(c, 'STRIPE_ERROR', 'Σφάλμα πύλης διαχείρισης.', 500);
  return success(c, { url: j.url });
});

billing.post('/cancel', requireAuth, async (c) => {
  const user = c.get('user');
  const sub = await c.env.DB.prepare(
    `SELECT stripe_subscription_id FROM subscriptions WHERE user_id = ? AND status='active'`,
  ).bind(user.id).first<{ stripe_subscription_id: string | null }>();
  if (!sub?.stripe_subscription_id) return error(c, 'NO_SUB', 'Καμία ενεργή συνδρομή.', 404);

  const r = await fetch(`https://api.stripe.com/v1/subscriptions/${sub.stripe_subscription_id}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${c.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ cancel_at_period_end: 'true' }),
  });
  const j = (await r.json()) as { error?: { message: string } };
  if (j.error) return error(c, 'STRIPE_ERROR', 'Αποτυχία ακύρωσης.', 500);
  return success(c, { ok: true });
});

billing.post('/manual-transfer', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    planId: string;
    period?: 'monthly' | 'yearly';
    documentType?: 'invoice' | 'receipt';
  }>().catch(() => null as any);
  if (!body?.planId) return error(c, 'VALIDATION', 'Λείπει το πλάνο.', 400);

  const plan = BILLING_PLANS[body.planId];
  if (!plan) return error(c, 'VALIDATION', 'Μη έγκυρο πλάνο.', 400);

  // Role-aware plan gating (same logic as /checkout above).
  const isBusinessPlan = body.planId.startsWith('business_');
  const isWorkerPlan = body.planId.startsWith('worker_');
  if (isBusinessPlan && user.role !== 'business' && user.role !== 'admin') {
    return error(c, 'FORBIDDEN', 'Αυτό το πλάνο είναι μόνο για επιχειρήσεις.', 403);
  }
  if (isWorkerPlan && user.role !== 'worker' && user.role !== 'admin') {
    return error(c, 'FORBIDDEN', 'Αυτό το πλάνο είναι μόνο για εργαζόμενους.', 403);
  }

  const period = body.period === 'yearly' ? 'yearly' : 'monthly';
  const documentType: 'invoice' | 'receipt' =
    body.documentType === 'invoice' ? 'invoice' : 'receipt';
  const amountCents = period === 'yearly' ? plan.yearlyCents : plan.monthlyCents;

  const order = await createManualBankTransfer(c.env, {
    userId: user.id,
    planId: body.planId,
    billingPeriod: period,
    documentType,
    amountCents,
  });

  return success(c, {
    id: order.id,
    referenceCode: order.referenceCode,
    amountCents,
    currency: 'EUR',
    expiresAt: order.expiresAt,
    bank: BANK_ACCOUNT,
    instructionsEl: [
      'Πραγματοποιήστε την κατάθεση στον παρακάτω λογαριασμό μέσα στο χρονικό διάστημα.',
      `Στην αιτιολογία αναφέρετε ΑΚΡΙΒΩΣ τον κωδικό αναφοράς: ${order.referenceCode}.`,
      'Η συνδρομή ενεργοποιείται μόλις επιβεβαιωθεί η κατάθεση από τη StaffNow (συνήθως εντός 1 εργάσιμης).',
    ],
  });
});

billing.get('/manual-transfer/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const row = await c.env.DB.prepare(
    `SELECT * FROM manual_bank_transfers WHERE id = ? AND user_id = ?`,
  ).bind(id, user.id).first();
  if (!row) return error(c, 'NOT_FOUND', 'Δεν βρέθηκε η παραγγελία.', 404);
  return success(c, { transfer: row, bank: BANK_ACCOUNT });
});

billing.get('/invoices/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const row = await c.env.DB.prepare(`SELECT * FROM invoices WHERE id = ?`)
    .bind(id)
    .first<any>();
  if (!row) return error(c, 'NOT_FOUND', 'Το έγγραφο δεν βρέθηκε.', 404);
  if (row.user_id !== user.id && user.role !== 'admin') {
    return error(c, 'FORBIDDEN', 'Δεν έχετε πρόσβαση σε αυτό το έγγραφο.', 403);
  }
  return new Response(row.html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="${row.doc_number.replace(/\//g, '_')}.html"`,
      'Cache-Control': 'private, no-store',
    },
  });
});

function trim(s: any, max: number): string | null {
  if (typeof s !== 'string') return null;
  const t = s.trim();
  return t ? t.slice(0, max) : null;
}

export default billing;
