import { DataTexture, Mesh, PlaneGeometry } from 'three'
import { describe, expect, it } from 'vitest'

import { createHeightmap } from '@europe-atlas/core/data/heightmap'

import {
  WORLD_PER_METRE,
  createReliefMesh,
  meshVertexGrid,
  meshWorldDepth,
  reliefWorldY,
} from './reliefMesh'

import type { HeightmapMeta } from '@europe-atlas/core/data/heightmap'

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

    it('applies an injected texture to the (unlit) material and whitens the base colour', () => {
      const texture = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1)
      const mesh = createReliefMesh(heightmap, { ...OPTS, map: texture })
      expect(mesh.material.map).toBe(texture)
      expect(mesh.material.color.getHexString()).toBe('ffffff')
    })

    it('falls back to a flat brown material when no texture is given', () => {
      const mesh = createReliefMesh(heightmap, OPTS)
      expect(mesh.material.map).toBeNull()
      expect(mesh.material.color.getHexString()).toBe('8a5a2b')
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

describe('reliefWorldY', () => {
  const CURVE = { plainsCeiling: 575, peakTarget: 1900 }

  describe('happy path', () => {
    it('passes plains through 1:1, scaled into world units', () => {
      expect(reliefWorldY(400, CURVE)).toBeCloseTo(400 * WORLD_PER_METRE, 12)
      expect(reliefWorldY(CURVE.plainsCeiling, CURVE)).toBeCloseTo(
        CURVE.plainsCeiling * WORLD_PER_METRE,
        12
      )
    })
  })

  describe('variants', () => {
    it('eases peaks toward the target instead of letting them spike', () => {
      const alps = reliefWorldY(4441, CURVE) / WORLD_PER_METRE
      expect(alps).toBeGreaterThan(CURVE.plainsCeiling)
      expect(alps).toBeLessThan(CURVE.peakTarget)
    })

    it('stays monotonic, so a higher sample never sits lower', () => {
      let previous = -1
      for (const elevation of [0, 100, 575, 800, 1500, 3000, 6000]) {
        const y = reliefWorldY(elevation, CURVE)
        expect(y).toBeGreaterThanOrEqual(previous)
        previous = y
      }
    })

    it('joins plains and mountains without a kink at the threshold', () => {
      // The slope is 1 either side of the ceiling; a discontinuity there would show as a terrace.
      const below = reliefWorldY(CURVE.plainsCeiling - 1, CURVE)
      const at = reliefWorldY(CURVE.plainsCeiling, CURVE)
      const above = reliefWorldY(CURVE.plainsCeiling + 1, CURVE)
      expect(above - at).toBeCloseTo(at - below, 6)
    })
  })

  describe('managed errors', () => {
    it('flattens the sea rather than sinking it', () => {
      expect(reliefWorldY(0, CURVE)).toBe(0)
      expect(reliefWorldY(-7328, CURVE)).toBe(0)
    })

    it('does not divide by zero when the curve has no reach', () => {
      const y = reliefWorldY(3000, { plainsCeiling: 1900, peakTarget: 1900 })
      expect(Number.isFinite(y)).toBe(true)
    })
  })

  // L4 (unmanaged errors): N/A — a pure arithmetic remap with no I/O and no async path.

  describe('edge cases', () => {
    it('never exceeds the peak target however high the sample', () => {
      expect(reliefWorldY(1e6, CURVE) / WORLD_PER_METRE).toBeLessThanOrEqual(CURVE.peakTarget)
    })
  })
})

describe('meshVertexGrid', () => {
  describe('happy path', () => {
    it('keeps the requested subdivision on X', () => {
      expect(meshVertexGrid({ width: 100, height: 100 }, 64).segX).toBe(64)
    })

    it('matches the rows to the columns on a square grid', () => {
      expect(meshVertexGrid({ width: 100, height: 100 }, 64).segY).toBe(64)
    })
  })

  describe('variants', () => {
    it('halves the rows on a grid twice as wide as it is tall', () => {
      expect(meshVertexGrid({ width: 200, height: 100 }, 64).segY).toBe(32)
    })

    it('doubles the rows on a grid twice as tall as it is wide', () => {
      expect(meshVertexGrid({ width: 100, height: 200 }, 64).segY).toBe(128)
    })

    it('reports the aspect it laid the grid out from', () => {
      expect(meshVertexGrid({ width: 1280, height: 1164 }, 512).aspect).toBeCloseTo(1280 / 1164)
    })

    it('rounds the row count rather than truncating it', () => {
      // 64 / (100/60) = 38.4 → 38; 64 / (100/70) = 44.8 → 45. Truncation would give 38 and 44.
      expect(meshVertexGrid({ width: 100, height: 60 }, 64).segY).toBe(38)
      expect(meshVertexGrid({ width: 100, height: 70 }, 64).segY).toBe(45)
    })
  })

  describe('managed errors', () => {
    it('keeps one row on a grid so wide the row count would round to zero', () => {
      // A zero-row plane has no surface at all, so nothing draped on it could land anywhere.
      expect(meshVertexGrid({ width: 4000, height: 1 }, 4).segY).toBe(1)
    })
  })

  describe('unmanaged errors', () => {
    it('surfaces a zero-height grid as a non-finite aspect rather than a plausible layout', () => {
      expect(meshVertexGrid({ width: 100, height: 0 }, 64).aspect).toBe(Number.POSITIVE_INFINITY)
    })
  })

  describe('edge cases', () => {
    it('holds up on a 1x1 grid', () => {
      expect(meshVertexGrid({ width: 1, height: 1 }, 8)).toMatchObject({ segX: 8, segY: 8 })
    })

    it('holds up on a single-segment request', () => {
      expect(meshVertexGrid({ width: 100, height: 100 }, 1)).toMatchObject({ segX: 1, segY: 1 })
    })
  })
})

describe('meshWorldDepth', () => {
  describe('happy path', () => {
    it('makes a square grid a square plane', () => {
      expect(meshWorldDepth({ width: 100, height: 100 }, 12)).toBeCloseTo(12)
    })
  })

  describe('variants', () => {
    it('shortens the plane for a grid wider than it is tall', () => {
      expect(meshWorldDepth({ width: 200, height: 100 }, 12)).toBeCloseTo(6)
    })

    it('lengthens the plane for a grid taller than it is wide', () => {
      expect(meshWorldDepth({ width: 100, height: 200 }, 12)).toBeCloseTo(24)
    })

    it('agrees with the aspect the vertex grid reports', () => {
      // The two must not drift: the plane's proportions and its vertex rows come from the same shape.
      const frame = { width: 1280, height: 1164 }
      expect(meshWorldDepth(frame, 12)).toBeCloseTo(12 / meshVertexGrid(frame, 512).aspect)
    })
  })

  // L3 (managed errors): N/A — a pure ratio handles no failure of its own; a degenerate frame is not
  // caught here but carried, and that is asserted just below.

  describe('unmanaged errors', () => {
    it('surfaces a zero-width grid as a non-finite depth', () => {
      expect(meshWorldDepth({ width: 0, height: 100 }, 12)).toBe(Number.POSITIVE_INFINITY)
    })
  })

  describe('edge cases', () => {
    it('collapses to nothing for a zero-width plane', () => {
      expect(meshWorldDepth({ width: 100, height: 100 }, 0)).toBe(0)
    })
  })
})
