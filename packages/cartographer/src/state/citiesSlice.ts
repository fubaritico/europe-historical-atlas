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
  /**
   * The holders ticked in the advanced filters (CARTO-370), by {@link holderKey}: `{Cities}` lists only the cities the
   * sources give to one of them; none ticked, no filter. Keyed by Wikidata id, so it means the same in every map.
   */
  cityHolders: ReadonlySet<string>
  /**
   * The states ticked in the advanced filters (CARTO-369) — a city's verdict, `misplaced`, `toDeclare`… as `{Cities}`
   * names them: it lists only the cities in one of them; none ticked, no filter by state.
   */
  cityStates: ReadonlySet<string>
  /** The order of `{Cities}`' list (CARTO-382): the export's, by name, by verification, or by holder. */
  citySort: CitySort
  /**
   * The city chosen — by a click on its point with the white arrow, or on its name in `{Cities}` (CARTO-384): its row
   * is marked and the list scrolls to it. `null` when none is.
   */
  selectedCity: string | null
  /** The city whose information box is open — a double-click on its point or its name (CARTO-384) — or `null`. */
  openedCity: string | null
  /**
   * The ids of the cities `{Cities}` lists under its filters — the name typed and the advanced filters (CARTO-390, the
   * dev, 2026-11-08: *"when I filter in the Cities panel, the map must be filtered too"*). Written by the list, the one
   * place that decides what its filters keep; `null` while no list is mounted, and then nothing is filtered.
   */
  listedCities: ReadonlySet<string> | null
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
  /**
   * Tick or untick a holder in the advanced filters.
   * @param key - the holder's key ({@link holderKey})
   * @param ticked - whether it is ticked
   */
  setCityHolderTicked: (key: string, ticked: boolean) => void
  /**
   * Tick or untick several holders at once, in one change — a suzerain and its descent (CARTO-388).
   * @param keys - the holders' keys
   * @param ticked - whether they are ticked
   */
  setCityHoldersTicked: (keys: readonly string[], ticked: boolean) => void
  /**
   * Tick or untick a state in the advanced filters.
   * @param state - the state, a city's verdict
   * @param ticked - whether it is ticked
   */
  setCityStateTicked: (state: string, ticked: boolean) => void
  /** Untick every holder and every state: the list shows every city of the year again. */
  untickCityFilters: () => void
  /**
   * Tick the holders and the states kept from the last session (CARTO-371), in place of those ticked.
   * @param holders - the holders' keys
   * @param states - the states
   */
  setCityFilters: (holders: readonly string[], states: readonly string[]) => void
  /**
   * Order the list of `{Cities}` (CARTO-382).
   * @param sort - the order
   */
  setCitySort: (sort: CitySort) => void
  /**
   * Choose a city, or none.
   * @param id - the city's id, or `null`
   */
  selectCity: (id: string | null) => void
  /**
   * Open a city's information box; the city is chosen with it.
   * @param id - the city's id
   */
  openCity: (id: string) => void
  /** Close the information box; the city stays chosen. */
  closeCity: () => void
  /**
   * Say which cities the list shows under its filters, or that no list is mounted.
   * @param ids - the ids listed, or `null`
   */
  setListedCities: (ids: readonly string[] | null) => void
}

/** The slice: the cities, which are shown, and the ways to change it. */
export type CitiesSlice = CitiesState & CitiesActions

/** The key of « Sans détenteur » in the advanced filters: the cities nobody has entered a holder for. */
export const NO_HOLDER = 'none'

/**
 * The orders `{Cities}`' list can take (CARTO-382, the dev, 2026-11-07): the export's as it comes, by name, by
 * verification — the map to correct first — or grouped by the holder the sources give.
 */
export const CITY_SORTS = ['export', 'name', 'verification', 'holder'] as const

/** One of {@link CITY_SORTS}. */
export type CitySort = (typeof CITY_SORTS)[number]

/**
 * Whether a value is one of the orders — the one read back from the browser, of no known shape.
 * @param value - anything
 * @returns `true` for an order the list knows
 */
export function isCitySort(value: unknown): value is CitySort {
  return (CITY_SORTS as readonly unknown[]).includes(value)
}

/**
 * A holder's key in the advanced filters (CARTO-370): its Wikidata id — what a map's polity is matched by, as the verdict
 * and the points' colour are — or its name for a holder that has none, or {@link NO_HOLDER}.
 * @param holder - the holder by the sources, or `null` while not entered
 * @returns its key
 */
export function holderKey(holder: CityHolder | null): string {
  if (holder === null) return NO_HOLDER
  return holder.wikidata === null ? `name:${holder.name}` : `wd:${holder.wikidata}`
}

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
 * The cities the canvas draws: those of the year open that `{Cities}` has shown **and still lists under its filters**
 * (CARTO-390) — a city a filter leaves out is off the map until the filter is lifted — with their positions.
 * @param cities - every city
 * @param shown - the ids shown
 * @param year - the year open
 * @param listed - the ids the list shows under its filters, or `null` with no list mounted: no filter
 * @returns each shown city's name, position — longitude first — and its holder's Wikidata id by the sources
 */
export function shownCityPoints(
  cities: readonly CityMark[],
  shown: ReadonlySet<string>,
  year: number,
  listed: ReadonlySet<string> | null
): ShownCity[] {
  return citiesOfYear(cities, year)
    .filter(({ id }) => shown.has(id) && (listed === null || listed.has(id)))
    .map(({ id, name, lon, lat, holder }) => ({
      id,
      name,
      lonLat: [lon, lat],
      holder: holder?.wikidata ?? null,
    }))
}

/** A city shown on the canvas: its name, its point, and the Wikidata id of the polity holding it by the sources. */
export interface ShownCity {
  /** Its sheet's id — what a click on its point chooses (CARTO-384). */
  id: string
  /** Its name. */
  name: string
  /** Its point, `[longitude, latitude]`. */
  lonLat: [number, number]
  /** The holder's Wikidata id by the sources — what a map's polity is matched by — or `null` when none is entered. */
  holder: string | null
}

/**
 * The advanced filters' actions (CARTO-370, CARTO-369, CARTO-371): tick a holder, tick a state, untick both kinds at
 * once, and put back those kept from the last session.
 * @param set - the store's setter
 * @param get - the store's getter
 * @returns the four actions
 */
function filterActions(
  set: (partial: Partial<CitiesState>) => void,
  get: () => CitiesState
): Pick<
  CitiesActions,
  | 'setCityHolderTicked'
  | 'setCityHoldersTicked'
  | 'setCityStateTicked'
  | 'untickCityFilters'
  | 'setCityFilters'
> {
  return {
    setCityHolderTicked: (key, ticked): void => {
      const next = new Set(get().cityHolders)
      if (ticked) next.add(key)
      else next.delete(key)
      set({ cityHolders: next })
    },
    setCityHoldersTicked: (keys, ticked): void => {
      const next = new Set(get().cityHolders)
      for (const key of keys) {
        if (ticked) next.add(key)
        else next.delete(key)
      }
      set({ cityHolders: next })
    },
    setCityStateTicked: (state, ticked): void => {
      const next = new Set(get().cityStates)
      if (ticked) next.add(state)
      else next.delete(state)
      set({ cityStates: next })
    },
    untickCityFilters: (): void => {
      set({ cityHolders: new Set(), cityStates: new Set() })
    },
    setCityFilters: (holders, states): void => {
      set({ cityHolders: new Set(holders), cityStates: new Set(states) })
    },
  }
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
  cityHolders: new Set(),
  selectedCity: null,
  openedCity: null,
  listedCities: null,
  setListedCities: (ids): void => {
    set({ listedCities: ids === null ? null : new Set(ids) })
  },
  selectCity: (id): void => {
    set({ selectedCity: id })
  },
  openCity: (id): void => {
    set({ selectedCity: id, openedCity: id })
  },
  closeCity: (): void => {
    set({ openedCity: null })
  },
  cityStates: new Set(),
  citySort: 'export',
  setCitySort: (sort): void => {
    set({ citySort: sort })
  },
  ...filterActions(set, get),
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
