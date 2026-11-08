// @vitest-environment node
import { readFileSync, statSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

/**
 * A file of the atlas's public directory, the very file the site serves.
 * @param path - relative to `public/`
 * @returns its address
 */
const publicFile = (path: string): URL => new URL(`../public/${path}`, import.meta.url)

// ATLAS-333: the loading bar counts a download against the size its sidecar states (the dev, 2026-11-08: a size of
// ours, never the server's). A file regenerated without its size, or with a stale one, fails here rather than on the
// reader's bar. The generators write it: files/spikes/fetch-dem, files/spikes/fetch-land.
describe('the sidecars of the relief and the mask', () => {
  it.each(['heightmaps/europe-dem-z6-1920', 'heightmaps/europe-dem-z5', 'masks/europe-land'])(
    'state the very size of %s.bin',
    (base) => {
      const sidecar = JSON.parse(readFileSync(publicFile(`${base}.json`), 'utf8')) as {
        bytes?: number
      }
      expect(sidecar.bytes).toBe(statSync(publicFile(`${base}.bin`)).size)
    }
  )
})
