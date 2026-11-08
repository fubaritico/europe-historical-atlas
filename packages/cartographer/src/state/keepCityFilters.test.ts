import { describe, expect, it, vi } from 'vitest'

import { cloneYearDocument } from '@europe-historical-atlas/core/data/yearDocument'

import { CITY_FILTERS_KEY, CITY_SORT_KEY } from '../persistence/cityFiltersStorage'
import { UNFRAMED } from '../viewport/viewport'

import { keepCityFilters } from './keepCityFilters'
import { openEmptyYear } from './openEmptyYear'
import { createCartographerStore } from './store'

import type { PageStorage } from '../persistence/guardedStorage'

/**
 * A store on an empty 1100, as the slices' own tests make it.
 * @returns the store
 */
function testStore() {
  return createCartographerStore({
    edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
    viewport: { viewport: UNFRAMED },
  })
}

/**
 * A storage in memory, its writes counted.
 * @param kept - what it holds under the filters' key at first
 * @returns the storage, its content and its writes
 */
function memory(kept: string | null = null) {
  const items = new Map<string, string>()
  if (kept !== null) items.set(CITY_FILTERS_KEY, kept)
  const setItem = vi.fn((key: string, value: string) => {
    items.set(key, value)
  })
  const storage: PageStorage = { getItem: (key) => items.get(key) ?? null, setItem }
  return { storage, items, setItem }
}

// CARTO-371, the dev, 2026-11-07: « je ne veux pas repartir de zéro à chaque rafraîchissement ».
describe('keepCityFilters', () => {
  describe('happy path', () => {
    it('writes the Empire ticked, so a refresh finds it', () => {
      const store = testStore()
      const { storage, items } = memory()
      keepCityFilters(store, storage)
      store.getState().setCityHolderTicked('wd:Q12548', true)
      expect(JSON.parse(items.get(CITY_FILTERS_KEY) ?? 'null')).toEqual({
        holders: ['wd:Q12548'],
        states: [],
      })
    })

    it('puts back at opening what the last session kept', () => {
      const store = testStore()
      keepCityFilters(store, memory('{"holders":["wd:Q12548"],"states":["misplaced"]}').storage)
      expect([...store.getState().cityHolders]).toEqual(['wd:Q12548'])
      expect([...store.getState().cityStates]).toEqual(['misplaced'])
    })
  })

  describe('variants', () => {
    it('writes a state ticked, then « Tout décocher » as none', () => {
      const store = testStore()
      const { storage, items } = memory()
      keepCityFilters(store, storage)
      store.getState().setCityStateTicked('misplaced', true)
      store.getState().untickCityFilters()
      expect(JSON.parse(items.get(CITY_FILTERS_KEY) ?? 'null')).toEqual({ holders: [], states: [] })
    })
  })

  // CARTO-382: the order of the list, kept with the filters under a key of its own.
  describe('the order', () => {
    it('writes the order chosen, and puts it back at the next opening', () => {
      const first = testStore()
      const { storage, items } = memory()
      keepCityFilters(first, storage)
      first.getState().setCitySort('name')
      expect(items.get(CITY_SORT_KEY)).toBe('name')
      const next = testStore()
      keepCityFilters(next, storage)
      expect(next.getState().citySort).toBe('name')
    })

    it('opens in the export’s order, said in the console, on an order kept that is none', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { storage, items } = memory()
      items.set(CITY_SORT_KEY, 'by-moon')
      const store = testStore()
      keepCityFilters(store, storage)
      expect(store.getState().citySort).toBe('export')
      expect(String(warn.mock.calls[0]?.[0])).toContain('is not one')
      warn.mockRestore()
    })
  })

  describe('edge cases', () => {
    it('does not write back what it has just put back at opening', () => {
      const store = testStore()
      const { storage, setItem } = memory('{"holders":["wd:Q12548"],"states":[]}')
      keepCityFilters(store, storage)
      expect(setItem).not.toHaveBeenCalled()
    })

    it('writes nothing for a change elsewhere in the store', () => {
      const store = testStore()
      const { storage, setItem } = memory()
      keepCityFilters(store, storage)
      store.getState().setCitiesAsPoints(true)
      expect(setItem).not.toHaveBeenCalled()
    })

    it('stops writing once unsubscribed', () => {
      const store = testStore()
      const { storage, setItem } = memory()
      keepCityFilters(store, storage)()
      store.getState().setCityHolderTicked('wd:Q12548', true)
      expect(setItem).not.toHaveBeenCalled()
    })
  })

  // L3, L4: the storage's own refusals are guardedStorage's; a value that cannot be read is cityFiltersStorage's.
})
