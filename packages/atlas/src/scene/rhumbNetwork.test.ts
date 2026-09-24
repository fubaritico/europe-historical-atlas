import { describe, expect, it } from 'vitest'

import { createHeightmap } from '@europe-atlas/core/data/heightmap'
import { clamp01 } from '@europe-atlas/core/utils/math'

import { generateRhumbSegments, rhumbCentres, waterRunsAlong } from './rhumbNetwork'

import type { RhumbNetworkOptions } from './rhumbNetwork'
import type { HeightmapMeta } from '@europe-atlas/core/data/heightmap'

/** Build minimal metadata for a test grid. */
function meta(width: number, height: number): HeightmapMeta {
  return {
    width,
    height,
    zoom: 5,
    bbox: { west: 0, south: 0, east: 1, north: 1 },
    min: -100,
    max: 100,
    encoding: 'int16-le-metres',
  }
}

/** A uniform grid at a single elevation. */
const uniform = (value: number) => createHeightmap(meta(4, 4), new Int16Array(16).fill(value))

const BASE: RhumbNetworkOptions = {
  center: { u: 0.5, v: 0.5 },
  circleRadius: 0, // all nodes coincide at the centre → deterministic counts
  nodeCount: 4,
  includeCenter: false,
  directions: 8, // → 4 unique orientations
  seaLevel: 0,
  step: 0.02,
}

describe('generateRhumbSegments', () => {
  describe('happy path', () => {
    it('emits one full chord per (node × unique orientation) over open sea', () => {
      const segments = generateRhumbSegments(uniform(-100), BASE)
      expect(segments).toHaveLength(4 * 4) // 4 coincident nodes × 4 orientations
    })
  })

  describe('variants', () => {
    it('scales with the node count and includeCenter', () => {
      const four = generateRhumbSegments(uniform(-100), { ...BASE, nodeCount: 4 })
      const eight = generateRhumbSegments(uniform(-100), { ...BASE, nodeCount: 8 })
      expect(eight.length).toBe(four.length * 2)
      const withCentre = generateRhumbSegments(uniform(-100), { ...BASE, includeCenter: true })
      expect(withCentre.length).toBe((BASE.nodeCount + 1) * 4)
    })

    it('scales with the direction count (unique orientations = directions / 2)', () => {
      const d8 = generateRhumbSegments(uniform(-100), { ...BASE, directions: 8 })
      const d16 = generateRhumbSegments(uniform(-100), { ...BASE, directions: 16 })
      expect(d16.length).toBe(d8.length * 2)
    })

    it('keeps every segment over water (sea-only clip)', () => {
      // Left half sea (−100), right half land (100): u = column/3, so columns 0..1 are sea.
      const data = new Int16Array(16)
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) data[y * 4 + x] = x < 2 ? -100 : 100
      const hm = createHeightmap(meta(4, 4), data)
      const segments = generateRhumbSegments(hm, { ...BASE, circleRadius: 0.3, nodeCount: 8 })
      expect(segments.length).toBeGreaterThan(0)
      for (const [a, b] of segments) {
        const mu = clamp01((a.u + b.u) / 2)
        const mv = clamp01((a.v + b.v) / 2)
        expect(hm.sample(mu, mv)).toBeLessThanOrEqual(0)
      }
    })
  })

  describe('managed errors', () => {
    it('emits nothing over all-land terrain', () => {
      expect(generateRhumbSegments(uniform(100), BASE)).toHaveLength(0)
    })
  })

  // L4 (unmanaged errors): N/A — pure synchronous generation over a typed array; no async, no I/O.

  describe('edge cases', () => {
    it('clips lines from centres outside the map to the map bounds', () => {
      // Centre far outside the unit square, big ring → most nodes are off-map; surviving lines still
      // only appear where they cross the (all-sea) square.
      const segments = generateRhumbSegments(uniform(-100), {
        ...BASE,
        center: { u: 2, v: 2 },
        circleRadius: 1.5,
        nodeCount: 8,
      })
      for (const [a, b] of segments) {
        for (const p of [a, b]) {
          expect(p.u).toBeGreaterThanOrEqual(-0.001)
          expect(p.u).toBeLessThanOrEqual(1.001)
          expect(p.v).toBeGreaterThanOrEqual(-0.001)
          expect(p.v).toBeLessThanOrEqual(1.001)
        }
      }
    })
  })
})

describe('rhumbCentres', () => {
  describe('happy path', () => {
    it('puts the first centre due north of the ring centre', () => {
      const [first] = rhumbCentres({ u: 0.5, v: 0.5 }, 0.1, 4, false)
      expect(first?.u).toBeCloseTo(0.5)
      expect(first?.v).toBeCloseTo(0.4)
    })
  })

  describe('variants', () => {
    it('gives one centre per node', () => {
      expect(rhumbCentres({ u: 0.5, v: 0.5 }, 0.1, 6, false)).toHaveLength(6)
    })

    it('adds the ring centre itself when asked', () => {
      const nodes = rhumbCentres({ u: 0.5, v: 0.5 }, 0.1, 4, true)
      expect(nodes).toHaveLength(5)
      expect(nodes[4]).toEqual({ u: 0.5, v: 0.5 })
    })

    it('spreads the ring clockwise from north', () => {
      const nodes = rhumbCentres({ u: 0.5, v: 0.5 }, 0.1, 4, false)
      expect(nodes[1]?.u).toBeCloseTo(0.6)
      expect(nodes[1]?.v).toBeCloseTo(0.5)
    })
  })

  // L3 (managed errors): N/A — it is arithmetic over already-validated dev-panel values.

  describe('unmanaged errors', () => {
    it('returns nothing for a ring of no nodes rather than dividing by zero', () => {
      expect(rhumbCentres({ u: 0.5, v: 0.5 }, 0.1, 0, false)).toHaveLength(0)
    })
  })

  describe('edge cases', () => {
    it('collapses every node onto the centre at zero radius', () => {
      for (const node of rhumbCentres({ u: 0.5, v: 0.5 }, 0, 4, false)) {
        expect(node.u).toBeCloseTo(0.5)
        expect(node.v).toBeCloseTo(0.5)
      }
    })
  })
})

describe('waterRunsAlong', () => {
  const from = { u: 0, v: 0.5 }

  describe('happy path', () => {
    it('emits one run across open water', () => {
      expect(waterRunsAlong(from, 1, 0, 0, 1, 0.25, () => true)).toHaveLength(1)
    })
  })

  describe('variants', () => {
    it('stops at the coast and picks up on the far side', () => {
      // Land in the middle third: two runs, one either side of it.
      const runs = waterRunsAlong(from, 1, 0, 0, 1, 0.1, (u) => u < 0.3 || u > 0.7)
      expect(runs.length).toBeGreaterThanOrEqual(2)
    })

    it('emits nothing over land from end to end', () => {
      expect(waterRunsAlong(from, 1, 0, 0, 1, 0.25, () => false)).toHaveLength(0)
    })

    it('walks down v as readily as across u', () => {
      expect(waterRunsAlong({ u: 0.5, v: 0 }, 0, 1, 0, 1, 0.25, () => true)).toHaveLength(1)
    })
  })

  describe('managed errors', () => {
    it('closes an open run at the end of the chord rather than dropping it', () => {
      const runs = waterRunsAlong(from, 1, 0, 0, 1, 0.25, () => true)
      expect(runs[0]?.[1].u).toBeCloseTo(1)
    })
  })

  describe('unmanaged errors', () => {
    it('clamps the sampled coordinate, so a chord ending on the edge reads inside the map', () => {
      const seen: number[] = []
      waterRunsAlong(from, 1, 0, 0, 1, 0.25, (u) => {
        seen.push(u)
        return true
      })
      for (const u of seen) expect(u).toBeGreaterThanOrEqual(0)
      for (const u of seen) expect(u).toBeLessThanOrEqual(1)
    })
  })

  describe('edge cases', () => {
    it('handles a chord shorter than one step', () => {
      expect(waterRunsAlong(from, 1, 0, 0, 0.01, 0.25, () => true)).toHaveLength(1)
    })
  })
})
