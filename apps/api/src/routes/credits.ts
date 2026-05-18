import { Hono } from 'hono';
import type { Env, AuthUser } from '../types';
import { requireAuth } from '../middleware/auth';
import { hasFeature } from '../middleware/subscription';
import { success, error } from '../lib/response';
import { generateId } from '../lib/id';

/** Actions that require a plan with boostedVisibility=true (Pro+ tiers). */
const BOOST_ACTIONS = new Set(['boost_job', 'boost_discover', 'boost_application']);

const credits = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// =====================================================================
// Credit costs for each AI action
// =====================================================================
const CREDIT_COSTS: Record<string, { cost: number; label: string }> = {
  // Business actions
  unlock_candidate:  { cost: 1, label: 'Ξεκλείδωμα υποψηφίου' },
  ai_shortlist:      { cost: 3, label: 'AI Top 5 Shortlist' },
  ai_hiring_chat:    { cost: 5, label: 'AI Hiring Chat' },
  post_extra_job:    { cost: 2, label: 'Extra αγγελία' },
  boost_job:         { cost: 5, label: 'Boost αγγελίας (7 ημέρες)' },
  ai_profile_summary: { cost: 1, label: 'AI Profile Summary' },
  // Worker actions
  ai_cv_generate:    { cost: 5, label: '🎨 AI CV Generator' },
  ai_profile_optimize: { cost: 3, label: '✨ AI Profile Optimizer' },
  boost_discover:    { cost: 2, label: '🚀 Boost στο Discover (24h)' },
  boost_application: { cost: 1, label: '⚡ Boost εφαρμογής' },
};

// Credit packages for purchase
const CREDIT_PACKAGES = [
  { id: 'pack_5',   credits: 5,   price: 499,  priceDisplay: '4,99€',  perCredit: '1,00€' },
  { id: 'pack_15',  credits: 15,  price: 999,  priceDisplay: '9,99€',  perCredit: '0,67€' },
  { id: 'pack_50',  credits: 50,  price: 2499, priceDisplay: '24,99€', perCredit: '0,50€' },
  { id: 'pack_100', credits: 100, price: 3999, priceDisplay: '39,99€', perCredit: '0,40€' },
];

// =====================================================================
// GET /balance — get current credit balance
// =====================================================================
credits.get('/balance', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  let creditRow = await db
    .prepare('SELECT balance, total_purchased, total_spent FROM credits WHERE user_id = ?')
    .bind(user.id)
    .first<{ balance: number; total_purchased: number; total_spent: number }>();

  // Auto-create credits row if not exists (with 5 free welcome credits for businesses)
  if (!creditRow) {
    const isBusinessOrAdmin = user.role === 'business' || user.role === 'admin';
    const welcomeCredits = isBusinessOrAdmin ? 5 : 0;
    const id = generateId('crd');
    const now = new Date().toISOString();

    await db
      .prepare('INSERT INTO credits (id, user_id, balance, total_purchased, total_spent, created_at, updated_at) VALUES (?, ?, ?, 0, 0, ?, ?)')
      .bind(id, user.id, welcomeCredits, now, now)
      .run();

    if (welcomeCredits > 0) {
      await db
        .prepare('INSERT INTO credit_transactions (id, user_id, amount, type, description, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(generateId('ctx'), user.id, welcomeCredits, 'bonus', '🎁 Καλωσόρισμα — 5 δωρεάν credits', now)
        .run();
    }

    creditRow = { balance: welcomeCredits, total_purchased: 0, total_spent: 0 };
  }

  return success(c, {
    balance: creditRow.balance,
    totalPurchased: creditRow.total_purchased,
    totalSpent: creditRow.total_spent,
    costs: CREDIT_COSTS,
    packages: CREDIT_PACKAGES,
  });
});

// =====================================================================
// GET /history — credit transaction history
// =====================================================================
credits.get('/history', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const limit = Math.min(parseInt(c.req.query('limit') || '30', 10), 100);

  const txns = await db
    .prepare(
      'SELECT id, amount, type, description, reference_id, reference_type, created_at FROM credit_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
    )
    .bind(user.id, limit)
    .all();

  return success(c, txns.results);
});

// =====================================================================
// POST /spend — spend credits on an AI action
// =====================================================================
credits.post('/spend', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const body = await c.req.json<{ action: string; referenceId?: string; referenceType?: string }>();

  const actionConfig = CREDIT_COSTS[body.action];
  if (!actionConfig) {
    return error(c, 'Άγνωστη ενέργεια', 400);
  }

  // Plan gate: boost actions are reserved for Pro+ business plans (and any
  // worker plan that grants boostedVisibility — currently worker_premium does).
  if (BOOST_ACTIONS.has(body.action) && !(await hasFeature(db, user.id, 'boostedVisibility'))) {
    return c.json(
      {
        success: false,
        error: {
          code: 'BOOST_LOCKED',
          message: 'Το Boost είναι διαθέσιμο από το πλάνο Pro και πάνω.',
        },
      },
      403,
    );
  }

  // Get current balance
  const creditRow = await db
    .prepare('SELECT balance FROM credits WHERE user_id = ?')
    .bind(user.id)
    .first<{ balance: number }>();

  if (!creditRow) {
    return error(c, 'Δεν έχετε λογαριασμό credits. Κάντε refresh.', 400);
  }

  if (creditRow.balance < actionConfig.cost) {
    return success(c, {
      success: false,
      insufficient: true,
      required: actionConfig.cost,
      current: creditRow.balance,
      action: body.action,
      label: actionConfig.label,
      packages: CREDIT_PACKAGES,
      message: `Χρειάζεσαι ${actionConfig.cost} credits για "${actionConfig.label}". Έχεις ${creditRow.balance}.`,
    });
  }

  const now = new Date().toISOString();

  // Deduct credits
  await db
    .prepare('UPDATE credits SET balance = balance - ?, total_spent = total_spent + ?, updated_at = ? WHERE user_id = ?')
    .bind(actionConfig.cost, actionConfig.cost, now, user.id)
    .run();

  // Log transaction
  await db
    .prepare(
      'INSERT INTO credit_transactions (id, user_id, amount, type, description, reference_id, reference_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(
      generateId('ctx'),
      user.id,
      -actionConfig.cost,
      'spend',
      actionConfig.label,
      body.referenceId || null,
      body.referenceType || null,
      now
    )
    .run();

  const updated = await db
    .prepare('SELECT balance FROM credits WHERE user_id = ?')
    .bind(user.id)
    .first<{ balance: number }>();

  return success(c, {
    spent: actionConfig.cost,
    action: body.action,
    label: actionConfig.label,
    remainingBalance: updated?.balance ?? 0,
  });
});

// =====================================================================
// POST /purchase — add credits (called after Stripe payment success)
// =====================================================================
credits.post('/purchase', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const body = await c.req.json<{ packageId: string; stripeSessionId?: string }>();

  const pkg = CREDIT_PACKAGES.find((p) => p.id === body.packageId);
  if (!pkg) {
    return error(c, 'Άγνωστο πακέτο credits', 400);
  }

  const now = new Date().toISOString();

  // Ensure credits row exists
  const existing = await db
    .prepare('SELECT id FROM credits WHERE user_id = ?')
    .bind(user.id)
    .first();

  if (!existing) {
    await db
      .prepare('INSERT INTO credits (id, user_id, balance, total_purchased, total_spent, created_at, updated_at) VALUES (?, ?, 0, 0, 0, ?, ?)')
      .bind(generateId('crd'), user.id, now, now)
      .run();
  }

  // Add credits
  await db
    .prepare('UPDATE credits SET balance = balance + ?, total_purchased = total_purchased + ?, updated_at = ? WHERE user_id = ?')
    .bind(pkg.credits, pkg.credits, now, user.id)
    .run();

  // Log transaction
  await db
    .prepare(
      'INSERT INTO credit_transactions (id, user_id, amount, type, description, reference_id, reference_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(
      generateId('ctx'),
      user.id,
      pkg.credits,
      'purchase',
      `Αγορά ${pkg.credits} credits (${pkg.priceDisplay})`,
      body.stripeSessionId || null,
      'stripe_session',
      now
    )
    .run();

  const updated = await db
    .prepare('SELECT balance, total_purchased FROM credits WHERE user_id = ?')
    .bind(user.id)
    .first<{ balance: number; total_purchased: number }>();

  return success(c, {
    purchased: pkg.credits,
    package: pkg,
    newBalance: updated?.balance ?? 0,
    totalPurchased: updated?.total_purchased ?? 0,
  });
});

// =====================================================================
// GET /packages — available credit packages
// =====================================================================
credits.get('/packages', async (c) => {
  return success(c, {
    packages: CREDIT_PACKAGES,
    costs: CREDIT_COSTS,
  });
});

// =====================================================================
// POST /stripe/checkout — create Stripe Checkout session for credits
// =====================================================================
credits.post('/stripe/checkout', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ packageId: string }>();

  const pkg = CREDIT_PACKAGES.find((p) => p.id === body.packageId);
  if (!pkg) {
    return error(c, 'Άγνωστο πακέτο', 400);
  }

  // Demo mode is **never** allowed in production. If the Stripe key is
  // missing or still a placeholder, refuse the request so we don't ever
  // give credits away for free. In dev/staging we still simulate the
  // purchase to keep the UX flow testable.
  const stripeKey = c.env.STRIPE_SECRET_KEY;
  const stripeKeyMissing = !stripeKey || stripeKey === 'sk_test_placeholder';

  if (stripeKeyMissing) {
    if (c.env.ENVIRONMENT === 'production') {
      return error(c, 'Η πληρωμή είναι προσωρινά απενεργοποιημένη. Δοκιμάστε σύντομα.', 503);
    }
    // Dev/staging only — simulate purchase so the team can test the UI.
    const now = new Date().toISOString();
    const db = c.env.DB;

    const existing = await db.prepare('SELECT id FROM credits WHERE user_id = ?').bind(user.id).first();
    if (!existing) {
      await db
        .prepare('INSERT INTO credits (id, user_id, balance, total_purchased, total_spent, created_at, updated_at) VALUES (?, ?, 0, 0, 0, ?, ?)')
        .bind(generateId('crd'), user.id, now, now)
        .run();
    }

    await db
      .prepare('UPDATE credits SET balance = balance + ?, total_purchased = total_purchased + ?, updated_at = ? WHERE user_id = ?')
      .bind(pkg.credits, pkg.credits, now, user.id)
      .run();

    await db
      .prepare(
        'INSERT INTO credit_transactions (id, user_id, amount, type, description, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .bind(generateId('ctx'), user.id, pkg.credits, 'purchase', `[${c.env.ENVIRONMENT}] ${pkg.credits} credits (${pkg.priceDisplay})`, now)
      .run();

    return success(c, {
      demo: true,
      creditsAdded: pkg.credits,
      message: `Demo mode (${c.env.ENVIRONMENT}): ${pkg.credits} credits προστέθηκαν.`,
    });
  }

  // Real Stripe checkout via raw API (no npm package needed)
  try {
    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${c.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'payment_method_types[0]': 'card',
        mode: 'payment',
        customer_email: user.email,
        'line_items[0][price_data][currency]': 'eur',
        'line_items[0][price_data][product_data][name]': `${pkg.credits} StaffNow Credits`,
        'line_items[0][price_data][product_data][description]': `Πακέτο ${pkg.credits} credits για AI hiring`,
        'line_items[0][price_data][unit_amount]': String(pkg.price),
        'line_items[0][quantity]': '1',
        'metadata[user_id]': user.id,
        'metadata[package_id]': pkg.id,
        'metadata[credits]': String(pkg.credits),
        success_url: `https://staffnow.gr/dashboard?credits_purchased=${pkg.credits}`,
        cancel_url: 'https://staffnow.gr/dashboard?credits_canceled=1',
      }),
    });

    const session = (await stripeRes.json()) as any;
    if (session.error) {
      return error(c, session.error.message || 'Stripe error', 400);
    }

    return success(c, { checkoutUrl: session.url });
  } catch (err: any) {
    return error(c, err?.message || 'Stripe error', 500);
  }
});

export default credits;
