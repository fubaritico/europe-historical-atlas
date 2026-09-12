import { PerspectiveCamera, Vector3 } from 'three'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { applyCameraState, createSessionStorageCameraStore, readCameraState } from './cameraState'

import type { CameraControls, CameraState } from './cameraState'

/** Build a minimal controls mock (target + spy update). */
function makeControls(): CameraControls {
  return { target: new Vector3(), update: vi.fn() }
}

const sample: CameraState = {
  position: [1, 2, 3],
  quaternion: [0, 0, 0, 1],
  fov: 55,
  target: [4, 5, 6],
}

describe('cameraState', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  describe('happy path', () => {
    it('reads a snapshot from camera + controls', () => {
      const camera = new PerspectiveCamera(60, 1, 0.1, 100)
      camera.position.set(1, 2, 3)
      const controls = makeControls()
      controls.target.set(4, 5, 6)

      const state = readCameraState(camera, controls)

      expect(state.position).toEqual([1, 2, 3])
      expect(state.fov).toBe(60)
      expect(state.target).toEqual([4, 5, 6])
      expect(state.quaternion).toHaveLength(4)
    })

    it('applies a snapshot to camera + controls (and re-syncs)', () => {
      const camera = new PerspectiveCamera(60, 1, 0.1, 100)
      const update = vi.fn()
      const controls: CameraControls = { target: new Vector3(), update }

      applyCameraState(camera, controls, sample)

      expect([camera.position.x, camera.position.y, camera.position.z]).toEqual([1, 2, 3])
      expect(camera.fov).toBe(55)
      expect([controls.target.x, controls.target.y, controls.target.z]).toEqual([4, 5, 6])
      expect(update).toHaveBeenCalledOnce()
    })

    it('round-trips through the sessionStorage store', () => {
      const store = createSessionStorageCameraStore()
      store.save(sample)
      expect(store.load()).toEqual(sample)
    })
  })

  describe('variants', () => {
    it('read → apply → read is stable (idempotent snapshot)', () => {
      const camera = new PerspectiveCamera(42, 2, 0.1, 100)
      camera.position.set(-3, 7.5, 12)
      const controls = makeControls()
      controls.target.set(0.5, -1, 9)
      const first = readCameraState(camera, controls)

      const camera2 = new PerspectiveCamera(60, 1, 0.1, 100)
      const controls2 = makeControls()
      applyCameraState(camera2, controls2, first)

      expect(readCameraState(camera2, controls2)).toEqual(first)
    })

    it('isolates state per storage key', () => {
      const a = createSessionStorageCameraStore('k:a')
      const b = createSessionStorageCameraStore('k:b')
      a.save(sample)
      expect(b.load()).toBeNull()
      expect(a.load()).toEqual(sample)
    })
  })

  describe('managed errors', () => {
    it('returns null when nothing is stored', () => {
      expect(createSessionStorageCameraStore().load()).toBeNull()
    })

    it('returns null for corrupt JSON', () => {
      sessionStorage.setItem('europe-map:camera', '{not json')
      expect(createSessionStorageCameraStore().load()).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    it('returns null for valid JSON with the wrong shape', () => {
      sessionStorage.setItem('europe-map:camera', JSON.stringify({ foo: 1 }))
      expect(createSessionStorageCameraStore().load()).toBeNull()
    })

    it('degrades to a no-op when setItem throws (does not propagate)', () => {
      const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota exceeded')
      })
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

      expect(() => {
        createSessionStorageCameraStore().save(sample)
      }).not.toThrow()

      setItem.mockRestore()
      warn.mockRestore()
    })
  })

  describe('edge cases', () => {
    it('rejects a shape with wrong-length arrays', () => {
      sessionStorage.setItem(
        'europe-map:camera',
        JSON.stringify({ position: [1, 2], quaternion: [0, 0, 0, 1], fov: 50, target: [0, 0, 0] })
      )
      expect(createSessionStorageCameraStore().load()).toBeNull()
    })

    it('preserves extreme numeric values through a round-trip', () => {
      const store = createSessionStorageCameraStore('k:extreme')
      const extreme: CameraState = {
        position: [-1e6, 0, 1e6],
        quaternion: [0, 0, 0, 1],
        fov: 179,
        target: [0, 0, 0],
      }
      store.save(extreme)
      expect(store.load()).toEqual(extreme)
    })
  })
})
