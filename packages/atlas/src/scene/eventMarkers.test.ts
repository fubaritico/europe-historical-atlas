import { Group } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { EVENT_MARKER_STYLE, createEventMarkers } from './eventMarkers'

import type { Mesh, MeshBasicMaterial } from 'three'

describe('createEventMarkers', () => {
  describe('happy path', () => {
    it('stands one pin on each ground position', () => {
      const markers = createEventMarkers([
        [1, 0.2, -1],
        [2, 0.3, 0],
      ])
      expect(markers.object.children).toHaveLength(2)
      expect(markers.object.children[0]?.position.toArray()).toEqual([1, 0.2, -1])
    })
  })

  describe('variants', () => {
    it('gives each pin a stem and a head', () => {
      const pin = createEventMarkers([[0, 0, 0]]).object.children[0] as Group
      expect(pin.children).toHaveLength(2)
    })

    it('paints the pins in the style’s colour', () => {
      const pin = createEventMarkers([[0, 0, 0]], { ...EVENT_MARKER_STYLE, color: '#00ff00' })
        .object.children[0] as Group
      const mesh = pin.children[0] as Mesh<never, MeshBasicMaterial>
      expect(mesh.material.color.getHexString()).toBe('00ff00')
    })
  })

  // L3: N/A — no input the module refuses: the ground positions come already placed
  // L4: N/A — no async work, nothing external

  describe('edge cases', () => {
    it('keeps a pin planted when the relief is exaggerated', () => {
      const markers = createEventMarkers([[0, 0.2, 0]])
      markers.setReliefScale(3)
      expect(markers.object.children[0]?.position.y).toBeCloseTo(0.6)
    })

    it('builds an empty group for no events', () => {
      expect(createEventMarkers([]).object.children).toHaveLength(0)
    })

    it('frees the shared geometries and material on dispose', () => {
      const markers = createEventMarkers([[0, 0, 0]])
      const pin = markers.object.children[0] as Group
      const [stem, head] = pin.children as Mesh[]
      const spies = [stem?.geometry, head?.geometry, stem?.material].map((resource) =>
        vi.spyOn(resource as { dispose: () => void }, 'dispose')
      )
      markers.dispose()
      for (const spy of spies) expect(spy).toHaveBeenCalledTimes(1)
    })
  })
})
