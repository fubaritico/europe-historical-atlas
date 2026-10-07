import { describe, expect, it } from 'vitest'

import { latitudeToVertical } from '@europe-historical-atlas/core/geo/mercator'

import { fitWhole } from './framing'
import {
  backdropToLonLat,
  lonLatToBackdrop,
  lonLatToScreen,
  projectAnchors,
  screenToLonLat,
} from './projection'
import { TEST_BACKDROP_FRAME } from './testFrame'

import type { BackdropFrame } from './projection'
import type { PixelSize, Viewport } from './viewport'

/**
 * The real backdrop, imported rather than re-declared — see `testFrame.ts`, which is also the only
 * place the numbers live and the only place a test checks them against the DEM's own metadata.
 */
const FRAME: BackdropFrame = TEST_BACKDROP_FRAME

/** The backdrop drawn at its own resolution, origin at the canvas origin. */
const NATIVE: Viewport = { scale: 1, originX: 0, originY: 0 }

/** A canvas, for the framing test. */
const CANVAS: PixelSize = { width: 1600, height: 900 }

describe('projection', () => {
  describe('happy path', () => {
    it('puts the frame’s western edge at column zero and its eastern at the last', () => {
      expect(lonLatToBackdrop([-45, 45], FRAME)[0]).toBeCloseTo(0, 9)
      expect(lonLatToBackdrop([78.75, 45], FRAME)[0]).toBeCloseTo(1280, 9)
    })

    it('puts the northern edge at row zero, matching the DEM’s row order', () => {
      expect(lonLatToBackdrop([0, FRAME.bounds.north], FRAME)[1]).toBeCloseTo(0, 6)
      expect(lonLatToBackdrop([0, FRAME.bounds.south], FRAME)[1]).toBeCloseTo(1164, 6)
    })

    it('round-trips a position through the backdrop', () => {
      const [lon, lat] = backdropToLonLat(lonLatToBackdrop([2.35, 48.85], FRAME), FRAME)

      expect(lon).toBeCloseTo(2.35, 9)
      expect(lat).toBeCloseTo(48.85, 9)
    })

    it('round-trips a position through the screen', () => {
      const view: Viewport = { scale: 0.37, originX: -120, originY: 64 }

      const [lon, lat] = screenToLonLat(lonLatToScreen([2.35, 48.85], FRAME, view), FRAME, view)

      expect(lon).toBeCloseTo(2.35, 9)
      expect(lat).toBeCloseTo(48.85, 9)
    })
  })

  describe('variants', () => {
    it('is linear in longitude, because Mercator’s x axis is', () => {
      const west = lonLatToBackdrop([-45, 45], FRAME)[0]
      const middle = lonLatToBackdrop([16.875, 45], FRAME)[0]
      const east = lonLatToBackdrop([78.75, 45], FRAME)[0]

      expect(middle - west).toBeCloseTo(east - middle, 6)
    })

    it('is NOT linear in latitude — the whole reason this module exists', () => {
      // Half way up the frame in degrees is not half way up in pixels: Mercator stretches the north.
      const mid = (FRAME.bounds.north + FRAME.bounds.south) / 2
      const byProportion =
        ((FRAME.bounds.north - mid) / (FRAME.bounds.north - FRAME.bounds.south)) * 1164

      const real = lonLatToBackdrop([0, mid], FRAME)[1]

      expect(byProportion).toBeCloseTo(582, 0)
      expect(real).toBeGreaterThan(byProportion + 40)
      expect(real).toBeCloseTo(latitudeToVertical(mid, FRAME.bounds) * 1164, 9)
    })

    it('follows the viewport: the same place moves when the view does', () => {
      const panned: Viewport = { scale: 1, originX: 200, originY: -50 }
      const [x, y] = lonLatToScreen([2.35, 48.85], FRAME, NATIVE)

      expect(lonLatToScreen([2.35, 48.85], FRAME, panned)).toEqual([x + 200, y - 50])
    })

    it('scales with the viewport', () => {
      const zoomed: Viewport = { scale: 2, originX: 0, originY: 0 }
      const [x, y] = lonLatToScreen([2.35, 48.85], FRAME, NATIVE)

      const [zx, zy] = lonLatToScreen([2.35, 48.85], FRAME, zoomed)

      expect(zx).toBeCloseTo(x * 2, 6)
      expect(zy).toBeCloseTo(y * 2, 6)
    })

    it('projects a whole table in order, parallel to the input', () => {
      const anchors: [number, number][] = [
        [0, 48],
        [2, 48],
        [2, 46],
      ]

      const screen = projectAnchors(anchors, FRAME, NATIVE)

      const [first, , third] = anchors
      if (first === undefined || third === undefined) throw new Error('the literal above has three')

      expect(screen).toHaveLength(3)
      expect(screen[0]).toEqual(lonLatToScreen(first, FRAME, NATIVE))
      expect(screen[2]).toEqual(lonLatToScreen(third, FRAME, NATIVE))
    })
  })

  describe('managed errors', () => {
    it('projects a position outside the frame rather than clamping it', () => {
      // The editorial zone is narrower than the render frame, but a reference may sit outside both.
      expect(lonLatToBackdrop([-80, 45], FRAME)[0]).toBeLessThan(0)
      expect(lonLatToBackdrop([120, 45], FRAME)[0]).toBeGreaterThan(1280)
    })

    it('projects an empty table to an empty table', () => {
      expect(projectAnchors([], FRAME, NATIVE)).toEqual([])
    })

    it('answers zero for a frame with no longitude span, as core’s own conversion does', () => {
      const flat: BackdropFrame = { ...FRAME, bounds: { ...FRAME.bounds, east: -45 } }

      expect(lonLatToBackdrop([0, 45], flat)[0]).toBe(0)
    })
  })

  describe('unmanaged errors', () => {
    // L4: N/A for async — nothing here awaits or catches. What follows is the non-finite case.
    it('carries a position that is not a position through, rather than inventing one', () => {
      expect(lonLatToBackdrop([Number.NaN, 45], FRAME)[0]).toBeNaN()
    })

    it('carries a viewport at scale zero through loudly', () => {
      const dead: Viewport = { scale: 0, originX: 0, originY: 0 }

      expect(Number.isFinite(screenToLonLat([10, 10], FRAME, dead)[0])).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('clamps nothing at the pole, which Mercator cannot reach', () => {
      // core/geo caps at ±85.05112878; beyond that the value saturates rather than diverging.
      expect(Number.isFinite(lonLatToBackdrop([0, 90], FRAME)[1])).toBe(true)
    })

    it('agrees with the framing: fitting the whole backdrop puts its corners on the canvas', () => {
      const view = fitWhole(CANVAS, FRAME.size, 20)

      const northWest = lonLatToScreen([FRAME.bounds.west, FRAME.bounds.north], FRAME, view)
      const southEast = lonLatToScreen([FRAME.bounds.east, FRAME.bounds.south], FRAME, view)

      expect(northWest[1]).toBeCloseTo(20, 6)
      expect(southEast[1]).toBeCloseTo(CANVAS.height - 20, 6)
      expect(northWest[0]).toBeGreaterThanOrEqual(20 - 1e-6)
      expect(southEast[0]).toBeLessThanOrEqual(CANVAS.width - 20 + 1e-6)
    })

    it('puts Paris inside the editorial zone, which is the sanity check that matters', () => {
      // The dev's own criterion: "ce qui serait gênant, c'est qu'une ville ne soit pas du bon côté".
      const [x, y] = lonLatToBackdrop([2.3522, 48.8566], FRAME)

      expect(x).toBeGreaterThan(0)
      expect(x).toBeLessThan(1280)
      expect(y).toBeGreaterThan(0)
      expect(y).toBeLessThan(1164)
      // West of centre, and a little BELOW the middle of the image — which is the non-obvious half and
      // the reason this test is here. Paris is roughly mid-way between 11.18°N and 76.84°N in degrees,
      // yet it lands at 0.60 down the picture, because Mercator compresses the south and stretches the
      // north. A projection done by proportion would put it at 0.43 and look plausible.
      expect(x / 1280).toBeCloseTo(0.383, 2)
      expect(y / 1164).toBeCloseTo(0.601, 2)
    })
  })
})
