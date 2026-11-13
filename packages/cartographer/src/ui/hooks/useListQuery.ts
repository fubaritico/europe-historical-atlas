import type { FilteredList } from '../../state/panelsSlice'
import type { CartographerStoreHook } from '../../state/store'

/**
 * What is typed in a list's filter, and how to change it — the store's (CARTO-427), so it outlives the panel docked or
 * floated and a reload. One home for `{Polities}` and `{Cities}`.
 * @param store - the store
 * @param list - which list
 * @returns the text, and its setter
 */
export function useListQuery(
  store: CartographerStoreHook,
  list: FilteredList
): [string, (query: string) => void] {
  // Store
  const query = store((state) => state.listQueries[list])

  // Store actions
  const setListQuery = store((state) => state.setListQuery)

  // Return
  return [
    query,
    (text) => {
      setListQuery(list, text)
    },
  ]
}
