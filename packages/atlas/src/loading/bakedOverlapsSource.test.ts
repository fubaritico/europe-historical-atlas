import { describe, expect, it, vi } from 'vitest'

import { BAKED_OVERLAPS_VERSION } from '@europe-historical-atlas/core/pipeline/bakedOverlaps'

import { createFetchBakedOverlapsSource } from './bakedOverlapsSource'

import type { BakedOverlaps } from '@europe-historical-atlas/core/pipeline/bakedOverlaps'

// ATLAS-399: the overlaps the build computed, read by the page — none is the dev server's normal case. The transport's
// answers (404, the dev server's page, a failed request) are the shared reader's, covered by bakedNamesSource.test.ts.

const JSON_TYPE = { 'content-type': 'application/json' }

/**
 * A transport answering one response.
 * @param body - the body
 * @param init - its status and headers
 * @returns the transport, as a spy
 */
function answering(body: string, init: ResponseInit) {
  return vi.fn(() => Promise.resolve(new Response(body, init)))
}

describe('createFetchBakedOverlapsSource', () => {
  describe('happy path', () => {
    it('reads 1100’s baked overlaps from its folder', async () => {
      const baked: BakedOverlaps = {
        version: BAKED_OVERLAPS_VERSION,
        key: 'k',
        overlaps: { pieces: [], refused: [] },
      }
      const fetchFile = answering(JSON.stringify(baked), { status: 200, headers: JSON_TYPE })
      const read = await createFetchBakedOverlapsSource('/years', fetchFile).load(1100)
      expect([fetchFile.mock.calls[0], read?.key]).toEqual([
        ['/years/1100/overlaps.json'],
        baked.key,
      ])
    })
  })

  describe('variants', () => {
    it('answers none when the site holds no file for the year', async () => {
      const source = createFetchBakedOverlapsSource('/years', answering('', { status: 404 }))
      expect(await source.load(1200)).toBeNull()
    })
  })

  describe('managed errors', () => {
    it('throws on a file that is not baked overlaps, naming it', async () => {
      const source = createFetchBakedOverlapsSource(
        '/years',
        answering('{"version":1}', { status: 200, headers: JSON_TYPE })
      )
      await expect(source.load(1100)).rejects.toThrow(/\/years\/1100\/overlaps\.json/)
    })
  })

  // L4, L5: the shared reader's (bakedFile), through bakedNamesSource.test.ts.
})
