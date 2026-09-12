import { Mesh, PlaneGeometry } from 'three'
import { describe, expect, it } from 'vitest'

import { createHeightmap } from '../data/heightmap'

import { createReliefMesh } from './reliefMesh'

import type { HeightmapMeta } from '../data/heightmap'

/** Build minimal metadata for a test grid. */
function meta(width: number, height: number, max: number): HeightmapMeta {
  return {
    width,
    height,
    zoom: 5,
    bbox: { west: 0, south: 0, east: 1, north: 1 },
    min: 0,
    max,
    encoding: 'int16-le-metres',
  }
}

const OPTS = { worldWidth: 10, segments: 4, plainsCeiling: 300, peakTarget: 700, wireframe: false }

/** Highest displaced Y across the mesh vertices. */
function maxY(mesh: Mesh): number {
  const position = mesh.geometry.getAttribute('position')
  let max = -Infinity
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i)
    if (y > max) max = y
  }
  return max
}

describe('createReliefMesh', () => {
  // One high corner (4000 m), the rest sea.
  const heightmap = createHeightmap(meta(2, 2, 4000), new Int16Array([0, 0, 0, 4000]))

  describe('happy path', () => {
    it('builds a Mesh + PlaneGeometry with the expected vertex count', () => {
      const mesh = createReliefMesh(heightmap, OPTS)
      expect(mesh).toBeInstanceOf(Mesh)
      expect(mesh.geometry).toBeInstanceOf(PlaneGeometry)
      expect(mesh.geometry.getAttribute('position').count).toBe(25) // (4 + 1) * (4 + 1)
    })

    it('raises land above a flat sea (y = 0 where elevation ≤ 0)', () => {
      const mesh = createReliefMesh(heightmap, OPTS)
      const position = mesh.geometry.getAttribute('position')
      let min = Infinity
      for (let i = 0; i < position.count; i++) min = Math.min(min, position.getY(i))
      expect(min).toBe(0)
      expect(maxY(mesh)).toBeGreaterThan(0)
    })
  })

  describe('variants', () => {
    it('applies the wireframe flag to the material', () => {
      expect(createReliefMesh(heightmap, { ...OPTS, wireframe: true }).material.wireframe).toBe(
        true
      )
    })

    it('a lower peakTarget yields lower peaks', () => {
      const low = createReliefMesh(heightmap, { ...OPTS, peakTarget: 500 })
      const high = createReliefMesh(heightmap, { ...OPTS, peakTarget: 1500 })
      expect(maxY(low)).toBeLessThan(maxY(high))
    })
  })

  describe('managed errors', () => {
    it('keeps plains linear below the ceiling', () => {
      const plain = createHeightmap(meta(1, 1, 200), new Int16Array([200]))
      // 200 m < ceiling 300 → mapped 1:1 then scaled by worldPerMetre (1/10000)
      expect(maxY(createReliefMesh(plain, OPTS))).toBeCloseTo(200 / 10000, 5)
    })
  })

  describe('unmanaged errors', () => {
    it('eases a peak far below its linear height', () => {
      const peak = createHeightmap(meta(1, 1, 4000), new Int16Array([4000]))
      const y = maxY(createReliefMesh(peak, OPTS))
      expect(y).toBeLessThan(1000 / 10000) // well below the linear 4000 m
      expect(y).toBeGreaterThan(300 / 10000) // above the plains ceiling
    })
  })

  describe('edge cases', () => {
    it('produces a flat sheet for an all-sea heightmap', () => {
      const sea = createHeightmap(meta(2, 2, 0), new Int16Array([0, 0, 0, 0]))
      expect(maxY(createReliefMesh(sea, OPTS))).toBe(0)
    })
  })
})
