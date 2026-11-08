import { useMemo } from 'react'

import { cityVerdicts } from '../../../../canvas/cityVerdict'
import { citiesOfYear } from '../../../../state/citiesSlice'

import type { CityVerdict } from '../../../../canvas/cityVerdict'
import type { CityMark } from '../../../../state/citiesSlice'
import type { YearDocument } from '@europe-historical-atlas/core/data/yearDocument'

/** What `{Cities}` shows of the year open: its cities, each one's verdict, and the one whose detail is open. */
export interface CitiesView {
  /** The cities of the year open, in the export's order. */
  cities: CityMark[]
  /** Each city's verdict, by id — computed at each render, so a verdict follows a border moved. */
  verdicts: ReadonlyMap<string, CityVerdict>
  /** The city whose detail is open, or `null`. */
  openedCity: CityMark | null
  /** Its verdict, or `undefined` with none open. */
  openedVerdict: CityVerdict | undefined
}

/**
 * The cities of the year open, their verdicts against the map, and the one opened.
 * @param all - every city of the export
 * @param document - the map
 * @param opened - the id of the city whose detail is open, or `null`
 * @returns the view
 */
export function useCitiesView(
  all: readonly CityMark[],
  document: YearDocument,
  opened: string | null
): CitiesView {
  // Derived
  const cities = useMemo(() => citiesOfYear(all, document.year), [all, document.year])
  const verdicts = cityVerdicts(document, cities)
  const openedCity = cities.find(({ id }) => id === opened) ?? null

  // Return
  return {
    cities,
    verdicts,
    openedCity,
    openedVerdict: openedCity === null ? undefined : verdicts.get(openedCity.id),
  }
}
