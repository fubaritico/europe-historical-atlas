import { describe, expect, it } from 'vitest'

import { lonLatToBackdrop } from './projection'
import { metresPerBackdropPixel } from './resolution'
import { TEST_BACKDROP_FRAME } from './testFrame'
import {
  MAX_SNAP_REACH_KM,
  closeEnoughToEdit,
  reachLabel,
  reachTenths,
  snapReachKm,
} from './toolReach'
import { UNFRAMED } from './viewport'

import type { Viewport } from './viewport'

/** A canvas the size of the dev's window at ×2, in screen pixels. */
const CANVAS = { width: 2600, height: 1400 }

/** The snap radius at ×2: `HANDLE_HIT_RADIUS` (8) times the pixel ratio. */
const RADIUS = 16

/**
 * A view at a scale, centred on a place.
 * @param scale - screen pixels per backdrop pixel
 * @param lonLat - the place at the centre of the canvas
 * @returns the viewport
 */
function viewCentredOn(scale: number, lonLat: [number, number]): Viewport {
  const [x, y] = lonLatToBackdrop(lonLat, TEST_BACKDROP_FRAME)
  return { scale, originX: CANVAS.width / 2 - x * scale, originY: CANVAS.height / 2 - y * scale }
}

/**
 * The reach expected at a scale and latitude, from the resolution module's own arithmetic.
 * @param scale - screen pixels per backdrop pixel
 * @param latitude - the latitude at the centre
 * @returns kilometres
 */
function expectedReach(scale: number, latitude: number): number {
  const metres = metresPerBackdropPixel(
    TEST_BACKDROP_FRAME.size,
    TEST_BACKDROP_FRAME.bounds,
    latitude
  )
  return (RADIUS * metres) / scale / 1000
}

describe('snapReachKm', () => {
  describe('happy path', () => {
    it('is the snap radius times the ground a screen pixel covers at the centre of the view', () => {
      const reach = snapReachKm(viewCentredOn(4, [2.35, 46.5]), CANVAS, TEST_BACKDROP_FRAME, RADIUS)

      expect(reach).toBeCloseTo(expectedReach(4, 46.5), 6)
    })
  })

  describe('variants', () => {
    it('halves when the zoom doubles', () => {
      const near = snapReachKm(viewCentredOn(8, [2.35, 46.5]), CANVAS, TEST_BACKDROP_FRAME, RADIUS)
      const far = snapReachKm(viewCentredOn(4, [2.35, 46.5]), CANVAS, TEST_BACKDROP_FRAME, RADIUS)

      expect(far / near).toBeCloseTo(2, 9)
    })

    it('is shorter further north at the same zoom, Mercator shrinking the ground per pixel', () => {
      const south = snapReachKm(viewCentredOn(4, [2.35, 40]), CANVAS, TEST_BACKDROP_FRAME, RADIUS)
      const north = snapReachKm(viewCentredOn(4, [2.35, 60]), CANVAS, TEST_BACKDROP_FRAME, RADIUS)

      expect(north).toBeLessThan(south)
    })

    it('doubles with the pixel ratio, the radius being eight CSS pixels on any screen', () => {
      const view = viewCentredOn(4, [2.35, 46.5])

      expect(snapReachKm(view, CANVAS, TEST_BACKDROP_FRAME, 16)).toBeCloseTo(
        2 * snapReachKm(view, CANVAS, TEST_BACKDROP_FRAME, 8),
        9
      )
    })
  })

  describe('managed errors', () => {
    it('is infinite for a view not framed yet, so nothing can be drawn before the canvas has a box', () => {
      expect(snapReachKm(UNFRAMED, CANVAS, TEST_BACKDROP_FRAME, RADIUS)).toBe(Infinity)
    })
  })

  describe('unmanaged errors', () => {
    it('reads the latitude at the edge when the centre is over the vellum, rather than extrapolating', () => {
      // Panned far north, the centre is above the backdrop; the latitude used is the frame's north edge.
      const view = viewCentredOn(4, [2.35, 76.84081641443098])
      const beyond = { ...view, originY: view.originY + 10_000 }

      expect(snapReachKm(beyond, CANVAS, TEST_BACKDROP_FRAME, RADIUS)).toBeCloseTo(
        expectedReach(4, TEST_BACKDROP_FRAME.bounds.north),
        6
      )
    })
  })

  describe('edge cases', () => {
    it('measures the reach at the opening view of the continent well beyond the threshold', () => {
      // Roughly the scale at which the whole map is covered in the dev's window.
      const reach = snapReachKm(viewCentredOn(1.1, [10, 50]), CANVAS, TEST_BACKDROP_FRAME, RADIUS)

      expect(reach).toBeGreaterThan(MAX_SNAP_REACH_KM)
    })
  })
})

describe('closeEnoughToEdit', () => {
  it('lets the tools act at the threshold and refuses them a hair beyond', () => {
    expect(closeEnoughToEdit(MAX_SNAP_REACH_KM, MAX_SNAP_REACH_KM)).toBe(true)
    expect(closeEnoughToEdit(MAX_SNAP_REACH_KM + 0.001, MAX_SNAP_REACH_KM)).toBe(false)
  })

  it('refuses an unframed view and a reach that is not a number, rather than letting them act', () => {
    expect(closeEnoughToEdit(Infinity, MAX_SNAP_REACH_KM)).toBe(false)
    expect(closeEnoughToEdit(Number.NaN, MAX_SNAP_REACH_KM)).toBe(false)
  })
})

describe('reachLabel', () => {
  describe('happy path', () => {
    it('writes kilometres to one decimal', () => {
      expect(reachLabel(37.42)).toBe('37.5 km')
    })
  })

  describe('variants', () => {
    it('keeps a whole reach whole, to one decimal', () => {
      expect(reachLabel(12)).toBe('12.0 km')
    })
  })

  // L3: N/A — a label; whether the reach is refused is closeEnoughToEdit's.

  // L4: N/A — the one caller writes a label only for a finite reach (`refuseFromAfar`).

  describe('edge cases', () => {
    // Seen on 2026-10-13: "would reach 10 km; the tools act within 10 km", at 10.2 km.
    it('never writes a reach just past the limit as the limit itself', () => {
      expect(reachLabel(10.02)).toBe('10.1 km')
      expect(reachLabel(10.2)).toBe('10.2 km')
    })
  })
})

describe('reachTenths', () => {
  it('rounds a reach up to the tenth, the figure the label writes', () => {
    expect(reachTenths(10.02)).toBe(10.1)
    expect(reachTenths(12)).toBe(12)
  })

  // L2–L5: N/A — one rounding, whose edges `reachLabel`'s suite already walks.
})
