#!/bin/bash
#
# StaffNow — Αυτόματο rebuild + deploy της δημόσιας ιστοσελίδας.
#
# Γιατί: Το web είναι Next.js static export. Οι σελίδες SEO κάθε αγγελίας
# (/jobs/[id]) και εργαζομένου (/workers/[id]) + το sitemap.xml παράγονται
# στο BUILD. Άρα νέες αγγελίες μπαίνουν στη Google μόνο μετά από rebuild.
# Αυτό το script ξαναχτίζει & ανεβάζει αυτόματα (μέσω cron).
#
# Χειροκίνητη εκτέλεση:  bash scripts/seo-rebuild.sh
#
set -uo pipefail

# Cron έχει minimal environment — δηλώνουμε ρητά το PATH για node/pnpm.
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

WEB_DIR="/Users/eygeniosafendoulidis/lim/staffnow/apps/web"
SCRIPT_DIR="/Users/eygeniosafendoulidis/lim/staffnow/scripts"
LOG="$SCRIPT_DIR/seo-rebuild.log"
LOCK="$SCRIPT_DIR/.seo-rebuild.lock"

export NEXT_PUBLIC_API_URL="https://staffnow-api-production.siteinside53.workers.dev"
export NEXT_PUBLIC_APP_URL="https://staffnow.gr"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"; }

# Απόφυγε ταυτόχρονες εκτελέσεις (lock)
if [ -f "$LOCK" ]; then
  log "Lock υπάρχει — παράλειψη αυτής της εκτέλεσης."
  exit 0
fi
echo $$ > "$LOCK"
trap 'rm -f "$LOCK"' EXIT

log "=== Rebuild ξεκίνησε ==="
cd "$WEB_DIR" || { log "Δεν βρέθηκε $WEB_DIR"; exit 1; }

if pnpm build >> "$LOG" 2>&1; then
  log "Build OK — γίνεται deploy…"
  if npx wrangler pages deploy --branch=main --commit-dirty=true >> "$LOG" 2>&1; then
    log "Deploy OK ✅"
  else
    log "Deploy ΑΠΕΤΥΧΕ ❌"
    exit 1
  fi
else
  log "Build ΑΠΕΤΥΧΕ ❌ (παράλειψη deploy)"
  exit 1
fi

log "=== Rebuild ολοκληρώθηκε ==="
