import { useEffect } from 'react'

/**
 * Hand the map the cities the list keeps under its filters (CARTO-390, the dev, 2026-11-08: *"when I filter in the
 * Cities panel, the map must be filtered too"*) — at each change of **which** cities are listed, never at each render
 * nor at a change of their order (review ARCH-003): the list is rebuilt at every render and re-sorted at will, so the ids
 * are compared, sorted, as one string. Withdrawn when the list goes, and the map then filters nothing.
 * @param ids - the ids of the cities listed, in any order
 * @param onListed - where the ids go — the store's `setListedCities`
 */
export function useListedCities(
  ids: readonly string[],
  onListed: (ids: readonly string[] | null) => void
): void {
  // Derived
  const listedKey = [...ids].sort().join('\n')

  // Effects
  useEffect(() => {
    onListed(listedKey === '' ? [] : listedKey.split('\n'))
  }, [listedKey, onListed])
  useEffect(
    () => () => {
      onListed(null)
    },
    [onListed]
  )
}
