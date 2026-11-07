import { afterEach, describe, expect, it, vi } from 'vitest'

import { CITY_FILTERS_KEY, readCityFilters, writeCityFilters } from './cityFiltersStorage'

import type { PageStorage } from './guardedStorage'

/**
 * A storage in memory.
 * @param kept - what it holds under the filters' key at first
 * @returns the storage and its content
 */
function memory(kept: string | null = null): { storage: PageStorage; items: Map<string, string> } {
  const items = new Map<string, string>()
  if (kept !== null) items.set(CITY_FILTERS_KEY, kept)
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

afterEach(() => {
  vi.restoreAllMocks()
})

// CARTO-371: the cities' filters, from one session to the next.
describe('cityFiltersStorage', () => {
  describe('happy path', () => {
    it('reads back the Empire and « not at the right place », ticked before the refresh', () => {
      const { storage } = memory()
      writeCityFilters(storage, { holders: ['wd:Q12548'], states: ['misplaced'] })
      expect(readCityFilters(storage)).toEqual({ holders: ['wd:Q12548'], states: ['misplaced'] })
    })
  })

  describe('variants', () => {
    it('keeps none ticked as none', () => {
      const { storage } = memory()
      writeCityFilters(storage, { holders: [], states: [] })
      expect(readCityFilters(storage)).toEqual({ holders: [], states: [] })
    })

    it('reads nothing when nothing was ever kept, and says nothing', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      expect(readCityFilters(memory().storage)).toBeNull()
      expect(warn).not.toHaveBeenCalled()
    })
  })

  describe('managed errors', () => {
    it('opens with none ticked, said in the console, on a value that is not JSON', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      expect(readCityFilters(memory('{oops').storage)).toBeNull()
      expect(String(warn.mock.calls[0]?.[0])).toContain('cannot be read')
    })

    it('opens with none ticked, said in the console, on JSON of another shape', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      expect(readCityFilters(memory('{"holders":"wd:Q12548"}').storage)).toBeNull()
      expect(String(warn.mock.calls[0]?.[0])).toContain('are not some')
    })
  })

  describe('unmanaged errors', () => {
    it('refuses a list holding anything but keys', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      expect(readCityFilters(memory('{"holders":[1],"states":[]}').storage)).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('refuses null kept under the key', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      expect(readCityFilters(memory('null').storage)).toBeNull()
    })
  })
})
