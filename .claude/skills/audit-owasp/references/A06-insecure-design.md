# A06:2025 — Insecure Design

OWASP Top 10 #6 (was #4 in 2021). Flaws in the design itself, which no implementation can fix. Here: the boundaries the design draws — what is trusted, what is written, what is published — and the contribution tool that will open them.

## Checklist

### High

#### OWASP-A06-001: Every file the atlas reads is untrusted until parsed
- **Where**: `packages/core/src/data/yearFormat.ts` (zod `strictObject` schemas), `yearSource.ts`, `yearManifest.ts`, `yearConsistency.ts`, `heightmap.ts`, `landMask.ts`, `riverSource.ts`, `regionSource.ts`, `assetError.ts`
- **Check**: Every JSON payload goes through a schema before use (strict objects: an unknown key is an error); every binary payload's size is checked against its metadata before it is read; a failure becomes an `AssetError` with its kind, never a partial value

#### OWASP-A06-002: The dev server writes only what core reads back
- **Where**: `packages/cartographer/src/devServer/yearWritePlan.ts`, `yearWriteEndpoint.ts` (`writeAll`, two passes), `draftBody.ts` (`whyNotADraft`)
- **Check**: A year is written only after `planYearWrite` has checked it with core's own readers; files are written to `.tmp` then renamed, so an interrupted save leaves the previous year whole
- **Check**: A draft is deliberately not validated beyond its year (documented in `draftEndpoint.ts`) — confirm it is only ever read back by the editor and checked on reopening

#### OWASP-A06-003: Input bounds
- **Where**: `packages/cartographer/src/devServer/httpEndpoint.ts` (`MAX_BODY_BYTES`, 32 MB), the schemas in `packages/core/src/data/yearFormat.ts`, `packages/cartographer/src/wikidata/wikidataSource.ts` (`WIKIDATA_BATCH`)
- **Check**: The body cap applies before parsing; arrays and strings that drive a loop or an allocation (rings, anchors, ids) have a reasonable bound or a cost that is linear

#### OWASP-A06-004: (planned) Abuse limits on the hosted contribution tool
- **Where**: a hosted server (Payload/Next today's plan; Express or another Node service if one is added)
- **Check**: Rate limiting on login, password reset and every mutation; Payload's `maxLoginAttempts` / `lockTime` set on the auth collection
- **Check**: An upload (a source scan, a plate) has a size and type limit
- **Note**: Verify Payload's auth options against `opensrc/` or its docs on the web, not from memory

### Medium

#### OWASP-A06-005: Publication is a separate, reviewable step
- **Where**: `.gitignore` (years un-ignored one by one), `.github/workflows/build.yml` and `ci.yml` (deploy of the artefact the gate checked), `packages/cms/src/export/` (the export from the Payload database to static JSON)
- **Check**: Nothing a contributor types reaches the published site without passing the gate: the export writes files that are committed and built like any other, rather than being served live

#### OWASP-A06-006: Concurrent writers do not lose work silently
- **Where**: `packages/cartographer/src/devServer/yearWriteEndpoint.ts` (`If-Match` against `yearStamp`, 412), `packages/core/src/data/yearStamp.ts`
- **Check**: A save conditional on the opened fingerprint is refused when the disk changed; the comparison happens just before the write
- **Check**: (planned) The contribution tool keeps versions and an arbitration is signed with the others kept (DESIGN-262), so an edit never erases a competing claim

#### OWASP-A06-007: Separation of environments
- **Where**: `packages/cartographer/vite.config.ts` (`apply: 'serve'`), `import.meta.env.DEV` gates, `packages/atlas/public/` shared as the Cartographer's `publicDir`
- **Check**: Writing exists only in local development; the shared `public/` never receives drafts, snapshots or `.tmp` files that a build would publish

### Low

#### OWASP-A06-008: Account lifecycle
- **Where**: `packages/cms/src/collections/Users.ts` (the auth collection)
- **Check**: Lockout after failed attempts, email verification before contributing, a way to revoke a contributor

#### OWASP-A06-009: (planned) Abuse monitoring
- **Where**: a hosted server (Payload/Next today's plan; Express or another Node service if one is added)
- **Check**: Spikes of failed logins or mass edits are visible to the maintainer (see A09)
