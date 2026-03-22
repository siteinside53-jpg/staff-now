# StaffNow API Documentation

Base URL: `https://api.staffnow.gr` (production) | `http://localhost:8787` (local)

## Authentication
All authenticated endpoints require either:
- `Authorization: Bearer <token>` header
- `staffnow_token` cookie (set automatically for web)

## Endpoints

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/register | No | Register new user |
| POST | /auth/login | No | Login |
| POST | /auth/logout | No | Logout (clears cookie) |
| GET | /auth/me | Yes | Get current user + profile |
| POST | /auth/forgot-password | No | Request password reset |
| POST | /auth/reset-password | No | Reset password with token |

### Workers
| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | /workers/me | Yes | worker | Get own profile |
| PATCH | /workers/me | Yes | worker | Update own profile |
| GET | /workers/discover | Yes | business | Discover workers |
| GET | /workers/:id | Yes | any | View worker profile |
| POST | /workers/:id/like | Yes | business | Like a worker |
| POST | /workers/:id/skip | Yes | business | Skip a worker |
| POST | /workers/:id/favorite | Yes | business | Favorite a worker |
| DELETE | /workers/:id/favorite | Yes | business | Unfavorite |

### Businesses
| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | /businesses/me | Yes | business | Get own profile |
| PATCH | /businesses/me | Yes | business | Update own profile |
| GET | /businesses/discover | Yes | worker | Discover businesses |
| GET | /businesses/:id | Yes | any | View business |

### Jobs
| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | /jobs | Yes | any | List published jobs |
| POST | /jobs | Yes | business | Create job listing |
| GET | /jobs/:id | Yes | any | Get job details |
| PATCH | /jobs/:id | Yes | business | Update job |
| POST | /jobs/:id/publish | Yes | business | Publish job |
| POST | /jobs/:id/archive | Yes | business | Archive job |
| POST | /jobs/:id/like | Yes | worker | Like a job |
| POST | /jobs/:id/skip | Yes | worker | Skip a job |

### Matches
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /matches | Yes | List matches |
| GET | /matches/:id | Yes | Get match details |
| POST | /matches/:id/archive | Yes | Archive match |

### Conversations
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /conversations | Yes | List conversations |
| GET | /conversations/:id/messages | Yes | Get messages |
| POST | /conversations/:id/messages | Yes | Send message |

### Notifications
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /notifications | Yes | List notifications |
| POST | /notifications/:id/read | Yes | Mark as read |
| POST | /notifications/read-all | Yes | Mark all read |

### Billing
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /billing/plans | No | List plans |
| GET | /billing/subscription | Yes | Get subscription |
| POST | /billing/checkout | Yes | Create checkout session |
| POST | /billing/portal | Yes | Get billing portal URL |
| POST | /billing/webhook | No | Stripe webhook |

### Uploads
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /uploads | Yes | Upload file |
| POST | /uploads/presign | Yes | Get presigned URL |

### Admin
| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | /admin/stats | Yes | admin | Dashboard stats |
| GET | /admin/users | Yes | admin | List users |
| POST | /admin/users/:id/suspend | Yes | admin | Suspend user |
| POST | /admin/users/:id/unsuspend | Yes | admin | Unsuspend user |
| GET | /admin/verifications | Yes | admin | List verifications |
| POST | /admin/verifications/:id/review | Yes | admin | Review verification |
| GET | /admin/reports | Yes | admin | List reports |
| POST | /admin/reports/:id/review | Yes | admin | Review report |

### Health
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /health | No | Health check |

## Response Format

Success:
```json
{ "success": true, "data": { ... } }
```

Paginated:
```json
{ "success": true, "data": [...], "meta": { "page": 1, "perPage": 20, "total": 100, "totalPages": 5 } }
```

Error:
```json
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Human readable message" } }
```
