import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import { createYearsFolderOnDisk } from './src/devServer/yearsOnDisk'
import { YEAR_WRITE_ROUTE } from './src/devServer/yearWriteRoute'

import type { BodyStream, ResponseSink, YearsFolder } from './src/devServer/yearWriteEndpoint'
import type * as YearWriteEndpoint from './src/devServer/yearWriteEndpoint'
import type { Plugin, ViteDevServer } from 'vite'

/** The folder the atlas reads its years from — inside the shared `public/`. */
const YEARS_DIR = fileURLToPath(new URL('../atlas/public/years/', import.meta.url))

/** The years folder on the real disk: `node:fs` handed to the adapter, which holds the logic and its tests. */
const yearsOnDisk: YearsFolder = createYearsFolderOnDisk(YEARS_DIR, {
  readFile: (path) => readFileSync(path, 'utf8'),
  writeFile: (path, text) => {
    writeFileSync(path, text, 'utf8')
  },
  makeFolder: (path) => {
    mkdirSync(path, { recursive: true })
  },
  rename: (fromPath, toPath) => {
    renameSync(fromPath, toPath)
  },
})

/** The endpoint's module, as `ssrLoadModule` hands it back. */
type EndpointModule = typeof YearWriteEndpoint

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
async function loadYearWriteMiddleware(
  server: ViteDevServer
): Promise<(req: BodyStream, res: ResponseSink) => void> {
  const endpoint = (await server.ssrLoadModule(
    '/src/devServer/yearWriteEndpoint.ts'
  )) as EndpointModule
  return endpoint.createYearWriteMiddleware(yearsOnDisk)
}

/**
 * Save a year from the editor: `PUT /__years/<year>` writes into the atlas's `years/` folder.
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
      let middleware: Promise<(req: BodyStream, res: ResponseSink) => void> | null = null
      server.middlewares.use(YEAR_WRITE_ROUTE, (req, res) => {
        middleware ??= loadYearWriteMiddleware(server)
        middleware.then(
          (handle) => {
            handle(req, res)
          },
          (error: unknown) => {
            // Logged and answered, then forgotten, so the next save tries loading again.
            middleware = null
            console.error('[Cartographer dev server] the year endpoint could not be loaded', error)
            res.statusCode = 500
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ reason: 'the dev server could not load its save endpoint' }))
          }
        )
      })
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
