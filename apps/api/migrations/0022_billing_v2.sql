-- =====================================================================
-- 0022_billing_v2.sql
-- Phase-2 billing schema: tax/legal data, idempotent payment/webhook log,
-- legal receipts/invoices and manual bank-transfer orders.
--
-- Money is stored as integer cents in EUR. Never use REAL/floats for money.
--
-- Existing tables (subscriptions, subscription_events, credits) are kept
-- as-is — we extend them with `grace_period_until` for failed-payment
-- handling.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. billing_profiles — one row per business user. Holds the legal data
--    we need to issue a τιμολόγιο (ΑΦΜ, ΔΟΥ, διεύθυνση).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS billing_profiles (
  user_id        TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  document_type  TEXT NOT NULL DEFAULT 'receipt',     -- 'invoice' | 'receipt'
  legal_name     TEXT,                                -- επωνυμία (req. for invoice)
  vat_number     TEXT,                                -- ΑΦΜ (req. for invoice)
  doy            TEXT,                                -- ΔΟΥ
  address        TEXT,
  postal_code    TEXT,
  city           TEXT,
  country        TEXT NOT NULL DEFAULT 'GR',
  phone          TEXT,
  email          TEXT,
  notes          TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------
-- 2. webhook_events — idempotency guard for ALL providers.
--    INSERT OR IGNORE on (provider, event_id) — if the event already
--    exists, we skip processing.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS webhook_events (
  id           TEXT PRIMARY KEY,
  provider     TEXT NOT NULL,                         -- 'stripe' | 'paypal' | 'manual' | 'viva' …
  event_id     TEXT NOT NULL,                         -- provider-issued id
  event_type   TEXT NOT NULL,
  payload      TEXT,                                  -- JSON snapshot
  processed_at TEXT,                                  -- null = received but not yet handled
  error        TEXT,                                  -- non-null = handler threw, retry-safe
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_provider_event
  ON webhook_events(provider, event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created
  ON webhook_events(created_at DESC);

-- ---------------------------------------------------------------------
-- 3. payments — one row per successful or attempted payment.
--    Always written from a verified backend source (Stripe webhook,
--    admin-confirmed manual transfer, …) — never from the client.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL,                      -- 'stripe' | 'manual' | 'paypal' …
  provider_ref    TEXT,                               -- payment_intent / charge id / transfer ref
  plan_id         TEXT,                               -- nullable for one-off payments
  amount_cents    INTEGER NOT NULL,                   -- e.g. 2900 = 29.00 EUR
  currency        TEXT NOT NULL DEFAULT 'EUR',
  status          TEXT NOT NULL DEFAULT 'pending',    -- 'pending'|'succeeded'|'failed'|'refunded'|'partially_refunded'
  refunded_cents  INTEGER NOT NULL DEFAULT 0,
  document_type   TEXT NOT NULL DEFAULT 'receipt',    -- 'invoice' | 'receipt'
  invoice_id      TEXT,                               -- → invoices.id once issued
  metadata        TEXT,                               -- JSON
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_ref
  ON payments(provider, provider_ref) WHERE provider_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_user
  ON payments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status
  ON payments(status, created_at DESC);

-- ---------------------------------------------------------------------
-- 4. invoices — legal documents with sequential numbering.
--    A snapshot of the customer is taken at issue time so future edits
--    of the billing profile do NOT alter past documents.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id            TEXT PRIMARY KEY,
  payment_id    TEXT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doc_type      TEXT NOT NULL,                        -- 'invoice' | 'receipt'
  doc_number    TEXT NOT NULL,                        -- e.g. 'TIM/2026/0001' or 'AP/2026/0001'
  series        TEXT NOT NULL,                        -- 'TIM' | 'AP'
  series_year   INTEGER NOT NULL,                     -- 2026
  series_seq    INTEGER NOT NULL,                     -- 1, 2, 3 …
  -- customer snapshot
  customer_name        TEXT,
  customer_vat         TEXT,
  customer_doy         TEXT,
  customer_address     TEXT,
  customer_postal_code TEXT,
  customer_city        TEXT,
  customer_country     TEXT,
  customer_email       TEXT,
  -- amounts
  net_cents     INTEGER NOT NULL,
  vat_rate      INTEGER NOT NULL DEFAULT 24,           -- percent
  vat_cents     INTEGER NOT NULL,
  total_cents   INTEGER NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'EUR',
  -- description
  description   TEXT,
  plan_id       TEXT,
  -- storage
  html          TEXT,                                  -- inline HTML (keeps thing simple)
  r2_key        TEXT,                                  -- optional copy in R2 (PDF later)
  issued_at     TEXT NOT NULL DEFAULT (datetime('now')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_doc_number ON invoices(doc_number);
CREATE INDEX IF NOT EXISTS idx_invoices_user            ON invoices(user_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_payment         ON invoices(payment_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_series   ON invoices(series, series_year, series_seq);

-- ---------------------------------------------------------------------
-- 5. manual_bank_transfers — pending order created when the customer
--    chooses "πληρωμή με κατάθεση". Admin marks it paid; then the
--    subscription is activated by the same code path Stripe uses.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS manual_bank_transfers (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id           TEXT NOT NULL,
  billing_period    TEXT NOT NULL DEFAULT 'monthly',  -- 'monthly' | 'yearly'
  amount_cents      INTEGER NOT NULL,
  reference_code    TEXT NOT NULL,                    -- shown to customer; UNIQUE
  document_type     TEXT NOT NULL DEFAULT 'receipt',
  status            TEXT NOT NULL DEFAULT 'pending',  -- 'pending'|'paid'|'expired'|'cancelled'
  expires_at        TEXT NOT NULL,                    -- usually now + 7 days
  paid_at           TEXT,
  paid_by_admin_id  TEXT REFERENCES users(id),
  payment_id        TEXT REFERENCES payments(id),
  notes             TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mbt_reference ON manual_bank_transfers(reference_code);
CREATE INDEX IF NOT EXISTS idx_mbt_user             ON manual_bank_transfers(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mbt_status           ON manual_bank_transfers(status, created_at DESC);

-- ---------------------------------------------------------------------
-- 6. subscriptions: add grace_period_until.
--    If a recurring payment fails, this is set to now()+3d. After that
--    the daily cron downgrades the user to the free tier.
-- ---------------------------------------------------------------------
ALTER TABLE subscriptions ADD COLUMN grace_period_until TEXT;

-- Helper sequence table for invoice numbering (one row per series/year).
-- D1 has no SEQUENCEs so we use UPDATE … RETURNING via a simple table.
CREATE TABLE IF NOT EXISTS document_counters (
  series      TEXT NOT NULL,
  series_year INTEGER NOT NULL,
  next_seq    INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (series, series_year)
);
