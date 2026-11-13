/**
 * What the lists show, kept from one session to the next (CARTO-427, the dev, 2026-11-13: *"when I reload the
 * Cartographer, it remembers the zoom, the position, the filters"*): what is typed in `{Polities}`' and `{Cities}`'
 * filters, the cities shown on the map and whether as points. Written to the page's storage at each change, read once at
 * opening, beside the cities' advanced filters (`cityFiltersStorage.ts`).
 *
 * **A kept state that cannot be read opens as none, said in the console** — the same choice as the cities' filters and
 * the panels' layout: a comfort, not the map. The shape is declared here structurally: persistence never imports the
 * store (`eslint.config.js`).
 */

import type { PageStorage } from './guardedStorage'

/** Where in the page's storage the lists' state is kept. */
export const LIST_VIEW_KEY = 'cartographer:list-view'

/** The lists' state as it is kept — the store's, by shape. */
export interface StoredListView {
  /** What is typed in `{Polities}`' filter. */
  readonly polityQuery: string
  /** What is typed in `{Cities}`' filter. */
  readonly cityQuery: string
  /** The ids of the cities shown on the map. */
  readonly shownCities: readonly string[]
  /** Whether the cities shown are drawn as points. */
  readonly citiesAsPoints: boolean
}

/**
 * The lists' state kept from the last session, or `null` — none kept, or one that cannot be read, said in the console.
 * @param storage - the page's storage
 * @returns the state, or `null`
 */
export function readListView(storage: PageStorage): StoredListView | null {
  const text = storage.getItem(LIST_VIEW_KEY)
  if (text === null) return null
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (error: unknown) {
    console.warn(
      '[Cartographer] the lists’ state kept from last time cannot be read; none is put back',
      error
    )
    return null
  }
  const { polityQuery, cityQuery, shownCities, citiesAsPoints } = (
    typeof raw === 'object' && raw !== null ? raw : {}
  ) as Record<string, unknown>
  if (
    typeof polityQuery !== 'string' ||
    typeof cityQuery !== 'string' ||
    !Array.isArray(shownCities) ||
    !shownCities.every((id) => typeof id === 'string') ||
    typeof citiesAsPoints !== 'boolean'
  ) {
    console.warn('[Cartographer] the lists’ state kept from last time is not one; none is put back')
    return null
  }
  return { polityQuery, cityQuery, shownCities: shownCities, citiesAsPoints }
}

/**
 * Keep the lists' state for the next session.
 * @param storage - the page's storage
 * @param view - the state now
 */
export function writeListView(storage: PageStorage, view: StoredListView): void {
  storage.setItem(LIST_VIEW_KEY, JSON.stringify(view))
}
