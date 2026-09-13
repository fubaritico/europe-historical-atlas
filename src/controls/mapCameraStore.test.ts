// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSessionStorageMapCameraStore } from './mapCameraStore'

import type { MapCameraState } from './mapCameraStore'

const sample: MapCameraState = { target: [1, 0, 2], zoom: 0.4 }

describe('mapCameraStore', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('happy path', () => {
    it('round-trips a snapshot through sessionStorage', () => {
      const store = createSessionStorageMapCameraStore('test:mapcam')
      store.save(sample)
      expect(store.load()).toEqual(sample)
    })

    it('returns null when nothing is stored', () => {
      expect(createSessionStorageMapCameraStore('test:mapcam').load()).toBeNull()
    })
  })

  describe('variants', () => {
    it('isolates state per storage key', () => {
      const a = createSessionStorageMapCameraStore('k:a')
      const b = createSessionStorageMapCameraStore('k:b')
      a.save(sample)
      expect(b.load()).toBeNull()
      expect(a.load()).toEqual(sample)
    })

    it('defaults to a key distinct from the reserved pose store (no collision)', () => {
      createSessionStorageMapCameraStore().save(sample)
      expect(sessionStorage.getItem('europe-map:map-camera')).not.toBeNull()
      expect(sessionStorage.getItem('europe-map:camera')).toBeNull()
    })
  })

  describe('managed errors', () => {
    it('returns null on corrupt JSON', () => {
      sessionStorage.setItem('test:mapcam', '{ not json')
      expect(createSessionStorageMapCameraStore('test:mapcam').load()).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    it('rejects a foreign, wrong-length, or non-numeric shape', () => {
      const store = createSessionStorageMapCameraStore('test:mapcam')
      sessionStorage.setItem('test:mapcam', JSON.stringify({ foo: 1 }))
      expect(store.load()).toBeNull()
      sessionStorage.setItem('test:mapcam', JSON.stringify({ target: [1, 2], zoom: 0 }))
      expect(store.load()).toBeNull()
      // `null` is not a finite number → the Number.isFinite guard rejects it (JSON cannot carry NaN/Infinity).
      sessionStorage.setItem('test:mapcam', JSON.stringify({ target: [null, 0, 0], zoom: 0 }))
      expect(store.load()).toBeNull()
    })

    it('degrades to a no-op when sessionStorage.setItem throws', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota')
      })
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const store = createSessionStorageMapCameraStore('test:mapcam')
      expect(() => {
        store.save(sample)
      }).not.toThrow()
    })
  })

  describe('edge cases', () => {
    it('preserves extreme finite values through a round-trip', () => {
      const store = createSessionStorageMapCameraStore('k:extreme')
      const extreme: MapCameraState = { target: [-1e6, 0, 1e6], zoom: 1 }
      store.save(extreme)
      expect(store.load()).toEqual(extreme)
    })
  })
})
