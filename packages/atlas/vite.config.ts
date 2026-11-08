import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite'

import { namesBake } from './bake/namesBake'

/**
 * A path in the atlas's package.
 * @param path - relative to this file
 * @returns the absolute path
 */
const here = (path: string): string => fileURLToPath(new URL(path, import.meta.url))

/**
 * Vite config — vanilla TypeScript + three.js. HMR is on by default; the dev server opens the browser.
 *
 * `optimizeDeps.entries` is pinned to our own entry so Vite's dependency scanner does NOT crawl the
 * vendored three.js sources under `opensrc/` (its example `.html` files import many exotic packages that
 * aren't installed, which produced "could not be resolved" warnings). The watcher ignores them too.
 *
 * At build only, the countries' names of every year are placed ahead of the visit (`bake/namesBake.ts`, ATLAS-333).
 */
export default defineConfig({
  server: {
    open: true,
    watch: { ignored: ['**/opensrc/**', '**/files/**'] },
  },
  optimizeDeps: { entries: ['index.html'] },
  plugins: [
    namesBake({
      publicDir: here('./public'),
      face: here('./src/scene/political/names/face/fondamento.woff2'),
      heightmapMeta: here('./public/heightmaps/europe-dem-z6-1920.json'),
    }),
  ],
})
