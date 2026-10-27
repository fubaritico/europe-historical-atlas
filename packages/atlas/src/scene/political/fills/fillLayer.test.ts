// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { createFillLayer } from './fillLayer'
import { LORD, VASSAL, options, relief, texture, twoPolities } from './testing/fillFixtures'

describe('createFillLayer', () => {
  describe('happy path', () => {
    it('builds one mesh drawn after the relief, pulled forward in depth to win against it', () => {
      const layer = createFillLayer(options())
      expect(layer.object.renderOrder).toBeGreaterThan(relief.renderOrder)
      expect(layer.object.material.polygonOffset).toBe(true)
      expect(layer.object.material.polygonOffsetFactor).toBeLessThan(0)
      layer.dispose()
    })
  })

  describe('variants', () => {
    it('follows a new texture and a new blend without a rebuild', () => {
      const layer = createFillLayer(options())
      const next = texture()
      layer.setMap(next)
      layer.setLook('multiply', 0.4)
      expect(layer.object.material.uniforms.map?.value).toBe(next)
      expect(layer.object.material.uniforms.mode?.value).toBe(1)
      expect(layer.object.material.uniforms.strength?.value).toBe(0.4)
      layer.dispose()
    })

    it('carries one attribute per level and opens on the deepest, every polity in its own colour', () => {
      const layer = createFillLayer(
        options({
          fills: twoPolities(),
          tintLevels: [
            [LORD, LORD],
            [LORD, VASSAL],
          ],
        })
      )
      expect(layer.object.geometry.getAttribute('tint0')).toBeDefined()
      expect(layer.object.geometry.getAttribute('tint1')).toBeDefined()
      expect(layer.object.material.uniforms.detail?.value).toBe(1)
      layer.dispose()
    })

    it('follows the zoom’s detail without touching the geometry', () => {
      const layer = createFillLayer(
        options({
          fills: twoPolities(),
          tintLevels: [
            [LORD, LORD],
            [LORD, VASSAL],
          ],
        })
      )
      const before = layer.object.geometry.getAttribute('tint0')
      layer.setDetail(0.25)
      expect(layer.object.material.uniforms.detail?.value).toBe(0.25)
      expect(layer.object.geometry.getAttribute('tint0')).toBe(before)
      layer.dispose()
    })
  })

  describe('managed errors', () => {
    it('builds an empty mesh when no polity has a tint', () => {
      const layer = createFillLayer(options({ tintLevels: [[null]] }))
      expect(layer.object.geometry.getAttribute('position').count).toBe(0)
      layer.dispose()
    })
  })

  // L4 (unmanaged errors): N/A — no asynchronous work, no outside source; a missing uniform is a
  // programming error and throws, which `setLook`'s own test would show the day one is renamed.

  describe('edge cases', () => {
    it('frees its geometry and material on dispose', () => {
      const layer = createFillLayer(options())
      let freed = 0
      layer.object.geometry.addEventListener('dispose', () => (freed += 1))
      layer.object.material.addEventListener('dispose', () => (freed += 1))
      layer.dispose()
      expect(freed).toBe(2)
    })
  })
})
