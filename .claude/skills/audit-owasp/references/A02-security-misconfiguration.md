# A02:2025 — Security Misconfiguration

OWASP Top 10 #2 (was #5 in 2021). Insecure defaults, missing hardening, overly permissive settings. Here: the Netlify static host, the Vite dev servers, the CI, and later the hosted contribution tool.

## Checklist

### Critical

#### OWASP-A02-001: No credential or token in a committed file
- **Where**: `.npmrc` (exists; routes the `@fubaritico` scope only), `.github/actions/setup/action.yml`, `.github/workflows/*.yml`, `.gitignore` (`.npmrc`, `**/.env*`), `.claude/skills/trello/`
- **Check**: The GitHub Packages token lives in `~/.npmrc` locally and `NODE_AUTH_TOKEN: ${{ github.token }}` in CI, never in the repository's `.npmrc`
- **Check**: Trello keys stay in `.env.local` (git-ignored); the Netlify and Sonar tokens are repository secrets, read through `env:`, never echoed
- **Check**: `git ls-files` lists no `.env*` and no `.npmrc` carrying an `_authToken`

### High

#### OWASP-A02-002: Security headers on the published site
- **Where**: `packages/atlas/public/_headers` (carried inside the artefact, per its own comment; there is no `netlify.toml`)
- **Check**: Today it sets only `Cache-Control`. Check for a `Content-Security-Policy` (scripts `'self'`, a `worker-src 'self'` for the compute worker, `connect-src 'self'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `frame-ancestors` / `X-Frame-Options`, `Permissions-Policy`
- **Check**: A CSP must still allow what the atlas really loads: WebGL, a module worker, same-origin JSON and binary assets — test it on a deploy preview, not by reading

#### OWASP-A02-003: Development tooling does not reach the published bundle
- **Where**: `packages/atlas/src/main.ts` (lil-gui dev panel and `Stats`, created in every build), `packages/cartographer/src/main.tsx` (`?break=` under `import.meta.env.DEV`), `packages/cartographer/vite.config.ts` (`apply: 'serve'`)
- **Check**: Every dev-only path is gated by `import.meta.env.DEV` or `apply: 'serve'`, and the built `dist/` contains no dev-server route (`/__years`, `/__drafts`)
- **Check**: The dev panel's presence in production is a known decision (memory "Dev tools panel"); confirm it exposes nothing beyond render tuning
- **Check**: No `build.sourcemap` turned on for the deployed atlas without a decision

#### OWASP-A02-004: Dev servers bind to loopback only
- **Where**: `packages/atlas/vite.config.ts`, `packages/cartographer/vite.config.ts`, the `dev` scripts in each `package.json`
- **Check**: No `server.host` / `--host`; the Cartographer's server writes to disk (A01-001), so exposing it on a network is a remote write

#### OWASP-A02-005: CI token permissions are least-privilege
- **Where**: `.github/workflows/ci.yml`, `sonarqube.yml`, `sonar-init.yml`, `build.yml`, `validate.yml`
- **Check**: Each job calling a workflow narrows `permissions:` (`contents: read`, `packages: read`); the jobs that declare none (`quality-gate`, `deploy`) inherit the repository default — check it is read-only in the repository settings or add an explicit block
- **Check**: Secrets are passed through `env:`, never interpolated into `run:` (the deploy's `COMMIT_SUBJECT` already is)

### Medium

#### OWASP-A02-006: (planned) Hosted server configuration
- **Where**: a hosted server (Payload/Next today's plan; Express or another Node service if one is added) — the future `payload.config.ts`, `next.config.*`
- **Check**: `secret` (PAYLOAD_SECRET) from the environment, long and random; `serverURL`, `cors` and `csrf` set to explicit origins; GraphQL playground and debug off in production; security headers set by the host or `next.config` `headers()`
- **Check**: The SQLite file (or its network successor) is outside any served folder and not committed
- **Check**: Required environment variables are validated at start-up — the server refuses to start without them rather than run on a default

#### OWASP-A02-007: Unused features and files on the host
- **Where**: `packages/atlas/public/`, `packages/atlas/dist/` (what ships), `.gitignore`
- **Check**: No spike output, `.tmp` file (`**/public/years/*.tmp` is ignored), draft or GPL payload in `public/`; the build guard in `build.yml` covers `borders/`

#### OWASP-A02-008: Install-time configuration
- **Where**: `pnpm-workspace.yaml` (`autoInstallPeers: false`, `catalog:`), `.github/actions/setup/action.yml` (`--frozen-lockfile`), `.nvmrc`, root `package.json` `engines`
- **Check**: CI installs with `--frozen-lockfile` on the pinned pnpm and Node versions; no package's lifecycle script is allowed to run unreviewed (see A03)

### Low

#### OWASP-A02-009: Directory listing and fallbacks on the host
- **Where**: `packages/atlas/public/_headers`, Netlify defaults (there is no `_redirects`)
- **Check**: Netlify serves no directory index; an unknown path answers 404, not the app shell masking a missing asset
- **Note**: Verify Netlify's behaviour against its docs on the web, not from memory

#### OWASP-A02-010: Dev-server endpoints refuse methods they do not serve
- **Where**: `packages/cartographer/src/devServer/yearWriteEndpoint.ts` (`PUT` only), `draftEndpoint.ts`, `snapshotEndpoint.ts`
- **Check**: Every other method answers 405 with its reason and logs a `console.warn`
