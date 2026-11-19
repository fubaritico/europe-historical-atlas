import { useMemo, useState } from 'react'

import { createCityVerdictCache } from '../../../../canvas/cityVerdictCache'
import { citiesOfYear } from '../../../../state/citiesSlice'

import type { CityVerdict } from '../../../../canvas/cityVerdict'
import type { CityMark } from '../../../../state/citiesSlice'
import type { CartographerStoreHook } from '../../../../state/store'

/** What `{Cities}` shows of the year open: its cities, each one's verdict, and the one whose detail is open. */
export interface CitiesView {
  /** The cities of the year open, in the export's order. */
  cities: CityMark[]
  /**
   * Each city's verdict, by id — computed once per version of the map, so a verdict follows a border moved and a box
   * ticked computes none (CARTO-485: thirteen thousand cities judged at every click).
   */
  verdicts: ReadonlyMap<string, CityVerdict>
  /** The city whose detail is open, or `null`. */
  openedCity: CityMark | null
  /** Its verdict, or `undefined` with none open. */
  openedVerdict: CityVerdict | undefined
}

/**
 * The cities of the year open, their verdicts against the map, and the one opened.
 * @param store - the store the cities and the map live in
 * @returns the view
 */
export function useCitiesView(store: CartographerStoreHook): CitiesView {
  // Store
  const all = store((state) => state.cities)
  const document = store((state) => state.document)
  const opened = store((state) => state.openedCity)
  // The map is edited in place: the version is what says a border moved.
  const version = store((state) => state.version)

  // State
  // The verdicts kept for one version of the map: a box ticked renders the panel and judges no city (CARTO-485).
  const [cache] = useState(createCityVerdictCache)

  // Derived
  const cities = useMemo(() => citiesOfYear(all, document.year), [all, document.year])
  const verdicts = cache.verdictsOf(document, version, cities)
  const openedCity = cities.find(({ id }) => id === opened) ?? null

  // Return
  return {
    cities,
    verdicts,
    openedCity,
    openedVerdict: openedCity === null ? undefined : verdicts.get(openedCity.id),
  }
}
