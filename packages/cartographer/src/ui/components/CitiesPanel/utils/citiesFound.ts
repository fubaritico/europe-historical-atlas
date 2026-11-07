import { holderKey } from '../../../../state/citiesSlice'
import { matchesFilter } from '../../../utils/matchesFilter'

import type { CityMark } from '../../../../state/citiesSlice'

/**
 * The cities `{Cities}` lists under its two filters (CARTO-360, CARTO-370): those whose name holds what is typed **and**
 * whose holder by the sources is ticked in the advanced filters — none ticked, no filter by holder.
 * @param cities - the cities of the year open
 * @param query - what is typed in the name filter
 * @param ticked - the holders ticked that a box of the dialogue stands for (`tickedHolders`)
 * @returns those that answer both
 */
export function citiesFound(
  cities: readonly CityMark[],
  query: string,
  ticked: ReadonlySet<string>
): CityMark[] {
  return cities.filter(
    ({ name, holder }) =>
      matchesFilter(name, query) && (ticked.size === 0 || ticked.has(holderKey(holder)))
  )
}
