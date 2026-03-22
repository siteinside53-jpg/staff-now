# StaffNow

**Tinder-style hiring platform for tourism and hospitality in Greece.**

Businesses discover candidates, workers discover opportunities — with swipe-style matching.

## Architecture

```
staffnow/
├── apps/
│   ├── web/          # Next.js 15 marketing site + dashboard
│   ├── mobile/       # Expo (React Native) mobile app
│   └── api/          # Cloudflare Workers + Hono API
├── packages/
│   ├── types/        # Shared TypeScript types
│   ├── validation/   # Zod schemas
│   ├── config/       # Constants, plans, labels
│   ├── shared-utils/ # Utility functions
│   ├── api-client/   # Shared fetch-based API client
│   └── ui/           # (Reserved) Shared UI
├── docs/             # ERD, API docs
└── .github/workflows # CI/CD pipelines
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web | Next.js 15, React 19, Tailwind CSS, TypeScript |
| Mobile | Expo 52, React Native, Expo Router |
| API | Cloudflare Workers, Hono, TypeScript |
| Database | Cloudflare D1 (SQLite) |
| Storage | Cloudflare R2 |
| Cache | Cloudflare KV |
| Payments | Stripe Subscriptions |
| Auth | JWT + httpOnly cookies (web) / SecureStore (mobile) |
| Monorepo | pnpm 9 + Turborepo |
| CI/CD | GitHub Actions |

## Prerequisites

- Node.js >= 20
- pnpm >= 9 (`corepack enable && corepack prepare pnpm@9 --activate`)
- Wrangler CLI (`npm i -g wrangler`)
- Cloudflare account
- Stripe account (for billing features)
- (Optional) Expo CLI + EAS CLI for mobile development

## Local Setup

### 1. Clone & Install

```bash
git clone https://github.com/your-org/staffnow.git
cd staffnow
pnpm install
```

### 2. Configure Environment

```bash
# API secrets
cp apps/api/.env.example apps/api/.dev.vars
# Edit apps/api/.dev.vars with your values

# Web environment
cp apps/web/.env.example apps/web/.env.local
```

### 3. Setup Database

```bash
# Create local D1 database (auto-created by wrangler dev)
# Run migrations
pnpm db:migrate

# Seed with demo data
pnpm db:seed
```

### 4. Start Development

```bash
# Start all services
pnpm dev

# Or individually:
pnpm --filter api dev      # API at http://localhost:8787
pnpm --filter web dev      # Web at http://localhost:3000
pnpm --filter mobile dev   # Expo dev server
```

### 5. Demo Accounts (after seeding)

| Email | Role | Notes |
|-------|------|-------|
| admin@staffnow.gr | admin | Full admin access |
| info@sunrisehotel.gr | business | Business Pro subscription |
| contact@poseidonbeach.gr | business | Business Basic subscription |
| maria.k@gmail.com | worker | Verified worker |
| giorgos.p@gmail.com | worker | Worker Premium subscription |

> All demo accounts use placeholder password hashes. Register new accounts for testing.

## Database

### Migrations

```bash
# Local
pnpm db:migrate

# Remote (production)
pnpm --filter api db:migrate:remote
```

Migrations are in `apps/api/migrations/` and run in alphabetical order.

### Schema

See [docs/ERD.md](docs/ERD.md) for the complete entity relationship diagram.

Key tables: users, worker_profiles, business_profiles, job_listings, swipes, matches, conversations, messages, subscriptions, notifications.

## API

See [docs/API.md](docs/API.md) for the complete API reference.

Key endpoint groups:
- `/auth/*` - Authentication (register, login, logout, password reset)
- `/workers/*` - Worker profiles & discovery
- `/businesses/*` - Business profiles & discovery
- `/jobs/*` - Job listings CRUD
- `/matches/*` - Match management
- `/conversations/*` - Messaging
- `/billing/*` - Stripe subscriptions
- `/admin/*` - Admin panel endpoints
- `/health` - Health check

## Cloudflare Deployment

### API (Workers)

```bash
npx wrangler login

# Create resources
npx wrangler d1 create staffnow-db-prod
npx wrangler r2 bucket create staffnow-uploads-prod
npx wrangler kv namespace create staffnow-kv

# Update IDs in apps/api/wrangler.toml [env.production]

# Set secrets
npx wrangler secret put JWT_SECRET --env production
npx wrangler secret put STRIPE_SECRET_KEY --env production
npx wrangler secret put STRIPE_WEBHOOK_SECRET --env production
npx wrangler secret put PASSWORD_SALT --env production

# Run migrations
for f in apps/api/migrations/*.sql; do
  npx wrangler d1 execute staffnow-db-prod --remote --file="$f"
done

# Deploy
cd apps/api && npx wrangler deploy --env production
```

### Web (Cloudflare Pages)

```bash
cd apps/web
NEXT_PUBLIC_API_URL=https://api.staffnow.gr pnpm build
npx wrangler pages deploy .next --project-name=staffnow-web
```

### Custom Domain Setup

1. Add `staffnow.gr` to Cloudflare DNS
2. Set `api.staffnow.gr` as custom domain for the Worker
3. Set `staffnow.gr` as custom domain for Cloudflare Pages
4. Configure SSL/TLS to Full (strict)

## Mobile (Expo)

```bash
cd apps/mobile

# Local development
npx expo start

# Build with EAS
npx eas build --profile preview --platform all

# Production build
npx eas build --profile production --platform all
```

Stripe billing on mobile redirects to web checkout via `expo-web-browser`.

## GitHub Actions

| Workflow | Trigger | What it does |
|----------|---------|-------------|
| `ci.yml` | Push/PR to main/develop | Lint, typecheck, test, build |
| `deploy-api.yml` | Push to main (apps/api/**) | Deploy API to Workers |
| `deploy-web.yml` | Push to main (apps/web/**) | Deploy web to Pages |

### Required GitHub Secrets

- `CLOUDFLARE_API_TOKEN` - Cloudflare API token with Workers/Pages/D1/R2 permissions
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key for web build

## Subscription Plans

| Plan | Monthly | Yearly | For |
|------|---------|--------|-----|
| Worker Free | 0€ | — | Workers (default) |
| Worker Premium | 9€ | 90€ | Workers |
| Business Basic | 29€ | 290€ | Businesses |
| Business Pro | 79€ | 790€ | Businesses |

No commission on hires. Revenue is subscription-based only.

## Environment Variables Checklist

### API (.dev.vars / Cloudflare Secrets)
- [ ] `JWT_SECRET` - Min 32 chars, cryptographically random
- [ ] `PASSWORD_SALT` - Random salt string
- [ ] `STRIPE_SECRET_KEY` - Stripe Dashboard > API Keys
- [ ] `STRIPE_WEBHOOK_SECRET` - Stripe Dashboard > Webhooks
- [ ] `STRIPE_PRICE_*` - 6 Stripe Price IDs for plans

### Web (.env.local)
- [ ] `NEXT_PUBLIC_API_URL` - API base URL
- [ ] `NEXT_PUBLIC_APP_URL` - Web app URL
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key

### Cloudflare (wrangler.toml)
- [ ] D1 database IDs for each environment
- [ ] KV namespace IDs
- [ ] R2 bucket names

### GitHub Actions
- [ ] `CLOUDFLARE_API_TOKEN`
- [ ] `STRIPE_PUBLISHABLE_KEY`

## Troubleshooting

| Problem | Solution |
|---------|----------|
| D1 migrations fail | Verify `database_id` in `wrangler.toml` |
| CORS errors | Check `CORS_ORIGIN` matches frontend URL |
| Mobile auth not working | Verify `API_URL` in `eas.json` |
| Stripe webhooks missing locally | Run `stripe listen --forward-to localhost:8787/billing/webhook` |
| pnpm install fails | `pnpm store prune && pnpm install` |
| Types not resolving | `pnpm build` packages first |

## Future Roadmap

- [ ] Real-time messaging (Durable Objects / WebSockets)
- [ ] Push notifications (Expo Push + email service integration)
- [ ] Advanced matching algorithm with relevance scoring
- [ ] Photo gallery for worker profiles
- [ ] Video introductions
- [ ] Calendar integration for interviews
- [ ] Full English translation
- [ ] Dedicated admin panel app
- [ ] Analytics dashboard with charts
- [ ] SMS verification (Twilio)
- [ ] In-app purchases for mobile (RevenueCat)
- [ ] Post-hire rating/review system
- [ ] Referral program
- [ ] Cloudflare WAF rate limiting

## License

Proprietary. All rights reserved.
