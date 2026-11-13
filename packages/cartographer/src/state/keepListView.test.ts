import { describe, expect, it, vi } from 'vitest'

import { cloneYearDocument } from '@europe-historical-atlas/core/data/yearDocument'

import { CARRIED_VIEW_KEY } from '../persistence/carriedView'
import { LIST_VIEW_KEY } from '../persistence/listViewStorage'
import { UNFRAMED } from '../viewport/viewport'

import { keepListView } from './keepListView'
import { keepView } from './keepView'
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
 * A storage in memory.
 * @param kept - what it holds at first, by key
 * @returns the storage and its content
 */
function memory(kept: Record<string, string> = {}) {
  const items = new Map<string, string>(Object.entries(kept))
  const storage: PageStorage & { removeItem: (key: string) => void } = {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value)
    },
    removeItem: (key) => {
      items.delete(key)
    },
  }
  return { storage, items }
}

const KEPT = {
  polityQuery: 'Hung',
  cityQuery: 'zad',
  shownCities: ['zadar'],
  citiesAsPoints: true,
}

// CARTO-427, the dev, 2026-11-13: "when I reload the Cartographer, it remembers the zoom, the position, the filters".
describe('keepListView', () => {
  describe('happy path', () => {
    it('puts back what was typed, the cities shown and the points, kept last time', () => {
      const store = testStore()
      keepListView(store, memory({ [LIST_VIEW_KEY]: JSON.stringify(KEPT) }).storage)
      const state = store.getState()
      expect(state.listQueries).toEqual({ polities: 'Hung', cities: 'zad' })
      expect([...state.shownCities]).toEqual(['zadar'])
      expect(state.citiesAsPoints).toBe(true)
    })

    it('writes what is typed in a filter, so a reload finds it', () => {
      const store = testStore()
      const { storage, items } = memory()
      keepListView(store, storage)
      store.getState().setListQuery('polities', 'Hung')
      expect(JSON.parse(items.get(LIST_VIEW_KEY) ?? '{}')).toMatchObject({ polityQuery: 'Hung' })
    })
  })

  describe('variants', () => {
    it('writes the points ticked and a city shown', () => {
      const store = testStore()
      const { storage, items } = memory()
      keepListView(store, storage)
      store.getState().setCitiesAsPoints(true)
      store.getState().setCitiesShown(['zadar'], true)
      expect(JSON.parse(items.get(LIST_VIEW_KEY) ?? '{}')).toMatchObject({
        citiesAsPoints: true,
        shownCities: ['zadar'],
      })
    })
  })

  describe('managed errors', () => {
    // Review ARCH-002: the cities' export unreachable once must not erase the cities the author chose.
    it('keeps the cities shown when the cities fail to load', () => {
      const store = testStore()
      const { storage, items } = memory({ [LIST_VIEW_KEY]: JSON.stringify(KEPT) })
      keepListView(store, storage)
      store.getState().setCitiesFailed('unreachable')
      expect(JSON.parse(items.get(LIST_VIEW_KEY) ?? '{}')).toMatchObject({ shownCities: ['zadar'] })
    })

    it('puts nothing back from a kept state that is not one, and says so', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const store = testStore()
      keepListView(store, memory({ [LIST_VIEW_KEY]: JSON.stringify({ polityQuery: 3 }) }).storage)
      expect(store.getState().listQueries).toEqual({ polities: '', cities: '' })
      expect(warn).toHaveBeenCalledOnce()
    })
  })

  describe('unmanaged errors', () => {
    it('puts nothing back from text the browser left that is not JSON, and says so', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const store = testStore()
      keepListView(store, memory({ [LIST_VIEW_KEY]: '{oops' }).storage)
      expect(store.getState().citiesAsPoints).toBe(false)
      expect(warn).toHaveBeenCalledOnce()
    })
  })

  describe('edge cases', () => {
    it('writes nothing once unsubscribed', () => {
      const store = testStore()
      const { storage, items } = memory()
      keepListView(store, storage)()
      store.getState().setListQuery('cities', 'zad')
      expect(items.has(LIST_VIEW_KEY)).toBe(false)
    })
  })
})

describe('keepView', () => {
  describe('happy path', () => {
    it('writes the view at each change, so a reload opens on it', () => {
      const store = testStore()
      const { storage, items } = memory()
      keepView(store, storage)
      store.getState().setViewport({ scale: 40, originX: -100, originY: 20 })
      expect(JSON.parse(items.get(CARRIED_VIEW_KEY) ?? '{}')).toEqual({
        scale: 40,
        originX: -100,
        originY: 20,
      })
    })
  })

  describe('edge cases', () => {
    it('never writes the opening’s unframed view', () => {
      const store = testStore()
      const { storage, items } = memory()
      keepView(store, storage)
      store.getState().setViewport({ scale: 40, originX: 0, originY: 0 })
      store.getState().setViewport(UNFRAMED)
      expect(JSON.parse(items.get(CARRIED_VIEW_KEY) ?? '{}')).toMatchObject({ scale: 40 })
    })
  })
})
