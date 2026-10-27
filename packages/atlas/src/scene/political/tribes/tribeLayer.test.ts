// @vitest-environment jsdom
import { DataTexture } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { MODE_INDEX } from '../tintOnRelief'

import { options, uniform } from './testing/tribeFixtures'
import { TRIBE_RENDER_ORDER, createTribeLayer } from './tribeLayer'
import { TRIBE_FRAGMENT_SHADER, TRIBE_OPACITY_GLSL } from './tribeShader'

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
