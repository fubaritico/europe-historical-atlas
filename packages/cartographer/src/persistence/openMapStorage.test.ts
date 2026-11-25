import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  OPEN_MAP_KEY,
  createTabMapKeeper,
  forgetOpenMap,
  keepOpenMap,
  keptOpenMap,
} from './openMapStorage'

import type { PageStorage } from './guardedStorage'

/** A tab's storage in memory. */
function memory(): PageStorage & { items: Map<string, string> } {
  const items = new Map<string, string>()
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value)
    },
  }
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('openMapStorage', () => {
  describe('happy path', () => {
    it('reads back the map kept open', () => {
      const storage = memory()
      keepOpenMap(storage, '1100-backup-2026-11-02')
      expect(keptOpenMap(storage)).toBe('1100-backup-2026-11-02')
    })
  })

  describe('variants', () => {
    it('reads no map in a new tab', () => {
      expect(keptOpenMap(memory())).toBeNull()
    })

    it('reads no map once it was closed', () => {
      const storage = memory()
      keepOpenMap(storage, '1100')
      forgetOpenMap(storage)
      expect(keptOpenMap(storage)).toBeNull()
    })
  })

  describe('managed errors', () => {
    it('opens on the start screen when the name kept cannot be a map’s, and says what it read', () => {
      const storage = memory()
      storage.setItem(OPEN_MAP_KEY, '../secret')
      expect(keptOpenMap(storage)).toBeNull()
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('« ../secret »'))
    })
  })

  describe('unmanaged errors', () => {
    it('says a write the browser refused, for the map kept and for none', () => {
      const refusing: PageStorage = { getItem: () => null, setItem: () => undefined }
      expect([keepOpenMap(refusing, '1100'), forgetOpenMap(refusing)]).toEqual([false, false])
    })

    it('says a write that held', () => {
      const storage = memory()
      expect([keepOpenMap(storage, '1100'), forgetOpenMap(storage)]).toEqual([true, true])
    })
  })

  describe('edge cases', () => {
    it('says nothing for a map closed, which is no defect', () => {
      const storage = memory()
      forgetOpenMap(storage)
      keptOpenMap(storage)
      expect(console.warn).not.toHaveBeenCalled()
    })
  })
})

/**
 * A keeper over a storage, its reloads and refusals recorded.
 * @param storage - the tab's storage
 * @returns the keeper and what it did
 */
function keeper(storage: PageStorage) {
  const did: string[] = []
  const kept = createTabMapKeeper({
    storage,
    reload: () => did.push('reload'),
    refused: (map) => did.push(`refused ${map ?? 'the start screen'}`),
  })
  return { kept, did }
}

describe('createTabMapKeeper', () => {
  const refusing: PageStorage = { getItem: () => null, setItem: () => undefined }

  describe('happy path', () => {
    it('keeps the map, then reloads on it', () => {
      const storage = memory()
      const { kept, did } = keeper(storage)
      kept.reloadOn('1200')
      expect([keptOpenMap(storage), did]).toEqual(['1200', ['reload']])
    })
  })

  describe('variants', () => {
    it('keeps no map, then reloads on the start screen', () => {
      const storage = memory()
      keepOpenMap(storage, '1100')
      const { kept, did } = keeper(storage)
      kept.reloadOn(null)
      expect([keptOpenMap(storage), did]).toEqual([null, ['reload']])
    })

    it('forgets the map and reloads on the start screen — « Se déconnecter »', () => {
      const storage = memory()
      keepOpenMap(storage, '1100')
      const { kept, did } = keeper(storage)
      kept.forget()
      expect([keptOpenMap(storage), did]).toEqual([null, ['reload']])
    })

    it('follows Save as… with no reload', () => {
      const storage = memory()
      const { kept, did } = keeper(storage)
      kept.follow('1100-essai')
      expect([keptOpenMap(storage), did]).toEqual(['1100-essai', []])
    })
  })

  describe('managed errors', () => {
    it('reloads nothing when the browser refused the write, and says it', () => {
      const { kept, did } = keeper(refusing)
      kept.reloadOn('1200')
      kept.reloadOn(null)
      kept.follow('1100-essai')
      expect(did).toEqual(['refused 1200', 'refused the start screen', 'refused 1100-essai'])
    })
  })

  // L4, L5: N/A — the storage's own failures are `guardedStorage`'s; read back above.
})
