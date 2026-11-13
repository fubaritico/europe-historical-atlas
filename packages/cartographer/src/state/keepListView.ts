import { readListView, writeListView } from '../persistence/listViewStorage'

import type { CartographerStoreHook } from './store'
import type { PageStorage } from '../persistence/guardedStorage'

/**
 * Keep what the lists show from one session to the next (CARTO-427): what is typed in the two filters, the cities shown
 * and whether as points are put back in the store at opening, then written at every change. Out of `main.tsx` so that a
 * test can type in a real store and read the storage, as `keepCityFilters` is.
 * @param store - the store the lists' state lives in
 * @param storage - the page's storage, guarded
 * @returns the unsubscription
 */
export function keepListView(store: CartographerStoreHook, storage: PageStorage): () => void {
  const kept = readListView(storage)
  if (kept !== null) {
    const state = store.getState()
    state.setListQuery('polities', kept.polityQuery)
    state.setListQuery('cities', kept.cityQuery)
    state.setCitiesShown(kept.shownCities, true)
    state.setCitiesAsPoints(kept.citiesAsPoints)
  }
  return store.subscribe(
    (state) => [state.listQueries, state.shownCities, state.citiesAsPoints] as const,
    ([queries, shown, asPoints]) => {
      // A failed load of the cities empties those shown: the kept ones stay kept for the next load (review ARCH-002).
      if (store.getState().citiesLoad.state === 'failed') return
      writeListView(storage, {
        polityQuery: queries.polities,
        cityQuery: queries.cities,
        shownCities: [...shown],
        citiesAsPoints: asPoints,
      })
    },
    // Each action makes a new object or set, so a change is a new reference.
    { equalityFn: (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2] }
  )
}
