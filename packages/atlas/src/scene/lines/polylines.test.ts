import { describe, expect, it } from 'vitest'

import {
  isClosedChain,
  mitreAt,
  offsetPolyline,
  polylinesToSegments,
  ringNeighbours,
} from './polylines'
import { run } from './testing/lineFixtures'

import type { UvPoint } from '@europe-historical-atlas/core/data/coastlineSource'

describe('isClosedChain', () => {
  describe('happy path', () => {
    it('recognises a ring by its repeated point', () => {
      expect(
        isClosedChain([
          { u: 0, v: 0 },
          { u: 1, v: 0 },
          { u: 1, v: 1 },
          { u: 0, v: 0 },
        ])
      ).toBe(true)
    })
  })

  describe('variants', () => {
    it('reads an open chain as open', () => {
      expect(
        isClosedChain([
          { u: 0, v: 0 },
          { u: 1, v: 0 },
          { u: 1, v: 1 },
          { u: 1, v: 2 },
        ])
      ).toBe(false)
    })
  })

  describe('managed errors', () => {
    it('refuses a triangle too short to enclose anything once the repeat is discounted', () => {
      expect(
        isClosedChain([
          { u: 0, v: 0 },
          { u: 1, v: 0 },
          { u: 0, v: 0 },
        ])
      ).toBe(false)
    })
  })

  describe('unmanaged errors', () => {
    it('reads an empty chain as open rather than throwing', () => {
      expect(isClosedChain([])).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('reads a single point as open', () => {
      expect(isClosedChain([{ u: 0, v: 0 }])).toBe(false)
    })
  })
})

describe('ringNeighbours', () => {
  const ring = [
    { u: 0, v: 0 },
    { u: 1, v: 0 },
    { u: 1, v: 1 },
  ]

  describe('happy path', () => {
    it('gives the points either side of a middle vertex', () => {
      expect(ringNeighbours(ring, 1, false)).toEqual({ previous: ring[0], next: ring[2] })
    })
  })

  describe('variants', () => {
    it('wraps around the end of a ring', () => {
      expect(ringNeighbours(ring, 0, true)?.previous).toEqual(ring[2])
    })

    it('clamps at the end of an open chain, so an endpoint is its own neighbour', () => {
      expect(ringNeighbours(ring, 0, false)?.previous).toEqual(ring[0])
    })
  })

  describe('managed errors', () => {
    it('reports nothing where the chain is too short to have neighbours', () => {
      expect(ringNeighbours([], 0, false)).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    it('reports nothing for an index past the end rather than reading undefined', () => {
      expect(ringNeighbours(ring, 99, false)).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('makes a single point its own neighbour on both sides', () => {
      const one = [{ u: 0, v: 0 }]
      expect(ringNeighbours(one, 0, true)).toEqual({ previous: one[0], next: one[0] })
    })
  })
})

describe('mitreAt', () => {
  describe('happy path', () => {
    it('offsets a straight run along the edge normal, with no mitre stretch', () => {
      const m = mitreAt({ u: 0, v: 0 }, { u: 1, v: 0 }, { u: 2, v: 0 })
      expect(m.scale).toBeCloseTo(1)
      expect(Math.hypot(m.u, m.v)).toBeCloseTo(1)
    })
  })

  describe('variants', () => {
    it('stretches the offset through a corner, so the shifted line stays parallel', () => {
      expect(mitreAt({ u: 0, v: 0 }, { u: 1, v: 0 }, { u: 1, v: 1 }).scale).toBeGreaterThan(1)
    })
  })

  describe('managed errors', () => {
    it('clamps a hairpin instead of throwing the vertex across the map', () => {
      const m = mitreAt({ u: 0, v: 0 }, { u: 1, v: 0 }, { u: 0, v: 0 })
      expect(Number.isFinite(m.scale)).toBe(true)
      expect(m.scale).toBeLessThanOrEqual(4)
    })
  })

  describe('unmanaged errors', () => {
    it('falls back on the one live normal when an edge has no length', () => {
      const m = mitreAt({ u: 0, v: 0 }, { u: 1, v: 0 }, { u: 1, v: 0 })
      expect(Math.hypot(m.u, m.v)).toBeCloseTo(1)
    })
  })

  describe('edge cases', () => {
    it('stays finite when both edges are degenerate', () => {
      const m = mitreAt({ u: 1, v: 0 }, { u: 1, v: 0 }, { u: 1, v: 0 })
      expect(Number.isFinite(m.scale)).toBe(true)
    })
  })
})

describe('offsetPolyline', () => {
  it('shifts a straight run sideways by exactly the distance asked', () => {
    const shifted = offsetPolyline(run(0.5), 0.01)
    // The run goes south; its left-hand normal points west, so the copy lands at u = 0.49.
    for (const point of shifted) expect(point.u).toBeCloseTo(0.49)
  })

  it('shifts the other way for a negative distance', () => {
    const shifted = offsetPolyline(run(0.5), -0.01)
    for (const point of shifted) expect(point.u).toBeCloseTo(0.51)
  })

  it('keeps a closed run closed', () => {
    const square: UvPoint[] = [
      { u: 0.4, v: 0.4 },
      { u: 0.6, v: 0.4 },
      { u: 0.6, v: 0.6 },
      { u: 0.4, v: 0.6 },
      { u: 0.4, v: 0.4 },
    ]
    const shifted = offsetPolyline(square, 0.01)
    const head = shifted[0]
    const tail = shifted[shifted.length - 1]
    expect(head).toEqual(tail)
  })

  it('clamps a hairpin instead of throwing the vertex off the map', () => {
    // Two segments doubling back on each other: the exact mitre is at infinity.
    const hairpin: UvPoint[] = [
      { u: 0.5, v: 0.4 },
      { u: 0.5, v: 0.5 },
      { u: 0.5001, v: 0.4 },
    ]
    for (const point of offsetPolyline(hairpin, 0.01)) {
      expect(Number.isFinite(point.u)).toBe(true)
      expect(Math.abs(point.u - 0.5)).toBeLessThan(0.05)
    }
  })

  it('returns the run untouched for a zero distance', () => {
    const original = run(0.5)
    expect(offsetPolyline(original, 0)).toEqual(original)
  })

  it('returns a single point untouched, having no direction to offset along', () => {
    const lone: UvPoint[] = [{ u: 0.5, v: 0.5 }]
    expect(offsetPolyline(lone, 0.01)).toEqual(lone)
  })
})

describe('polylinesToSegments', () => {
  it('explodes a run into one fewer segment than it has points', () => {
    expect(
      polylinesToSegments([
        [
          { u: 0, v: 0 },
          { u: 0, v: 1 },
          { u: 0, v: 2 },
        ],
      ])
    ).toHaveLength(2)
  })
  it('yields nothing for a run of a single point', () => {
    expect(polylinesToSegments([[{ u: 0, v: 0 }]])).toEqual([])
  })
})
