import { describe, expect, it, vi } from 'vitest'

import { moveAnchors } from '@europe-historical-atlas/core/editor/documentEdits'
import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'

import { TEST_BACKDROP_FRAME } from '../viewport/testFrame'

import { createVassalBandCache } from './vassalBandCache'

import type { RasterToImage } from './tribeFeatherCache'
import type { YearDocument } from '@europe-historical-atlas/core/data/yearDocument'

/** The Empire made a vassal of France. */
const withVassal = (): YearDocument => {
  const doc = sharedBorderDocument()
  const hre = doc.polities.find((polity) => polity.id === 'hre')
  if (hre) hre.suzerain = 'fr-couronne'
  return doc
}

const COLOURS = new Map([
  ['fr-couronne', '#aa0000'],
  ['hre', '#204060'],
])

/**
 * A cache whose images are stand-ins, counting how many it makes.
 * @returns the cache and the counter
 */
function counting(): {
  cache: ReturnType<typeof createVassalBandCache>
  toImage: ReturnType<typeof vi.fn<RasterToImage>>
} {
  const toImage = vi.fn<RasterToImage>(() => ({}) as CanvasImageSource)
  return { cache: createVassalBandCache(TEST_BACKDROP_FRAME, toImage), toImage }
}

describe('createVassalBandCache', () => {
  describe('happy path', () => {
    it('makes one image per vassal claim, by the claim it fills', () => {
      const { cache, toImage } = counting()
      const doc = withVassal()
      const bands = cache.bandsOf(doc, 1, COLOURS)
      const claim = doc.claims.find((each) => each.polity === 'hre')
      if (claim === undefined) throw new Error('test: the vassal’s claim')
      expect([...bands.keys()]).toEqual([claim])
      expect(bands.get(claim)?.box).toEqual(toImage.mock.calls[0]?.[0].box)
    })
  })

  describe('variants', () => {
    it('hands back the same map, made once, for repaints at one version', () => {
      const { cache, toImage } = counting()
      const doc = withVassal()
      const first = cache.bandsOf(doc, 4, COLOURS)
      for (let repaint = 0; repaint < 5; repaint++)
        expect(cache.bandsOf(doc, 4, COLOURS)).toBe(first)
      expect(toImage).toHaveBeenCalledTimes(1)
    })

    // An edit elsewhere must not measure the vassal again. Anchor 0 is France's alone.
    it('reuses the image when the edit touched nothing the vassal reads, and makes it again when it did', () => {
      const { cache, toImage } = counting()
      const doc = withVassal()
      const claim = doc.claims.find((each) => each.polity === 'hre')
      if (claim === undefined) throw new Error('test: the vassal’s claim')
      const first = cache.bandsOf(doc, 4, COLOURS).get(claim)
      moveAnchors(doc, [{ index: 0, to: [-0.5, 48] }])
      expect(cache.bandsOf(doc, 5, COLOURS).get(claim)).toBe(first)
      expect(toImage).toHaveBeenCalledTimes(1)
      // Anchor 4 is the Empire's eastern corner.
      moveAnchors(doc, [{ index: 4, to: [4.5, 48] }])
      expect(cache.bandsOf(doc, 6, COLOURS).get(claim)).not.toBe(first)
      expect(toImage).toHaveBeenCalledTimes(2)
    })

    it('makes the image again when the vassal’s colour changes', () => {
      const { cache, toImage } = counting()
      const doc = withVassal()
      cache.bandsOf(doc, 1, COLOURS)
      cache.bandsOf(doc, 2, new Map([...COLOURS, ['hre', '#aa0000']]))
      expect(toImage).toHaveBeenCalledTimes(2)
    })
  })

  describe('managed errors', () => {
    it('answers an empty map for a year with no vassal', () => {
      const { cache, toImage } = counting()
      expect(cache.bandsOf(sharedBorderDocument(), 1, COLOURS).size).toBe(0)
      expect(toImage).not.toHaveBeenCalled()
    })
  })

  describe('unmanaged errors', () => {
    it('lets an image maker that throws throw, and asks again at the same version', () => {
      const toImage = vi.fn<RasterToImage>(() => {
        throw new Error('no canvas')
      })
      const cache = createVassalBandCache(TEST_BACKDROP_FRAME, toImage)
      const doc = withVassal()
      expect(() => cache.bandsOf(doc, 1, COLOURS)).toThrow(/no canvas/)
      expect(() => cache.bandsOf(doc, 1, COLOURS)).toThrow(/no canvas/)
      expect(toImage).toHaveBeenCalledTimes(2)
    })
  })

  describe('edge cases', () => {
    it('drops the band of a vassal made sovereign again', () => {
      const { cache } = counting()
      const doc = withVassal()
      expect(cache.bandsOf(doc, 1, COLOURS).size).toBe(1)
      const hre = doc.polities.find((polity) => polity.id === 'hre')
      if (hre) hre.suzerain = null
      expect(cache.bandsOf(doc, 2, COLOURS).size).toBe(0)
    })
  })
})
