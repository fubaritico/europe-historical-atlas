import type { CityVerdict } from './utils/cityVerdict'
import type { CityMark } from '../../../state/citiesSlice'

/*
 * The list's props, apart from its components — the list and its row read the same shape, and a type imported
 * between them would run in a circle.
 */

/** What the list shows and reports. */
export interface CityListProps {
  /** The cities of the year open, in the export's order. */
  cities: readonly CityMark[]
  /** The ids of the cities shown on the canvas. */
  shown: ReadonlySet<string>
  /** The city whose detail is open, or `null`. */
  opened: string | null
  /** Each city's verdict, by id — a city the map puts elsewhere, or whose holder it lacks, is marked. */
  verdicts: ReadonlyMap<string, CityVerdict>
  /** A city's eye was toggled. */
  onShown: (id: string, shown: boolean) => void
  /** The eye heading the list was toggled: every city listed, shown or hidden at once. */
  onAllShown: (ids: readonly string[], shown: boolean) => void
  /** A city was double-clicked: its detail opens. */
  onOpen: (id: string) => void
}
