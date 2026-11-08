import { describe, expect, it } from 'vitest'

import { layFills } from './fillBuffers'

const SQUARE = [
  { u: 0.25, v: 0.25 },
  { u: 0.75, v: 0.25 },
  { u: 0.75, v: 0.75 },
  { u: 0.25, v: 0.75 },
]

/**
 * A request over a 4 × 4 grid, overridable.
 * @param over - what to change
 * @returns the request
 */
function request(
  over: Partial<Parameters<typeof layFills>[0]> = {}
): Parameters<typeof layFills>[0] {
  return {
    regions: [{ rings: [SQUARE] }],
    grid: { segX: 4, segY: 4 },
    tintLevels: [[{ r: 200, g: 40, b: 10 }]],
    bandDepths: [0],
    band: null,
    heights: new Float32Array(25).fill(2),
    worldWidth: 10,
    worldDepth: 10,
    ...over,
  }
}

// ATLAS-396: a year's fills cut, shared and laid in one go, for the worker.
describe('layFills', () => {
  describe('happy path', () => {
    it('lays every vertex at the relief’s height, in world space, its polity’s tint on it', () => {
      const { positions, tints, indices } = layFills(request())
      const ys = positions.filter((_, k) => k % 3 === 1)
      expect(new Set(ys)).toEqual(new Set([2]))
      expect(Math.min(...positions.filter((_, k) => k % 3 === 0))).toBeCloseTo(-2.5, 6)
      expect(Array.from(tints[0]?.slice(0, 3) ?? [])).toEqual([200, 40, 10])
      expect(indices.length % 3).toBe(0)
    })
  })

  describe('variants', () => {
    it('reads one height a node, row by row from the north', () => {
      // The north half at 0, the south half at 8: the square straddles both.
      const heights = Float32Array.from({ length: 25 }, (_, node) => (node < 10 ? 0 : 8))
      const ys = layFills(request({ heights })).positions.filter((_, k) => k % 3 === 1)
      expect([Math.min(...ys), Math.max(...ys)]).toEqual([0, 8])
    })

    it('shares the vertices of the cut, three indices a triangle', () => {
      const { positions, indices } = layFills(request())
      expect(positions.length / 3).toBeLessThan(indices.length)
    })
  })

  describe('managed errors', () => {
    it('leaves a polity unfilled at the deepest level out of every buffer', () => {
      const { positions, indices } = layFills(request({ tintLevels: [[null]] }))
      expect([positions.length, indices.length]).toEqual([0, 0])
    })
  })

  describe('unmanaged errors', () => {
    it('carries a missing height as NaN, never a plausible one', () => {
      const ys = layFills(request({ heights: new Float32Array(0) })).positions.filter(
        (_, k) => k % 3 === 1
      )
      expect(ys.every((y) => Number.isNaN(y))).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('lays nothing for no polity', () => {
      const { positions, tints } = layFills(request({ regions: [], tintLevels: [[]] }))
      expect([positions.length, tints[0]?.length]).toEqual([0, 0])
    })
  })
})
