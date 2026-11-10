// @vitest-environment node
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { FAVICON_PATH, faviconSvg } from './favicon'

// REPO-415: the atlas's and the Cartographer's tab show the CMS's mark — the committed file is core's drawing.
describe('favicon', () => {
  describe('happy path', () => {
    it('is the mark the CMS shows in its tab, as core draws it', () => {
      // Off: `pnpm --filter @europe-historical-atlas/atlas favicon` writes it again from core.
      expect(readFileSync(FAVICON_PATH, 'utf8')).toBe(faviconSvg())
    })
  })

  // L2–L5: N/A — one file compared with one drawing; the drawing's own cases are core's (brandMark.test.ts).
})
