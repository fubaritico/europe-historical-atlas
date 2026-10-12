import { defineConfig } from 'vitest/config'

/**
 * Vitest config for the lint plugin — the **node** environment: ESLint runs in Node, never in a page.
 * The rules are JavaScript and their suites TypeScript, so coverage reads the `.js` files.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // The first typed case starts TypeScript's project service: 0.65 s alone, measured, and past the 5 s
    // default once the four packages' suites share the machine — it failed once that way, 2026-10-12.
    testTimeout: 20_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.js'],
    },
  },
})
