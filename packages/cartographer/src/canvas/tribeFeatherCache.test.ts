import { describe, expect, it, vi } from 'vitest'

import { moveAnchors } from '@europe-historical-atlas/core/editor/documentEdits'
import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'

import { TEST_BACKDROP_FRAME } from '../viewport/testFrame'

import { createTribeFeatherCache } from './tribeFeatherCache'

import type { RasterToImage } from './tribeFeatherCache'
import type { TribeFeather } from '@europe-historical-atlas/core/editor/tribeFeather'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

/** The Empire made a tribe, beside the kingdom of France. */
const withTribe = (): YearDocument => {
  const doc = sharedBorderDocument()
  const hre = doc.polities.find((polity) => polity.id === 'hre')
  if (hre) hre.rank = 'tribe'
  return doc
}

const COLOURS = new Map([
  ['fr-couronne', '#aa0000'],
  ['hre', '#41580b'],
])

/**
 * A cache whose images are stand-ins, counting how many it makes.
 * @param feather - the fade, inset at 30 km by default
 * @returns the cache and the counter
 */
function counting(feather: TribeFeather = { mode: 'inset', widthKm: 30 }): {
  cache: ReturnType<typeof createTribeFeatherCache>
  toImage: ReturnType<typeof vi.fn<RasterToImage>>
} {
  const toImage = vi.fn<RasterToImage>(() => ({}) as CanvasImageSource)
  const cache = createTribeFeatherCache(
    {
      frame: TEST_BACKDROP_FRAME,
      feather,
      land: { isLand: () => true },
    },
    toImage
  )
  return { cache, toImage }
}

describe('createTribeFeatherCache', () => {
  describe('happy path', () => {
    it('makes one image per tribe, over the box the raster covers', () => {
      const { cache, toImage } = counting()
      const [feather, ...rest] = cache.feathersOf(withTribe(), 1, COLOURS)
      expect(rest).toEqual([])
      expect(toImage).toHaveBeenCalledTimes(1)
      expect(feather?.box).toEqual(toImage.mock.calls[0]?.[0].box)
    })
  })

  describe('variants', () => {
    // A pan repaints on every pointer move at one version: the images must not be made again.
    it('hands back the same images, made once, for repaints at one version', () => {
      const { cache, toImage } = counting()
      const doc = withTribe()
      const first = cache.feathersOf(doc, 4, COLOURS)
      for (let repaint = 0; repaint < 10; repaint++)
        expect(cache.feathersOf(doc, 4, COLOURS)).toBe(first)
      expect(toImage).toHaveBeenCalledTimes(1)
    })

    // ARCH-002: an edit elsewhere must not measure every tribe again.
    it('reuses the image at a new version when the edit touched nothing the tribe reads', () => {
      const { cache, toImage } = counting()
      const doc = withTribe()
      const first = cache.feathersOf(doc, 4, COLOURS)
      // Anchor 0 is France's alone, its western corner.
      moveAnchors(doc, [{ index: 0, to: [-0.5, 48] }])
      expect(cache.feathersOf(doc, 5, COLOURS)).toBe(first)
      expect(toImage).toHaveBeenCalledTimes(1)
    })

    it('makes the image again when the tribe’s own outline moves', () => {
      const { cache, toImage } = counting()
      const doc = withTribe()
      const [first] = cache.feathersOf(doc, 4, COLOURS)
      // Anchor 4 is the Empire's alone.
      moveAnchors(doc, [{ index: 4, to: [4.5, 48] }])
      const [second] = cache.feathersOf(doc, 5, COLOURS)
      expect(second).not.toBe(first)
      expect(toImage).toHaveBeenCalledTimes(2)
    })

    it('makes the image again when the tribe is recoloured', () => {
      const { cache, toImage } = counting()
      const doc = withTribe()
      cache.feathersOf(doc, 4, COLOURS)
      cache.feathersOf(doc, 5, new Map([...COLOURS, ['hre', '#123456']]))
      expect(toImage).toHaveBeenCalledTimes(2)
      expect(toImage.mock.calls[1]?.[0].pixels.slice(0, 3)).toEqual(
        Uint8ClampedArray.from([0x12, 0x34, 0x56])
      )
    })

    it('makes the image again in outset when a neighbour’s outline near it moves', () => {
      const { cache, toImage } = counting({ mode: 'outset', widthKm: 30 })
      const doc = withTribe()
      cache.feathersOf(doc, 4, COLOURS)
      moveAnchors(doc, [{ index: 0, to: [-0.5, 48] }])
      cache.feathersOf(doc, 5, COLOURS)
      expect(toImage).toHaveBeenCalledTimes(2)
    })
  })

  describe('managed errors', () => {
    it('makes no image for a year without a tribe, and still answers from the cache after', () => {
      const { cache, toImage } = counting()
      const first = cache.feathersOf(sharedBorderDocument(), 0, COLOURS)
      expect(first).toEqual([])
      expect(cache.feathersOf(sharedBorderDocument(), 0, COLOURS)).toBe(first)
      expect(toImage).not.toHaveBeenCalled()
    })
  })

  describe('unmanaged errors', () => {
    it('lets a failing image maker throw, rather than drawing a tribe from nothing', () => {
      const cache = createTribeFeatherCache(
        {
          frame: TEST_BACKDROP_FRAME,
          feather: { mode: 'inset', widthKm: 30 },
          land: { isLand: () => true },
        },
        () => {
          throw new Error('no 2D context')
        }
      )
      expect(() => cache.feathersOf(withTribe(), 1, COLOURS)).toThrow(/2D context/)
    })
  })

  describe('edge cases', () => {
    // QUAL-006: a broken tribe is refused once, not again at every version it stays broken.
    it('says a broken tribe once across versions that leave it broken, and draws nothing for it', () => {
      const said = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { cache, toImage } = counting()
      const doc = withTribe()
      moveAnchors(doc, [{ index: 4, to: [Number.NaN, 48] }])
      expect(cache.feathersOf(doc, 1, COLOURS)).toEqual([])
      expect(cache.feathersOf(doc, 2, COLOURS)).toEqual([])
      expect(said).toHaveBeenCalledTimes(1)
      expect(toImage).not.toHaveBeenCalled()
      said.mockRestore()
    })

    it('misses on the first call even at version zero', () => {
      const { cache, toImage } = counting()
      cache.feathersOf(withTribe(), 0, COLOURS)
      expect(toImage).toHaveBeenCalledTimes(1)
    })
  })
})
