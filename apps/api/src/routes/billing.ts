import { Hono } from 'hono';
import { PLANS } from '@staffnow/config';
import type { Env, AuthUser } from '../types';
import { requireAuth } from '../middleware/auth';
import { success, error } from '../lib/response';
import { generateId } from '../lib/id';

const billing = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// POST /webhook — must be before requireAuth routes so it can accept raw body
billing.post('/webhook', async (c) => {
  const db = c.env.DB;
  const signature = c.req.header('stripe-signature');

  if (!signature) {
    return error(c, 'Λείπει η υπογραφή Stripe', 400);
  }

  const rawBody = await c.req.text();

  // Verify Stripe webhook signature using HMAC-SHA256
  const parts = signature.split(',').reduce(
    (acc, part) => {
      const [key, value] = part.split('=');
      if (key === 't') acc.timestamp = value;
      if (key === 'v1') acc.signatures.push(value);
      return acc;
    },
    { timestamp: '', signatures: [] as string[] }
  );

  if (!parts.timestamp || parts.signatures.length === 0) {
    return error(c, 'Μη έγκυρη υπογραφή webhook', 400);
  }

  // Check timestamp tolerance (5 minutes)
  const tolerance = 300;
  const timestampAge = Math.floor(Date.now() / 1000) - parseInt(parts.timestamp, 10);
  if (Math.abs(timestampAge) > tolerance) {
    return error(c, 'Η υπογραφή webhook έχει λήξει', 400);
  }

  const signedPayload = `${parts.timestamp}.${rawBody}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(c.env.STRIPE_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const isValid = parts.signatures.some((sig) => {
    if (sig.length !== expectedSignature.length) return false;
    // Constant-time comparison
    let result = 0;
    for (let i = 0; i < sig.length; i++) {
      result |= sig.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }
    return result === 0;
  });

  if (!isValid) {
    return error(c, 'Μη έγκυρη υπογραφή webhook', 400);
  }

  const event = JSON.parse(rawBody);
  const now = new Date().toISOString();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      const planId = session.metadata?.plan_id;

      if (!userId || !planId) break;

      const subscriptionId = session.subscription;

      // Get subscription details from Stripe
      const subResponse = await fetch(
        `https://api.stripe.com/v1/subscriptions/${subscriptionId}`,
        {
          headers: { Authorization: `Bearer ${c.env.STRIPE_SECRET_KEY}` },
        }
      );
      const stripeSub = (await subResponse.json()) as {
        current_period_start: number;
        current_period_end: number;
        status: string;
      };

      const existingSub = await db
        .prepare('SELECT id FROM subscriptions WHERE user_id = ?')
        .bind(userId)
        .first();

      if (existingSub) {
        await db
          .prepare(
            `UPDATE subscriptions
             SET plan_id = ?, stripe_subscription_id = ?, status = 'active',
                 current_period_start = ?, current_period_end = ?, updated_at = ?
             WHERE user_id = ?`
          )
          .bind(
            planId,
            subscriptionId,
            new Date(stripeSub.current_period_start * 1000).toISOString(),
            new Date(stripeSub.current_period_end * 1000).toISOString(),
            now,
            userId
          )
          .run();
      } else {
        await db
          .prepare(
            `INSERT INTO subscriptions (id, user_id, plan_id, stripe_subscription_id, stripe_customer_id, status, current_period_start, current_period_end, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`
          )
          .bind(
            generateId(),
            userId,
            planId,
            subscriptionId,
            session.customer,
            new Date(stripeSub.current_period_start * 1000).toISOString(),
            new Date(stripeSub.current_period_end * 1000).toISOString(),
            now,
            now
          )
          .run();
      }

      // Update user's stripe_customer_id if not set
      await db
        .prepare(
          'UPDATE users SET stripe_customer_id = ?, updated_at = ? WHERE id = ? AND stripe_customer_id IS NULL'
        )
        .bind(session.customer, now, userId)
        .run();

      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const stripeSubId = subscription.id;

      const statusMap: Record<string, string> = {
        active: 'active',
        past_due: 'past_due',
        canceled: 'canceled',
        unpaid: 'past_due',
        trialing: 'trialing',
        incomplete: 'past_due',
        incomplete_expired: 'canceled',
        paused: 'canceled',
      };

      const mappedStatus = statusMap[subscription.status] || subscription.status;

      await db
        .prepare(
          `UPDATE subscriptions
           SET status = ?, current_period_start = ?, current_period_end = ?,
               cancel_at_period_end = ?, updated_at = ?
           WHERE stripe_subscription_id = ?`
        )
        .bind(
          mappedStatus,
          new Date(subscription.current_period_start * 1000).toISOString(),
          new Date(subscription.current_period_end * 1000).toISOString(),
          subscription.cancel_at_period_end ? 1 : 0,
          now,
          stripeSubId
        )
        .run();

      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;

      await db
        .prepare(
          `UPDATE subscriptions SET status = 'canceled', updated_at = ? WHERE stripe_subscription_id = ?`
        )
        .bind(now, subscription.id)
        .run();

      // Notify user
      const sub = await db
        .prepare('SELECT user_id FROM subscriptions WHERE stripe_subscription_id = ?')
        .bind(subscription.id)
        .first<{ user_id: string }>();

      if (sub) {
        await db
          .prepare(
            `INSERT INTO notifications (id, user_id, type, title, body, read, created_at, updated_at)
             VALUES (?, ?, 'subscription', ?, ?, 0, ?, ?)`
          )
          .bind(
            generateId(),
            sub.user_id,
            'Η συνδρομή σας ακυρώθηκε',
            'Η συνδρομή σας έχει ακυρωθεί. Μπορείτε να ανανεώσετε ανά πάσα στιγμή.',
            now,
            now
          )
          .run();
      }

      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const customerId = invoice.customer;

      const user = await db
        .prepare('SELECT id FROM users WHERE stripe_customer_id = ?')
        .bind(customerId)
        .first<{ id: string }>();

      if (user) {
        await db
          .prepare(
            `UPDATE subscriptions SET status = 'past_due', updated_at = ? WHERE user_id = ? AND status = 'active'`
          )
          .bind(now, user.id)
          .run();

        await db
          .prepare(
            `INSERT INTO notifications (id, user_id, type, title, body, read, created_at, updated_at)
             VALUES (?, ?, 'billing', ?, ?, 0, ?, ?)`
          )
          .bind(
            generateId(),
            user.id,
            'Αποτυχία πληρωμής',
            'Η πληρωμή της συνδρομής σας απέτυχε. Παρακαλώ ενημερώστε τον τρόπο πληρωμής σας.',
            now,
            now
          )
          .run();
      }

      break;
    }
  }

  return success(c, { received: true });
});

// GET /plans
billing.get('/plans', async (c) => {
  return success(c, { plans: PLANS });
});

// GET /subscription
billing.get('/subscription', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  const subscription = await db
    .prepare(
      `SELECT s.*, u.stripe_customer_id
       FROM subscriptions s
       JOIN users u ON u.id = s.user_id
       WHERE s.user_id = ?
       ORDER BY s.created_at DESC LIMIT 1`
    )
    .bind(user.id)
    .first();

  if (!subscription) {
    return success(c, { subscription: null, plan: null });
  }

  const plan = PLANS.find((p: { id: string }) => p.id === (subscription as { plan_id: string }).plan_id) || null;

  return success(c, { subscription, plan });
});

// POST /checkout
billing.post('/checkout', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const body = await c.req.json<{ planId: string; successUrl: string; cancelUrl: string }>();

  const { planId, successUrl, cancelUrl } = body;

  if (!planId || !successUrl || !cancelUrl) {
    return error(c, 'Λείπουν απαιτούμενα πεδία', 400);
  }

  const plan = PLANS.find((p: { id: string }) => p.id === planId);
  if (!plan) {
    return error(c, 'Μη έγκυρο πλάνο', 400);
  }

  // Get or create Stripe customer
  const userData = await db
    .prepare('SELECT id, email, stripe_customer_id FROM users WHERE id = ?')
    .bind(user.id)
    .first<{ id: string; email: string; stripe_customer_id: string | null }>();

  if (!userData) {
    return error(c, 'Ο χρήστης δεν βρέθηκε', 404);
  }

  let customerId = userData.stripe_customer_id;

  if (!customerId) {
    // Create Stripe customer
    const customerResponse = await fetch('https://api.stripe.com/v1/customers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${c.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: userData.email,
        'metadata[user_id]': userData.id,
      }),
    });

    const customer = (await customerResponse.json()) as { id: string; error?: { message: string } };

    if (customer.error) {
      return error(c, 'Σφάλμα δημιουργίας πελάτη Stripe', 500);
    }

    customerId = customer.id;

    await db
      .prepare('UPDATE users SET stripe_customer_id = ?, updated_at = ? WHERE id = ?')
      .bind(customerId, new Date().toISOString(), user.id)
      .run();
  }

  // Create checkout session
  const priceId = (plan as { stripePriceId: string }).stripePriceId;
  const sessionParams = new URLSearchParams({
    customer: customerId,
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    'metadata[user_id]': user.id,
    'metadata[plan_id]': planId,
    'subscription_data[metadata][user_id]': user.id,
    'subscription_data[metadata][plan_id]': planId,
  });

  const sessionResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${c.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: sessionParams,
  });

  const session = (await sessionResponse.json()) as { url: string; id: string; error?: { message: string } };

  if (session.error) {
    return error(c, 'Σφάλμα δημιουργίας συνεδρίας πληρωμής', 500);
  }

  return success(c, { url: session.url, sessionId: session.id });
});

// POST /portal
billing.post('/portal', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const body = await c.req.json<{ returnUrl: string }>();

  const userData = await db
    .prepare('SELECT stripe_customer_id FROM users WHERE id = ?')
    .bind(user.id)
    .first<{ stripe_customer_id: string | null }>();

  if (!userData?.stripe_customer_id) {
    return error(c, 'Δεν βρέθηκε πελάτης Stripe', 404);
  }

  const portalResponse = await fetch(
    'https://api.stripe.com/v1/billing_portal/sessions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${c.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: userData.stripe_customer_id,
        return_url: body.returnUrl,
      }),
    }
  );

  const portal = (await portalResponse.json()) as { url: string; error?: { message: string } };

  if (portal.error) {
    return error(c, 'Σφάλμα δημιουργίας πύλης διαχείρισης', 500);
  }

  return success(c, { url: portal.url });
});

export default billing;
