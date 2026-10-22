# A05:2025 — Injection

OWASP Top 10 #5 (was #3 in 2021). Untrusted data sent to an interpreter as part of a command or query.

## Checklist

### Critical

#### OWASP-A05-001: SQL injection via string interpolation
- **Where**: API routes, any Supabase `.rpc()` calls, raw queries
- **Check**: No template literals or string concatenation in SQL/query construction
- **Check**: All `.rpc()` parameters are passed as named params, not interpolated
- **Must use**: Supabase query builder methods (`.eq()`, `.in()`, `.filter()`)

#### OWASP-A05-002: XSS via dangerouslySetInnerHTML
- **Where**: `.web.tsx` files, web components
- **Check**: No `dangerouslySetInnerHTML` without DOMPurify sanitization
- **Check**: No rendering of user-provided HTML/markdown without sanitization

#### OWASP-A05-003: Command injection
- **Where**: Any `exec()`, `spawn()`, `execSync()` calls
- **Check**: No user input passed to shell commands
- **Check**: No `child_process` usage with unsanitized input

### High

#### OWASP-A05-004: XSS via unescaped user input in DOM
- **Where**: `.web.tsx` files
- **Check**: User-provided data rendered in JSX is auto-escaped by React (safe)
- **Check**: BUT: `href` attributes with user input (javascript: protocol attack)
- **Check**: `src` attributes with user-controlled URLs
- **Check**: CSS injection via inline styles from user input

#### OWASP-A05-005: Template injection
- **Where**: Any server-side template rendering, email templates
- **Check**: No user input interpolated into templates without escaping

#### OWASP-A05-006: NoSQL injection
- **Where**: Supabase/PostgREST filters
- **Check**: Filter operators not controllable by user input
- **Check**: `.or()` and `.filter()` with user input are parameterized

### Medium

#### OWASP-A05-007: Header injection
- **Where**: API responses, redirect handling
- **Check**: No user input in HTTP response headers without sanitization
- **Check**: `Location` header for redirects must validate the URL

#### OWASP-A05-008: Path traversal
- **Where**: File serving, asset loading, any path construction from user input
- **Check**: No `../` sequences possible in user-provided file paths
- **Check**: Allowlist-based path resolution, never user-controlled base paths

#### OWASP-A05-009: Regex injection (ReDoS)
- **Where**: Any `new RegExp()` with user input
- **Check**: No user-provided strings used directly in regex construction
- **Check**: If regex needed, use pre-compiled patterns or safe regex libraries

### Low

#### OWASP-A05-010: Log injection
- **Where**: Console/log statements
- **Check**: User input in logs should be sanitized (no CRLF injection for log forging)
- **Check**: Structured logging preferred over string interpolation
