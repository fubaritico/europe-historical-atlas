# A04:2025 — Cryptographic Failures

OWASP Top 10 #4 (was #2 in 2021). Failures related to cryptography (or lack thereof) that expose sensitive data.

## Checklist

### Critical

#### OWASP-A04-001: Hardcoded secrets in source code
- **Where**: All files (except `.env*`)
- **Patterns**: `sk-*`, `pk-*`, `supabase.*key`, `password =`, `secret =`, `token =`, API keys, connection strings
- **Check**: No credentials, API keys, or tokens committed to version control
- **Exception**: `.env.example` with placeholder values only

#### OWASP-A04-002: Sensitive data in client bundle
- **Where**: Web app source, mobile app source
- **Check**: `SUPABASE_SERVICE_ROLE_KEY` never in client code
- **Check**: No server-only secrets imported in client-side files
- **Check**: Env vars prefixed correctly (VITE_* for web, EXPO_PUBLIC_* for mobile)

### High

#### OWASP-A04-003: Sensitive data stored without encryption
- **Where**: Mobile — AsyncStorage, SecureStore usage
- **Check**: Tokens, session data, PII stored in `expo-secure-store` (not AsyncStorage)
- **Check**: Web — sensitive data not in plain localStorage (use httpOnly cookies or encrypted storage)
- **Accepted exception**: bare RN app (`apps/mobile/`) uses AsyncStorage — learning reference only

#### OWASP-A04-004: Weak or no transport encryption
- **Where**: All HTTP calls, API client configs
- **Check**: All production URLs use HTTPS
- **Check**: No `http://` URLs except localhost/10.0.2.2 in dev configs
- **Check**: No TLS downgrade options or certificate pinning bypass in production

#### OWASP-A04-005: Sensitive data in URL parameters
- **Where**: API calls, navigation
- **Check**: Tokens, passwords, PII never passed as query parameters (visible in logs, history)
- **Check**: OAuth redirect URIs don't leak tokens in URL fragments without proper handling

### Medium

#### OWASP-A04-006: Weak hashing for security purposes
- **Where**: All files
- **Check**: No MD5 or SHA1 for passwords, tokens, or integrity checks
- **Check**: No `Math.random()` for security-sensitive operations (use `crypto.getRandomValues`)

#### OWASP-A04-007: Sensitive data in logs
- **Where**: All files with console.warn/error, logging utilities
- **Check**: No logging of tokens, passwords, session IDs, or user PII
- **Check**: Error handlers don't serialize full request/response with auth headers

#### OWASP-A04-008: Missing data classification
- **Where**: API responses
- **Check**: Responses don't over-expose data (e.g., returning full user object with email when only name needed)
- **Check**: `select()` in Supabase queries limits columns to what's needed

### Low

#### OWASP-A04-009: Insecure random values
- **Where**: Any generated IDs, tokens, or nonces in client code
- **Check**: Use `crypto.randomUUID()` or `crypto.getRandomValues()` over `Math.random()`

#### OWASP-A04-010: Missing cache control on sensitive responses
- **Where**: API responses containing sensitive data
- **Check**: Sensitive endpoints should set `Cache-Control: no-store` headers
