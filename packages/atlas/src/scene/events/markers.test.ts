import { Quaternion, Texture, Vector3 } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { combineEventMarkers } from './markers'
import { createPinMarkers } from './pin'

describe('combineEventMarkers', () => {
  // L1–L2: one case covers it — every call is passed on to each kind, and the groups are held together
  // L3: N/A — nothing is refused
  // L4: N/A — no async work, nothing external

  describe('happy path', () => {
    it('holds several markers as one: scaled and freed together', () => {
      const pins = createPinMarkers(
        [{ ground: [0, 0.2, 0], colour: '#e3170a' }],
        () => new Texture()
      )
      const more = createPinMarkers(
        [{ ground: [1, 0.1, 0], colour: '#e3170a' }],
        () => new Texture()
      )
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
      expect(pins.object.children[0]?.children[0]?.position.y).toBeCloseTo(0.4)
      expect(more.object.children[0]?.children[0]?.position.y).toBeCloseTo(0.2)
      for (const spy of disposes) expect(spy).toHaveBeenCalledTimes(1)
    })
  })

  describe('edge cases', () => {
    it('holds an empty group for no markers', () => {
      expect(combineEventMarkers([]).object.children).toHaveLength(0)
    })
  })
})
