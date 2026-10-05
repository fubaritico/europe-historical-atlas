import { describe, expect, it } from 'vitest'

import { RENDER_FRAME } from './backdropFrame'
import { fitBox, fitScale, fitWhole } from './framing'
import { backdropToScreen } from './viewport'

import type { BackdropBox } from './framing'
import type { PixelSize } from './viewport'

/** The real backdrop's grid, imported rather than re-declared — see `backdropFrame.ts`. */
const BACKDROP: PixelSize = RENDER_FRAME.size

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
