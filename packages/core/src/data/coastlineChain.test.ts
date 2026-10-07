import { describe, expect, it } from 'vitest'

import { chainSegments } from './coastlineChain'
import { createFieldCoastlineSource } from './coastlineSource'

import type { Contour } from './coastlineChain'
import type { CoastlineSegment, UvPoint } from './coastlineSource'

/**
 * A point, written short so a fixture reads as a shape rather than as a wall of braces.
 * @param u - horizontal coordinate
 * @param v - vertical coordinate
 * @returns the point
 */
function p(u: number, v: number): UvPoint {
  return { u, v }
}

/**
 * A segment between two coordinate pairs.
 * @param from - first endpoint, as `[u, v]`
 * @param to - second endpoint, as `[u, v]`
 * @returns the segment
 */
function seg(from: [number, number], to: [number, number]): CoastlineSegment {
  return [p(from[0], from[1]), p(to[0], to[1])]
}

/**
 * The first contour, or a failure saying so.
 *
 * Neither `contours[0]!` nor `contours[0] as Contour` is available: `noUncheckedIndexedAccess` makes the
 * index optional, `no-non-null-assertion` forbids the first form, and `non-nullable-type-assertion-style`
 * rewrites the second *into* the first. A guard satisfies both, and says something useful when it fires.
 * @param contours - what chaining returned
 * @returns the first contour
 * @throws when there is none, which is the assertion the caller meant to make
 */
function first(contours: Contour[]): Contour {
  const one = contours[0]
  if (!one) throw new Error('expected at least one contour, got none')
  return one
}

/**
 * A contour's points as coordinate pairs, for readable assertions.
 * @param contour - the contour to flatten
 * @returns the points as `[u, v]` pairs
 */
function coords(contour: Contour): [number, number][] {
  return contour.points.map((point) => [point.u, point.v])
}

describe('chainSegments', () => {
  describe('happy path', () => {
    it('joins segments that share an endpoint into one run', () => {
      const contours = chainSegments([seg([0, 0], [1, 0]), seg([1, 0], [2, 0])])

      expect(contours).toHaveLength(1)
      expect(coords(first(contours))).toEqual([
        [0, 0],
        [1, 0],
        [2, 0],
      ])
      expect(contours[0]?.closed).toBe(false)
    })

    it('reports a run that comes back to its start as closed, without repeating the first point', () => {
      const contours = chainSegments([
        seg([0, 0], [1, 0]),
        seg([1, 0], [1, 1]),
        seg([1, 1], [0, 0]),
      ])

      expect(contours).toHaveLength(1)
      expect(contours[0]?.closed).toBe(true)
      // Three corners, three points. A repeated first point would be a fourth, and every consumer
      // would then have to know whether to strip it.
      expect(contours[0]?.points).toHaveLength(3)
    })
  })

  describe('variants', () => {
    it('walks both ways from its seed, so an open run is not cut in two', () => {
      // The trap this test exists for. Segments arrive in no particular order, so the seed lands in the
      // middle of the run as often as not — and the shoreline is cut open by the frame's edge, so open
      // runs are the normal case here. A forward-only walk would emit [1,0]→[2,0] and leave [0,0]→[1,0]
      // for a second contour, splitting one coast into two at an arbitrary point.
      const contours = chainSegments([seg([1, 0], [2, 0]), seg([0, 0], [1, 0])])

      expect(contours).toHaveLength(1)
      expect(coords(first(contours))).toEqual([
        [0, 0],
        [1, 0],
        [2, 0],
      ])
    })

    it('keeps two runs that never touch apart', () => {
      const contours = chainSegments([seg([0, 0], [1, 0]), seg([5, 5], [6, 5])])

      expect(contours).toHaveLength(2)
      expect(contours.every((c) => c.points.length === 2)).toBe(true)
    })

    it('follows a segment given end-first, orientation being arbitrary in a cloud', () => {
      // Marching squares emits each segment in its own cell's edge order, so a run alternates direction
      // freely. Chaining has to read both ends, not assume `[0]` is the entry.
      const contours = chainSegments([seg([0, 0], [1, 0]), seg([2, 0], [1, 0])])

      expect(contours).toHaveLength(1)
      expect(coords(first(contours))).toEqual([
        [0, 0],
        [1, 0],
        [2, 0],
      ])
    })

    it('returns the longest contour first', () => {
      const contours = chainSegments([
        seg([9, 9], [8, 9]),
        seg([0, 0], [1, 0]),
        seg([1, 0], [2, 0]),
        seg([2, 0], [3, 0]),
      ])

      expect(contours[0]?.points).toHaveLength(4)
      expect(contours[1]?.points).toHaveLength(2)
    })
  })

  describe('managed errors', () => {
    it('returns nothing for nothing', () => {
      expect(chainSegments([])).toEqual([])
    })

    it('never drops a segment, whatever the junctions look like', () => {
      // A saddle gives a point three or four incident segments, and the walk picks one arbitrarily. That
      // is allowed — what is not allowed is losing the others. The total point count is the invariant.
      const segments = [
        seg([1, 1], [0, 1]),
        seg([1, 1], [2, 1]),
        seg([1, 1], [1, 0]),
        seg([1, 1], [1, 2]),
      ]

      const contours = chainSegments(segments)
      const points = contours.reduce((total, c) => total + c.points.length, 0)

      // Four segments, so four joins consumed; whatever the shape of the runs, every segment is in one.
      expect(points).toBe(segments.length + contours.length)
    })
  })

  describe('unmanaged errors', () => {
    it('does not hang on a segment whose two ends are the same point', () => {
      const contours = chainSegments([seg([0, 0], [0, 0]), seg([0, 0], [1, 0])])

      expect(contours.length).toBeGreaterThan(0)
      expect(contours.every((c) => c.points.length < 10)).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('does not weld two shores that merely pass close by', () => {
      // The reason there is no epsilon. These two runs are 1e-9 apart — far below any tolerance someone
      // would be tempted to write, and genuinely separate: at the shipped resolution two shores can run
      // within a cell of each other across a strait.
      const contours = chainSegments([seg([0, 0], [1, 0]), seg([1 + 1e-9, 0], [2, 0])])

      expect(contours).toHaveLength(2)
    })

    it('chains a real marching-squares field into closed islands', () => {
      // An island in a 5×5 field: the producer's own output, not a hand-written cloud. This is what
      // proves the endpoints coincide exactly — the whole premise of keying without a tolerance.
      const land = new Set(['2,2'])
      const contours = chainSegments(
        createFieldCoastlineSource({
          width: 5,
          height: 5,
          level: 0.5,
          valueAt: (x, y) => (land.has(`${String(x)},${String(y)}`) ? 1 : 0),
        }).load()
      )

      expect(contours).toHaveLength(1)
      expect(contours[0]?.closed).toBe(true)
      expect(contours[0]?.points.length).toBeGreaterThanOrEqual(4)
    })

    it('chains two islands of a real field into two closed contours', () => {
      const land = new Set(['1,1', '4,4'])
      const contours = chainSegments(
        createFieldCoastlineSource({
          width: 7,
          height: 7,
          level: 0.5,
          valueAt: (x, y) => (land.has(`${String(x)},${String(y)}`) ? 1 : 0),
        }).load()
      )

      expect(contours).toHaveLength(2)
      expect(contours.every((c) => c.closed)).toBe(true)
    })
  })
})
