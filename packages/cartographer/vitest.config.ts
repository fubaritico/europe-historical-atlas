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
    // Vitest empties every stylesheet by default, `?raw` included — so a test reading a sheet as text
    // reads `''`, and a guard over it passes on nothing. Opened for our own sheets only.
    css: { include: [/src\/.*\.css/] },
    // WORKAROUND, remove with the design system's next release: `@fubaritico/react@0.2.0` emits relative
    // imports without `.js`, which Node's ESM loader refuses — and Vitest loads `node_modules` through
    // Node. Inlined, the package goes through Vite, which resolves them. See known-issues.md.
    server: { deps: { inline: [/@fubaritico/] } },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/*.test.{ts,tsx}'],
    },
  },
})
