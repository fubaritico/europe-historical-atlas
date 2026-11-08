import { holderKey } from '../../../../state/citiesSlice'
import { matchesFilter } from '../../../utils/matchesFilter'

import type { CityVerdict } from '../../../../canvas/cityVerdict'
import type { CityMark } from '../../../../state/citiesSlice'
import type { CityFiltersProps } from '../cityFiltersProps'

/** The advanced filters' two kinds of box: the holders ticked and the states ticked (CARTO-370, CARTO-369). */
export type TickedFilters = Pick<CityFiltersProps, 'ticked' | 'tickedStates'>

/**
 * The cities `{Cities}` lists under its filters (CARTO-360, CARTO-370, CARTO-369): those whose name holds what is typed,
 * **and** whose holder by the sources is one of those ticked, **and** whose state is one of those ticked — none ticked of
 * a kind, no filter of that kind.
 * @param cities - the cities of the year open
 * @param query - what is typed in the name filter
 * @param ticked - the holders and the states ticked
 * @param verdicts - each city's verdict, by id — its state
 * @returns those that answer all three
 */
export function citiesFound(
  cities: readonly CityMark[],
  query: string,
  ticked: TickedFilters,
  verdicts: ReadonlyMap<string, CityVerdict>
): CityMark[] {
  return cities.filter(
    ({ id, name, holder }) =>
      matchesFilter(name, query) &&
      (ticked.ticked.size === 0 || ticked.ticked.has(holderKey(holder))) &&
      (ticked.tickedStates.size === 0 || ticked.tickedStates.has(verdicts.get(id)?.kind ?? ''))
  )
}
