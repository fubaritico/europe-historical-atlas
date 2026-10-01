import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

/**
 * Unmounts whatever a test rendered, after every test.
 *
 * `@testing-library/react` would do this by itself, but only on a condition this repository does not meet:
 * read in its source, it registers its own hook `if (typeof afterEach === 'function')` — that is, only when
 * the runner's hooks are **globals**. Every config here imports `describe`/`it`/`expect` explicitly instead,
 * so the hook is never found and nothing is ever unmounted.
 *
 * What that costs if left out is not a crash but a lie: renders pile up in the same document, and a query for
 * a role finds the previous test's element as well as this one's. The failure reads as an ambiguous selector,
 * which points at the query rather than at the leak.
 *
 * Declared here rather than by switching `globals: true` on, so that one package out of three does not end up
 * with twenty ambient symbols the other two do not have.
 */
afterEach(() => {
  cleanup()
})
