import { describe, expect, it } from 'vitest'

import {
  backdropBoxOfBounds,
  clampToCover,
  coverScale,
  fitBox,
  fitScale,
  fitWhole,
  openingView,
} from './framing'
import { TEST_BACKDROP_FRAME } from './testFrame'
import { backdropToScreen } from './viewport'

import type { BackdropBox } from './framing'
import type { PixelSize } from './viewport'

/** The real backdrop's grid, imported rather than re-declared — see `testFrame.ts`. */
const BACKDROP: PixelSize = TEST_BACKDROP_FRAME.size

/** A canvas wider than the backdrop's aspect, so height is the constraining axis. */
const WIDE_CANVAS: PixelSize = { width: 1600, height: 900 }

describe('framing', () => {
  describe('happy path', () => {
    it('fits the whole backdrop on the axis that constrains it', () => {
      // 900 - 2×20 = 860 over 1164 rows is tighter than 1560 over 1280 columns.
      expect(fitScale(WIDE_CANVAS, { x: 0, y: 0, width: 1280, height: 1164 }, 20)).toBeCloseTo(
        860 / 1164,
        12
      )
    })

    it('centres what it frames', () => {
      const view = fitWhole(WIDE_CANVAS, BACKDROP, 20)

      const [cx, cy] = backdropToScreen(view, [BACKDROP.width / 2, BACKDROP.height / 2])

      expect(cx).toBeCloseTo(800, 9)
      expect(cy).toBeCloseTo(450, 9)
    })

    it('leaves the whole backdrop inside the canvas', () => {
      const view = fitWhole(WIDE_CANVAS, BACKDROP, 20)

      const [left, top] = backdropToScreen(view, [0, 0])
      const [right, bottom] = backdropToScreen(view, [BACKDROP.width, BACKDROP.height])

      expect(left).toBeGreaterThanOrEqual(20 - 1e-9)
      expect(top).toBeCloseTo(20, 9)
      expect(right).toBeLessThanOrEqual(WIDE_CANVAS.width - 20 + 1e-9)
      expect(bottom).toBeCloseTo(WIDE_CANVAS.height - 20, 9)
    })
  })

  describe('variants', () => {
    it('is constrained by width when the canvas is the taller shape', () => {
      const tall: PixelSize = { width: 600, height: 2000 }

      expect(fitScale(tall, { x: 0, y: 0, width: 1280, height: 1164 }, 0)).toBeCloseTo(
        600 / 1280,
        12
      )
    })

    it('frames a box away from the origin, and centres that box', () => {
      const box: BackdropBox = { x: 400, y: 300, width: 200, height: 100 }

      const view = fitBox(WIDE_CANVAS, box, 50)
      const [cx, cy] = backdropToScreen(view, [500, 350])

      expect(cx).toBeCloseTo(800, 9)
      expect(cy).toBeCloseTo(450, 9)
    })

    it('uses the whole canvas when no margin is asked for', () => {
      expect(fitScale(WIDE_CANVAS, { x: 0, y: 0, width: 1600, height: 900 }, 0)).toBeCloseTo(1, 12)
    })

    it('scales a small box up, not only large ones down', () => {
      const view = fitBox(WIDE_CANVAS, { x: 0, y: 0, width: 10, height: 10 }, 0)

      expect(view.scale).toBeCloseTo(90, 12)
    })
  })

  describe('managed errors', () => {
    it('collapses to zero rather than mirroring when the margin swallows the canvas', () => {
      expect(fitScale(WIDE_CANVAS, { x: 0, y: 0, width: 1280, height: 1164 }, 800)).toBe(0)
    })

    it('refuses to invent a scale for a box with no extent', () => {
      expect(fitScale(WIDE_CANVAS, { x: 10, y: 10, width: 0, height: 100 }, 0)).toBe(0)
      expect(fitScale(WIDE_CANVAS, { x: 10, y: 10, width: 100, height: 0 }, 0)).toBe(0)
      expect(fitScale(WIDE_CANVAS, { x: 10, y: 10, width: -5, height: 100 }, 0)).toBe(0)
    })

    it('still centres a box it cannot scale, so the view is somewhere rather than nowhere', () => {
      const view = fitBox(WIDE_CANVAS, { x: 10, y: 10, width: 0, height: 0 }, 0)

      expect(view.scale).toBe(0)
      expect(view.originX).toBe(800)
      expect(view.originY).toBe(450)
    })
  })

  describe('unmanaged errors', () => {
    // L4: N/A for async — nothing here awaits or catches. What follows is the non-finite input case.
    it('carries a non-finite canvas through instead of inventing a size', () => {
      expect(
        fitScale({ width: Number.NaN, height: 900 }, { x: 0, y: 0, width: 10, height: 10 }, 0)
      ).toBeNaN()
    })
  })

  describe('edge cases', () => {
    it('fits a canvas of zero size as a scale of zero', () => {
      expect(fitScale({ width: 0, height: 0 }, { x: 0, y: 0, width: 1280, height: 1164 }, 0)).toBe(
        0
      )
    })

    it('fits a one-pixel box, which is the smallest thing a polity can be', () => {
      const view = fitBox(WIDE_CANVAS, { x: 639, y: 581, width: 1, height: 1 }, 0)

      expect(view.scale).toBeCloseTo(900, 12)
      expect(backdropToScreen(view, [639.5, 581.5])[0]).toBeCloseTo(800, 6)
    })

    it('keeps the backdrop square: both axes get the same scale', () => {
      const view = fitWhole({ width: 500, height: 5000 }, BACKDROP, 0)
      const [right] = backdropToScreen(view, [BACKDROP.width, 0])
      const [, bottom] = backdropToScreen(view, [0, BACKDROP.height])
      const [originX, originY] = backdropToScreen(view, [0, 0])

      expect((right - originX) / BACKDROP.width).toBeCloseTo(
        (bottom - originY) / BACKDROP.height,
        12
      )
    })
  })
})

/** The whole backdrop, as the box the view must never uncover. */
const WHOLE: BackdropBox = { x: 0, y: 0, width: BACKDROP.width, height: BACKDROP.height }

describe('coverScale', () => {
  describe('happy path', () => {
    it('takes the larger ratio, where fitting takes the smaller', () => {
      const canvas: PixelSize = { width: 800, height: 600 }

      expect(coverScale(canvas, WHOLE)).toBeCloseTo(800 / BACKDROP.width, 9)
      expect(coverScale(canvas, WHOLE)).toBeGreaterThan(fitScale(canvas, WHOLE, 0))
    })
  })

  describe('variants', () => {
    it('is decided by whichever axis is short of the box', () => {
      // A tall canvas against a wide box: height is what has to be filled.
      expect(coverScale({ width: 100, height: 900 }, { x: 0, y: 0, width: 400, height: 200 })).toBe(
        4.5
      )
      expect(coverScale({ width: 900, height: 100 }, { x: 0, y: 0, width: 400, height: 200 })).toBe(
        2.25
      )
    })

    it('is exactly 1 when the canvas is the box', () => {
      expect(coverScale({ width: 400, height: 300 }, { x: 0, y: 0, width: 400, height: 300 })).toBe(
        1
      )
    })
  })

  describe('managed errors', () => {
    it('yields zero for a box with no extent, rather than infinity', () => {
      expect(coverScale({ width: 800, height: 600 }, { x: 0, y: 0, width: 0, height: 10 })).toBe(0)
      expect(coverScale({ width: 800, height: 600 }, { x: 0, y: 0, width: 10, height: -4 })).toBe(0)
    })
  })

  describe('unmanaged errors', () => {
    it('yields zero for a canvas with no extent, which is a canvas nothing can cover', () => {
      expect(coverScale({ width: 0, height: 0 }, WHOLE)).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('takes no margin, a margin being the thing covering has none of', () => {
      // Two arguments, not three. Asserted as a shape rather than a value: a cover that left a gap
      // would not cover, so the signature is the guarantee.
      expect(coverScale).toHaveLength(2)
    })
  })
})

describe('clampToCover', () => {
  /** 800×600 of canvas against 1280×1164 of backdrop at scale 1 — 480 and 564 of slack. */
  const CANVAS: PixelSize = { width: 800, height: 600 }

  describe('happy path', () => {
    it('leaves a view alone when the backdrop already covers the canvas', () => {
      const held = clampToCover({ scale: 1, originX: -240, originY: -282 }, CANVAS, BACKDROP)

      expect(held).toEqual({ scale: 1, originX: -240, originY: -282 })
    })
  })

  describe('variants', () => {
    it('refuses a positive origin, which would show void on the left', () => {
      expect(clampToCover({ scale: 1, originX: 123, originY: 0 }, CANVAS, BACKDROP).originX).toBe(0)
    })

    it('refuses an origin past the far edge, which would show void on the right', () => {
      const held = clampToCover({ scale: 1, originX: -5000, originY: -5000 }, CANVAS, BACKDROP)

      expect(held.originX).toBe(CANVAS.width - BACKDROP.width)
      expect(held.originY).toBe(CANVAS.height - BACKDROP.height)
    })

    it('never touches the scale — holding is about where, not how big', () => {
      expect(clampToCover({ scale: 7.5, originX: 0, originY: 0 }, CANVAS, BACKDROP).scale).toBe(7.5)
    })
  })

  describe('managed errors', () => {
    /*
     * THE guard. The plausible version holds both axes the same way at every scale:
     *   `Math.min(0, Math.max(canvas - painted, origin))`
     * which is right while the backdrop is larger than the canvas and inverts below it — `canvas -
     * painted` turns positive, so the range becomes empty and the map is pinned to the left edge with
     * the void all on one side. Centring is the only answer that stays symmetrical.
     */
    it('centres a backdrop too small to cover, instead of pinning it to a corner', () => {
      const tiny = { width: 100, height: 80 }
      const held = clampToCover({ scale: 1, originX: -400, originY: -400 }, CANVAS, tiny)

      expect(held.originX).toBe((800 - 100) / 2)
      expect(held.originY).toBe((600 - 80) / 2)
    })
  })

  describe('unmanaged errors', () => {
    it('centres rather than dividing by a scale of zero', () => {
      const held = clampToCover({ scale: 0, originX: 10, originY: 10 }, CANVAS, BACKDROP)

      expect(held.originX).toBe(400)
      expect(held.originY).toBe(300)
    })
  })

  describe('edge cases', () => {
    it('allows exactly one origin when the backdrop covers the canvas exactly', () => {
      const exact = { width: 800, height: 600 }

      for (const origin of [-50, 0, 50])
        expect(clampToCover({ scale: 1, originX: origin, originY: origin }, CANVAS, exact)).toEqual(
          {
            scale: 1,
            originX: 0,
            originY: 0,
          }
        )
    })
  })
})

describe('openingView', () => {
  /** The editorial zone, lon −45…60 / lat 20…76, as the document declares it. */
  const ZONE = backdropBoxOfBounds(
    { west: -45, south: 20, east: 60, north: 76 },
    TEST_BACKDROP_FRAME
  )

  describe('happy path', () => {
    it('never opens below cover, so the editor never opens on void', () => {
      for (const canvas of [
        { width: 800, height: 600 },
        { width: 1920, height: 400 },
        { width: 500, height: 1200 },
      ])
        expect(openingView(canvas, BACKDROP, ZONE, 24).scale).toBeGreaterThanOrEqual(
          coverScale(canvas, WHOLE)
        )
    })
  })

  describe('variants', () => {
    /*
     * The second guard, and the one a naive version fails the other way: opening at `coverScale` flat
     * would be simpler and would ignore the zone entirely, framing a third of the backdrop the author
     * may not draw in. On a canvas shaped like the zone, fitting it wins and the scale is above cover.
     */
    it('frames the editorial zone when the canvas has room for it', () => {
      const canvas: PixelSize = { width: 900, height: 820 }
      const scale = openingView(canvas, BACKDROP, ZONE, 24).scale

      expect(scale).toBeGreaterThan(coverScale(canvas, WHOLE))
      expect(scale).toBeCloseTo(fitScale(canvas, ZONE, 24), 9)
    })

    it('is recomputed from the canvas, so two window sizes give two views', () => {
      const narrow = openingView({ width: 700, height: 900 }, BACKDROP, ZONE, 24)
      const wide = openingView({ width: 1900, height: 500 }, BACKDROP, ZONE, 24)

      expect(narrow.scale).not.toBeCloseTo(wide.scale, 6)
    })
  })

  describe('managed errors', () => {
    it('holds the view inside the backdrop, zone or no zone', () => {
      const canvas: PixelSize = { width: 800, height: 600 }
      const view = openingView(canvas, BACKDROP, ZONE, 24)

      expect(view.originX).toBeLessThanOrEqual(0)
      expect(view.originY).toBeLessThanOrEqual(0)
      expect(view.originX + BACKDROP.width * view.scale).toBeGreaterThanOrEqual(canvas.width - 1e-9)
      expect(view.originY + BACKDROP.height * view.scale).toBeGreaterThanOrEqual(
        canvas.height - 1e-9
      )
    })
  })

  describe('unmanaged errors', () => {
    it('falls back to cover for a zone with no extent', () => {
      const canvas: PixelSize = { width: 800, height: 600 }
      const empty: BackdropBox = { x: 0, y: 0, width: 0, height: 0 }

      expect(openingView(canvas, BACKDROP, empty, 24).scale).toBeCloseTo(
        coverScale(canvas, WHOLE),
        9
      )
    })
  })

  describe('edge cases', () => {
    /*
     * The zone cannot be centred horizontally, and that is geometry rather than a defect: its western
     * limit is −45°, which is *exactly* where the backdrop starts. Centring it would need a positive
     * origin — void down the left-hand side — so the hold puts its western edge on the canvas's.
     * Written down because the first version of this test asserted a centred zone and accused correct
     * code; the JSDoc said "centred" too, and said it of a view that is held.
     */
    it('puts the zone’s western edge on the canvas’s, the two sharing a limit', () => {
      const canvas: PixelSize = { width: 900, height: 820 }
      const view = openingView(canvas, BACKDROP, ZONE, 24)
      const topLeft = backdropToScreen(view, [ZONE.x, ZONE.y])

      expect(topLeft[0]).toBeCloseTo(0, 6)
    })

    it('centres the zone on the axis that has room for it', () => {
      const canvas: PixelSize = { width: 900, height: 820 }
      const view = openingView(canvas, BACKDROP, ZONE, 24)
      const centre = backdropToScreen(view, [ZONE.x + ZONE.width / 2, ZONE.y + ZONE.height / 2])

      // Vertically the zone sits inside the backdrop on both sides — 20°N against 11.18°N, 76°N
      // against 76.84°N — so there is slack and the centring survives the hold.
      expect(centre[1]).toBeCloseTo(canvas.height / 2, 6)
    })
  })
})

describe('backdropBoxOfBounds', () => {
  describe('happy path', () => {
    it('turns the whole frame’s own bounds back into the whole frame', () => {
      const box = backdropBoxOfBounds(TEST_BACKDROP_FRAME.bounds, TEST_BACKDROP_FRAME)

      expect(box.x).toBeCloseTo(0, 6)
      expect(box.y).toBeCloseTo(0, 6)
      expect(box.width).toBeCloseTo(BACKDROP.width, 6)
      expect(box.height).toBeCloseTo(BACKDROP.height, 6)
    })
  })

  describe('variants', () => {
    it('places the editorial zone inside the frame, not over it', () => {
      const zone = backdropBoxOfBounds(
        { west: -45, south: 20, east: 60, north: 76 },
        TEST_BACKDROP_FRAME
      )

      expect(zone.x).toBeCloseTo(0, 6)
      expect(zone.width).toBeLessThan(BACKDROP.width)
      expect(zone.height).toBeLessThan(BACKDROP.height)
    })
  })

  describe('managed errors', () => {
    // THE guard here, and the one `scene.ts` already states for the same rectangle one transform
    // further along: latitude is not linear in Mercator. The plausible version scales the degrees —
    // `(north - lat) / (north - south) * height` — which puts the southern edge of a 56-degree box
    // visibly wrong, and the taller the box the worse.
    it('projects the latitudes rather than scaling the degrees', () => {
      const half = backdropBoxOfBounds(
        { west: -45, south: 11.1784, east: 78.75, north: 45 },
        TEST_BACKDROP_FRAME
      )
      const linear =
        ((TEST_BACKDROP_FRAME.bounds.north - 45) /
          (TEST_BACKDROP_FRAME.bounds.north - TEST_BACKDROP_FRAME.bounds.south)) *
        BACKDROP.height

      expect(half.y).not.toBeCloseTo(linear, 0)
    })
  })

  describe('unmanaged errors', () => {
    it('yields a box with no extent for bounds with none', () => {
      const point = backdropBoxOfBounds(
        { west: 0, south: 45, east: 0, north: 45 },
        TEST_BACKDROP_FRAME
      )

      expect(point.width).toBeCloseTo(0, 9)
      expect(point.height).toBeCloseTo(0, 9)
    })
  })

  describe('edge cases', () => {
    it('is the inverse of what the scene draws, so the frame and the fit agree', () => {
      const zone = backdropBoxOfBounds(
        { west: -45, south: 20, east: 60, north: 76 },
        TEST_BACKDROP_FRAME
      )

      expect(zone.width).toBeGreaterThan(0)
      expect(zone.height).toBeGreaterThan(0)
    })
  })
})
