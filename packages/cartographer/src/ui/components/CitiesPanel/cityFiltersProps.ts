import type { HolderChoices } from './utils/holderChoices'

/*
 * The advanced filters' props, apart from their components — the list, the funnel and the dialogue read the same shape.
 */

/** What the advanced filters show and report (CARTO-370). */
export interface CityFiltersProps {
  /** What the dialogue offers for the year open, and how many cities each holder holds. */
  choices: HolderChoices
  /** The holders ticked that one of its boxes stands for — those that filter. */
  ticked: ReadonlySet<string>
  /** A box was ticked or unticked. */
  onTick: (key: string, ticked: boolean) => void
  /** « Tout décocher » was clicked. */
  onUntickAll: () => void
}
