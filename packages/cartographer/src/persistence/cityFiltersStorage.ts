/**
 * The cities' advanced filters, kept from one session to the next (CARTO-371, the dev, 2026-11-07: *"je ne veux pas
 * repartir de zéro à chaque rafraîchissement de la page"*): written to the page's storage at each change, read once at
 * opening. The holders are keyed by Wikidata id, so they mean the same in every map; a state is a city's verdict.
 *
 * **Filters that cannot be read open as none, said in the console** — the same choice as the panels' layout
 * (`panelLayoutStorage.ts`): a comfort, not the map. The shape is declared here structurally: persistence never imports
 * the store (`eslint.config.js`).
 */

import type { PageStorage } from './guardedStorage'

/** Where in the page's storage the filters are kept. */
export const CITY_FILTERS_KEY = 'cartographer:city-filters'

/** The filters as they are kept — the store's `cityHolders` and `cityStates`, by shape. */
export interface StoredCityFilters {
  /** The holders ticked, by their keys. */
  readonly holders: readonly string[]
  /** The states ticked. */
  readonly states: readonly string[]
}

/**
 * Whether a value is a list of strings.
 * @param value - anything
 * @returns `true` for an array holding only strings
 */
function isStrings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((each) => typeof each === 'string')
}

/**
 * The filters kept from the last session, or `null` — none kept, or some that cannot be read, said in the console.
 * @param storage - the page's storage
 * @returns the filters, or `null`
 */
export function readCityFilters(storage: PageStorage): StoredCityFilters | null {
  const text = storage.getItem(CITY_FILTERS_KEY)
  if (text === null) return null
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (error: unknown) {
    console.warn(
      '[Cartographer] the cities’ filters kept from last time cannot be read; none is ticked',
      error
    )
    return null
  }
  const { holders, states } = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<
    string,
    unknown
  >
  if (!isStrings(holders) || !isStrings(states)) {
    console.warn(
      '[Cartographer] the cities’ filters kept from last time are not some; none is ticked'
    )
    return null
  }
  return { holders, states }
}

/**
 * Keep the filters for the next session.
 * @param storage - the page's storage
 * @param filters - the holders and the states ticked
 */
export function writeCityFilters(storage: PageStorage, filters: StoredCityFilters): void {
  storage.setItem(CITY_FILTERS_KEY, JSON.stringify(filters))
}
