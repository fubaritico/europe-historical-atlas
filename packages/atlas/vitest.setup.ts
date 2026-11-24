import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

/**
 * Unmounts whatever a test rendered, after every test (ATLAS-519, when React came to the atlas).
 *
 * `@testing-library/react` registers this hook by itself only when the runner's hooks are globals, and every config
 * here imports `describe`/`it`/`expect` explicitly — so without this file renders pile up in the same document, and a
 * query finds the previous test's element as well as this one's (the Cartographer's `vitest.setup.ts`, same reason).
 */
afterEach(() => {
  cleanup()
})
