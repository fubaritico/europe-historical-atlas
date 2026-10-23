# A03:2025 — Software Supply Chain Failures

OWASP Top 10 #3 (expanded from "Vulnerable and Outdated Components"). Compromised or vulnerable dependencies, registries, build tools and CI steps.

## Checklist

### Critical

#### OWASP-A03-001: Dependencies with known critical CVEs
- **Where**: `pnpm-lock.yaml`, `pnpm-workspace.yaml` (`catalog:`), every `packages/*/package.json`, root `package.json`
- **Check**: `pnpm audit --prod` and `pnpm audit` show no critical advisory; runtime dependencies first (`three`, `lil-gui`, `react`, `react-dom`, `zustand`, `zod`, `@fubaritico/*`)

#### OWASP-A03-002: Unpinned tool executed with a deploy secret
- **Where**: `.github/workflows/ci.yml` (`deploy`: `npx --yes netlify-cli@latest`, twice, with `NETLIFY_AUTH_TOKEN` in the environment)
- **Check**: A tool that receives a token runs at a pinned version (or from the lockfile as a devDependency), never `@latest` fetched at run time

### High

#### OWASP-A03-003: GitHub Actions pinned and from trusted publishers
- **Where**: `.github/workflows/*.yml`, `.github/actions/setup/action.yml` (`actions/checkout@v7`, `actions/setup-node@v7`, `pnpm/action-setup@v6`, `actions/upload-artifact@v7`, `actions/download-artifact@v8`, `SonarSource/sonarqube-scan-action@v8`)
- **Check**: Third-party actions that receive a secret (the Sonar action gets `SONAR_TOKEN` and `GITHUB_TOKEN`) are pinned to a commit SHA, not a movable tag
- **Check**: No `pull_request_target` trigger and no untrusted input interpolated into `run:`

#### OWASP-A03-004: Private scope routed to its registry only
- **Where**: `.npmrc` (check it exists; do not print it), `.github/actions/setup/action.yml` (`registry-url`, `scope: '@fubaritico'`)
- **Check**: `@fubaritico/*` resolves only from `https://npm.pkg.github.com`; every other package from the public npm registry — no scope that could be squatted on the public registry is left unrouted

#### OWASP-A03-005: Lifecycle scripts of dependencies
- **Where**: `pnpm-workspace.yaml`, `pnpm-lock.yaml`
- **Check**: Which dependencies run `postinstall` / `install` scripts (pnpm 10 blocks them unless listed in `onlyBuiltDependencies`); each allowed one is justified

#### OWASP-A03-006: Outdated framework versions
- **Where**: `pnpm-workspace.yaml` `catalog:` (Vite, React, three.js, TypeScript, ESLint, Vitest, zod)
- **Check**: `pnpm outdated -r` — no major behind on a runtime dependency without a recorded reason

### Medium

#### OWASP-A03-007: Lockfile integrity
- **Where**: `pnpm-lock.yaml`, `.github/actions/setup/action.yml`
- **Check**: CI installs with `--frozen-lockfile`; the lockfile is committed and changed only alongside a `package.json` or catalogue change

#### OWASP-A03-008: Unused dependencies
- **Where**: every `package.json` (e.g. `pngjs` at the root for spike tooling)
- **Check**: Each declared dependency is imported somewhere; a dev-only tool is a devDependency

#### OWASP-A03-009: No dependency update automation
- **Where**: `.github/` (there is no `dependabot.yml` and no Renovate config)
- **Check**: Some mechanism (Dependabot security updates at least) reports advisories on `pnpm-lock.yaml`

#### OWASP-A03-010: (planned) The contribution tool's dependency tree
- **Where**: the future Payload 3.x + Next.js + `@payloadcms/db-sqlite` application (`files/plans/contribution/payload-check.md`)
- **Check**: Its Next version sits inside Payload's supported peer range; it uses the catalogue's single React; advisories on Next and Payload are tracked
- **Note**: Verify peer ranges against `opensrc/` or npm on the web, not from memory

### Low

#### OWASP-A03-011: Dev tooling versions
- **Where**: root `package.json` devDependencies (husky, lint-staged, commitlint, turbo, prettier), `packages/eslint-plugin-eha/package.json`
- **Check**: No tooling more than one major behind; `packageManager` and the CI's pnpm version agree

#### OWASP-A03-012: No SBOM
- **Where**: `.github/workflows/build.yml`
- **Check**: Whether a bill of materials is produced for the deployed artefact (low value for a static site; note, do not block)
