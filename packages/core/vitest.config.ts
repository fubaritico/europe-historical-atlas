import { defineConfig } from 'vitest/config'

/**
 * Vitest config for `core` — the **node** environment, which is the contract made executable.
 *
 * This package has no DOM: it compiles against `WebWorker`, it is read by a worker, and ESLint forbids it a
 * renderer. Running its suites under jsdom would hand them a `document` the production code can never have, so
 * a module reaching for one would pass here and fail in the worker. Node is the honest environment, and the
 * cheapest guard against that drift.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts'],
    },
  },
})
