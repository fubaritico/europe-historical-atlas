import { afterEach, describe, expect, it, vi } from 'vitest'

import { CARRIED_VIEW_KEY, carryView, takeCarriedView } from './carriedView'

import type { ViewStorage } from './carriedView'

/** A tab's storage, in memory. */
function memory(): ViewStorage & { held: Map<string, string> } {
  const held = new Map<string, string>()
  return {
    held,
    getItem: (key) => held.get(key) ?? null,
    setItem: (key, value) => {
      held.set(key, value)
    },
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('the view carried to the next map', () => {
  describe('happy path', () => {
    it('gives back the view carried', () => {
      const storage = memory()
      carryView(storage, { scale: 12, originX: -340, originY: 85 })
      expect(takeCarriedView(storage)).toEqual({ scale: 12, originX: -340, originY: 85 })
    })
  })

  describe('variants', () => {
    // CARTO-427: the view is kept, not taken once — a reload opens on it too.
    it('gives it back at every opening, so a reload opens on the same view', () => {
      const storage = memory()
      carryView(storage, { scale: 12, originX: 0, originY: 0 })
      takeCarriedView(storage)
      expect(takeCarriedView(storage)).toEqual({ scale: 12, originX: 0, originY: 0 })
    })
  })

  describe('managed errors', () => {
    it('opens on the whole map when the carried view is not one, and says so', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const storage = memory()
      storage.setItem(CARRIED_VIEW_KEY, JSON.stringify({ scale: 0, originX: 1, originY: 2 }))
      expect(takeCarriedView(storage)).toBeNull()
      expect(warn).toHaveBeenCalledOnce()
    })
  })

  describe('unmanaged errors', () => {
    it('opens on the whole map when the storage holds text that is not JSON', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const storage = memory()
      storage.setItem(CARRIED_VIEW_KEY, '{oops')
      expect(takeCarriedView(storage)).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('answers nothing when no view was carried', () => {
      expect(takeCarriedView(memory())).toBeNull()
    })
  })
})
