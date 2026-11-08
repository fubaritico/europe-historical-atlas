import { afterEach, describe, expect, it, vi } from 'vitest'

import { screenToLonLatOnBackdrop } from '../../viewport/projection'
import { TEST_BACKDROP_FRAME } from '../../viewport/testFrame'
import { drawOutlineAt, testGestureContext, testPolity, testStore } from '../testGestureContext'

import { arrowDoubleClick } from './arrowDoubleClick'
import { cityUnder } from './cityHit'
import { arrowPress, arrowRelease, toolKey } from './toolGestures'

import type { CityMark } from '../../state/citiesSlice'
import type { CartographerStoreHook } from '../../state/store'
import type { Point } from '../../viewport/viewport'

afterEach(() => {
  vi.restoreAllMocks()
})

const in1100 = {
  kind: 'instant',
  at: { year: 1100, month: null, day: null, calendar: null, circa: false, margin: null },
} as const

/**
 * A city of 1100 at a screen point, under the test store's view.
 * @param store - the store, for its view
 * @param id - the city's id, its name too
 * @param at - where it is on screen
 * @returns the city
 */
function cityAt(store: CartographerStoreHook, id: string, at: Point): CityMark {
  const lonLat = screenToLonLatOnBackdrop(at, TEST_BACKDROP_FRAME, store.getState().viewport)
  if (lonLat === null) throw new Error('off the backdrop')
  return {
    id,
    name: id,
    lon: lonLat[0],
    lat: lonLat[1],
    date: in1100,
    holder: null,
    holderSources: [],
  }
}

/**
 * France as a square from (100, 100) to (300, 300), nobody aimed at, under the white arrow; Troyes at its centre and
 * Reims near its top, both shown.
 * @returns the store and the gesture context
 */
function openFrance() {
  const store = testStore()
  store.getState().createPolity(testPolity('fr', 'Reaume de France'), { kind: 'c', label: 'fr' })
  drawOutlineAt(store, 'fr', [
    [100, 100],
    [300, 100],
    [300, 300],
    [100, 300],
  ])
  store.getState().selectTool('edit')
  store
    .getState()
    .setCities([cityAt(store, 'troyes', [200, 200]), cityAt(store, 'reims', [200, 130])])
  store.getState().setCitiesShown(['troyes', 'reims'], true)
  return { store, ...testGestureContext(store) }
}

/**
 * A click of the white arrow: press and release at one point.
 * @param context - the gesture context
 * @param at - where
 * @param shift - whether ‹shift› is held
 */
function click(context: ReturnType<typeof openFrance>['context'], at: Point, shift = false): void {
  arrowPress(context, at, shift)
  arrowRelease(context, at)
}

// CARTO-384, the dev, 2026-11-07: a click on a city's point chooses it in {Cities}; a double-click, on the point,
// opens its information box.
describe('cityHit', () => {
  describe('happy path', () => {
    it('chooses Troyes on a click on its point, France not made the target', () => {
      const { store, context } = openFrance()

      click(context, [203, 202])

      expect(store.getState().selectedCity).toBe('troyes')
      expect(store.getState().target).toBeNull()
    })

    it("opens Troyes' box on a double-click on its point, and no polity's form", () => {
      const { store, context } = openFrance()

      arrowDoubleClick(context, [200, 200])

      expect([store.getState().openedCity, store.getState().selectedCity]).toEqual([
        'troyes',
        'troyes',
      ])
      expect(store.getState().polityForm).toBeNull()
    })
  })

  describe('variants', () => {
    it("opens Troyes' box on ‹enter›, Troyes chosen by a click on its point", () => {
      const { store, context } = openFrance()

      click(context, [200, 200])

      expect(toolKey(context, 'Enter')).toBe(true)
      expect(store.getState().openedCity).toBe('troyes')
    })

    it('drops the city chosen on a click off every city', () => {
      const { store, context } = openFrance()
      click(context, [200, 200])

      click(context, [150, 250])

      expect(store.getState().selectedCity).toBeNull()
      expect(store.getState().target).toBe('fr')
    })

    it('makes France the target on a click in its fill away from every city', () => {
      const { store, context } = openFrance()

      click(context, [150, 250])

      expect(store.getState().target).toBe('fr')
      expect(store.getState().selectedCity).toBeNull()
    })

    it("opens France's form on a double-click in its fill away from every city", () => {
      const { store, context } = openFrance()

      arrowDoubleClick(context, [150, 250])

      expect(store.getState().polityForm).toBe('fr')
      expect(store.getState().openedCity).toBeNull()
    })

    it('takes no city whose eye is off: the click on its place makes France the target', () => {
      const { store, context } = openFrance()
      store.getState().setCityShown('troyes', false)

      click(context, [200, 200])

      expect(store.getState().selectedCity).toBeNull()
      expect(store.getState().target).toBe('fr')
    })

    it('chooses the nearer of two cities within reach', () => {
      const { store, context } = openFrance()
      store
        .getState()
        .setCities([cityAt(store, 'troyes', [200, 200]), cityAt(store, 'sens', [206, 200])])
      store.getState().setCitiesShown(['troyes', 'sens'], true)

      click(context, [204, 200])

      expect(store.getState().selectedCity).toBe('sens')
    })

    it('keeps the anchors selected when a city is chosen', () => {
      const { store, context } = openFrance()
      context.session.selected = [0]

      click(context, [200, 200])

      expect(store.getState().selectedCity).toBe('troyes')
      expect(context.session.selected).toEqual([0])
    })
  })

  describe('managed errors', () => {
    it('opens nothing on ‹enter› with no city chosen, and leaves the key to the page', () => {
      const { store, context } = openFrance()

      expect(toolKey(context, 'Enter')).toBe(false)
      expect(store.getState().openedCity).toBeNull()
    })

    it('chooses nothing on a click with ‹shift› held on a city', () => {
      const { store, context } = openFrance()

      click(context, [200, 200], true)

      expect(store.getState().selectedCity).toBeNull()
    })

    it("opens no box on a double-click on France's anchor, a city under it, and says why", () => {
      const { store, context } = openFrance()
      store.getState().aimAt('fr')
      store.getState().selectTool('edit')
      store.getState().setCities([cityAt(store, 'corner', [100, 100])])
      store.getState().setCitiesShown(['corner'], true)
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

      arrowDoubleClick(context, [100, 100])

      expect(store.getState().openedCity).toBeNull()
      expect(warn).toHaveBeenCalledOnce()
    })
  })

  // L4: N/A — no value can fail to arrive: the cities are the store's, projected under its view.

  describe('edge cases', () => {
    it('catches a city at exactly the radius, and none just past it', () => {
      const { context } = openFrance()

      expect(cityUnder(context, [208, 200])).toBe('troyes')
      expect(cityUnder(context, [209, 200])).toBeNull()
    })

    it('takes no city of another year, even shown', () => {
      const { store, context } = openFrance()
      const later = cityAt(store, 'later', [250, 250])
      store
        .getState()
        .setCities([{ ...later, date: { ...in1100, at: { ...in1100.at, year: 1200 } } }])
      store.getState().setCitiesShown(['later'], true)

      expect(cityUnder(context, [250, 250])).toBeNull()
    })

    // CARTO-390: a city the list's filters leave out is not drawn, so not there to be clicked.
    it('takes no city the list leaves out, even shown', () => {
      const { store, context } = openFrance()
      store.getState().setListedCities(['reims'])

      expect(cityUnder(context, [200, 200])).toBeNull()
    })

    it('takes no city when none is read', () => {
      const store = testStore()
      const { context } = testGestureContext(store)

      expect(cityUnder(context, [200, 200])).toBeNull()
    })
  })
})
