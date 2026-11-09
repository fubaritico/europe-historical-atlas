import { afterEach, describe, expect, it, vi } from 'vitest'

import { BAKED_OVERLAPS_VERSION } from '@europe-historical-atlas/core/pipeline/bakedOverlaps'

import { bakedOverlapsFor, sayStaleOverlaps } from './bakedOverlaps'

import type { BakedOverlaps } from '@europe-historical-atlas/core/pipeline/bakedOverlaps'

// ATLAS-399: the build's file handed to the settling — the names' rule, said in the console.

afterEach(() => {
  vi.restoreAllMocks()
})

/** A file the build wrote. */
const BAKED: BakedOverlaps = {
  version: BAKED_OVERLAPS_VERSION,
  key: 'k',
  overlaps: { pieces: [], refused: [] },
}

/**
 * A pipeline world whose baked overlaps answer as given.
 * @param load - what reading the file does
 * @returns the world
 */
function reading(load: () => Promise<BakedOverlaps | null>) {
  return { assets: { bakedOverlaps: { load } } } as unknown as Parameters<
    typeof bakedOverlapsFor
  >[0]
}

describe('bakedOverlapsFor', () => {
  describe('happy path', () => {
    it('hands the build’s file on, saying nothing', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const baked = await bakedOverlapsFor(
        reading(() => Promise.resolve(BAKED)),
        1100
      )
      expect([baked, warn.mock.calls.length]).toEqual([BAKED, 0])
    })
  })

  describe('variants', () => {
    it('hands none on when the site holds none — the dev server — and warns', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const baked = await bakedOverlapsFor(
        reading(() => Promise.resolve(null)),
        1100
      )
      expect([baked, String(warn.mock.calls[0]?.[0])]).toEqual([
        null,
        '[atlas] 1100: no overlaps computed at the build — computed here.',
      ])
    })
  })

  describe('managed errors', () => {
    it('hands none on when the file cannot be read, said as an error', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const baked = await bakedOverlapsFor(
        reading(() => Promise.reject(new Error('HTTP 500'))),
        1100
      )
      expect([baked, error.mock.calls.length]).toEqual([null, 1])
    })
  })

  // L4: N/A — every throw of the reading is the managed case above.
  // L5: N/A — one year, one file.
})

describe('sayStaleOverlaps', () => {
  describe('happy path', () => {
    it('warns when the build’s file was there and the settling computed them all the same', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      sayStaleOverlaps(1100, BAKED, { overlapsFrom: 'computed' })
      expect(String(warn.mock.calls[0]?.[0])).toBe(
        '[atlas] 1100: the overlaps computed at the build are for another version of the year — computed here.'
      )
    })
  })

  describe('variants', () => {
    it('says nothing when the settling took the build’s', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      sayStaleOverlaps(1100, BAKED, { overlapsFrom: 'build' })
      expect(warn).not.toHaveBeenCalled()
    })

    it('says nothing more when there was no file: that was said when it was read', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      sayStaleOverlaps(1100, null, { overlapsFrom: 'computed' })
      expect(warn).not.toHaveBeenCalled()
    })
  })

  // L3, L4, L5: N/A — a comparison and a warning.
})
