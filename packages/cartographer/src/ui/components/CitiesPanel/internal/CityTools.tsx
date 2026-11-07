import { CityFilters } from './CityFilters'
import { CitySortMenu } from './CitySortMenu'

import type { CityFiltersProps } from '../cityFiltersProps'

/**
 * The buttons at the right of the name filter: the funnel of the advanced filters (CARTO-370), then the sort (CARTO-382).
 * @param props - the filters and the order
 * @returns the two buttons
 */
export function CityTools(props: CityFiltersProps) {
  // Render
  return (
    <>
      <CityFilters {...props} />
      <CitySortMenu sort={props.sort} onSort={props.onSort} />
    </>
  )
}
