# A02:2025 — Security Misconfiguration

OWASP Top 10 #2 (was #5 in 2021). Missing or incorrect security hardening across the application stack.

## Checklist

### Critical

#### OWASP-A02-001: Default credentials or demo accounts in production config
- **Where**: `.env.example`, config files, seed scripts
- **Check**: No real credentials in example files
- **Check**: Seed/demo data endpoints gated behind `NODE_ENV !== 'production'`

### High

#### OWASP-A02-002: Overly permissive CORS
- **Where**: API Express config (`apps/api/src/index.ts`)
- **Check**: CORS origin is NOT `*` in production
- **Check**: Allowed origins explicitly listed or dynamically validated
- **Check**: Credentials mode + CORS properly configured together

#### OWASP-A02-003: Verbose error messages in production
- **Where**: API error handlers, catch blocks
- **Check**: Stack traces never sent to client
- **Check**: Internal paths, package versions not exposed in error responses
- **Check**: Generic error messages for 500s ("Internal server error")

#### OWASP-A02-004: Security headers missing
- **Where**: API responses, web server config
- **Check**: `X-Content-Type-Options: nosniff`
- **Check**: `X-Frame-Options: DENY` or CSP `frame-ancestors`
- **Check**: `Strict-Transport-Security` (HSTS)
- **Check**: `Content-Security-Policy` (at least basic)
- **Note**: Some may be handled by hosting (Netlify headers)

#### OWASP-A02-005: Debug mode or dev tools in production
- **Where**: All config files, build scripts
- **Check**: No `devtools: true`, `debug: true` in production configs
- **Check**: React DevTools, Redux DevTools disabled in production
- **Check**: Source maps not served in production (or restricted)

### Medium

#### OWASP-A02-006: Unnecessary features enabled
- **Where**: `app.json`, `package.json`, API middleware
- **Check**: Only needed permissions requested in mobile app
- **Check**: No unused middleware that increases attack surface
- **Check**: `X-Powered-By` header disabled (Express default exposes "Express")

#### OWASP-A02-007: Insecure default configurations
- **Where**: Supabase config, JWT settings
- **Check**: JWT expiry is reasonable (not infinite)
- **Check**: Session configuration secure (httpOnly, secure, sameSite)
- **Check**: Auto-refresh token behavior is intentional

#### OWASP-A02-008: Missing environment variable validation
- **Where**: App startup, config initialization
- **Check**: Required env vars validated at startup (fail-fast)
- **Check**: No silent fallback to insecure defaults when env vars missing

### Low

#### OWASP-A02-009: Directory listing enabled
- **Where**: Web server config, static file serving
- **Check**: No directory indexes exposed
- **Note**: Typically handled by Vite/hosting, but verify

#### OWASP-A02-010: Unnecessary HTTP methods
- **Where**: API route definitions
- **Check**: Only needed HTTP methods registered per route
- **Check**: No wildcard method handlers (`app.all()` without restriction)
