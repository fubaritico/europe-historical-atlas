import { useEffect, useEffectEvent } from 'react'

import type { CityMark } from '../../../../state/citiesSlice'

/**
 * Scroll `{Cities}`' list to the city chosen (CARTO-384) — on the map with the white arrow, as `{Polities}` scrolls to
 * the polity chosen there — **by its place in the list, its row drawn or not** (CARTO-485: only the rows in view are in
 * the page). A city the filters hide has no place, and nothing scrolls. The scroll follows the city chosen, never a
 * list filtered or sorted again under it.
 * @param cities - the cities listed, filtered and sorted
 * @param selected - the city chosen, or `null`
 * @param show - scroll the list to a row given by its index
 */
export function useShowChosenCity(
  cities: readonly CityMark[],
  selected: string | null,
  show: (index: number) => void
): void {
  // Effects
  const showChosen = useEffectEvent((id: string) => {
    const index = cities.findIndex((city) => city.id === id)
    if (index >= 0) show(index)
  })
  useEffect(() => {
    if (selected !== null) showChosen(selected)
  }, [selected])
}
