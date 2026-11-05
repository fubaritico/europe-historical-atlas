import { dateCoversYear } from '@europe-historical-atlas/core/time/dateOverlap'

import type { HistoricalDate } from '@europe-historical-atlas/core/time/historicalDate'
import type { StateCreator } from 'zustand'

/**
 * The cities as guides for the borders — `{Cities}` (CARTO-193, the dev, 2026-11-02): the contribution's cities, each
 * shown or hidden by its own eye, **none shown at opening**; the author lights the ones he needs to place a border.
 *
 * **Out of the undo line, like the layers**: showing a city changes what the author sees, never the year.
 */

/** A city as the Cartographer reads it from the contribution's export (`content/events.json`). */
export interface CityMark {
  /** The sheet's id in the contribution — one city at one date. */
  readonly id: string
  /** Its name, in French — the contribution's language. */
  readonly name: string
  /** Longitude, WGS84 degrees. */
  readonly lon: number
  /** Latitude, WGS84 degrees. */
  readonly lat: number
  /** When the sheet holds: a year alone counts for that year, an interval for every year it covers. */
  readonly date: HistoricalDate
  /** The polity holding it by the sources (CMS-335), or `null` while nobody has entered it. */
  readonly holder: CityHolder | null
  /** The sources that say who held it, each with where in it. */
  readonly holderSources: readonly HolderSource[]
}

/** The polity holding a city by the sources: its name, and its Wikidata id — what a map's polity is compared by. */
export interface CityHolder {
  /** Its name, as entered. */
  readonly name: string
  /** Its Wikidata id, or `null` for a polity that has none. */
  readonly wikidata: string | null
}

/** A source saying who held a city. */
export interface HolderSource {
  /** Its title. */
  readonly title: string
  /** Where in it — a page, a line — or `null`. */
  readonly where: string | null
  /** The polity it names, which may differ from another source's. */
  readonly holder: CityHolder
}

/** Where the cities stand: on their way, in, or refused — the panel says which. */
export type CitiesLoad =
  | { readonly state: 'loading' }
  | { readonly state: 'loaded' }
  | { readonly state: 'failed'; readonly reason: string }

/** The cities' state. */
export interface CitiesState {
  /** Every city of the export, whatever its date. */
  cities: readonly CityMark[]
  /** Where the load stands. */
  citiesLoad: CitiesLoad
  /** The ids of the cities shown on the canvas. */
  shownCities: ReadonlySet<string>
  /**
   * Whether the cities shown are drawn as points — a dot in the colour of the polity holding each by the sources,
   * ringed, no name — rather than as a dot and its name (the dev, 2026-11-05: *"I need visual milestones"*, to slalom
   * a border between the cities of two polities).
   */
  citiesAsPoints: boolean
}

/** What may be done to the cities. */
export interface CitiesActions {
  /**
   * Install the cities read from the export.
   * @param cities - every city, whatever its date
   */
  setCities: (cities: readonly CityMark[]) => void
  /**
   * Say the cities could not be read; the panel shows it, the canvas draws none.
   * @param reason - what went wrong, for the panel and the console
   */
  setCitiesFailed: (reason: string) => void
  /**
   * Show or hide one city.
   * @param id - the city's id
   * @param shown - whether it is drawn
   */
  setCityShown: (id: string, shown: boolean) => void
  /**
   * Show or hide several cities at once — the list's own eye, over the cities it lists.
   * @param ids - the cities
   * @param shown - whether they are drawn
   */
  setCitiesShown: (ids: readonly string[], shown: boolean) => void
  /**
   * Draw the cities shown as points, or as a dot and its name.
   * @param asPoints - whether they are points
   */
  setCitiesAsPoints: (asPoints: boolean) => void
}

/** The slice: the cities, which are shown, and the ways to change it. */
export type CitiesSlice = CitiesState & CitiesActions

/**
 * The cities whose date covers a year, in the export's order — the dev's rule of 2026-10-30 (`core/time/dateOverlap`):
 * a date alone covers its year, an interval its start to its end both included, circa does not widen.
 * @param cities - every city
 * @param year - the year open
 * @returns those of that year
 */
export function citiesOfYear(cities: readonly CityMark[], year: number): CityMark[] {
  return cities.filter(({ date }) => dateCoversYear(date, year))
}

/**
 * The cities the canvas draws: those of the year open that `{Cities}` has shown, with their positions.
 * @param cities - every city
 * @param shown - the ids shown
 * @param year - the year open
 * @returns each shown city's name, position — longitude first — and its holder's Wikidata id by the sources
 */
export function shownCityPoints(
  cities: readonly CityMark[],
  shown: ReadonlySet<string>,
  year: number
): ShownCity[] {
  return citiesOfYear(cities, year)
    .filter(({ id }) => shown.has(id))
    .map(({ name, lon, lat, holder }) => ({
      name,
      lonLat: [lon, lat],
      holder: holder?.wikidata ?? null,
    }))
}

/** A city shown on the canvas: its name, its point, and the Wikidata id of the polity holding it by the sources. */
export interface ShownCity {
  /** Its name. */
  name: string
  /** Its point, `[longitude, latitude]`. */
  lonLat: [number, number]
  /** The holder's Wikidata id by the sources — what a map's polity is matched by — or `null` when none is entered. */
  holder: string | null
}

/**
 * Open a cities slice: none read yet, none shown.
 * @param set - the store's setter
 * @param get - the store's getter
 * @returns the slice
 */
export const createCitiesSlice: StateCreator<
  CitiesSlice,
  [['zustand/subscribeWithSelector', never]],
  [],
  CitiesSlice
> = (set, get) => ({
  cities: [],
  citiesLoad: { state: 'loading' },
  shownCities: new Set(),
  citiesAsPoints: false,
  setCitiesAsPoints: (asPoints): void => {
    set({ citiesAsPoints: asPoints })
  },
  setCities: (cities): void => {
    set({ cities, citiesLoad: { state: 'loaded' } })
  },
  setCitiesFailed: (reason): void => {
    set({ cities: [], citiesLoad: { state: 'failed', reason }, shownCities: new Set() })
  },
  setCityShown: (id, shown): void => {
    get().setCitiesShown([id], shown)
  },
  setCitiesShown: (ids, shown): void => {
    const next = new Set(get().shownCities)
    for (const id of ids) {
      if (shown) next.add(id)
      else next.delete(id)
    }
    set({ shownCities: next })
  },
})
