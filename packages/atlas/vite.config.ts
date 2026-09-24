import { defineConfig } from 'vite'

/**
 * Vite config — vanilla TypeScript + three.js. HMR is on by default; the dev server opens the browser.
 *
 * `optimizeDeps.entries` is pinned to our own entry so Vite's dependency scanner does NOT crawl the
 * vendored three.js sources under `opensrc/` (its example `.html` files import many exotic packages that
 * aren't installed, which produced "could not be resolved" warnings). The watcher ignores them too.
 */
export default defineConfig({
  server: {
    open: true,
    watch: { ignored: ['**/opensrc/**', '**/files/**'] },
  },
  optimizeDeps: { entries: ['index.html'] },
})
