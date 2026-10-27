// @vitest-environment jsdom
import { DataTexture } from 'three'
import { describe, expect, it, vi } from 'vitest'

import {
  BEYOND_OUTLINE_KM,
  featherOpacity,
  tribeOpacity,
} from '@europe-historical-atlas/core/editor/tribeFeather'
import { planeHeight } from '@europe-historical-atlas/core/pipeline/gridDrape'

import { MODE_INDEX } from '../tintOnRelief'

import { tribeBuffers } from './tribeBuffers'
import { TRIBE_RENDER_ORDER, createTribeLayer } from './tribeLayer'
import { TRIBE_FRAGMENT_SHADER, TRIBE_OPACITY_GLSL, shaderOpacity } from './tribeShader'

import type { TribeLayerOptions } from './tribeLayer'

const GRID = { segX: 4, segY: 4 }
/** A relief whose height at a node is its column plus ten times its row: no two planes agree. */
const nodeY = (ix: number, iy: number): number => ix + 10 * iy

/** Two triangles, six vertices, with a distance each: inside, on the outline, outside. */
const PATCH = {
  tint: { r: 65, g: 88, b: 11 },
  triangles: Float32Array.from([0.1, 0.1, 0.3, 0.1, 0.1, 0.3, 0.6, 0.6, 0.9, 0.6, 0.6, 0.9]),
  distances: Float32Array.from([-20, -10, 0, 5, 10, 30]),
  claimed: Float32Array.from([40, 40, 40, 40, -3, 40]),
  land: Float32Array.from([1, 1, 1, 1, 1, 0]),
}

/**
 * Options over the patch, overridable.
 * @param over - what to change
 * @returns the options
 */
const options = (over: Partial<TribeLayerOptions> = {}): TribeLayerOptions => ({
  patches: [PATCH],
  grid: GRID,
  nodeY,
  worldWidth: 4,
  worldDepth: 2,
  map: new DataTexture(new Uint8Array(16), 2, 2),
  mode: 'overlay',
  strength: 0.8,
  feather: { mode: 'inset', widthKm: 15 },
  ...over,
})

/**
 * The value of one of the layer's uniforms.
 * @param layer - the layer
 * @param name - the uniform
 * @returns its value
 */
const uniform = (layer: ReturnType<typeof createTribeLayer>, name: string): unknown =>
  layer.object.material.uniforms[name]?.value

describe('tribeBuffers', () => {
  describe('happy path', () => {
    it('lays each vertex on the relief plane under it, in world space', () => {
      const { positions } = tribeBuffers(options())
      expect(positions[0]).toBeCloseTo((0.1 - 0.5) * 4)
      expect(positions[1]).toBeCloseTo(planeHeight(0.1, 0.1, GRID, nodeY))
      expect(positions[2]).toBeCloseTo((0.1 - 0.5) * 2)
    })

    it('carries each vertex’s distances, its land and the tribe’s colour beside it', () => {
      const { distances, tints, claimed, land } = tribeBuffers(options())
      expect([...distances]).toEqual([-20, -10, 0, 5, 10, 30])
      expect([...claimed]).toEqual([40, 40, 40, 40, -3, 40])
      expect([...land]).toEqual([1, 1, 1, 1, 1, 0])
      expect([...tints.slice(0, 3)]).toEqual([65, 88, 11])
    })
  })

  describe('variants', () => {
    it('puts two tribes one after the other, each in its colour', () => {
      const other = { ...PATCH, tint: { r: 1, g: 2, b: 3 } }
      const { tints, distances } = tribeBuffers(options({ patches: [PATCH, other] }))
      expect(distances.length).toBe(12)
      expect([...tints.slice(18, 21)]).toEqual([1, 2, 3])
    })
  })

  describe('managed errors', () => {
    it('refuses a patch with fewer distances than vertices', () => {
      const short = { ...PATCH, distances: Float32Array.from([1, 2]) }
      expect(() => tribeBuffers(options({ patches: [short] }))).toThrow(/distances/)
    })

    it('refuses a patch with fewer land values than vertices', () => {
      const short = { ...PATCH, land: Float32Array.from([1]) }
      expect(() => tribeBuffers(options({ patches: [short] }))).toThrow(/land/)
    })
  })

  describe('unmanaged errors', () => {
    // L4: N/A — arithmetic over typed arrays the caller built; nothing asynchronous.
    it('carries a NaN distance through, rather than reading it as far outside', () => {
      const broken = { ...PATCH, distances: Float32Array.from([Number.NaN, 0, 0, 0, 0, 0]) }
      expect(tribeBuffers(options({ patches: [broken] })).distances[0]).toBeNaN()
    })
  })

  describe('edge cases', () => {
    it('builds empty buffers for no tribe', () => {
      const { positions, distances } = tribeBuffers(options({ patches: [] }))
      expect(positions.length).toBe(0)
      expect(distances.length).toBe(0)
    })
  })
})

describe('createTribeLayer', () => {
  describe('happy path', () => {
    it('blends over what is drawn, after the fills, without writing depth', () => {
      const layer = createTribeLayer(options())
      expect(layer.object.material.transparent).toBe(true)
      expect(layer.object.material.depthWrite).toBe(false)
      expect(layer.object.renderOrder).toBe(TRIBE_RENDER_ORDER)
      layer.dispose()
    })

    it('starts from the feather it is given: inset at 15 km is a shift of zero', () => {
      const layer = createTribeLayer(options())
      expect(uniform(layer, 'featherWidth')).toBe(15)
      expect(uniform(layer, 'featherShift')).toBe(0)
    })
  })

  describe('variants', () => {
    it('moves the fade outside the outline with no rebuild', () => {
      const layer = createTribeLayer(options())
      const geometry = layer.object.geometry
      layer.setFeather({ mode: 'outset', widthKm: 25 })
      expect(uniform(layer, 'featherWidth')).toBe(25)
      expect(uniform(layer, 'featherShift')).toBe(25)
      expect(layer.object.geometry).toBe(geometry)
    })

    it('retunes the blend and the strength as the fills are retuned', () => {
      const layer = createTribeLayer(options())
      layer.setLook('multiply', 0.5)
      expect(uniform(layer, 'mode')).toBe(MODE_INDEX.multiply)
      expect(uniform(layer, 'strength')).toBe(0.5)
    })

    it('composites onto a freshly baked terrain', () => {
      const layer = createTribeLayer(options())
      const baked = new DataTexture(new Uint8Array(16), 2, 2)
      layer.setMap(baked)
      expect(uniform(layer, 'map')).toBe(baked)
    })

    it('pins the opacity GLSL its CPU mirror copies, and puts it in the fragment stage', () => {
      // An edit to the GLSL fails here until `shaderOpacity` — compared with core below — is edited to match.
      expect(TRIBE_OPACITY_GLSL).toBe(`
    float opacity = smoothstep(0.0, 1.0, clamp((featherShift - vDistance) / featherWidth, 0.0, 1.0));
    float beyond = step(0.000001, vDistance);
    float free = step(0.0, vClaimed) * step(0.5, vLand);
    opacity *= 1.0 - beyond * (1.0 - free);
`)
      expect(TRIBE_FRAGMENT_SHADER).toContain(TRIBE_OPACITY_GLSL)
    })
  })

  describe('managed errors', () => {
    it('divides by a hair rather than by zero for a width of zero — a hard edge', () => {
      const layer = createTribeLayer(options({ feather: { mode: 'inset', widthKm: 0 } }))
      expect(uniform(layer, 'featherWidth')).toBeGreaterThan(0)
      expect(uniform(layer, 'featherShift')).toBe(0)
    })
  })

  describe('unmanaged errors', () => {
    it('says so when a uniform it writes has gone missing', () => {
      const layer = createTribeLayer(options())
      delete layer.object.material.uniforms.featherShift
      expect(() => {
        layer.setFeather({ mode: 'outset', widthKm: 10 })
      }).toThrow(/featherShift/)
    })
  })

  describe('edge cases', () => {
    it('frees its geometry and material, and leaves the texture to its owner', () => {
      const map = new DataTexture(new Uint8Array(16), 2, 2)
      const layer = createTribeLayer(options({ map }))
      const geometry = vi.spyOn(layer.object.geometry, 'dispose')
      const material = vi.spyOn(layer.object.material, 'dispose')
      const texture = vi.spyOn(map, 'dispose')
      layer.dispose()
      expect(geometry).toHaveBeenCalled()
      expect(material).toHaveBeenCalled()
      expect(texture).not.toHaveBeenCalled()
    })
  })
})

describe('shaderOpacity', () => {
  /** Distances across both ramps, the outline and core's threshold either side of it included. */
  const DISTANCES = [
    -45,
    -30,
    -15,
    -3.75,
    -1e-3,
    0,
    BEYOND_OUTLINE_KM / 2,
    BEYOND_OUTLINE_KM,
    1e-3,
    10,
    29.9,
    30,
    45,
  ]
  const CLAIMED = [-5, -1e-6, 0, 5]
  const LAND = [true, false]
  const FEATHERS = [
    { mode: 'inset', widthKm: 30 },
    { mode: 'outset', widthKm: 30 },
    { mode: 'outset', widthKm: 15 },
  ] as const

  describe('happy path', () => {
    // QUAL-004: the outset spill cut lived only in GLSL; its mirror answers as core over every combination.
    it('answers as core’s tribeOpacity over a table of distance, neighbour and land, both modes', () => {
      for (const feather of FEATHERS)
        for (const signedKm of DISTANCES)
          for (const claimedKm of CLAIMED)
            for (const land of LAND)
              expect(
                shaderOpacity(
                  { distance: signedKm, claimed: claimedKm, land: land ? 1 : 0 },
                  feather
                ),
                `${feather.mode} ${String(feather.widthKm)} d=${String(signedKm)} c=${String(claimedKm)} land=${String(land)}`
              ).toBeCloseTo(tribeOpacity({ signedKm, claimedKm, land }, feather), 9)
    })
  })

  describe('variants', () => {
    it('reads the ramp as core’s smoothstep of (shift − d) / width', () => {
      const t = (0 - -3.75) / 15
      expect(
        shaderOpacity({ distance: -3.75, claimed: 5, land: 1 }, { mode: 'inset', widthKm: 15 })
      ).toBeCloseTo(t * t * (3 - 2 * t), 12)
      expect(featherOpacity(-3.75, 15, 'inset')).toBeCloseTo(t * t * (3 - 2 * t), 12)
    })
  })

  describe('managed errors', () => {
    it('cuts an outset spill over a neighbour and over the sea, and keeps it over free land', () => {
      const outset = { mode: 'outset', widthKm: 30 } as const
      expect(shaderOpacity({ distance: 10, claimed: -3, land: 1 }, outset)).toBe(0)
      expect(shaderOpacity({ distance: 10, claimed: 40, land: 0 }, outset)).toBe(0)
      expect(shaderOpacity({ distance: 10, claimed: 40, land: 1 }, outset)).toBeGreaterThan(0)
    })
  })

  // L4: N/A — a NaN varying has no defined GLSL result to mirror; core's NaN answer is tested in core.

  describe('edge cases', () => {
    it('cuts from core’s threshold exactly, never below it', () => {
      const outset = { mode: 'outset', widthKm: 30 } as const
      expect(
        shaderOpacity({ distance: BEYOND_OUTLINE_KM / 2, claimed: -5, land: 1 }, outset)
      ).toBeCloseTo(1, 9)
      expect(shaderOpacity({ distance: BEYOND_OUTLINE_KM, claimed: -5, land: 1 }, outset)).toBe(0)
    })
  })
})
