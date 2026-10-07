import { describe, expect, it } from 'vitest'

import { boundsOf, boxesOverlap, detailThresholdSquared, visibleBox } from './culling'

import type { Viewport } from './viewport'

/** A view that shows the backdrop at its own resolution, origin at the canvas corner. */
const NATIVE: Viewport = { scale: 1, originX: 0, originY: 0 }

describe('visibleBox', () => {
  describe('happy path', () => {
    it('is the canvas, in backdrop pixels, at native scale', () => {
      expect(visibleBox(NATIVE, { width: 800, height: 600 })).toEqual({
        left: 0,
        top: 0,
        right: 800,
        bottom: 600,
      })
    })
  })

  describe('variants', () => {
    it('shows half as much ground at twice the scale', () => {
      const box = visibleBox({ scale: 2, originX: 0, originY: 0 }, { width: 800, height: 600 })

      expect(box.right).toBe(400)
      expect(box.bottom).toBe(300)
    })

    it('follows the origin, so panning moves the window rather than resizing it', () => {
      const box = visibleBox({ scale: 1, originX: -100, originY: -50 }, { width: 800, height: 600 })

      expect(box.left).toBe(100)
      expect(box.right).toBe(900)
      // The window keeps its size: a pan is a translation, not a zoom.
      expect(box.right - box.left).toBe(800)
      expect(box.bottom - box.top).toBe(600)
    })

    it('reaches into negative backdrop coordinates when the map is dragged right', () => {
      // Beyond the backdrop's own edge is a legitimate place to be — the vellum shows there.
      expect(
        visibleBox({ scale: 1, originX: 200, originY: 0 }, { width: 800, height: 600 }).left
      ).toBe(-200)
    })
  })

  // L3/L4/L5: N/A — four divisions. A zero scale cannot arrive (the viewport clamps, and the painter
  // refuses one anyway), and there is no branch to drive into an error.
})

describe('boxesOverlap', () => {
  describe('happy path', () => {
    it('sees two boxes that cross', () => {
      const a = { left: 0, top: 0, right: 10, bottom: 10 }
      const b = { left: 5, top: 5, right: 15, bottom: 15 }

      expect(boxesOverlap(a, b)).toBe(true)
    })

    it('sees one box inside another', () => {
      const outer = { left: 0, top: 0, right: 100, bottom: 100 }
      const inner = { left: 40, top: 40, right: 50, bottom: 50 }

      expect(boxesOverlap(outer, inner)).toBe(true)
      expect(boxesOverlap(inner, outer)).toBe(true)
    })
  })

  describe('variants', () => {
    it.each([
      ['to the right', { left: 20, top: 0, right: 30, bottom: 10 }],
      ['to the left', { left: -30, top: 0, right: -20, bottom: 10 }],
      ['below', { left: 0, top: 20, right: 10, bottom: 30 }],
      ['above', { left: 0, top: -30, right: 10, bottom: -20 }],
    ])('rejects a box %s', (_where, other) => {
      // All four, because an overlap test that forgets one axis passes most cases: the one it drops
      // only shows as contours vanishing on one side of the screen.
      expect(boxesOverlap({ left: 0, top: 0, right: 10, bottom: 10 }, other)).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('counts a shared edge as overlapping', () => {
      const a = { left: 0, top: 0, right: 10, bottom: 10 }
      const b = { left: 10, top: 0, right: 20, bottom: 10 }

      // The safe side: a contour exactly on the edge still has a stroke width, so half of it shows.
      expect(boxesOverlap(a, b)).toBe(true)
    })

    it('handles a box of zero size — a single point', () => {
      const point = { left: 5, top: 5, right: 5, bottom: 5 }

      expect(boxesOverlap({ left: 0, top: 0, right: 10, bottom: 10 }, point)).toBe(true)
    })
  })
})

describe('boundsOf', () => {
  describe('happy path', () => {
    it('wraps every point', () => {
      expect(
        boundsOf([
          [3, 7],
          [-1, 2],
          [5, 4],
        ])
      ).toEqual({ left: -1, top: 2, right: 5, bottom: 7 })
    })
  })

  describe('variants', () => {
    it('does not confuse the two axes', () => {
      expect(boundsOf([[1, 100]])).toEqual({ left: 1, top: 100, right: 1, bottom: 100 })
    })
  })

  describe('edge cases', () => {
    it('gives an empty run a box at the origin, not one that matches everything', () => {
      // Returning the infinities would make `boxesOverlap` answer `true` for every view, so an empty
      // run would be drawn always instead of never — the opposite of what culling is for.
      expect(boundsOf([])).toEqual({ left: 0, top: 0, right: 0, bottom: 0 })
      expect(boxesOverlap(boundsOf([]), { left: 100, top: 100, right: 200, bottom: 200 })).toBe(
        false
      )
    })
  })

  // L3/L4: N/A — a fold over numbers that have already been produced by the projection.
})

describe('detailThresholdSquared', () => {
  describe('happy path', () => {
    it('is one backdrop pixel, squared, at native scale', () => {
      expect(detailThresholdSquared(NATIVE)).toBe(1)
    })
  })

  describe('variants', () => {
    it('drops more of the detail the further out the view is', () => {
      const out = detailThresholdSquared({ scale: 0.25, originX: 0, originY: 0 })

      // At a quarter scale one screen pixel spans four backdrop pixels, so points closer than that
      // cannot move a single one.
      expect(out).toBe(16)
    })

    it('keeps every point once the view magnifies the backdrop', () => {
      const inClose = detailThresholdSquared({ scale: 8, originX: 0, originY: 0 })

      // A fraction of a pixel: nothing is dropped, which is right — magnified is exactly when the
      // detail becomes visible.
      expect(inClose).toBeLessThan(1)
      expect(inClose).toBeGreaterThan(0)
    })
  })

  describe('edge cases', () => {
    it('asks for nothing at a scale of zero rather than dividing by it', () => {
      expect(detailThresholdSquared({ scale: 0, originX: 0, originY: 0 })).toBe(0)
    })
  })
})
