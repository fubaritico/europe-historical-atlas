# A01:2025 — Broken Access Control

OWASP Top 10 #1 (two consecutive cycles). Failures in enforcing that users cannot act outside
their intended permissions. In 2025, SSRF (formerly A10:2021) is merged into this category.

## Checklist

### Critical

#### OWASP-A01-001: Missing authentication on data route
- **Where**: API route files (`apps/api/src/routes/*.ts`)
- **Check**: Every router MUST call `router.use(requireAuth)` — no data endpoint unprotected
- **Exception**: `/health` (mounted on `app` directly, not a router)

#### OWASP-A01-002: Missing user_id filter on database query
- **Where**: API route handlers
- **Check**: Every `.from()` query MUST include `.eq('user_id', res.locals.userId)`
- **Check**: Every `.rpc()` call MUST pass `p_user_id: res.locals.userId`
- **Why**: Service role key bypasses RLS — this is the ONLY access control

#### OWASP-A01-003: Insecure Direct Object Reference (IDOR)
- **Where**: API routes with `:id` params
- **Check**: After fetching by ID, verify the record belongs to the authenticated user
- **Check**: Never trust client-provided `user_id` in request body for ownership

#### OWASP-A01-004: Unvalidated URL in server-side fetch (SSRF)
- **Where**: API routes, any server-side `fetch()` or HTTP client calls
- **Check**: No user-provided URL passed directly to `fetch()`, `axios`, or similar
- **Check**: If URL needed from user, validate against strict allowlist
- **Check**: No ability to fetch `file://`, `gopher://`, or internal metadata endpoints

### High

#### OWASP-A01-005: Privilege escalation via body manipulation
- **Where**: API POST/PUT handlers
- **Check**: `user_id` must come from `res.locals.userId`, never from `req.body`
- **Check**: Zod schemas for input must NOT include `user_id` field

#### OWASP-A01-006: Missing authorization on destructive operations
- **Where**: DELETE endpoints
- **Check**: Record ownership verified before deletion (select + check user_id, or filter in WHERE)

#### OWASP-A01-007: Client-side route protection without server validation
- **Where**: Web loaders, mobile navigation guards
- **Check**: Client-side auth checks are supplementary — server MUST reject unauthorized requests independently
- **Check**: Sensitive data never loaded in client bundle before auth check

#### OWASP-A01-008: Internal network access via user input (SSRF)
- **Where**: API routes that proxy or fetch external resources
- **Check**: Cannot reach `localhost`, `127.0.0.1`, `10.*`, `172.16-31.*`, `192.168.*` via user input
- **Check**: Cannot access cloud metadata endpoints (`169.254.169.254`)
- **Check**: DNS rebinding protection (resolve before fetching, validate IP)

#### OWASP-A01-009: Open redirect enabling SSRF chain
- **Where**: Redirect handling, OAuth callbacks
- **Check**: `redirectTo` / `redirect_uri` parameters validated against allowlist
- **Check**: No arbitrary URL in redirect target
- **Known**: SEC-006 (deferred — oauth.ts redirectTo not validated yet)

### Medium

#### OWASP-A01-010: Horizontal privilege escalation via query params
- **Where**: API GET endpoints with filters
- **Check**: Query params like `?user_id=X` cannot override `res.locals.userId`

#### OWASP-A01-011: Missing access control on file/asset URLs
- **Where**: Any URL construction for user assets (avatars, documents)
- **Check**: Supabase Storage URLs must use signed URLs or RLS-protected buckets

#### OWASP-A01-012: Metadata manipulation
- **Where**: API routes that accept `created_at`, `updated_at`, or system fields
- **Check**: System fields must be server-set, never accepted from client input

#### OWASP-A01-013: Webhook or callback URL injection (SSRF)
- **Where**: Any webhook registration, notification URLs
- **Check**: Callback URLs validated before server sends requests to them
- **Check**: If webhooks used, URL scheme restricted to https
- **Note**: May not apply if no webhook feature exists

#### OWASP-A01-014: Image/avatar URL fetching (SSRF)
- **Where**: Avatar loading, any server-side image processing
- **Check**: If server fetches images from user-provided URLs, validate scheme + domain
- **Check**: Timeout and size limits on fetched resources
- **Note**: If avatar URLs are only used client-side (img src), SSRF doesn't apply — but verify

### Low

#### OWASP-A01-015: Verbose error revealing access control logic
- **Where**: API error responses
- **Check**: 404 (not found) should be returned instead of 403 (forbidden) to avoid confirming resource existence

#### OWASP-A01-016: Supabase Storage URL manipulation (SSRF)
- **Where**: Supabase Storage URL construction
- **Check**: Storage bucket paths not user-controllable for arbitrary file access
- **Check**: Signed URL generation uses correct bucket/path validation

#### OWASP-A01-017: Third-party API proxy without validation (SSRF)
- **Where**: Any server route that proxies to external APIs
- **Check**: Target API host hardcoded, not from user input
- **Check**: Only expected paths/methods forwarded
- **Note**: Relevant if GoCardless integration proxies requests
