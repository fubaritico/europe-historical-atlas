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
    removeItem: (key) => {
      held.delete(key)
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
    it('gives it back once, so a plain reload opens on the whole map', () => {
      const storage = memory()
      carryView(storage, { scale: 12, originX: 0, originY: 0 })
      takeCarriedView(storage)
      expect(takeCarriedView(storage)).toBeNull()
    })
  })

  describe('managed errors', () => {
    it('opens on the whole map when the carried view is not one, and says so', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const storage = memory()
      storage.setItem(CARRIED_VIEW_KEY, JSON.stringify({ scale: 0, originX: 1, originY: 2 }))
      expect(takeCarriedView(storage)).toBeNull()
      expect(warn).toHaveBeenCalledOnce()
      expect(storage.held.has(CARRIED_VIEW_KEY)).toBe(false)
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
