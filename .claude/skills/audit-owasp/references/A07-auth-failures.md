# A07:2025 — Authentication Failures

OWASP Top 10 #7 (renamed from "Identification and Authentication Failures" in 2021).
Weaknesses in authentication mechanisms.

## Checklist

### Critical

#### OWASP-A07-001: Authentication bypass
- **Where**: API middleware (`apps/api/src/middleware/auth.ts`)
- **Check**: `requireAuth` properly validates JWT via `supabase.auth.getUser()` (not just decode)
- **Check**: No fallback path that allows unauthenticated access
- **Check**: Token extracted correctly from `Authorization: Bearer <token>` header

#### OWASP-A07-002: Session fixation
- **Where**: Auth flow (login, signup, token refresh)
- **Check**: Session token regenerated after authentication state change
- **Check**: Old tokens invalidated on logout
- **Note**: Supabase handles this — verify no custom session logic bypasses it

### High

#### OWASP-A07-003: Missing token expiry enforcement
- **Where**: Auth configuration, token handling
- **Check**: JWT has reasonable expiry (current: 600s / 10 min)
- **Check**: Expired tokens are rejected server-side (not just client-side)
- **Check**: Refresh token rotation implemented (old refresh tokens invalidated)

#### OWASP-A07-004: Insecure token storage
- **Where**: Mobile — token persistence, Web — token storage
- **Check**: Mobile tokens in `expo-secure-store` (not AsyncStorage)
- **Check**: Web tokens in httpOnly cookies or secure memory (not plain localStorage)
- **Accepted**: bare RN app uses AsyncStorage (learning reference, not published)

#### OWASP-A07-005: Missing MFA validation server-side
- **Where**: API auth middleware, TOTP flow
- **Check**: If MFA enrolled, server validates TOTP before granting full access
- **Check**: MFA cannot be bypassed by replaying pre-MFA token

#### OWASP-A07-006: OAuth misconfiguration
- **Where**: OAuth setup (Google), redirect URIs
- **Check**: Redirect URIs strictly validated (no open redirect)
- **Check**: State parameter used to prevent CSRF on OAuth flow
- **Check**: OAuth tokens not exposed in client-side URL fragments without handling

### Medium

#### OWASP-A07-007: Weak session management
- **Where**: Client auth hooks, session handling
- **Check**: Session invalidated on sign-out (not just cleared client-side)
- **Check**: Concurrent session handling defined (one device signs out, others?)
- **Check**: Session expiry communicated to user (modal, redirect)

#### OWASP-A07-008: Missing brute-force protection on OTP/TOTP
- **Where**: OTP verification, TOTP challenge screens
- **Check**: Limited attempts before lockout
- **Check**: Rate limiting on verification endpoint
- **Note**: Likely handled by Supabase — verify

#### OWASP-A07-009: Credential enumeration
- **Where**: Login, signup, password reset flows
- **Check**: Same response for valid/invalid email on login failure
- **Check**: No timing side-channel revealing if user exists
- **Note**: Supabase default behavior — verify not overridden

### Low

#### OWASP-A07-010: Missing password strength requirements
- **Where**: Signup form validation
- **Check**: Minimum password length enforced (client + server)
- **Check**: Common password list check
- **Note**: May be Supabase-configured — check project settings

#### OWASP-A07-011: Token in URL
- **Where**: Deep links, navigation, API calls
- **Check**: Tokens never passed as URL query parameters
- **Check**: Magic links / OTP links handled securely (one-time use)
