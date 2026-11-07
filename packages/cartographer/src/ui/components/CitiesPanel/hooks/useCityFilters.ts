import { polityRows } from '../../../utils/polityRows'
import { holderChoices } from '../utils/holderChoices'
import { tickedHolders } from '../utils/tickedHolders'

import type { CityMark } from '../../../../state/citiesSlice'
import type { PolityColourSource } from '../../../../state/polityColourSource'
import type { CartographerStoreHook } from '../../../../state/store'
import type { CityFiltersProps } from '../cityFiltersProps'

/**
 * The advanced filters bound to the store (CARTO-370): what they offer for the year open, the holders ticked that one
 * of their boxes stands for, and the store's two actions. Computed at each render, as the verdicts are, so a polity
 * added or renamed in the map is in the dialogue at once.
 * @param store - the store the holders ticked and the document live in
 * @param colours - the polities' colours, for the swatches
 * @param cities - the cities of the year open
 * @returns the filters' props
 */
export function useCityFilters(
  store: CartographerStoreHook,
  colours: PolityColourSource,
  cities: readonly CityMark[]
): CityFiltersProps {
  // Store
  const document = store((state) => state.document)
  const holders = store((state) => state.cityHolders)
  // The document is mutated in place: the version is what says a polity was added or recoloured.
  const version = store((state) => state.version)

  // Store actions
  const onTick = store((state) => state.setCityHolderTicked)
  const onUntickAll = store((state) => state.untickCityHolders)

  // Derived
  const choices = holderChoices(polityRows(document, colours.coloursOf(document, version)), cities)

  // Return
  return { choices, ticked: tickedHolders(holders, choices.keys), onTick, onUntickAll }
}
