import { mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import { DRAFT_ROUTE, DRAFTS_FOLDER, SNAPSHOTS_FOLDER } from './src/devServer/draftRoute'
import { createDraftFolderOnDisk, createYearsFolderOnDisk } from './src/devServer/yearsOnDisk'
import { YEAR_WRITE_ROUTE } from './src/devServer/yearWriteRoute'

import type { DraftFolder } from './src/devServer/draftEndpoint'
import type * as DraftEndpoint from './src/devServer/draftEndpoint'
import type { BodyStream, ResponseSink } from './src/devServer/httpEndpoint'
import type { YearFolder } from './src/devServer/diskFolder'
import type * as YearWriteEndpoint from './src/devServer/yearWriteEndpoint'
import type { Plugin, ViteDevServer } from 'vite'

/** The folder the atlas reads its years from — inside the shared `public/`. */
const YEARS_DIR = fileURLToPath(new URL('../atlas/public/years/', import.meta.url))

/**
 * Where the drafts are kept (CARTO-238) — **outside `public/`**, which the dev server serves and every build
 * publishes, and git-ignored (`.autosave` in `.gitignore`): a draft is the work since the last ‹ctrl+S›, on this machine.
 */
const DRAFTS_DIR = fileURLToPath(new URL(`../../${DRAFTS_FOLDER}/`, import.meta.url))

/** Where the hourly snapshots are kept (CARTO-238, rung 2a) — beside the drafts, git-ignored with them. */
const SNAPSHOTS_DIR = fileURLToPath(new URL(`../../${SNAPSHOTS_FOLDER}/`, import.meta.url))

/** `node:fs`'s synchronous calls, handed to the adapters, which hold the logic and its tests. */
const disk = {
  readFile: (path: string) => readFileSync(path, 'utf8'),
  writeFile: (path: string, text: string) => {
    writeFileSync(path, text, 'utf8')
  },
  makeFolder: (path: string) => {
    mkdirSync(path, { recursive: true })
  },
  rename: (fromPath: string, toPath: string) => {
    renameSync(fromPath, toPath)
  },
  removeFile: (path: string) => {
    rmSync(path)
  },
  modifiedAt: (path: string) => statSync(path).mtimeMs,
}

/** The years folder on the real disk. */
const yearsOnDisk: YearFolder = createYearsFolderOnDisk(YEARS_DIR, disk)

/** The drafts folder on the real disk. */
const draftsOnDisk: DraftFolder = createDraftFolderOnDisk(DRAFTS_DIR, disk)

/** The snapshots folder on the real disk. */
const snapshotsOnDisk: YearFolder = createYearsFolderOnDisk(SNAPSHOTS_DIR, disk)

/** The endpoints' modules, as `ssrLoadModule` hands them back. */
type YearEndpointModule = typeof YearWriteEndpoint
type DraftEndpointModule = typeof DraftEndpoint

/** A Connect middleware, as the endpoints build them. */
type Middleware = (req: BodyStream, res: ResponseSink) => void

/**
 * Load the endpoint through the dev server itself, once.
 *
 * **Why not a plain `import` at the top of this file.** Vite bundles its config with every bare import left
 * external, so `@europe-historical-atlas/core` would be handed to Node as raw `.ts` — which Node 22.14
 * refuses (`ERR_UNKNOWN_FILE_EXTENSION`), breaking both the build and every restart of the dev server.
 * Found by the gate on 2026-10-12. `ssrLoadModule` goes through Vite's own pipeline instead: it transforms
 * TypeScript, and it does not externalise a linked workspace package, `core` resolving to its sources.
 * @param server - the dev server
 * @returns the endpoint's middleware, built on the real disk
 */
async function loadYearWriteMiddleware(server: ViteDevServer): Promise<Middleware> {
  const endpoint = (await server.ssrLoadModule(
    '/src/devServer/yearWriteEndpoint.ts'
  )) as YearEndpointModule
  return endpoint.createYearWriteMiddleware(yearsOnDisk)
}

/**
 * Load the draft endpoint the same way, for the same reason.
 * @param server - the dev server
 * @returns the endpoint's middleware, built on the real disk and the real clock
 */
async function loadDraftMiddleware(server: ViteDevServer): Promise<Middleware> {
  const endpoint = (await server.ssrLoadModule(
    '/src/devServer/draftEndpoint.ts'
  )) as DraftEndpointModule
  return endpoint.createDraftMiddleware(draftsOnDisk, snapshotsOnDisk, () => new Date())
}

/**
 * Mount an endpoint on a route, loading it at its first request rather than at start-up: a failure to load
 * answers that request with a 500 and the reason, instead of stopping the whole server, and is forgotten so
 * the next request tries again.
 * @param server - the dev server
 * @param route - where to mount it
 * @param load - how to build its middleware
 * @param what - what the endpoint is, for the log
 */
function mountEndpoint(
  server: ViteDevServer,
  route: string,
  load: (server: ViteDevServer) => Promise<Middleware>,
  what: string
): void {
  let middleware: Promise<Middleware> | null = null
  server.middlewares.use(route, (req, res) => {
    middleware ??= load(server)
    middleware.then(
      (handle) => {
        handle(req, res)
      },
      (error: unknown) => {
        middleware = null
        console.error(`[Cartographer dev server] the ${what} endpoint could not be loaded`, error)
        res.statusCode = 500
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify({ reason: `the dev server could not load its ${what} endpoint` }))
      }
    )
  })
}

/**
 * Save a year from the editor: `PUT /__years/<year>` writes into the atlas's `years/` folder; and keep its
 * draft between two saves: `/__drafts/<year>` (`draftEndpoint.ts`, CARTO-238).
 *
 * `apply: 'serve'` — the dev server only. The built site has no server to write with, and saving online is
 * a later tier (`s15`). Authorised by the dev on 2026-10-12, with the checks the endpoint carries.
 *
 * The endpoint is loaded at the first save rather than at start-up, and a failure to load it answers that
 * save with a 500 and the reason — the editor says *not saved* — instead of stopping the whole server.
 * @returns the plugin
 */
function saveYearsFromTheEditor(): Plugin {
  return {
    name: 'cartographer-save-years',
    apply: 'serve',
    configureServer(server) {
      mountEndpoint(server, YEAR_WRITE_ROUTE, loadYearWriteMiddleware, 'save')
      mountEndpoint(server, DRAFT_ROUTE, loadDraftMiddleware, 'draft')
    },
  }
}

/**
 * The Cartographer's Vite configuration.
 *
 * **`publicDir` points at the atlas's own `public/`, and that is a wiring decision rather than a
 * shortcut.** The editor needs the DEM (2.98 MB), the land mask (2.9 MB) and the rivers to bake the same
 * backdrop the atlas renders — and the backdrop has to be *the atlas's* texture, byte for byte, because
 * that is the only thing on this canvas georeferenced by construction. Serving the same directory is what
 * makes "the same" true by construction too: Vite serves it in dev and copies it into `dist` at build, so
 * nothing is duplicated and nothing can drift. The alternative measured on 2026-10-06 was copying ~6 MB
 * into this package — two committed copies of one asset, with no check that they agree.
 *
 * **It is also what makes a saved year readable at once**: the editor saves into `public/years/`, and both
 * applications read it back from there, with nothing moved by hand.
 *
 * **What it widens, and the remedy that travels with it.** `packages/atlas/public/borders/` holds the 21
 * GPL-3.0 payloads. They are git-ignored, so they never reach a CI checkout and this cannot publish them —
 * the earlier claim that it would was wrong. What it does do is give a *second* `dist/` the same exposure
 * the atlas's has, while `build.yml`'s guard only watched the atlas's. That guard now walks every
 * package's `dist`, which is the one line this change owes.
 *
 * It also retires the favicon that was committed twice on 2026-10-05: there is one `public/` now, so there
 * is one favicon, and the drift this repository recorded as cosmetic cannot happen.
 */
export default defineConfig({
  plugins: [react(), saveYearsFromTheEditor()],
  publicDir: '../atlas/public',
})
