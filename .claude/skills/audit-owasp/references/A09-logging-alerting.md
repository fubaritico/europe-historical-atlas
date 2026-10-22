# A09:2025 — Security Logging and Alerting Failures

OWASP Top 10 #9 (renamed from "Security Logging and Monitoring Failures" in 2021).
Insufficient logging, detection, and active response.

## Checklist

### High

#### OWASP-A09-001: No logging of authentication events
- **Where**: API auth middleware, auth hooks
- **Check**: Failed login attempts logged (with IP if available, without password)
- **Check**: Successful logins logged
- **Check**: Token refresh failures logged
- **Check**: Logout events logged

#### OWASP-A09-002: No logging of authorization failures
- **Where**: API routes, access control middleware
- **Check**: 401/403 responses logged with user context
- **Check**: Attempts to access other users' resources logged
- **Check**: Suspicious patterns detectable from logs

### Medium

#### OWASP-A09-003: Missing audit trail for financial operations
- **Where**: API mutation routes (create/update/delete transactions, pots, budgets)
- **Check**: Mutations logged with user_id, timestamp, operation, affected resource
- **Check**: Balance-affecting operations have before/after values logged
- **Note**: Formal audit table may not exist yet — note as recommendation

#### OWASP-A09-004: Sensitive data in logs
- **Where**: All logging statements
- **Check**: Passwords, tokens, full credit card numbers never logged
- **Check**: PII (email, phone) masked or omitted in standard logs
- **Check**: Financial amounts acceptable to log (not PII)

#### OWASP-A09-005: Missing error monitoring
- **Where**: API error handlers, client error boundaries
- **Check**: Unhandled exceptions captured (Sentry, Bugsnag, or equivalent)
- **Check**: Client-side crashes reported (React error boundaries)
- **Note**: If no error service configured, note as informational

### Low

#### OWASP-A09-006: No structured logging format
- **Where**: API, all console.warn/error calls
- **Check**: Logs include timestamp, severity, context (userId, requestId)
- **Check**: Structured format (JSON) preferred for machine parsing
- **Note**: `console.warn/error` is current practice — structured logging is an improvement

#### OWASP-A09-007: Missing request correlation
- **Where**: API middleware
- **Check**: Request ID generated and propagated through the request lifecycle
- **Check**: Logs correlatable across middleware -> handler -> response
- **Note**: Informational for this project stage

#### OWASP-A09-008: No alerting on anomalies
- **Where**: Monitoring configuration
- **Check**: Threshold alerts for unusual error rates
- **Check**: Alert on repeated auth failures from same source
- **Note**: Informational — relevant for production deployment

#### OWASP-A09-009: Log retention and access control
- **Where**: Logging infrastructure config
- **Check**: Logs not publicly accessible
- **Check**: Log retention period defined
- **Note**: Typically hosting/infra concern — informational

#### OWASP-A09-010: Missing health check endpoint monitoring
- **Where**: API `/health` endpoint
- **Check**: Health endpoint exists and returns meaningful status
- **Check**: Can be used for uptime monitoring
