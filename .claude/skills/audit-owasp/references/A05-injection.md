# A05:2025 — Injection

OWASP Top 10 #5 (was #3 in 2021). Untrusted data sent to an interpreter as part of a command or query. Here the interpreters are the DOM, the file system behind the dev server, the regex engine and, later, the contribution tool's database.

## Checklist

### Critical

#### OWASP-A05-001: Path traversal in the dev server's file writes
- **Where**: `packages/cartographer/src/devServer/yearWritePlan.ts` (`YEAR_DIGITS`, `YEAR_SEGMENT`), `draftEndpoint.ts` (`DRAFT_PATH`), `snapshotEndpoint.ts` (`SNAPSHOT_PATH`, `takenAtOf`), `yearsOnDisk.ts` (joins with a plain `/`, no normalisation)
- **Check**: Every relative path handed to a disk folder is built from a year matched by `YEAR_DIGITS` and fixed names; a snapshot name read from the URL is accepted only once `takenAtOf` has matched it against the year prefix and the time pattern
- **Check**: Because `yearsOnDisk.ts` trusts its callers, any new route or verb validates its path segment the same way before touching the disk — `..`, `%2e%2e`, a backslash or an absolute path never reach `disk.*`

#### OWASP-A05-002: HTML injection into the DOM
- **Where**: `packages/atlas/src/ui/` (`notice.ts`, `errorNet.ts`, `splash.ts`, `progressOverlay.ts`), `packages/atlas/src/devPanel.ts` (lil-gui labels), `packages/cartographer/src/ui/`
- **Check**: No `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `dangerouslySetInnerHTML`, `eval` or `new Function`; overlays write with `textContent`
- **Check**: Text that comes from data — polity names from `years/*/registry.json`, Wikidata labels, error messages — is rendered as text (React children or `textContent`), never as markup

#### OWASP-A05-003: Command injection
- **Where**: `scripts/merge-coverage.mjs`, `.claude/skills/*/scripts/`, `.husky/`, `.github/workflows/*.yml`, any `child_process` use
- **Check**: No shell command is built from file contents, request data or a commit message; CI passes untrusted text (`github.event.head_commit.message`) through `env:`, as the deploy step does, never as `${{ }}` inside `run:`

### High

#### OWASP-A05-004: URL injection in links and attributes
- **Where**: `packages/cartographer/src/wikidata/wikidataFacts.ts` (article URL from a sitelink title), `packages/cartographer/src/ui/components/WikidataPanel/internal/FoundFacts.tsx` (`href`, `target="_blank"`, `rel="noreferrer"`)
- **Check**: An `href` built from data has a fixed `https://` scheme and host, and the data part is `encodeURIComponent`-ed; no `javascript:` reachable
- **Check**: Every `target="_blank"` keeps `rel="noreferrer"` (or `noopener`)

#### OWASP-A05-005: CSS injection from data
- **Where**: `packages/cartographer/src/ui/components/ToolRail/internal/SwatchPicker.tsx` (`style={{ background: polity.colour }}`), canvas `fillStyle` / `strokeStyle` in `packages/cartographer/src/canvas/paint/`, `packages/core/src/data/yearFormat.ts` (`hexColour`)
- **Check**: A colour read from a year file is held to `#rrggbb` by the schema before it reaches a style; no other data-driven string reaches a `style` or a CSS variable

#### OWASP-A05-006: Message-format injection
- **Where**: `packages/core/src/i18n/messageFormat.ts`, `catalogue.ts`, the apps' `i18n/` label files
- **Check**: Only catalogue entries are parsed as patterns; a value interpolated into a message (a name, a year) is substituted as text and never re-parsed as a pattern

#### OWASP-A05-007: (planned) SQL injection in the contribution tool and its export
- **Where**: the future Payload 3.x on `@payloadcms/db-sqlite` (Drizzle), the export script, a hosted server (Payload/Next today's plan; Express or another Node service if one is added)
- **Check**: Queries go through Payload's API or Drizzle's builders; no raw SQL built with template literals or concatenation; a `where` received from a request cannot choose operators or fields outside an allowlist
- **Note**: Verify how Payload passes `where` to Drizzle against `opensrc/` or its docs on the web, not from memory

### Medium

#### OWASP-A05-008: Regular expressions built from input (ReDoS)
- **Where**: every `new RegExp(` in `packages/*/src` — today `devServer/draftEndpoint.ts`, `snapshotEndpoint.ts`, `yearWritePlan.ts` (built from the constant `YEAR_DIGITS`) and `packages/cartographer/src/ui/styles/sheetRule.ts` (a test helper that escapes its selector)
- **Check**: None interpolates request or file data unescaped; patterns run on request paths are anchored and linear

#### OWASP-A05-009: Header injection
- **Where**: `packages/cartographer/src/devServer/httpEndpoint.ts` (`send`, `setHeader`)
- **Check**: Response headers are fixed (`content-type: application/json`); no request data is written into a header

#### OWASP-A05-010: Query parameters read by the apps
- **Where**: `packages/cartographer/src/ui/components/ErrorBoundary/utils/readZoneBreaks.ts` (`?break=`), `packages/cartographer/src/ui/workbench/utils/readHash.ts` (`location.hash`), `packages/cartographer/src/wikidata/wikidataSource.ts` (`URLSearchParams` for the outbound request)
- **Check**: A parameter is matched against a closed set of names before it has any effect; nothing read from the address bar reaches a fetch URL, a path or the DOM as markup

### Low

#### OWASP-A05-011: Log injection
- **Where**: `packages/cartographer/src/devServer/*.ts` (`console.warn` with the refused origin, method or path)
- **Check**: Request values logged to the dev server's terminal are interpolated as data (`String(...)`); a CR/LF in them cannot forge another log line that matters — low stakes on a local terminal
