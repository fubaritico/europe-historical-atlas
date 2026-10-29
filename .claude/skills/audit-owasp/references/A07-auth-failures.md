# A07:2025 — Authentication Failures

OWASP Top 10 #7. Weaknesses in confirming identity and managing sessions. **Authentication lives in the CMS** (`packages/cms`, Payload 3.x on Next.js, the `Users` collection with `auth: true`), local for now. The atlas is public and read-only; the Cartographer's dev server authenticates a request by where it comes from (same machine). Items marked `(planned)` concern hosting the CMS online, and only those are reported as not applicable.

## Checklist

### Critical

#### OWASP-A07-001: The dev server's "same machine" check is the only authentication, and it holds
- **Where**: `packages/cartographer/src/devServer/httpEndpoint.ts` (`isSameMachineRequest`, `LOOPBACK_HOST`), `draftEndpoint.ts` (`isFromHere`)
- **Check**: The check cannot be passed by a page from another origin (its `Origin` differs) nor by a DNS-rebound name (its `Host` is not loopback); `LOOPBACK_HOST` is anchored at both ends
- **Check**: It is never presented or reused as authentication for anything reachable off the machine (A01-002)

#### OWASP-A07-002: Authentication on every non-public route of the CMS
- **Where**: `packages/cms/src/collections/Users.ts`, `packages/cms/src/app/` (Next route handlers, server actions, any middleware)
- **Check**: Every route and server action that reads unpublished data or writes checks the session server-side; the admin UI hiding a button is not a check
- **Check**: An error while verifying a session denies access (see A10)

### High

#### OWASP-A07-003: Session tokens and cookies
- **Where**: the auth options of `packages/cms/src/collections/Users.ts` (`auth.tokenExpiration`, `cookies`; Payload's defaults while `auth: true`)
- **Check**: Expiry set to a deliberate value; cookies `HttpOnly`, `Secure`, `SameSite=Lax` or stricter; logout invalidates server-side
- **Note**: Verify Payload's cookie and JWT defaults against `opensrc/` or its docs on the web, not from memory

#### OWASP-A07-004: No token in browser storage or URLs
- **Where**: the CMS admin and `packages/cms/src/components/`, the Cartographer if it ever saves online (`s15`, the online saving tier named in `yearWriteEndpoint.ts`)
- **Check**: Credentials ride in an `HttpOnly` cookie, never in `localStorage`, `sessionStorage` or a query string; today `sessionStorage` holds camera state only (`packages/atlas/src/camera/cameraState.ts`, `packages/atlas/src/controls/mapCameraStore.ts`)

#### OWASP-A07-005: (planned) Online saving from the Cartographer
- **Where**: the future replacement for `PUT /__years/<year>` once saving goes online (a Netlify Function or the hosted tool)
- **Check**: The same-machine lock is replaced by real authentication and authorization, not carried over; the body checks of `yearWritePlan.ts` stay

### Medium

#### OWASP-A07-006: (planned) Brute-force protection
- **Where**: the future login, password-reset and email-verification routes
- **Check**: `maxLoginAttempts` and `lockTime` set; rate limiting in front (A06-004)

#### OWASP-A07-007: (planned) Credential enumeration
- **Where**: the future login, signup and password-reset flows
- **Check**: The same answer whether the account exists or not

#### OWASP-A07-008: Admin and default accounts
- **Where**: `packages/cms/src/seed/`, Payload's first-user flow
- **Check**: No default administrator with a known password; the first user is created deliberately

### Low

#### OWASP-A07-009: Password policy
- **Where**: the validation of `packages/cms/src/collections/Users.ts`
- **Check**: A minimum length and a check against common passwords

#### OWASP-A07-010: CI and registry tokens are scoped and rotated
- **Where**: `.github/actions/setup/action.yml` (`github.token`), the repository secrets used in `.github/workflows/ci.yml` and `sonarqube.yml`, the local `~/.npmrc` (not in the repository)
- **Check**: The local GitHub Packages token is `read:packages` only; the Netlify and Sonar tokens are scoped to this site and project and can be revoked without breaking anything else
