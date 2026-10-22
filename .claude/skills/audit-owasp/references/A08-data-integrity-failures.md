# A08:2025 — Software and Data Integrity Failures

OWASP Top 10 #8 (same position as 2021). Code and infrastructure that does not protect against integrity violations.

## Checklist

### High

#### OWASP-A08-001: Untrusted deserialization
- **Where**: API request handling, any JSON.parse of external data
- **Check**: No `JSON.parse()` of user input without try/catch and schema validation
- **Check**: No `eval()` or `Function()` to process data (also covered in A05)
- **Check**: Zod validation on ALL request bodies before processing

#### OWASP-A08-002: Missing integrity checks on critical data
- **Where**: Financial operations (balance, transactions, pots)
- **Check**: Amounts validated server-side (not trusted from client)
- **Check**: Running totals recomputed server-side, not accepted from client
- **Check**: No client-side calculation accepted as source of truth

#### OWASP-A08-003: Insecure CI/CD pipeline
- **Where**: `.github/workflows/`, build scripts, Husky hooks
- **Check**: No secrets in workflow files
- **Check**: Actions use pinned versions (SHA, not `@latest`)
- **Check**: No arbitrary code execution from PR comments
- **Note**: If no CI/CD configured yet, note as informational

### Medium

#### OWASP-A08-004: Missing subresource integrity (SRI)
- **Where**: Web HTML, CDN script/style loading
- **Check**: External scripts/styles have `integrity` attribute
- **Check**: No CDN resources loaded without integrity verification
- **Note**: If all resources bundled (Vite), this may not apply

#### OWASP-A08-005: Unsigned or unverified updates
- **Where**: OTA updates (Expo Updates), package installation
- **Check**: Expo Updates configured with code signing (if used)
- **Check**: No custom update mechanism that bypasses store review

#### OWASP-A08-006: Client-side data manipulation
- **Where**: Financial forms, amount inputs
- **Check**: Server re-validates all business rules (don't trust client validation alone)
- **Check**: Optimistic updates don't persist on server rejection
- **Check**: TanStack Query mutation error handling reverts optimistic state

### Low

#### OWASP-A08-007: Missing file integrity monitoring
- **Where**: Build outputs, deployment artifacts
- **Check**: Build outputs deterministic or checksummed
- **Note**: Informational for this project stage

#### OWASP-A08-008: Auto-update without user consent
- **Where**: Mobile app update mechanism
- **Check**: Major updates require user acknowledgment
- **Check**: No forced app reload without warning
- **Note**: Informational — relevant when Expo Updates is configured

#### OWASP-A08-009: Unvalidated redirects from external sources
- **Where**: OAuth callbacks, deep links, email links
- **Check**: Redirect targets validated against allowlist
- **Check**: No open redirect from OAuth `redirectTo` parameter
- **Known**: SEC-006 (deferred — oauth.ts redirectTo not validated yet)

#### OWASP-A08-010: Missing CSP for inline scripts
- **Where**: Web HTML template, server response headers
- **Check**: Content-Security-Policy restricts inline scripts
- **Check**: No `unsafe-inline` or `unsafe-eval` in CSP
- **Note**: Vite injects inline scripts — may need nonce-based CSP
