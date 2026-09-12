import { defineConfig } from 'vitest/config'

/**
 * Vitest config — jsdom environment (DOM + Storage available for camera/store tests).
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
})
