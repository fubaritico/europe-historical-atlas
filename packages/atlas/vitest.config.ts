import { defineConfig } from 'vitest/config'

/**
 * Vitest config for the atlas — jsdom, and here the DOM is genuinely the subject.
 *
 * `CameraStateStore` persists through `sessionStorage`, `devPanel` builds a real lil-gui against the document,
 * and `ui/` is plain DOM over the canvas. Those suites are testing browser behaviour, so they need a browser's
 * objects. WebGL is not among them: the renderer is injected, so it is a mock in tests.
 *
 * `computeWorker.ts` is excluded from coverage rather than from the run: it is the worker's entry point, a few
 * lines of wiring around `serveCompute`, and it is `core` that owns and tests the compute itself.
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/testing/**', '**/computeWorker.ts'],
    },
  },
})
