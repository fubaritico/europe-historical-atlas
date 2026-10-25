import { defineConfig } from 'vitest/config'

/**
 * Vitest config for the contribution tool — **node**: what is tested here is the export, data in and data out,
 * which runs in a Node script and never in a page.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts', 'src/app/**', 'src/payload-types.ts'],
    },
  },
})
