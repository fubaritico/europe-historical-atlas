import { describe, expect, it } from 'vitest'

import { isClosedChain, mitreAt, ringNeighbours } from './polylines'

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
