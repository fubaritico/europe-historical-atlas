# A08:2025 — Software and Data Integrity Failures

OWASP Top 10 #8. Code and data whose integrity is assumed rather than checked. Here: the year files the atlas trusts, the dev server's writes, the CI that builds and deploys, and the export the contribution tool will produce.

## Checklist

### High

#### OWASP-A08-001: Untrusted data is parsed, not assumed
- **Where**: `packages/core/src/data/yearFormat.ts`, `yearSource.ts`, `yearManifest.ts`, `yearConsistency.ts` (the atlas's readers); `packages/cartographer/src/devServer/yearWriteEndpoint.ts`, `draftBody.ts` (`JSON.parse` of request bodies); `packages/cartographer/src/wikidata/wikidataSource.ts` (`readBatchAnswer`), `wikidataFacts.ts` (`readEntity`)
- **Check**: Every `JSON.parse` / `response.json()` result is typed `unknown` and narrowed by a schema or a field-by-field reader before use; no `as` cast stands in for validation
- **Check**: The Wikidata answer is checked for `error` and `entities`, and an entity that does not read becomes `unknown`, never a half-filled fact

#### OWASP-A08-002: The deployed bytes are the checked bytes
- **Where**: `.github/workflows/ci.yml` (`deploy` downloads `atlas-${{ github.sha }}`), `build.yml` (worker-chunk and GPL guards, `upload-artifact`)
- **Check**: Deploy never rebuilds; it ships the artefact the build job asserted on; deploy runs only on `main` after `quality-gate` succeeds

#### OWASP-A08-003: CI pipeline integrity
- **Where**: `.github/workflows/*.yml`, `.github/actions/setup/action.yml`
- **Check**: No `pull_request_target`; untrusted text through `env:` only; third-party actions pinned (A03-003); no tool fetched at `@latest` with a secret (A03-002)

#### OWASP-A08-004: Atomic and consistent writes
- **Where**: `packages/cartographer/src/devServer/yearWriteEndpoint.ts` (`writeAll`), `draftEndpoint.ts` (`.tmp` then rename), `yearWritePlan.ts`
- **Check**: All files of a year go to `.tmp` before any rename, the manifest last; a year's three files are cross-checked by core before writing

### Medium

#### OWASP-A08-005: Local commit hooks are a convenience, CI is the gate
- **Where**: `.husky/pre-commit`, `.husky/commit-msg`, `.lintstagedrc.json`, `commitlint.config.js`, `.github/workflows/validate.yml`
- **Check**: Everything the hooks check is re-checked in CI (lint, type-check, test, `format:check`), since `--no-verify` skips the hooks

#### OWASP-A08-006: Integrity of the compute worker's messages
- **Where**: `packages/core/src/pipeline/computeServer.ts`, `workerCompute.ts`
- **Check**: The worker is same-origin and bundled; an unknown command `kind` throws in `computeServer.ts`; a message whose `id` matches no pending call is dropped in `workerCompute.ts` — confirm that silence is a decision (`rules/error-handling.md`), not an accident

#### OWASP-A08-007: (planned) Integrity of the export from the contribution database
- **Where**: the future export script from Payload's SQLite to static JSON (CMS-223)
- **Check**: The export's output goes through core's readers (the same schemas the atlas uses) before it is written into `public/`; a half-translated entry is reported (as `plan.md` P8 says), not shipped silently

### Low

#### OWASP-A08-008: Third-party resources loaded at run time
- **Where**: `packages/atlas/index.html`, `packages/cartographer/index.html`, `packages/cartographer/workbench.html`
- **Check**: No script or stylesheet from a CDN; if one is ever added, it carries Subresource Integrity

#### OWASP-A08-009: Content Security Policy against injected scripts
- **Where**: `packages/atlas/public/_headers`
- **Check**: A CSP without `'unsafe-inline'` / `'unsafe-eval'` for scripts (none today — see A02-002)

#### OWASP-A08-010: Provenance of the published data
- **Where**: `packages/atlas/public/years/*/polities.json` (`sources`, `yearProvenanceSchema` in `yearFormat.ts`, cross-checked in `yearConsistency.ts`), `files/plans/sources/`
- **Check**: Each published year declares its provenance; a source traced under a licence that forbids it never reaches `public/` (licence integrity, not only security)
