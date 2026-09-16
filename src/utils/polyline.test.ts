import { describe, expect, it } from 'vitest'

import { simplifyPolyline } from './polyline'

import type { PlanarPoint } from './polyline'

/**
 * A staircase approximating the diagonal from `(0,0)` to `(steps, steps)` — the exact artefact a border
 * derived from a grid produces, where every step is one cell.
 */
function staircase(steps: number): PlanarPoint[] {
  const points: PlanarPoint[] = [{ u: 0, v: 0 }]
  for (let i = 0; i < steps; i++) {
    points.push({ u: i + 1, v: i })
    points.push({ u: i + 1, v: i + 1 })
  }
  return points
}

describe('simplifyPolyline', () => {
  describe('happy path', () => {
    it('collapses a staircase into the line it was approximating', () => {
      const simplified = simplifyPolyline(staircase(20), 1)
      expect(simplified).toHaveLength(2)
      expect(simplified[0]).toEqual({ u: 0, v: 0 })
      expect(simplified[1]).toEqual({ u: 20, v: 20 })
    })

    it('leaves a chain that already says something alone', () => {
      const corner: PlanarPoint[] = [
        { u: 0, v: 0 },
        { u: 10, v: 0 },
        { u: 10, v: 10 },
      ]
      expect(simplifyPolyline(corner, 1)).toEqual(corner)
    })
  })

  describe('variants', () => {
    it('drops more as the tolerance grows', () => {
      const line = staircase(20)
      expect(simplifyPolyline(line, 0.1).length).toBeGreaterThan(simplifyPolyline(line, 0.6).length)
    })

    it('keeps a deviation larger than the tolerance', () => {
      const spike: PlanarPoint[] = [
        { u: 0, v: 0 },
        { u: 5, v: 3 },
        { u: 10, v: 0 },
      ]
      expect(simplifyPolyline(spike, 1)).toHaveLength(3)
      expect(simplifyPolyline(spike, 4)).toHaveLength(2)
    })

    it('carries the point type the caller handed it, untouched', () => {
      const tagged = [
        { u: 0, v: 0, tag: 'a' },
        { u: 1, v: 0.01, tag: 'b' },
        { u: 2, v: 0, tag: 'c' },
      ]
      expect(simplifyPolyline(tagged, 1)).toEqual([tagged[0], tagged[2]])
    })
  })

  describe('managed errors', () => {
    it('returns a copy when the tolerance is zero', () => {
      const line = staircase(3)
      const simplified = simplifyPolyline(line, 0)
      expect(simplified).toEqual(line)
      expect(simplified).not.toBe(line)
    })

    it('ignores a negative tolerance rather than inverting the test', () => {
      const line = staircase(3)
      expect(simplifyPolyline(line, -5)).toEqual(line)
    })

    it('returns a two-point chain unchanged, having nothing to drop', () => {
      const pair: PlanarPoint[] = [
        { u: 0, v: 0 },
        { u: 1, v: 1 },
      ]
      expect(simplifyPolyline(pair, 10)).toEqual(pair)
    })
  })

  describe('unmanaged errors', () => {
    it('survives an empty chain', () => {
      expect(simplifyPolyline([], 1)).toEqual([])
    })

    it('survives a chain whose points all coincide', () => {
      const stack: PlanarPoint[] = [
        { u: 1, v: 1 },
        { u: 1, v: 1 },
        { u: 1, v: 1 },
      ]
      expect(simplifyPolyline(stack, 1)).toHaveLength(2)
    })

    // L4: N/A — pure arithmetic over an array, with no async work and no external resource.
  })

  describe('edge cases', () => {
    it('never moves the first or last point', () => {
      // What makes it safe on borders: runs meet at tripoints, which are always an end of a run, so
      // simplifying each run on its own cannot pull two of them apart and reopen a gap.
      const line = staircase(30)
      const simplified = simplifyPolyline(line, 100)
      expect(simplified[0]).toEqual(line[0])
      expect(simplified[simplified.length - 1]).toEqual(line[line.length - 1])
    })

    it('keeps a closed chain closed', () => {
      const ring: PlanarPoint[] = [
        { u: 0, v: 0 },
        { u: 10, v: 0 },
        { u: 10, v: 10 },
        { u: 0, v: 10 },
        { u: 0, v: 0 },
      ]
      const simplified = simplifyPolyline(ring, 1)
      expect(simplified[0]).toEqual(simplified[simplified.length - 1])
    })

    it('reduces the point count rather than multiplying it', () => {
      // The opposite of smoothing, which doubles per round.
      const line = staircase(50)
      expect(simplifyPolyline(line, 1).length).toBeLessThan(line.length)
    })

    it('eats a small shape whole once the tolerance exceeds it', () => {
      // The failure to watch for: a one-cell territory is a deviation of one cell, so a tolerance above
      // that erases it. This is why the tolerance is expressed in cells and defaults to nothing.
      const enclaveBump: PlanarPoint[] = [
        { u: 0, v: 0 },
        { u: 5, v: 1 },
        { u: 10, v: 0 },
      ]
      expect(simplifyPolyline(enclaveBump, 0.5)).toHaveLength(3)
      expect(simplifyPolyline(enclaveBump, 1.5)).toHaveLength(2)
    })
  })
})
