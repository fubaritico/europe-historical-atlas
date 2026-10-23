# A01:2025 — Broken Access Control

OWASP Top 10 #1. Users acting outside their intended permissions. Here there is no user and no production server: the one door today is the Cartographer's Vite dev server, which writes to disk; accounts arrive with the contribution tool (planned).

## Checklist

### Critical

#### OWASP-A01-001: Dev-server endpoints answer only a page this machine served
- **Where**: `packages/cartographer/src/devServer/httpEndpoint.ts` (`isSameMachineRequest`, `LOOPBACK_HOST`), `yearWriteEndpoint.ts`, `draftEndpoint.ts` (`isFromHere`), `snapshotEndpoint.ts`
- **Check**: Every writing method (`PUT`, `POST`, `DELETE`) requires a loopback `Host` **and** an `Origin` equal to `http://<that host>` — the pair that shuts out another site and a DNS-rebound name
- **Check**: A `GET` (which a browser sends without `Origin`) still requires a loopback `Host`, and no `Access-Control-Allow-*` header is set anywhere under `devServer/`, so another site cannot read the answer
- **Check**: Every new route mounted in `vite.config.ts` goes through the same lock before it touches the disk — no handler reads or writes before the origin check

#### OWASP-A01-002: The writing dev server never leaves the loopback interface or the dev mode
- **Where**: `packages/cartographer/vite.config.ts` (`saveYearsFromTheEditor`, `apply: 'serve'`), `packages/cartographer/package.json` (`dev` script)
- **Check**: No `server.host`, `--host` or `0.0.0.0`: on a LAN interface, a non-browser client forges `Host` and `Origin` at will and the lock of A01-001 no longer holds
- **Check**: The plugin keeps `apply: 'serve'`, so no build output carries a writing endpoint

#### OWASP-A01-003: (planned) Access rules on every Payload collection
- **Where**: the future Payload 3.x application (`files/plans/contribution/payload-check.md`, `files/plans/plan.md` P7)
- **Check**: Every collection and global declares `access` for `read`, `create`, `update`, `delete`; none relies on the default
- **Check**: In 3.x the Local API bypasses access control unless `overrideAccess: false` is passed (4.0 changes the default, per `payload-check.md`): any Next route, server action or hook that calls it on behalf of a request passes the user and `overrideAccess: false`; only the export script runs with full access
- **Note**: Verify the 3.x default against `opensrc/` or the Payload docs on the web, not from memory

### High

#### OWASP-A01-004: Drafts and snapshots are never served or published
- **Where**: `packages/cartographer/src/devServer/draftRoute.ts` (`DRAFTS_FOLDER`, `SNAPSHOTS_FOLDER`), `packages/cartographer/vite.config.ts` (`publicDir`), `.gitignore` (`**/.autosave/`)
- **Check**: Both folders stay outside `packages/atlas/public/` (which the dev server serves and every build copies) and stay git-ignored

#### OWASP-A01-005: Only the data meant to ship reaches the published site
- **Where**: `.gitignore` (`**/public/years/*/` with its `!` exceptions, `public/borders/`), `.github/workflows/build.yml` (the GPL guard), `.github/workflows/ci.yml` (`deploy`)
- **Check**: A year is published only by an explicit un-ignore line; the borders guard walks every `packages/*/dist`; the deploy uploads the atlas artefact alone, never the Cartographer's `dist`

#### OWASP-A01-006: Outbound requests go only where the code says
- **Where**: `packages/cartographer/src/wikidata/wikidataSource.ts` (`WIKIDATA_ENDPOINT`, `WIKIDATA_ID`, `requestUrl`), the readers in `packages/core/src/data/` (`yearSource.ts`, `yearManifest.ts`, `heightmap.ts`, `landMask.ts`, `riverSource.ts`, `regionSource.ts`)
- **Check**: The Wikidata endpoint is a constant; ids are filtered by `WIKIDATA_ID` before the URL is built, and parameters go through `URLSearchParams`
- **Check**: The atlas's asset paths are built from code constants and the manifest's years; no value read from a file or the address bar can turn a fetch into an absolute or other-origin URL

#### OWASP-A01-007: (planned) Object-level and field-level authorization in the contribution tool
- **Where**: the future Payload collections, and a hosted server (Payload/Next today's plan; Express or another Node service if one is added)
- **Check**: A contributor reads and edits only what their role allows (own drafts vs. published entries); a reviewer role signs an arbitration
- **Check**: System fields (author, status, published flag, timestamps) carry field-level `access.update` so a request body cannot set them
- **Check**: Every route of a hosted server sits behind the auth middleware; a `:id` route checks the record against the caller, not only its existence

### Medium

#### OWASP-A01-008: Development switches stay out of the reader's reach
- **Where**: `packages/cartographer/src/main.tsx` (`?break=` through `import.meta.env.DEV`), `packages/cartographer/src/ui/components/ErrorBoundary/utils/readZoneBreaks.ts`, `packages/atlas/src/main.ts` + `devPanel.ts` (lil-gui and Stats, created in every build)
- **Check**: `?break=` is read only under `import.meta.env.DEV` and is absent from the built bundle
- **Check**: The atlas's dev panel only tunes render parameters in memory — it fetches nothing, writes nothing, and exposes no path or URL input

#### OWASP-A01-009: (planned) Cross-origin and redirect rules of the hosted contribution tool
- **Where**: the future `payload.config.ts` (`cors`, `csrf`, `serverURL`), the login flow
- **Check**: `cors` and `csrf` list explicit origins, never `*`; the post-login redirect accepts only same-origin relative paths

### Low

#### OWASP-A01-010: A refusal does not reveal more than it must
- **Where**: `packages/cartographer/src/devServer/httpEndpoint.ts` (`respond`, `diskCodeOf`), each endpoint's `refuse`
- **Check**: The page gets a fixed sentence and Node's error code; absolute paths and stacks go to the server terminal only

#### OWASP-A01-011: (planned) The static export publishes only what is published
- **Where**: the future export script from Payload's database to static JSON (CONTRIB-223)
- **Check**: Draft, unreviewed or deleted entries and contributor identities are filtered out before writing into `public/`
