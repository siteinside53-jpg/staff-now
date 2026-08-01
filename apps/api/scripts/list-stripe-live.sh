#!/usr/bin/env bash
#
# StaffNow — READ-ONLY Stripe inspector.
# Lists your Live-mode Products, Prices and Tax Rates so we can map the
# correct price IDs into the worker secrets. It creates / changes NOTHING.
#
# Usage:
#   STRIPE_KEY=sk_live_xxx bash apps/api/scripts/list-stripe-live.sh
#
set -euo pipefail

if [[ -z "${STRIPE_KEY:-}" ]]; then
  echo "Missing STRIPE_KEY. Run:  STRIPE_KEY=sk_live_xxx bash $0"
  exit 1
fi

MODE="LIVE"
[[ "$STRIPE_KEY" == sk_test_* ]] && MODE="TEST"
echo "== Stripe key mode: $MODE =="
echo ""

echo "===================== PRICES ====================="
curl -sS -u "${STRIPE_KEY}:" \
  "https://api.stripe.com/v1/prices?limit=100&active=true&expand[]=data.product" \
| python3 -c '
import sys, json
d = json.load(sys.stdin)
if "error" in d:
    print("STRIPE ERROR:", d["error"].get("message")); sys.exit(1)
rows = []
for p in d.get("data", []):
    prod = p.get("product") or {}
    name = prod.get("name") if isinstance(prod, dict) else str(prod)
    amt  = p.get("unit_amount")
    eur  = ("%.2f" % (amt/100)) if amt is not None else "?"
    rec  = p.get("recurring") or {}
    interval = rec.get("interval", "once")
    rows.append((name or "?", eur, interval, p.get("id"), p.get("lookup_key") or "-"))
rows.sort(key=lambda r:(r[0], r[2]))
fmt = "{:34} {:>8} {:8} {:34} {}"
print(fmt.format("PRODUCT", "EUR", "INTERVAL", "PRICE_ID", "LOOKUP_KEY"))
for r in rows:
    print(fmt.format(r[0][:34], r[1], r[2], r[3], r[4]))
'
echo ""
echo "==================== TAX RATES ==================="
curl -sS -u "${STRIPE_KEY}:" \
  "https://api.stripe.com/v1/tax_rates?limit=100" \
| python3 -c '
import sys, json
d = json.load(sys.stdin)
if "error" in d:
    print("STRIPE ERROR:", d["error"].get("message")); sys.exit(1)
for t in d.get("data", []):
    print("{:30} {}%  inclusive={}  active={}  {}".format(
        t.get("id"), t.get("percentage"), t.get("inclusive"),
        t.get("active"), t.get("display_name")))
'
echo ""
echo "Done (read-only). Paste the output above back to continue."
