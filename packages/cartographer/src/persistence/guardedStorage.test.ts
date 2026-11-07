import { afterEach, describe, expect, it, vi } from 'vitest'

import { guardedStorage } from './guardedStorage'

import type { PageStorage } from './guardedStorage'

/**
 * A storage in memory.
 * @returns the storage and its content
 */
function memory(): { storage: PageStorage; items: Map<string, string> } {
  const items = new Map<string, string>()
  return {
    storage: {
      getItem: (key) => items.get(key) ?? null,
      setItem: (key, value) => {
        items.set(key, value)
      },
    },
    items,
  }
}

/** What the browser throws when site data is blocked, or the quota is full. */
const REFUSED = new DOMException('The operation is insecure.', 'SecurityError')

afterEach(() => {
  vi.restoreAllMocks()
})

// CARTO-371, the dev, 2026-11-07: « si le navigateur refuse de garder les filtres, on ne le fait pas ».
describe('guardedStorage', () => {
  describe('happy path', () => {
    it('reads back what it wrote, when the browser allows it', () => {
      const { storage } = memory()
      const guarded = guardedStorage(() => storage)
      guarded.setItem('k', 'v')
      expect(guarded.getItem('k')).toBe('v')
    })
  })

  describe('variants', () => {
    it('gives nothing for a key never written', () => {
      expect(guardedStorage(() => memory().storage).getItem('k')).toBeNull()
    })
  })

  describe('managed errors', () => {
    it('keeps nothing and says it once when the storage cannot even be reached — site data blocked', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const guarded = guardedStorage(() => {
        throw REFUSED
      })
      guarded.setItem('k', 'v')
      expect(guarded.getItem('k')).toBeNull()
      guarded.setItem('k', 'w')
      expect(warn).toHaveBeenCalledTimes(1)
      expect(String(warn.mock.calls[0]?.[0])).toContain(
        '[Cartographer] the browser refuses its storage'
      )
    })

    it('carries on when a write is refused — the quota full — and says it once over many writes', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const full: PageStorage = {
        getItem: () => null,
        setItem: () => {
          throw new DOMException('Quota exceeded', 'QuotaExceededError')
        },
      }
      const guarded = guardedStorage(() => full)
      expect(() => {
        guarded.setItem('k', 'v')
        guarded.setItem('k', 'w')
      }).not.toThrow()
      expect(warn).toHaveBeenCalledTimes(1)
    })

    it('reads nothing when a read is refused, and says it once over two reads', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const blocked: PageStorage = {
        getItem: () => {
          throw REFUSED
        },
        setItem: () => undefined,
      }
      const guarded = guardedStorage(() => blocked)
      expect(guarded.getItem('k')).toBeNull()
      expect(guarded.getItem('j')).toBeNull()
      expect(warn).toHaveBeenCalledTimes(1)
    })
  })

  describe('unmanaged errors', () => {
    it('opens the storage once, not at each read', () => {
      const open = vi.fn(() => memory().storage)
      const guarded = guardedStorage(open)
      guarded.getItem('a')
      guarded.getItem('b')
      expect(open).toHaveBeenCalledTimes(1)
    })
  })

  describe('edge cases', () => {
    it('says nothing while the browser allows it', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const guarded = guardedStorage(() => memory().storage)
      guarded.setItem('k', 'v')
      guarded.getItem('k')
      expect(warn).not.toHaveBeenCalled()
    })
  })
})
