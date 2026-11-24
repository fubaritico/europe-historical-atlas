import { describe, expect, it, vi } from 'vitest'

import { createAtlasStore, interfaceSideOf } from './atlasStore'

/**
 * The number of the request in flight.
 * @param store - the store
 * @returns its serial
 */
function serialOf(store: ReturnType<typeof createAtlasStore>): number {
  const request = store.getState().requested
  if (request === null) throw new Error('no request in flight')
  return request.serial
}

// ATLAS-392, the dev, 2026-11-24: the state the map and the interface share, outside React.
describe('createAtlasStore', () => {
  describe('happy path', () => {
    it('holds the years and the year laid first once the map has started', () => {
      const store = createAtlasStore()
      store.getState().started([1100, 1200], 1100)
      expect(store.getState()).toMatchObject({
        years: [1100, 1200],
        shownYear: 1100,
        requested: null,
      })
    })

    it('shows the year requested once its request settles', () => {
      const store = createAtlasStore()
      store.getState().started([1100, 1200], 1100)
      store.getState().requestYear(1200)
      expect(store.getState().requested?.year).toBe(1200)
      store.getState().yearSettled(serialOf(store), 1200)
      expect(store.getState()).toMatchObject({ shownYear: 1200, requested: null })
    })
  })

  describe('variants', () => {
    it('tells a subscriber of each request, and of nothing else', () => {
      const store = createAtlasStore()
      const heard = vi.fn()
      store.subscribe((state) => state.requested, heard)
      store.getState().started([1100], 1100)
      expect(heard).not.toHaveBeenCalled()
      store.getState().requestYear(1200)
      expect(heard).toHaveBeenCalledTimes(1)
    })

    it('makes a new request of the same year asked again — the dev panel’s reset redraws it (review ARCH-002)', () => {
      const store = createAtlasStore()
      const heard = vi.fn()
      store.subscribe((state) => state.requested, heard)
      store.getState().requestYear(1100)
      store.getState().requestYear(1100)
      expect(heard).toHaveBeenCalledTimes(2)
    })
  })

  describe('managed errors', () => {
    it('ends a failed request on the year still drawn', () => {
      const store = createAtlasStore()
      store.getState().started([1100, 1200], 1100)
      store.getState().requestYear(1200)
      store.getState().yearSettled(serialOf(store), 1100)
      expect(store.getState()).toMatchObject({ shownYear: 1100, requested: null })
    })

    it('starts with no year shown when the map laid none', () => {
      const store = createAtlasStore()
      store.getState().started([1100], null)
      expect(store.getState().shownYear).toBeNull()
    })
  })

  // L4: N/A — no input reaches the store but the map's and the interface's own numbers.

  describe('edge cases', () => {
    it('lets a request overtaken by a newer one settle nothing — the newer settles for itself', () => {
      const store = createAtlasStore()
      store.getState().started([1100, 1200, 1300], 1100)
      store.getState().requestYear(1200)
      const older = serialOf(store)
      store.getState().requestYear(1300)
      const newer = serialOf(store)
      store.getState().yearSettled(older, 1200)
      expect(store.getState()).toMatchObject({ shownYear: 1100, requested: { year: 1300 } })
      store.getState().yearSettled(newer, 1300)
      expect(store.getState()).toMatchObject({ shownYear: 1300, requested: null })
    })

    it('tells apart two requests of the same year, so the older cannot settle the newer (review QUAL-001)', () => {
      const store = createAtlasStore()
      store.getState().started([1100, 1200], 1100)
      store.getState().requestYear(1200)
      const first = serialOf(store)
      store.getState().requestYear(1100)
      store.getState().requestYear(1200)
      store.getState().yearSettled(first, 1200)
      expect(store.getState().requested?.year).toBe(1200)
      expect(store.getState().shownYear).toBe(1100)
    })

    it('keeps its own copy of the years, so the caller’s array changing later changes nothing', () => {
      const store = createAtlasStore()
      const years = [1100]
      store.getState().started(years, 1100)
      years.push(1200)
      expect(store.getState().years).toEqual([1100])
    })

    it('gives the interface the facts and its one action: a year requested through it reaches the store', () => {
      const store = createAtlasStore()
      const side = interfaceSideOf(store)
      side.requestYear(1200)
      expect(side.facts.getState().requested?.year).toBe(1200)
    })

    it('shares nothing between two stores', () => {
      const one = createAtlasStore()
      const two = createAtlasStore()
      one.getState().requestYear(1200)
      expect(two.getState().requested).toBeNull()
    })
  })
})
