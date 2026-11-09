import { describe, expect, it, vi } from 'vitest'

import {
  VASSAL_BAND_REACH_KM,
  VASSAL_BAND_SHARE,
  VASSAL_BAND_WIDTH_KM,
  vassalBandOpacity,
} from '@europe-historical-atlas/core/data/vassalBand'
import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'
import { signedDistanceField } from '@europe-historical-atlas/core/geo/signedDistance'

import { TEST_BACKDROP_FRAME } from '../../viewport/testFrame'

import { createGridProjection } from './tribeFeathers'
import { vassalBandPlans, vassalBandRaster } from './vassalBands'

import type { YearDocument } from '@europe-historical-atlas/core/data/yearDocument'
import type * as SignedDistance from '@europe-historical-atlas/core/geo/signedDistance'

/** Whether the signed distance answers `NaN` everywhere — a broken distance inside a box that is a number. */
const brokenDistance = vi.hoisted(() => ({ on: false }))

vi.mock('@europe-historical-atlas/core/geo/signedDistance', async (importOriginal) => {
  const actual = await importOriginal<typeof SignedDistance>()
  return {
    ...actual,
    signedDistanceField: (...args: Parameters<typeof actual.signedDistanceField>) =>
      brokenDistance.on ? () => Number.NaN : actual.signedDistanceField(...args),
  }
})

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
 * The plans of a document, over the test frame.
 * @param doc - the document
 * @param colours - the colours
 * @returns the plans
 */
const plansOf = (doc: YearDocument, colours = COLOURS): ReturnType<typeof vassalBandPlans> =>
  vassalBandPlans(doc, colours, TEST_BACKDROP_FRAME, createGridProjection(TEST_BACKDROP_FRAME))

/**
 * The share a raster's pixel holds.
 * @param raster - the raster
 * @param raster.pixels - its RGBA pixels
 * @param at - the pixel's index
 * @returns its alpha, `0..1`
 */
const alphaAt = (raster: { pixels: Uint8ClampedArray }, at: number): number =>
  (raster.pixels[4 * at + 3] ?? Number.NaN) / 255

describe('vassalBands', () => {
  describe('happy path', () => {
    it('plans one band per vassal claim, in its colour, none for the sovereign', () => {
      const plans = plansOf(withVassal())
      expect(plans.map((plan) => plan.polity)).toEqual(['hre'])
      expect(plans[0]?.signature.colour).toBe('#204060')
    })

    it('holds each pixel at core’s share of the signed distance at its centre — half near the outline, full deep', () => {
      const doc = withVassal()
      const [plan] = plansOf(doc)
      const raster = plan?.raster()
      if (!raster) throw new Error('test: a raster')
      const claim = doc.claims.find((each) => each.polity === 'hre')
      const projection = createGridProjection(TEST_BACKDROP_FRAME)
      const rings = (claim?.rings ?? []).map((ring) =>
        ring.flatMap((index) => {
          const point = projection.pointOf(index, doc.anchors[index])
          return point === undefined ? [] : [point]
        })
      )
      const distance = signedDistanceField(rings, TEST_BACKDROP_FRAME.bounds, VASSAL_BAND_REACH_KM)
      const { width: W, height: H } = TEST_BACKDROP_FRAME.size
      const shares = new Set<number>()
      for (let row = 0; row < raster.box.height; row++)
        for (let col = 0; col < raster.box.width; col++) {
          const km = distance((raster.box.x + col + 0.5) / W, (raster.box.y + row + 0.5) / H)
          const expected = Math.round(vassalBandOpacity(km, VASSAL_BAND_WIDTH_KM) * 255) / 255
          const share = alphaAt(raster, row * raster.box.width + col)
          expect(share).toBe(expected)
          shares.add(share)
        }
      // Both tones are there: a square of ~150 km has ground deeper than the band.
      expect([...shares].sort()).toEqual([Math.round(VASSAL_BAND_SHARE * 255) / 255, 1])
    })
  })

  describe('variants', () => {
    // Mutation: banding by the suzerain alone would band a vassal that is a tribe.
    it('plans no band for a vassal that is a tribe, nor for a year of sovereigns', () => {
      const doc = withVassal()
      const hre = doc.polities.find((polity) => polity.id === 'hre')
      if (hre) hre.rank = 'tribe'
      expect(plansOf(doc)).toEqual([])
      expect(plansOf(sharedBorderDocument())).toEqual([])
    })

    it('points each plan at the document’s own claim, which the scene matches its fill by', () => {
      const doc = withVassal()
      expect(plansOf(doc)[0]?.claim).toBe(doc.claims.find((claim) => claim.polity === 'hre'))
    })
  })

  describe('managed errors', () => {
    it('skips a vassal with no colour, as its fill is skipped', () => {
      expect(plansOf(withVassal(), new Map([['fr-couronne', '#aa0000']]))).toEqual([])
    })
  })

  describe('unmanaged errors', () => {
    // A NaN alpha would read as nought: the vassal's fill erased in silence.
    it('says a band that is not a number once, and draws none — the vassal is then filled whole', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const raster = vassalBandRaster(
        { id: 'x', name: 'X' },
        [
          [
            { u: Number.NaN, v: 0.5 },
            { u: 0.6, v: 0.5 },
            { u: 0.6, v: 0.6 },
          ],
        ],
        '#204060',
        TEST_BACKDROP_FRAME
      )
      expect(raster).toBeNull()
      expect(error).toHaveBeenCalledTimes(1)
      expect(String(error.mock.calls[0]?.[0])).toMatch(/band of the vassal "X"/)
      error.mockRestore()
    })

    // Mutation: without the guard per pixel, every pixel's alpha reads nought — the vassal erased, said nowhere.
    it('says a distance that is not a number once, inside a box that is one, and draws none', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      brokenDistance.on = true
      try {
        const raster = vassalBandRaster(
          { id: 'x', name: 'X' },
          [
            [
              { u: 0.5, v: 0.5 },
              { u: 0.6, v: 0.5 },
              { u: 0.6, v: 0.6 },
            ],
          ],
          '#204060',
          TEST_BACKDROP_FRAME
        )
        expect(raster).toBeNull()
        expect(error).toHaveBeenCalledTimes(1)
      } finally {
        brokenDistance.on = false
        error.mockRestore()
      }
    })
  })

  describe('edge cases', () => {
    it('gives rings with no point no raster', () => {
      expect(
        vassalBandRaster({ id: 'x', name: 'X' }, [[]], '#204060', TEST_BACKDROP_FRAME)
      ).toBeNull()
    })

    it('reaches one pixel past the outline on each side, held within the backdrop', () => {
      const raster = vassalBandRaster(
        { id: 'x', name: 'X' },
        [
          [
            { u: 0, v: 0 },
            { u: 0.01, v: 0 },
            { u: 0.01, v: 0.01 },
          ],
        ],
        '#204060',
        TEST_BACKDROP_FRAME
      )
      expect(raster?.box.x).toBe(0)
      expect(raster?.box.y).toBe(0)
    })

    it('holds the box within the backdrop on its far sides too', () => {
      const raster = vassalBandRaster(
        { id: 'x', name: 'X' },
        [
          [
            { u: 0.99, v: 0.99 },
            { u: 1, v: 0.99 },
            { u: 1, v: 1 },
          ],
        ],
        '#204060',
        TEST_BACKDROP_FRAME
      )
      const { width: W, height: H } = TEST_BACKDROP_FRAME.size
      expect((raster?.box.x ?? 0) + (raster?.box.width ?? 0)).toBe(W)
      expect((raster?.box.y ?? 0) + (raster?.box.height ?? 0)).toBe(H)
    })

    it('gives rings wholly past the backdrop no raster — a box with no pixel', () => {
      const raster = vassalBandRaster(
        { id: 'x', name: 'X' },
        [
          [
            { u: 1.5, v: 1.5 },
            { u: 1.6, v: 1.5 },
            { u: 1.6, v: 1.6 },
          ],
        ],
        '#204060',
        TEST_BACKDROP_FRAME
      )
      expect(raster).toBeNull()
    })
  })
})
