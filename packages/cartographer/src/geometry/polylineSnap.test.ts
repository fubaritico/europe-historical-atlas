import { describe, expect, it } from 'vitest'

import { nearestVertexOnPolylines, subPathBetween } from './polylineSnap'

import type { Point } from '../viewport/viewport'

/** The snapping radius, in screen pixels like every other handle. */
const RADIUS = 12

/** Two lines that meet, which is the confluence case `s02` walks through. */
const SCHELDT: Point[] = [
  [100, 500],
  [120, 450],
  [140, 400],
  [160, 350],
]
const MEUSE: Point[] = [
  [150, 500],
  [160, 440],
  [170, 380],
]

describe('polylineSnap', () => {
  describe('happy path', () => {
    it('finds the vertex under the pointer, and says how far it was', () => {
      const hit = nearestVertexOnPolylines([SCHELDT], [142, 398], RADIUS)

      expect(hit).not.toBeNull()
      expect(hit?.polyline).toBe(0)
      expect(hit?.vertex).toBe(2)
      expect(hit?.distancePx).toBeCloseTo(Math.hypot(2, 2), 9)
    })

    it('finds nothing when no line is within the radius', () => {
      expect(nearestVertexOnPolylines([SCHELDT], [900, 900], RADIUS)).toBeNull()
    })

    it('takes the stretch between two vertices, both included', () => {
      expect(subPathBetween(SCHELDT, 1, 3)).toEqual([
        [120, 450],
        [140, 400],
        [160, 350],
      ])
    })
  })

  describe('variants', () => {
    it('weighs every line against every other, not the first one in range', () => {
      // Both lines have a vertex inside the radius, which is what makes this exercise the case: the
      // plausible version returns the first line holding a hit, and the nearer one is the second.
      // A first version of this test put the pointer where only the second line was in range at all,
      // so it passed against the very implementation it was written to catch.
      const far: Point[] = [[110, 100]]
      const near: Point[] = [[102, 100]]

      const hit = nearestVertexOnPolylines([far, near], [100, 100], RADIUS)

      expect(hit?.polyline).toBe(1)
      expect(hit?.distancePx).toBeCloseTo(2, 9)
    })

    it('picks the river the pointer is actually on, at a confluence', () => {
      const hit = nearestVertexOnPolylines([SCHELDT, MEUSE], [160, 442], RADIUS)

      expect(hit?.polyline).toBe(1)
      expect(hit?.vertex).toBe(1)
    })

    it('snaps to either line depending only on where the pointer is', () => {
      expect(nearestVertexOnPolylines([SCHELDT, MEUSE], [100, 501], RADIUS)?.polyline).toBe(0)
      expect(nearestVertexOnPolylines([SCHELDT, MEUSE], [150, 501], RADIUS)?.polyline).toBe(1)
    })

    it('takes a stretch of one vertex when both clicks land on the same one', () => {
      expect(subPathBetween(SCHELDT, 2, 2)).toEqual([[140, 400]])
    })

    it('takes the whole line when the clicks are its two ends', () => {
      expect(subPathBetween(SCHELDT, 0, 3)).toEqual(SCHELDT)
    })

    it('answers at any radius, the snapping distance being the caller’s', () => {
      expect(nearestVertexOnPolylines([SCHELDT], [100, 520], 12)).toBeNull()
      expect(nearestVertexOnPolylines([SCHELDT], [100, 520], 25)?.vertex).toBe(0)
    })
  })

  describe('managed errors', () => {
    it('finds nothing among no lines, which is what makes the status bar say so', () => {
      expect(nearestVertexOnPolylines([], [100, 500], RADIUS)).toBeNull()
    })

    it('skips a line with no vertices rather than counting it as a miss', () => {
      const hit = nearestVertexOnPolylines([[], SCHELDT], [100, 501], RADIUS)

      expect(hit?.polyline).toBe(1)
      expect(hit?.vertex).toBe(0)
    })

    it('refuses a stretch whose indices are not on the line', () => {
      expect(subPathBetween(SCHELDT, 0, 99)).toEqual([])
      expect(subPathBetween(SCHELDT, -1, 2)).toEqual([])
      expect(subPathBetween([], 0, 0)).toEqual([])
    })

    it('refuses a stretch asked for with fractional indices', () => {
      expect(subPathBetween(SCHELDT, 0.5, 2)).toEqual([])
    })
  })

  describe('unmanaged errors', () => {
    // L4: N/A for async — nothing here awaits or catches. What follows is the non-finite case.
    it('finds nothing for a pointer that is not a position', () => {
      expect(nearestVertexOnPolylines([SCHELDT], [Number.NaN, 400], RADIUS)).toBeNull()
    })

    it('ignores a vertex that is not a position instead of letting it win', () => {
      const broken: Point[] = [
        [Number.NaN, Number.NaN],
        [140, 400],
      ]

      expect(nearestVertexOnPolylines([broken], [140, 401], RADIUS)?.vertex).toBe(1)
    })
  })

  describe('edge cases', () => {
    it('walks upstream as well as downstream — the clicks come in either order', () => {
      const downstream = subPathBetween(SCHELDT, 1, 3)
      const upstream = subPathBetween(SCHELDT, 3, 1)

      expect(upstream).toEqual([...downstream].reverse())
      expect(upstream).toHaveLength(3)
    })

    it('keeps the earlier line when two vertices are exactly as near', () => {
      const a: Point[] = [[0, 0]]
      const b: Point[] = [[0, 0]]

      expect(nearestVertexOnPolylines([a, b], [0, 0], RADIUS)?.polyline).toBe(0)
    })

    it('snaps at exactly the radius', () => {
      expect(nearestVertexOnPolylines([[[0, 0]]], [12, 0], RADIUS)?.vertex).toBe(0)
      expect(nearestVertexOnPolylines([[[0, 0]]], [13, 0], RADIUS)).toBeNull()
    })

    it('returns the line’s own vertices, so the inserted points are exact', () => {
      const stretch = subPathBetween(SCHELDT, 0, 2)

      expect(stretch[0]).toBe(SCHELDT[0])
      expect(stretch[2]).toBe(SCHELDT[2])
    })

    it('holds up over the real asset’s shape: hundreds of vertices across many lines', () => {
      const many = Array.from({ length: 200 }, (_, line) =>
        Array.from({ length: 50 }, (_, v) => [line * 10, v * 10] as Point)
      )

      const hit = nearestVertexOnPolylines(many, [1230, 310], RADIUS)

      expect(hit?.polyline).toBe(123)
      expect(hit?.vertex).toBe(31)
    })
  })
})
