# A09:2025 — Security Logging and Alerting Failures

OWASP Top 10 #9. Not logging, not monitoring, not alerting on what matters. Today the logs are the browser console (`console.warn` / `console.error`, never `console.log`) and the Cartographer dev server's terminal; there is no production server to log. The project rule (`rules/error-handling.md`): no refusal is silent.

## Checklist

### High

#### OWASP-A09-001: Every refusal at the dev server is logged
- **Where**: `packages/cartographer/src/devServer/httpEndpoint.ts` (`LOG_TAG`, the 413 and the cut-off body), `yearWriteEndpoint.ts`, `draftEndpoint.ts` (`refuse`), `snapshotEndpoint.ts` (`refuse`)
- **Check**: A request refused for its origin, method, path, body or size logs a `console.warn` with `[Cartographer dev server]` and the reason; a disk failure logs a `console.error` with the full error
- **Check**: The cross-origin refusal names the refused `Origin`, so an attempt from another site is visible in the terminal

#### OWASP-A09-002: (planned) Authentication and authorization events
- **Where**: a hosted server (Payload/Next today's plan; Express or another Node service if one is added) — login, logout, failed login, lockout, refused access
- **Check**: Each is logged server-side with time, account (never the password) and source address

### Medium

#### OWASP-A09-003: (planned) Audit trail of contributions
- **Where**: the future Payload collections (versions on), the arbitration of DESIGN-262
- **Check**: Every change to a claim, a source or a published entry keeps who and when; an arbitration is signed and the competing claims are kept

#### OWASP-A09-004: Sensitive data in logs
- **Where**: every `console.warn` / `console.error` in `packages/*/src`, `.github/workflows/ci.yml` (the deploy's diagnostic step)
- **Check**: No token, cookie or (planned) personal data in a log line; the page receives a fixed sentence while absolute paths stay in the server terminal (`respond` in `httpEndpoint.ts`)

#### OWASP-A09-005: Errors reach someone
- **Where**: `packages/atlas/src/ui/errorNet.ts` (`error` and `unhandledrejection` shown on screen), `packages/cartographer/src/ui/components/ErrorBoundary/` (one boundary per zone)
- **Check**: The atlas shows any unexpected error; the Cartographer's boundaries catch render errors, but errors thrown in event handlers, `requestAnimationFrame` or timers have no net yet (open, per `rules/error-handling.md`)
- **Check**: (planned) An error monitoring service (Sentry is named in `plan.md` with authentication and the security layer) for the hosted tool and the published atlas

### Low

#### OWASP-A09-006: One log format
- **Where**: every `console.warn` / `console.error` call
- **Check**: Each starts with its application's tag (`[Cartographer]`, `[Cartographer dev server]`, the atlas's) so a line says who spoke

#### OWASP-A09-007: No log per frame
- **Where**: the render loops (`packages/atlas/src/app/frameLoop.ts`, the Cartographer's canvas painters)
- **Check**: A check that would run on every repaint logs once per document version, never per frame — a flood hides the line that matters

#### OWASP-A09-008: CI and deploy alerting
- **Where**: `.github/workflows/ci.yml` (`quality-gate`, `deploy`), `sonarqube.yml` (non-blocking by design)
- **Check**: A failed deploy or a skipped deploy (missing secrets) is visible; a Sonar failure is reported but does not block, as decided

#### OWASP-A09-009: (planned) Log retention and access
- **Where**: the hosting of the contribution tool
- **Check**: Who can read server logs, for how long they are kept, and that they hold no more personal data than needed

#### OWASP-A09-010: (planned) Health check of the hosted tool
- **Where**: a hosted server (Payload/Next today's plan; Express or another Node service if one is added)
- **Check**: A health endpoint that reveals no version or configuration, watched by an uptime check
