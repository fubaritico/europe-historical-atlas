import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

/**
 * Vitest config for the atlas — jsdom, and here the DOM is genuinely the subject.
 *
 * `CameraStateStore` persists through `sessionStorage`, `devPanel` builds a real lil-gui against the document,
 * and `ui/` is the interface over the canvas — React since ATLAS-519, the splash and the notices still plain DOM. Those suites are testing browser behaviour, so they need a browser's
 * objects. WebGL is not among them: the renderer is injected, so it is a mock in tests. The React plugin is declared here
 * as well as in `vite.config.ts`, which this file replaces rather than extends: without it a `.tsx` suite fails to parse
 * at its first tag (the Cartographer's lesson).
 *
 * `computeWorker.ts` is excluded from coverage rather than from the run: it is the worker's entry point, a few
 * lines of wiring around `serveCompute`, and it is `core` that owns and tests the compute itself.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // `bake/` is what the site's build computes ahead (ATLAS-333): its tests run in node, each file saying so.
    include: ['src/**/*.test.{ts,tsx}', 'bake/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.{ts,tsx}', 'bake/**/*.ts'],
      exclude: ['**/*.test.{ts,tsx}', '**/testing/**', '**/computeWorker.ts'],
    },
  },
})
