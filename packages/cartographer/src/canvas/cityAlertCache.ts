import { citiesOfYear, shownCityPoints } from '../state/citiesSlice'

import { cityAlert, cityVerdicts, mapPolities, paintedHolder } from './cityVerdict'

import type { CityAlert } from './paint/cityPainter'
import type { CitiesState, CityMark, ShownCity } from '../state/citiesSlice'
import type { YearDocument } from '@europe-historical-atlas/core/data/yearDocument'

/** What a city's point shows: its alert ring, and the polity whose colour fills it. */
export interface CityPaint {
  /** Its alert, or `null` at the right place. */
  readonly alert: CityAlert | null
  /** The registry id of the polity whose colour fills the dot — `null` for a hollow dot (CARTO-450). */
  readonly holder: string | null
}

/**
 * Each city's alert and colour on the map (CARTO-389), kept for one document version — a pan repaints on every pointer move, and
 * a verdict projects every anchor of the document. **Keyed on the document, its version and the cities read**: a
 * gesture, another map opened, or the cities read again computes them anew; nothing else does.
 */

/** The cache. */
export interface CityAlertCache {
  /**
   * The alerts and colours of the cities of the year open.
   * @param document - the year open
   * @param version - the edition's version counter
   * @param cities - every city of the export
   * @returns each city's paint, by its id
   */
  alertsOf: (
    document: YearDocument,
    version: number,
    cities: readonly CityMark[]
  ) => ReadonlyMap<string, CityPaint>
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
    alerts: ReadonlyMap<string, CityPaint>
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
      const alerts = new Map<string, CityPaint>()
      const map = mapPolities(document)
      for (const [id, verdict] of cityVerdicts(document, citiesOfYear(cities, document.year))) {
        alerts.set(id, { alert: cityAlert(verdict.kind), holder: paintedHolder(verdict, map) })
      }
      last = { document, version, cities, alerts }
      return alerts
    },
  }
}

/** No city's alert — the cities drawn as a dot and its name, or none shown. */
const NO_ALERTS: ReadonlyMap<string, CityPaint> = new Map()

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
  ).map((city) => {
    const paint = alerts.get(city.id)
    // Not judged — the cities shown as names, or none shown: no point is painted, so no colour to give it
    return paint === undefined
      ? { ...city, holder: null, alert: null }
      : { ...city, holder: paint.holder, alert: paint.alert }
  })
}
