import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

/**
 * Vitest config for the Cartographer — jsdom, because its chrome is React and its canvas is a DOM element.
 *
 * The React plugin is declared here and not only in `vite.config.ts`: a `vitest.config.ts` **replaces**
 * `vite.config.ts` rather than extending it, so without this line a `.tsx` suite fails to parse at the first
 * tag.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/*.test.{ts,tsx}'],
    },
  },
})
