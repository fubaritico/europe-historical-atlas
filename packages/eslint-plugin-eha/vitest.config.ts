import { defineConfig } from 'vitest/config'

/**
 * Vitest config for the lint plugin — the **node** environment: ESLint runs in Node, never in a page.
 * The rules are JavaScript and their suites TypeScript, so coverage reads the `.js` files.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.js'],
    },
  },
})
