import { readCityFilters, writeCityFilters } from '../persistence/cityFiltersStorage'

import type { CartographerStoreHook } from './store'
import type { PageStorage } from '../persistence/guardedStorage'

/**
 * Keep the cities' filters from one session to the next (CARTO-371): those kept are put back in the store at opening,
 * then every change of the holders or the states ticked is written. Out of `main.tsx` so that a test can tick a box in a
 * real store and read the storage (review of CARTO-371).
 * @param store - the store the filters live in
 * @param storage - the page's storage, guarded
 * @returns the unsubscription
 */
export function keepCityFilters(store: CartographerStoreHook, storage: PageStorage): () => void {
  const kept = readCityFilters(storage)
  if (kept !== null) store.getState().setCityFilters(kept.holders, kept.states)
  return store.subscribe(
    (state) => [state.cityHolders, state.cityStates] as const,
    ([holders, states]) => {
      writeCityFilters(storage, { holders: [...holders], states: [...states] })
    },
    // Each action makes a new set, so a change is a new reference — and the restore above, made before, writes nothing.
    { equalityFn: (a, b) => a[0] === b[0] && a[1] === b[1] }
  )
}
