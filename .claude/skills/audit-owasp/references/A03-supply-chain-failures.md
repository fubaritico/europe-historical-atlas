# A03:2025 — Software Supply Chain Failures

OWASP Top 10 #3 (expands A06:2021 "Vulnerable & Outdated Components"). Highest exploit score
of any 2025 category (8.17). Covers the full lifecycle: sourcing, building, distributing,
and deploying third-party components.

## Checklist

### Critical

#### OWASP-A03-001: Dependencies with known critical CVEs
- **Where**: All `package.json` files, `pnpm-lock.yaml`
- **Check**: Run `pnpm audit` — any critical severity findings
- **Check**: Direct dependencies with known RCE, auth bypass, or data leak CVEs
- **Note**: Report the output of `pnpm audit --audit-level critical`

### High

#### OWASP-A03-002: Severely outdated framework versions
- **Where**: Root and workspace `package.json` files
- **Check**: Core frameworks not more than 2 major versions behind
- **Check**: Security-critical packages (express, supabase, expo) on supported versions
- **Frameworks**: React, React Native, Expo SDK, Express, Supabase client

#### OWASP-A03-003: Unmaintained dependencies
- **Where**: All `package.json` files
- **Check**: No dependencies that are archived, deprecated, or unmaintained (>2 years no release)
- **Check**: No packages with published security advisories and no fix available

#### OWASP-A03-004: Dependencies with high CVEs
- **Where**: All `package.json` files
- **Check**: Run `pnpm audit` — any high severity findings
- **Check**: Known vulnerabilities in transitive dependencies

#### OWASP-A03-005: Unhardened CI/CD pipeline
- **Where**: `.github/workflows/`, build scripts
- **Check**: GitHub Actions pinned by commit SHA, not tag (`actions/checkout@<sha>` not `@v4`)
- **Check**: No secrets in workflow files
- **Check**: No arbitrary code execution from PR comments
- **Check**: Separate read/write tokens per pipeline stage
- **Note**: If no CI/CD configured yet, note as informational

### Medium

#### OWASP-A03-006: Missing lockfile integrity
- **Where**: `pnpm-lock.yaml`
- **Check**: Lockfile exists and is committed
- **Check**: No `resolutions` or `overrides` that mask vulnerability warnings

#### OWASP-A03-007: Unused dependencies increasing attack surface
- **Where**: All `package.json` files
- **Check**: No obviously unused packages (installed but never imported)
- **Check**: Dev dependencies not accidentally in `dependencies`

#### OWASP-A03-008: Missing Expo SDK alignment
- **Where**: `apps/mobile-expo/package.json`
- **Check**: All Expo packages aligned to current SDK version
- **Check**: Run `npx expo install --check` mentally (verify version compatibility)

#### OWASP-A03-009: Untrusted package sources
- **Where**: `.npmrc`, package installation config
- **Check**: No dependencies from unknown/untrusted registries
- **Check**: `.npmrc` doesn't point to unexpected registries
- **Check**: No typosquatted package names (verify against official npm registry)

### Low

#### OWASP-A03-010: Outdated dev tooling
- **Where**: Root `package.json` devDependencies
- **Check**: Linters, formatters, build tools reasonably current
- **Note**: Low security risk but can indicate unmaintained project hygiene

#### OWASP-A03-011: Pinned versions without update strategy
- **Where**: `package.json`, pnpm catalog
- **Check**: Dependencies use range operators (`^`, `~`) for security patches
- **Check**: Or alternatively, Dependabot/Renovate configured for updates
- **Note**: Informational — no active exploit risk

#### OWASP-A03-012: Missing SBOM (Software Bill of Materials)
- **Where**: Build/deployment pipeline
- **Check**: SBOM generated as CI artifact for production builds
- **Note**: Informational for this project stage — becoming a compliance requirement
