import { Mesh, Texture } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { createCompassRose } from './compassRose'

import type { CompassRoseColors } from './compassRoseSvg'

const COLORS: CompassRoseColors = { ink: '#4a3424', halfWind: '#3f5e3a', quarterWind: '#7a2230' }

const opts = {
  colors: COLORS,
  labels: true,
  size: 2.5,
  opacity: 0.65,
  position: [1, 0.01, -2] as [number, number, number],
}

describe('createCompassRose', () => {
  describe('happy path', () => {
    it('builds a Mesh with the rasterised texture, opacity and position', () => {
      const texture = new Texture()
      const rose = createCompassRose({ ...opts, loadTexture: () => texture })
      expect(rose.object).toBeInstanceOf(Mesh)
      expect(rose.object.material.map).toBe(texture)
      expect(rose.object.material.opacity).toBe(0.65)
      expect([rose.object.position.x, rose.object.position.y, rose.object.position.z]).toEqual([
        1, 0.01, -2,
      ])
    })
  })

  describe('variants', () => {
    it('passes the built SVG to the injected rasteriser', () => {
      let captured = ''
      const load = (svg: string): Texture => {
        captured = svg
        return new Texture()
      }
      createCompassRose({ ...opts, loadTexture: load })
      expect(captured).toContain('<svg')
      expect(captured).toContain('>NE<')
    })
  })

  // L3/L4: N/A — synchronous build; the rasteriser is injected (no real image decode here).

  describe('edge cases', () => {
    it('frees geometry, material and texture on dispose (no GPU leak)', () => {
      const texture = new Texture()
      const rose = createCompassRose({ ...opts, loadTexture: () => texture })
      const geomSpy = vi.spyOn(rose.object.geometry, 'dispose')
      const matSpy = vi.spyOn(rose.object.material, 'dispose')
      const texSpy = vi.spyOn(texture, 'dispose')
      rose.dispose()
      expect(geomSpy).toHaveBeenCalledOnce()
      expect(matSpy).toHaveBeenCalledOnce()
      expect(texSpy).toHaveBeenCalledOnce()
    })
  })
})
