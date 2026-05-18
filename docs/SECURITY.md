# StaffNow Security Notes

## Current state

### What is done
- JWT-based auth with HttpOnly cookie on login/register (`auth.ts` sets `staffnow_token`
  with `HttpOnly; SameSite=Lax; Secure` in production).
- CORS restricted via `CORS_ORIGIN` env var with `credentials: true`.
- Secure headers (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy).
- Stripe webhook HMAC verification with timing-safe comparison.
- Rate limiting on login (10/15min) and password reset (3/hour); global 60/min.
- Login lockout after 5 failed attempts for 15 minutes (per email).
- SQL injection fixes:
  - `routes/jobs.ts` — parameterized `worker_id` binding
  - `routes/admin.ts` — `date('now', ?)` binding with validated days param
  - `routes/matches.ts` — role-based GROUP BY now uses safe JS conditional
- Removed password-reset token console.log leak (`auth.ts`).

### What still needs attention (roadmap)

1. **Migrate frontend from `localStorage` token to cookie-only auth**
   - Why: `localStorage.getItem('staffnow_token')` appears in 15+ files and is
     exposed to any XSS.
   - Steps:
     1. Audit every `fetch()` call in `apps/web/src` and set `credentials: 'include'`.
     2. Replace `Authorization: Bearer ${token}` with reliance on the `staffnow_token`
        cookie which is already sent automatically when `credentials: 'include'`.
     3. Remove `localStorage.setItem('staffnow_token', ...)` from login/signup flows;
        the server already sets the cookie.
     4. Adjust `packages/api-client/src/client.ts` to always send credentials.
     5. Test logout clears the cookie (server already clears via `Max-Age=0`).

2. **Add CSRF protection**
   - With cookie auth, add a double-submit CSRF token or SameSite=Strict.

3. **Content Security Policy**
   - Add a CSP header in `secureHeaders()` config disallowing inline scripts except
     those we sign.

4. **Input sanitization for admin messages** (`admin.ts` ~line 570)
   - Currently only trimmed; HTML should be escaped before being shown in
     notifications.

5. **Video call auth**
   - `POST /video/create-room` should verify the caller is a party in the target
     conversation. Currently any authenticated user can create a room.

6. **File upload validation**
   - Client-only `accept=""` hints; server should re-validate MIME and size.

## Reporting

Email security@staffnow.gr (preferred) or open a private GitHub issue.
