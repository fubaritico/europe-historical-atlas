# A10:2025 — Mishandling of Exceptional Conditions

OWASP Top 10 #10 (new in 2025). Failing open, swallowing errors, leaking internals, leaving state half-changed. In this project, error handling is a decision of the developer's, never an implementation detail (`rules/error-handling.md`): an auditor flags any undiscussed fallback, swallowed `catch` or `?? default` standing in for a value that failed to arrive.

## Checklist

### Critical

#### OWASP-A10-001: The dev server's lock fails closed
- **Where**: `packages/cartographer/src/devServer/httpEndpoint.ts` (`isSameMachineRequest`), `draftEndpoint.ts` (`isFromHere`)
- **Check**: A missing `Host` or `Origin` returns `false` (refused), never a pass; no `try/catch` around the check can turn an exception into acceptance

#### OWASP-A10-002: A failed write leaves the previous state whole and says so
- **Where**: `packages/cartographer/src/devServer/yearWriteEndpoint.ts` (`writeAll`), `draftEndpoint.ts`, `httpEndpoint.ts` (`respond`)
- **Check**: A disk error after some `.tmp` files are written leaves the year readable; the `catch` answers 500 and logs, it never continues as if saved
- **Check**: Stray `.tmp` files left by an interrupted save are ignored by readers and git (`**/public/years/*.tmp`)

#### OWASP-A10-003: (planned) The hosted tool fails closed
- **Where**: a hosted server (Payload/Next today's plan; Express or another Node service if one is added) — auth middleware, access functions
- **Check**: An exception while reading a session or evaluating an `access` function denies; no `catch { /* pass */ }` around authorization

### High

#### OWASP-A10-004: Internals do not leak into answers
- **Where**: `packages/cartographer/src/devServer/httpEndpoint.ts` (`diskCodeOf`), `vite.config.ts` (`mountEndpoint`'s 500), `packages/cartographer/src/ui/components/ErrorBoundary/`, `packages/atlas/src/ui/errorNet.ts`
- **Check**: The dev server answers a fixed sentence and Node's code; stacks and paths stay in the terminal
- **Check**: What the boundaries and the atlas's error net show on screen in a production build is a decision (showing raw error text "in development only" is pending with the dev)

#### OWASP-A10-005: Unhandled rejections
- **Where**: every `async` path — the readers in `packages/core/src/data/`, `packages/core/src/pipeline/workerCompute.ts`, `packages/cartographer/src/wikidata/wikidataSource.ts`, the Cartographer's save and draft calls
- **Check**: Every promise is awaited or has a rejection handler; the atlas's `errorNet.ts` listens to `unhandledrejection`; the Cartographer has no such net yet (A09-005)

#### OWASP-A10-006: Untrusted input fails loudly and typed
- **Where**: `packages/core/src/data/assetError.ts` (`transport | schema | consistency | semantic`), `yearSource.ts`, `packages/core/src/i18n/messageFormat.ts` (`MessageFormatError`)
- **Check**: A bad file becomes an `AssetError` of its kind and a notice (`packages/atlas/src/ui/notice.ts`); a declared degraded mode (the land-mask fallback) announces itself; a missing message value throws rather than rendering a hole

### Medium

#### OWASP-A10-007: Exhaustive handling of kinds
- **Where**: `switch` statements over a discriminated union — `packages/core/src/pipeline/computeServer.ts` (throws on an unknown command), the canvas tools and the endpoints' method dispatch
- **Check**: An unknown case throws or refuses with a log; none falls through to a plausible default

#### OWASP-A10-008: Swallowed `catch` blocks
- **Where**: every `catch {` and `catch (` in `packages/*/src` (e.g. `yearWriteEndpoint.ts` and `draftBody.ts` on `JSON.parse`, `yearsOnDisk.ts` on `ENOENT`, the `sessionStorage` stores in `packages/atlas/src/camera/cameraState.ts` and `controls/mapCameraStore.ts`)
- **Check**: Each one answers, rethrows or logs, and its choice is the documented one; `yearsOnDisk.ts` turns only `ENOENT` into `null` and rethrows the rest

#### OWASP-A10-009: Silent substitution of a broken value
- **Where**: all TypeScript under `packages/*/src`, in particular numeric paths (relief, projection, camera)
- **Check**: No `?? default`, `|| 0` or comparison that turns a `NaN` or a missing value into a plausible one (the `reliefWorldY` sea-level case recorded in `rules/error-handling.md` is the pattern to look for)

#### OWASP-A10-010: Resources released on failure
- **Where**: `packages/core/src/pipeline/workerCompute.ts` (`die`, pending calls rejected), the atlas's three.js teardown (`dispose()`), `packages/atlas/src/ui/errorNet.ts` (listener removal)
- **Check**: A worker that dies rejects every pending call; GPU resources and listeners are released on teardown and on error paths

### Low

#### OWASP-A10-011: Network calls without a timeout
- **Where**: `packages/cartographer/src/wikidata/wikidataSource.ts` (`deps.fetch`), the `fetch` calls in `packages/core/src/data/`
- **Check**: None passes an `AbortSignal` today; decide whether a hung Wikidata request needs a timeout and what the author sees when it fires

#### OWASP-A10-012: Partial operations in the CMS and its export
- **Where**: the Payload hooks of `packages/cms/src/collections/`, `packages/cms/src/export/`
- **Check**: A multi-document change runs in a transaction; the export writes to temporary files and renames, like `writeAll`, so a failed export never leaves `public/` half-updated
- **Note**: Verify Payload's transaction support on SQLite against `opensrc/` or its docs on the web, not from memory
