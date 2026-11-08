import { citiesOfYear, shownCityPoints } from '../state/citiesSlice'

import { cityAlert, cityVerdicts } from './cityVerdict'

import type { CityAlert } from './paint/cityPainter'
import type { CitiesState, CityMark, ShownCity } from '../state/citiesSlice'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

/**
 * Each city's alert on the map (CARTO-389), kept for one document version — a pan repaints on every pointer move, and
 * a verdict projects every anchor of the document. **Keyed on the document, its version and the cities read**: a
 * gesture, another map opened, or the cities read again computes them anew; nothing else does.
 */

/** The cache. */
export interface CityAlertCache {
  /**
   * The alerts of the cities of the year open.
   * @param document - the year open
   * @param version - the edition's version counter
   * @param cities - every city of the export
   * @returns each city's alert, by its id — a city with none is absent
   */
  alertsOf: (
    document: YearDocument,
    version: number,
    cities: readonly CityMark[]
  ) => ReadonlyMap<string, CityAlert>
}

/**
 * A cache, empty.
 * @returns the cache
 */
export function createCityAlertCache(): CityAlertCache {
  let last: {
    document: YearDocument
    version: number
    cities: readonly CityMark[]
    alerts: ReadonlyMap<string, CityAlert>
  } | null = null
  return {
    alertsOf: (document, version, cities) => {
      if (
        last !== null &&
        last.document === document &&
        last.version === version &&
        last.cities === cities
      ) {
        return last.alerts
      }
      const alerts = new Map<string, CityAlert>()
      for (const [id, { kind }] of cityVerdicts(document, citiesOfYear(cities, document.year))) {
        const alert = cityAlert(kind)
        if (alert !== null) alerts.set(id, alert)
      }
      last = { document, version, cities, alerts }
      return alerts
    },
  }
}

/** No city's alert — the cities drawn as a dot and its name, or none shown. */
const NO_ALERTS: ReadonlyMap<string, CityAlert> = new Map()

/**
 * The cities the canvas paints, each with its alert (CARTO-389). The alerts are asked of the cache only where they are
 * drawn — the cities as points, one shown at least (review ARCH-001): every gesture is a new version, and a verdict
 * tests each city of the year against every ring.
 * @param state - the store's document, its version and the cities' state
 * @param state.document - the year open
 * @param state.version - the edition's version counter
 * @param cache - the alerts kept for one version
 * @returns the cities shown, longitude first, each with its alert or `null`
 */
export function citiesToPaint(
  state: Pick<CitiesState, 'cities' | 'shownCities' | 'citiesAsPoints' | 'listedCities'> & {
    document: YearDocument
    version: number
  },
  cache: CityAlertCache
): (ShownCity & { alert: CityAlert | null })[] {
  const alerts =
    state.citiesAsPoints && state.shownCities.size > 0
      ? cache.alertsOf(state.document, state.version, state.cities)
      : NO_ALERTS
  return shownCityPoints(
    state.cities,
    state.shownCities,
    state.document.year,
    state.listedCities
  ).map((city) => ({
    ...city,
    alert: alerts.get(city.id) ?? null,
  }))
}
