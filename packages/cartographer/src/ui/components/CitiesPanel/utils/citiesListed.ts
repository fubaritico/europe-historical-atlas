import { citiesFound } from './citiesFound'
import { citiesSorted } from './citiesSorted'

import type { CityVerdict } from './cityVerdict'
import type { CityMark } from '../../../../state/citiesSlice'
import type { CityFiltersProps } from '../cityFiltersProps'

/**
 * The cities `{Cities}` lists: those its filters find (CARTO-360, CARTO-370, CARTO-369), in the order chosen (CARTO-382).
 * @param cities - the cities of the year open, in the export's order
 * @param query - what is typed in the name filter
 * @param filters - the holders and states ticked, and the order
 * @param verdicts - each city's verdict, by id
 * @returns the cities to list, in their order
 */
export function citiesListed(
  cities: readonly CityMark[],
  query: string,
  filters: Pick<CityFiltersProps, 'ticked' | 'tickedStates' | 'sort'>,
  verdicts: ReadonlyMap<string, CityVerdict>
): CityMark[] {
  return citiesSorted(citiesFound(cities, query, filters, verdicts), filters.sort, verdicts)
}
