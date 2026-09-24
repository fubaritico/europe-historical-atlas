import { defineConfig } from 'vitest/config'

/**
 * Vitest config — jsdom environment (DOM + Storage available for camera/store tests).
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['packages/*/src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // One run covers both packages, so one report: Sonar reads a single lcov instead of one per
      // package. `text` keeps the summary readable when the command is run by hand.
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/computeWorker.ts'],
    },
  },
})
