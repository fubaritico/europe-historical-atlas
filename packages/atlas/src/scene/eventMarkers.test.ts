import { Group, Quaternion, Vector3 } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { BORDER_RENDER_ORDER } from '../mapLayerContext'

import {
  EVENT_MARKER_STYLE,
  EVENT_RENDER_ORDER,
  combineEventMarkers,
  createEventMarkers,
} from './eventMarkers'

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

    it('draws the pins in the transparent pass, ordered after the borders', () => {
      const pin = createEventMarkers([[0, 0, 0]]).object.children[0] as Group
      const mesh = pin.children[0] as Mesh<never, MeshBasicMaterial>
      expect(mesh.material.transparent).toBe(true)
      expect(pin.renderOrder).toBe(EVENT_RENDER_ORDER)
      expect(EVENT_RENDER_ORDER).toBeGreaterThan(BORDER_RENDER_ORDER)
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

    it('holds several markers as one: scaled and freed together', () => {
      const pins = createEventMarkers([[0, 0.2, 0]])
      const more = createEventMarkers([[1, 0.1, 0]])
      const disposes = [vi.spyOn(pins, 'dispose'), vi.spyOn(more, 'dispose')]
      const faces = [vi.spyOn(pins, 'faceCamera'), vi.spyOn(more, 'faceCamera')]
      const both = combineEventMarkers([pins, more])
      const camera = { position: new Vector3(0, 1, 1), quaternion: new Quaternion() }
      const zooms = [vi.spyOn(pins, 'setZoom'), vi.spyOn(more, 'setZoom')]
      both.setReliefScale(2)
      both.setZoom(0.7, 100)
      for (const spy of zooms) expect(spy).toHaveBeenCalledWith(0.7, 100)
      both.faceCamera(camera, 2)
      both.dispose()
      for (const spy of faces) expect(spy).toHaveBeenCalledWith(camera, 2)
      expect(both.object.children).toEqual([pins.object, more.object])
      expect(more.object.children[0]?.position.y).toBeCloseTo(0.2)
      for (const spy of disposes) expect(spy).toHaveBeenCalledTimes(1)
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
