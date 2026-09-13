import { describe, expect, it, vi } from 'vitest'

import { createDebugRect } from './debugRect'

import type { BufferAttribute } from 'three'

// L3/L4 (managed/unmanaged errors): N/A — a pure geometry factory with no external inputs to fail.
describe('createDebugRect', () => {
  describe('happy path', () => {
    it('creates a hidden 4-vertex line loop drawn on top', () => {
      const rect = createDebugRect('#ffffff')
      expect(rect.object.visible).toBe(false)
      expect(rect.object.renderOrder).toBe(999)
      expect(rect.object.material.depthTest).toBe(false)
      expect(rect.object.geometry.getAttribute('position').count).toBe(4)
    })
  })

  describe('variants', () => {
    it('toggles visibility', () => {
      const rect = createDebugRect('#ffffff')
      rect.setVisible(true)
      expect(rect.object.visible).toBe(true)
      rect.setVisible(false)
      expect(rect.object.visible).toBe(false)
    })

    it('updates the corner positions from a rect at height y', () => {
      const rect = createDebugRect('#ffffff')
      rect.update({ minX: -1, maxX: 2, minZ: -3, maxZ: 4 }, 0.5)
      const pos = rect.object.geometry.getAttribute('position') as BufferAttribute
      expect([pos.getX(0), pos.getY(0), pos.getZ(0)]).toEqual([-1, 0.5, -3])
      expect([pos.getX(2), pos.getZ(2)]).toEqual([2, 4])
    })
  })

  describe('edge cases', () => {
    it('disposes geometry and material without leaking', () => {
      const rect = createDebugRect('#ffffff')
      const geometry = vi.spyOn(rect.object.geometry, 'dispose')
      const material = vi.spyOn(rect.object.material, 'dispose')
      rect.dispose()
      expect(geometry).toHaveBeenCalledOnce()
      expect(material).toHaveBeenCalledOnce()
    })
  })
})
