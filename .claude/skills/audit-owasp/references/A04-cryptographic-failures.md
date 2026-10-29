# A04:2025 — Cryptographic Failures

OWASP Top 10 #4 (was #2 in 2021). Exposure of sensitive data through weak or missing protection. Today the repository holds no personal data and no user secret; what is sensitive is the developer's tokens, and, later, contributors' accounts.

## Checklist

### Critical

#### OWASP-A04-001: Hardcoded secrets in source code
- **Where**: all tracked files except `.env*`; in particular `.github/`, `scripts/`, `.claude/skills/*/scripts/`, `packages/*/src/`, `files/plans/`
- **Check**: No GitHub, Netlify, Sonar or Trello token, no `ghp_` / `npm_` / `_authToken=` string; the repository is public, so anything committed is published
- **Check**: `git log -p` is clean too — a secret removed in a later commit is still public

#### OWASP-A04-002: Nothing secret in a client bundle
- **Where**: `packages/atlas/src/`, `packages/cartographer/src/`, every `import.meta.env.*` read
- **Check**: Only `VITE_`-prefixed values reach a bundle; none of them is a secret; no `.env*` file is read by a Vite config

### High

#### OWASP-A04-003: Transport is HTTPS
- **Where**: `packages/cartographer/src/wikidata/wikidataSource.ts` (`WIKIDATA_ENDPOINT`), `wikidataFacts.ts` (Wikipedia links), the atlas's relative asset URLs, the site on Netlify
- **Check**: Every absolute URL is `https://`; the atlas fetches only same-origin relative paths

#### OWASP-A04-004: Contributor credentials and sessions
- **Where**: `packages/cms/src/collections/Users.ts` (`auth: true`), `packages/cms/src/payload.config.ts` (`secret` from `PAYLOAD_SECRET`), and (planned) the hosted server
- **Check**: Passwords hashed by Payload's auth (never a custom scheme); `PAYLOAD_SECRET` long, random, from the environment; auth cookies `HttpOnly`, `Secure`, `SameSite`
- **Check**: HTTPS enforced on the hosted tool, HSTS set
- **Note**: Verify Payload's hashing and cookie defaults against `opensrc/` or its docs on the web, not from memory

### Medium

#### OWASP-A04-005: Sensitive data in logs
- **Where**: every `console.warn` / `console.error`, in particular `packages/cartographer/src/devServer/httpEndpoint.ts` (full disk errors to the terminal), `.github/workflows/ci.yml` (the deploy's diagnostic step prints the site id's length and first 8 characters)
- **Check**: No token or full secret printed; the partial site id printed in a public repository's CI logs is a decision, not an accident

#### OWASP-A04-006: Contributor data in the static export
- **Where**: `packages/cms/src/export/` (the export from the Payload database to static JSON)
- **Check**: Emails, password hashes, session data and private notes never reach `public/`; only fields declared public are exported

#### OWASP-A04-007: Data in browser storage
- **Where**: `packages/atlas/src/camera/cameraState.ts`, `packages/atlas/src/controls/mapCameraStore.ts` (`sessionStorage`)
- **Check**: Only view state (camera position) is stored; no identity or token goes to Web Storage, now or with accounts

### Low

#### OWASP-A04-008: Weak hashing used for a security purpose
- **Where**: `packages/core/src/data/yearStamp.ts` (the fingerprint behind `If-Match`), any hash in `packages/*/src`
- **Check**: A fingerprint used for change detection only is fine; no non-cryptographic hash is ever used for integrity against an attacker or for a secret

#### OWASP-A04-009: Insecure random values
- **Where**: any `Math.random()` in `packages/*/src`
- **Check**: Not used for an identifier that must be unguessable; (planned) tokens and ids in the contribution tool come from `crypto` / the framework
