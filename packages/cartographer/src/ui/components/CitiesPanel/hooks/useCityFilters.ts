import { useListQuery } from '../../../hooks/useListQuery'
import { polityRows } from '../../../utils/polityRows'
import { holderChoices } from '../utils/holderChoices'
import { isOfferedState, stateChoices } from '../utils/stateChoices'
import { tickedHolders } from '../utils/tickedHolders'

import type { CityVerdict } from '../../../../canvas/cityVerdict'
import type { CityMark } from '../../../../state/citiesSlice'
import type { PolityColourSource } from '../../../../state/polityColourSource'
import type { CartographerStoreHook } from '../../../../state/store'
import type { CityFiltersProps } from '../cityFiltersProps'

/**
 * The advanced filters bound to the store (CARTO-370, CARTO-369): what they offer for the year open — the holders and
 * the states, each with its count — what is ticked, and the store's actions. Computed at each render, as the verdicts
 * are, so a polity added or renamed in the map, or a border moved, is in the dialogue at once.
 * @param store - the store the holders and states ticked and the document live in
 * @param colours - the polities' colours, for the swatches
 * @param cities - the cities of the year open
 * @param verdicts - each city's verdict, by id — its state
 * @returns the filters' props
 */
export function useCityFilters(
  store: CartographerStoreHook,
  colours: PolityColourSource,
  cities: readonly CityMark[],
  verdicts: ReadonlyMap<string, CityVerdict>
): CityFiltersProps {
  // Store
  const document = store((state) => state.document)
  const holders = store((state) => state.cityHolders)
  const tickedStates = store((state) => state.cityStates)
  const sort = store((state) => state.citySort)
  const [query, onQuery] = useListQuery(store, 'cities')
  // The document is mutated in place: the version is what says a polity was added or recoloured.
  const version = store((state) => state.version)

  // Store actions
  const onTick = store((state) => state.setCityHolderTicked)
  const onTickHolders = store((state) => state.setCityHoldersTicked)
  const onTickState = store((state) => state.setCityStateTicked)
  const onUntickAll = store((state) => state.untickCityFilters)
  const onSort = store((state) => state.setCitySort)
  const onListed = store((state) => state.setListedCities)

  // Derived
  const choices = holderChoices(polityRows(document, colours.coloursOf(document, version)), cities)

  // Return
  return {
    choices,
    ticked: tickedHolders(holders, choices.keys),
    onTick,
    onTickHolders,
    states: stateChoices(cities, verdicts),
    // Only the states the dialogue offers filter (review of CARTO-371): one read back from the browser that no box
    // stands for would empty the list with nothing to untick. The closed set, not the year's counts — a state ticked
    // with no city in it stays ticked.
    tickedStates: new Set([...tickedStates].filter((state) => isOfferedState(state))),
    onTickState,
    onUntickAll,
    sort,
    onSort,
    onListed,
    query,
    onQuery,
  }
}
