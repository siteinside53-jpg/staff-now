#!/usr/bin/env bash
#
# StaffNow — Stripe initial setup (test mode).
#
# Creates Products + Prices for the business plans and prints the env-var
# commands you need to run to wire them into the production worker.
#
# Usage:
#   STRIPE_KEY=sk_test_xxx ./apps/api/scripts/setup-stripe.sh
#
# After this finishes, copy/paste the printed `wrangler secret put` lines
# into your shell to seed the production worker.

set -euo pipefail

if [[ -z "${STRIPE_KEY:-}" ]]; then
  echo "❌  Missing STRIPE_KEY env var. Run:"
  echo "    STRIPE_KEY=sk_test_xxx $0"
  exit 1
fi

if [[ ! "$STRIPE_KEY" =~ ^sk_(test|live)_ ]]; then
  echo "❌  STRIPE_KEY does not look like a Stripe secret key (sk_test_/sk_live_)."
  exit 1
fi

api() {
  curl -sS -u "${STRIPE_KEY}:" "https://api.stripe.com/v1/$1" "${@:2}"
}

create_product_with_prices() {
  local name="$1"
  local desc="$2"
  local monthly_eur="$3"
  local yearly_eur="$4"
  local plan_key="$5"

  echo ""
  echo "📦  $name ($plan_key)"

  # Idempotency: search by metadata.plan_key.
  existing=$(api "products/search" \
    --data-urlencode "query=metadata['plan_key']:'$plan_key'" \
    | sed -n 's/.*"id": *"\(prod_[^"]*\)".*/\1/p' | head -n1)

  if [[ -n "$existing" ]]; then
    product_id="$existing"
    echo "   ↳ already exists: $product_id"
  else
    product_id=$(api "products" \
      -d "name=$name" \
      -d "description=$desc" \
      -d "metadata[plan_key]=$plan_key" \
      | sed -n 's/.*"id": *"\(prod_[^"]*\)".*/\1/p' | head -n1)
    echo "   ↳ created: $product_id"
  fi

  monthly_cents=$(( monthly_eur * 100 ))
  yearly_cents=$(( yearly_eur * 100 ))

  monthly_price=$(api "prices" \
    -d "product=$product_id" \
    -d "currency=eur" \
    -d "unit_amount=$monthly_cents" \
    -d "recurring[interval]=month" \
    -d "metadata[plan_key]=${plan_key}_monthly" \
    -d "lookup_key=${plan_key}_monthly" \
    -d "transfer_lookup_key=true" \
    | sed -n 's/.*"id": *"\(price_[^"]*\)".*/\1/p' | head -n1)

  yearly_price=$(api "prices" \
    -d "product=$product_id" \
    -d "currency=eur" \
    -d "unit_amount=$yearly_cents" \
    -d "recurring[interval]=year" \
    -d "metadata[plan_key]=${plan_key}_yearly" \
    -d "lookup_key=${plan_key}_yearly" \
    -d "transfer_lookup_key=true" \
    | sed -n 's/.*"id": *"\(price_[^"]*\)".*/\1/p' | head -n1)

  echo "   • monthly (${monthly_eur} €): $monthly_price"
  echo "   • yearly  (${yearly_eur} €): $yearly_price"

  upper_key=$(echo "$plan_key" | tr '[:lower:]' '[:upper:]')
  printf '%s|%s\n' "STRIPE_PRICE_${upper_key}_MONTHLY" "$monthly_price" >> /tmp/staffnow_stripe_secrets.tmp
  printf '%s|%s\n' "STRIPE_PRICE_${upper_key}_YEARLY"  "$yearly_price"  >> /tmp/staffnow_stripe_secrets.tmp
}

: > /tmp/staffnow_stripe_secrets.tmp

create_product_with_prices \
  "StaffNow — Business Basic" \
  "StaffNow Business Basic plan: up to 50 swipes/month, 10 active matches" \
  29 290 "business_basic"

create_product_with_prices \
  "StaffNow — Business Pro" \
  "StaffNow Business Pro plan: unlimited swipes, advanced filters, verified badge" \
  79 790 "business_pro"

echo ""
echo "================================================================"
echo "✅  Done. Run these commands to seed the production worker:"
echo "================================================================"
echo ""
echo "cd apps/api"
echo "echo \"$STRIPE_KEY\" | npx wrangler secret put STRIPE_SECRET_KEY --env production"
while IFS='|' read -r name value; do
  echo "echo \"$value\" | npx wrangler secret put $name --env production"
done < /tmp/staffnow_stripe_secrets.tmp
echo ""
echo "# Then create the webhook in Stripe Dashboard (test mode):"
echo "#   https://dashboard.stripe.com/test/webhooks"
echo "# - Endpoint URL: https://staffnow-api-production.siteinside53.workers.dev/billing/webhook"
echo "# - Events: checkout.session.completed, invoice.paid, invoice.payment_failed,"
echo "#           customer.subscription.updated, customer.subscription.deleted, charge.refunded"
echo "# After creating, copy the 'Signing secret' (whsec_...) and run:"
echo "#   echo whsec_xxx | npx wrangler secret put STRIPE_WEBHOOK_SECRET --env production"
echo ""

rm -f /tmp/staffnow_stripe_secrets.tmp
