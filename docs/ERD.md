# StaffNow Database Entity Relationship Diagram

## Tables Overview

### Core
- **users** - Authentication & role management
- **auth_tokens** - Session tokens
- **worker_profiles** - Worker profile data
- **business_profiles** - Business profile data
- **job_listings** - Job postings by businesses

### Junction Tables
- **worker_profile_roles** - Worker <-> Roles (M2M)
- **worker_profile_languages** - Worker <-> Languages (M2M)
- **job_listing_roles** - Job <-> Roles (M2M)

### Matching
- **swipes** - Like/Skip actions
- **matches** - Confirmed mutual interest
- **favorites** - Saved profiles/jobs
- **blocks** - Blocked users

### Communication
- **conversations** - Chat threads (1:1 with match)
- **messages** - Individual messages

### Billing
- **subscriptions** - Stripe subscription data
- **subscription_events** - Webhook event log

### Admin / Trust
- **verification_requests** - ID verification queue
- **reports** - User reports
- **notifications** - In-app notifications
- **media_files** - Uploaded files tracking
- **audit_logs** - Action audit trail

## Relationships

```
users 1──N worker_profiles (user_id)
users 1──N business_profiles (user_id)
users 1──N auth_tokens (user_id)
users 1──N swipes (swiper_id)
users 1──N favorites (user_id)
users 1──N notifications (user_id)
users 1──1 subscriptions (user_id)

worker_profiles 1──N worker_profile_roles (worker_profile_id)
worker_profiles 1──N worker_profile_languages (worker_profile_id)

business_profiles 1──N job_listings (business_id)
job_listings 1──N job_listing_roles (job_listing_id)

matches N──1 users (worker_id)
matches N──1 users (business_id)
matches N──1 job_listings (job_id)
matches 1──1 conversations (match_id)

conversations 1──N messages (conversation_id)

subscriptions 1──N subscription_events (subscription_id)
```

## Key Constraints
- swipes: UNIQUE(swiper_id, target_id, target_type) - prevents duplicate swipes
- matches: UNIQUE(worker_id, business_id, job_id) - prevents duplicate matches
- favorites: UNIQUE(user_id, target_id, target_type)
- blocks: UNIQUE(blocker_id, blocked_id)
- worker_profile_roles: UNIQUE(worker_profile_id, role)
- worker_profile_languages: UNIQUE(worker_profile_id, language)
