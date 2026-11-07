import type { HolderChoices } from './utils/holderChoices'
import type { StateChoice } from './utils/stateChoices'
import type { CitySort } from '../../../state/citiesSlice'

/*
 * The advanced filters' props, apart from their components — the list, the funnel and the dialogue read the same shape.
 */

/** What the advanced filters show and report (CARTO-370, CARTO-369). */
export interface CityFiltersProps {
  /** What the dialogue offers for the year open, and how many cities each holder holds. */
  choices: HolderChoices
  /** The holders ticked that one of its boxes stands for — those that filter. */
  ticked: ReadonlySet<string>
  /** A box was ticked or unticked. */
  onTick: (key: string, ticked: boolean) => void
  /** A suzerain's box was ticked or unticked: its keys and its descent's, in one change (CARTO-388). */
  onTickHolders: (keys: readonly string[], ticked: boolean) => void
  /** The states the dialogue offers, and how many cities each holds (CARTO-369). */
  states: readonly StateChoice[]
  /** The states ticked. */
  tickedStates: ReadonlySet<string>
  /** A state's box was ticked or unticked. */
  onTickState: (state: string, ticked: boolean) => void
  /** « Tout décocher » was clicked: every holder and every state unticked. */
  onUntickAll: () => void
  /** The order of the list (CARTO-382) — it lives with the filters, and is kept at a refresh with them. */
  sort: CitySort
  /** An order was chosen in the sort menu. */
  onSort: (sort: CitySort) => void
}
