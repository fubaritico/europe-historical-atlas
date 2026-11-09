// @vitest-environment jsdom
import { DataTexture } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { FILL_POLYGON_OFFSET } from '../tintOnRelief'
import { TRIBE_RENDER_ORDER } from '../tribes/tribeLayer'

import { HATCH_POLYGON_OFFSET, createHatchLayer } from './hatchLayer'
import { HATCH_FRAGMENT_SHADER, HATCH_VERTEX_SHADER, hatchColourAttribute } from './hatchShader'

import type { HatchLayerOptions } from './hatchLayer'
import type { HatchArrays } from '@europe-historical-atlas/core/pipeline/hatchBuffers'

// ATLAS-399: the hatches drawn over the fills and the tribes, under every line, blended as a fill is.

/** One triangle, red and blue in turn. */
const ARRAYS = (): HatchArrays => ({
  positions: new Float32Array(9),
  colours: [0, 1, 2, 3].map(() => new Uint8Array(9)),
  counts: new Uint8Array([2, 2, 2]),
  indices: Uint32Array.of(0, 1, 2),
})

/**
 * The layer's options, overridable.
 * @param over - what to change
 * @returns the options
 */
function options(over: Partial<HatchLayerOptions> = {}): HatchLayerOptions {
  return {
    arrays: ARRAYS(),
    worldWidth: 10,
    worldDepth: 8,
    stripeWorld: 0.5,
    map: new DataTexture(new Uint8Array(16), 2, 2),
    mode: 'overlay',
    strength: 1,
    ...over,
  }
}

describe('createHatchLayer', () => {
  describe('happy path', () => {
    it('is drawn after the tribes and before every line, so it covers both and hides no line', () => {
      const layer = createHatchLayer(options())
      expect([
        layer.object.renderOrder > TRIBE_RENDER_ORDER,
        layer.object.renderOrder < 0,
        layer.object.material.transparent,
        layer.object.material.depthWrite,
      ]).toEqual([true, true, true, false])
      layer.dispose()
    })

    it('is pulled forward in depth past the fills it lies on', () => {
      const layer = createHatchLayer(options())
      expect([
        layer.object.material.polygonOffsetUnits < FILL_POLYGON_OFFSET.units,
        HATCH_POLYGON_OFFSET.units,
      ]).toEqual([true, 2 * FILL_POLYGON_OFFSET.units])
      layer.dispose()
    })
  })

  describe('variants', () => {
    it('follows a new texture and a new blend without a rebuild', () => {
      const layer = createHatchLayer(options())
      const next = new DataTexture(new Uint8Array(16), 2, 2)
      layer.setMap(next)
      layer.setLook('multiply', 0.4)
      const { uniforms } = layer.object.material
      expect([uniforms.map?.value, uniforms.mode?.value, uniforms.strength?.value]).toEqual([
        next,
        1,
        0.4,
      ])
      layer.dispose()
    })

    it('carries the four colours and their count as the shaders name them, and the stripes’ width', () => {
      const layer = createHatchLayer(options({ stripeWorld: 0.75 }))
      const names = [0, 1, 2, 3].map(hatchColourAttribute)
      const { geometry, material } = layer.object
      expect([
        names.every((name) => name in geometry.attributes),
        'count' in geometry.attributes,
        names.every((name) => HATCH_VERTEX_SHADER.includes(`attribute vec3 ${name};`)),
        material.uniforms.stripeWorld?.value,
      ]).toEqual([true, true, true, 0.75])
      layer.dispose()
    })
  })

  describe('managed errors', () => {
    it('refuses to write a uniform it was not built with', () => {
      const layer = createHatchLayer(options())
      delete layer.object.material.uniforms.mode
      expect(() => {
        layer.setLook('normal', 1)
      }).toThrow(/hatch layer: no uniform "mode"/)
      layer.dispose()
    })
  })

  // L4: N/A — the arrays are built by core's hatchBuffers, whose own suite covers them.

  describe('edge cases', () => {
    it('frees its geometry, its material and its three stripe images, never the terrain', () => {
      const map = new DataTexture(new Uint8Array(16), 2, 2)
      const layer = createHatchLayer(options({ map }))
      const { geometry, material } = layer.object
      const stripes = ['stripes2', 'stripes3', 'stripes4'].map(
        (name) => material.uniforms[name]?.value as DataTexture
      )
      const spies = [geometry, material, ...stripes, map].map((each) => vi.spyOn(each, 'dispose'))
      layer.dispose()
      expect(spies.map((spy) => spy.mock.calls.length)).toEqual([1, 1, 1, 1, 1, 0])
    })

    it('reads every stripe image before choosing, so each has the derivatives its mipmap is chosen by', () => {
      const choice = HATCH_FRAGMENT_SHADER.indexOf('vec4 weights')
      const reads = ['stripes2', 'stripes3', 'stripes4'].map((name) =>
        HATCH_FRAGMENT_SHADER.indexOf(`texture2D(${name}`)
      )
      expect(reads.every((at) => at > 0 && at < choice)).toBe(true)
    })
  })
})
