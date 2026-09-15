import { describe, expect, it } from 'vitest'

import { createHeightmap } from '../data/heightmap'
import { clamp01 } from '../utils/math'

import { generateRhumbSegments } from './rhumbNetwork'

import type { RhumbNetworkOptions } from './rhumbNetwork'
import type { HeightmapMeta } from '../data/heightmap'

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
