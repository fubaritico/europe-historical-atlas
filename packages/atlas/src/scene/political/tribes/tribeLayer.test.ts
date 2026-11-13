// @vitest-environment jsdom
import { DataTexture } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { bandWave } from '@europe-historical-atlas/core/editor/tribeFeather'

import { MODE_INDEX } from '../tintOnRelief'

import { options, uniform } from './testing/tribeFixtures'
import { TRIBE_RENDER_ORDER, createTribeLayer } from './tribeLayer'
import { BAND_WAVE_GLSL, TRIBE_FRAGMENT_SHADER, TRIBE_OPACITY_GLSL } from './tribeShader'

const reference = (u: number, v: number, wave: number): number => {
  const k = (2 * Math.PI) / wave
  const [x, y] = [u * 8000, v * 8000]
  return (
    (Math.sin(k * (0.83 * x + 0.56 * y) + 1.3) +
      Math.sin(1.37 * k * (-0.41 * x + 0.91 * y) + 4.1) +
      Math.sin(0.71 * k * (0.97 * x - 0.24 * y) + 2.7)) /
    3
  )
}

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

    // The dev, 2026-11-02: the band's three uniforms, written at the making and again on each change.
    it('writes the band, its irregularity and its wavelength, then a change of them', () => {
      const layer = createTribeLayer(
        options({ feather: { mode: 'band', widthKm: 30, irregularity: 0.5, waveKm: 200 } })
      )
      expect([
        uniform(layer, 'featherBand'),
        uniform(layer, 'featherIrregularity'),
        uniform(layer, 'featherWave'),
      ]).toEqual([1, 0.5, 200])
      layer.setFeather({ mode: 'inset', widthKm: 30, irregularity: 0.25, waveKm: 90 })
      expect([
        uniform(layer, 'featherBand'),
        uniform(layer, 'featherIrregularity'),
        uniform(layer, 'featherWave'),
      ]).toEqual([0, 0.25, 90])
    })

    it('pins the band’s wave GLSL, term for term with core’s', () => {
      // An edit to either copy fails here: the text below, and core's values at three fixed points.
      expect(BAND_WAVE_GLSL).toBe(`
  float bandWave(vec2 at, float waveKm) {
    float k = 6.283185307179586 / waveKm;
    float x = at.x * 8000.0;
    float y = at.y * 8000.0;
    return (sin(k * (0.83 * x + 0.56 * y) + 1.3)
      + sin(1.37 * k * (-0.41 * x + 0.91 * y) + 4.1)
      + sin(0.71 * k * (0.97 * x - 0.24 * y) + 2.7)) / 3.0;
  }
`)
      expect(TRIBE_FRAGMENT_SHADER).toContain(BAND_WAVE_GLSL)
      for (const [u, v, wave] of [
        [0.1, 0.2, 150],
        [0.5, 0.5, 300],
        [0.83, 0.07, 60],
      ] as const)
        expect(bandWave(u, v, wave)).toBeCloseTo(reference(u, v, wave), 12)
    })

    it('pins the opacity GLSL its CPU mirror copies, and puts it in the fragment stage', () => {
      // An edit to the GLSL fails here until `shaderOpacity` — compared with core below — is edited to match.
      expect(TRIBE_OPACITY_GLSL).toBe(`
    float fade = smoothstep(0.0, 1.0, clamp((featherShift - vDistance) / featherWidth, 0.0, 1.0));
    float inside = 1.0 - step(0.0, vDistance);
    vec2 framed = vec2(vUv.x, 1.0 - vUv.y);
    float bandWidth = clamp(
      featherWidth * (1.0 + featherIrregularity * bandWave(framed, featherWave)),
      0.0,
      60.0
    );
    float band = inside * mix(0.500, 1.0, step(bandWidth, -vDistance));
    float opacity = mix(fade, band, featherBand);
    // An outlined tribe (CARTO-439), core's TRIBE_OUTLINED_FEATHER written in: full within the rim, half to the width,
    // nothing deeper — both limits undulating by its own wave, as the Cartographer draws it.
    float rimWave = 1.0 + 0.500 * bandWave(framed, 150.0);
    float rimInner = clamp(15.0 * rimWave, 0.0, 60.0);
    float rimOuter = clamp(30.0 * rimWave, 0.0, 60.0);
    float rim = inside * mix(1.0, 0.500 * (1.0 - step(rimOuter, -vDistance)), step(rimInner, -vDistance));
    opacity = mix(opacity, rim, vOutlined);
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
