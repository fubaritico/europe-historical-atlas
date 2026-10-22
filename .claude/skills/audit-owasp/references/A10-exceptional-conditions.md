# A10:2025 — Mishandling of Exceptional Conditions

OWASP Top 10 #10 (new for 2025, replaces SSRF which was merged into A01). Programs that fail
to prevent, detect, and respond to unusual situations — leading to crashes, unexpected behavior,
information disclosure, and exploitable states.

Key CWEs: CWE-209 (sensitive info in errors), CWE-248 (uncaught exceptions), CWE-636 (fail open),
CWE-703 (improper exception handling), CWE-754 (missing unusual condition checks), CWE-756
(missing custom error page).

## Checklist

### Critical

#### OWASP-A10-001: Fail-open auth middleware (CWE-636)
- **Where**: API middleware (`apps/api/src/middleware/auth.ts`)
- **Check**: If `requireAuth` throws an exception, the request MUST be denied (401), never passed through
- **Check**: No `try { verifyToken() } catch { /* pass */ }` pattern — exception = deny access
- **Check**: Auth middleware uses fail-closed pattern: any error → 401 response

#### OWASP-A10-002: Missing global error handler
- **Where**: API Express app (`apps/api/src/index.ts`)
- **Check**: Express global error handler registered (`app.use((err, req, res, next) => ...)`)
- **Check**: Global handler returns generic message, never stack traces or internal details
- **Check**: Global handler logs the full error server-side for debugging

### High

#### OWASP-A10-003: Stack traces in error responses (CWE-209)
- **Where**: API error handlers, catch blocks
- **Check**: No `err.stack`, `err.message` from internal errors sent to client
- **Check**: No `JSON.stringify(error)` that might serialize stack/internal paths
- **Check**: Client receives only `{ "error": "Human-readable message" }` — no internals
- **Overlap**: Also covered in A02-003, but A10 focuses on the exception handling path specifically

#### OWASP-A10-004: Uncaught promise rejections (CWE-248)
- **Where**: All async handlers in API routes, web loaders, mobile screens
- **Check**: Every `async` route handler wrapped in try/catch or uses Express async error forwarding
- **Check**: No `.then()` chains without `.catch()`
- **Check**: `process.on('unhandledRejection')` handler registered in API entry point

#### OWASP-A10-005: Sensitive data leaked in exception messages (CWE-209)
- **Where**: Custom error classes, Supabase error forwarding
- **Check**: Supabase `error.message` reviewed before forwarding to client (may contain SQL details)
- **Check**: Zod validation errors sanitized (may reveal schema structure)
- **Check**: No database connection strings, file paths, or internal IPs in error responses

### Medium

#### OWASP-A10-006: Missing default cases (CWE-754)
- **Where**: Switch statements, if/else chains in API handlers
- **Check**: Switch on user input always has `default` case
- **Check**: Enum-like checks have exhaustive handling or explicit fallback
- **Check**: No silent pass-through when unexpected value received

#### OWASP-A10-007: Partial transaction on exception
- **Where**: Multi-step API operations (financial mutations, onboarding setup)
- **Check**: If a multi-step operation fails mid-way, prior steps are rolled back
- **Check**: Supabase RPCs used for atomic operations (single SQL transaction)
- **Check**: No partial state committed when a later step throws

#### OWASP-A10-008: Resource leaks in exception paths
- **Where**: Database connections, file handles, external API calls
- **Check**: Resources cleaned up in `finally` blocks, not just happy path
- **Check**: Supabase client connections properly managed (SDK handles pooling, but verify custom clients)
- **Check**: HTTP client timeouts set to prevent hanging on failed requests

#### OWASP-A10-009: Error boundaries missing in client apps
- **Where**: React web app, React Native mobile app
- **Check**: React error boundaries at route/screen level (catch rendering errors)
- **Check**: Error boundaries show user-friendly message, not crash dump
- **Check**: Error boundaries report to error tracking service (if configured)

#### OWASP-A10-010: TanStack Query error handling gaps
- **Where**: Query/mutation hooks in web and mobile apps
- **Check**: `onError` callbacks handle errors gracefully (toast, redirect, retry)
- **Check**: Failed mutations don't leave UI in inconsistent state
- **Check**: Network errors distinguished from server errors (different UX)

### Low

#### OWASP-A10-011: Silent null/undefined handling
- **Where**: All TypeScript code
- **Check**: Optional chaining (`?.`) not used to silently swallow errors that should be caught
- **Check**: Nullish coalescing (`??`) fallbacks are intentional, not hiding bugs
- **Check**: `as` type assertions not masking potentially null values

#### OWASP-A10-012: Missing timeout on external calls
- **Where**: API routes calling external services (Supabase RPCs, GoCardless)
- **Check**: HTTP requests have explicit timeout
- **Check**: No indefinite `await` on external service calls
- **Note**: Supabase client has default timeouts — verify custom fetch configs
