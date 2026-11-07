import type { CityVerdict } from './utils/cityVerdict'
import type { HolderDot } from './utils/holderDot'
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
  /** The city chosen — on the map with the white arrow, or by a click on its name — marked and scrolled to, or `null`. */
  selected: string | null
  /** The city whose information box is open, or `null`. */
  opened: string | null
  /**
   * Each city's verdict, by id — a city the map puts elsewhere, or whose holder it lacks, is marked in yellow; one with
   * no holder entered, in red (CARTO-386).
   */
  verdicts: ReadonlyMap<string, CityVerdict>
  /** A city's dot: its holder's colour by the sources, and what its bubble says (CARTO-367). */
  dotOf: (city: CityMark) => HolderDot
  /** A city's eye was toggled. */
  onShown: (id: string, shown: boolean) => void
  /** The box heading the list was ticked or not: every city listed, shown or hidden at once. */
  onAllShown: (ids: readonly string[], shown: boolean) => void
  /** Whether the cities shown are drawn as points in their holder's colour. */
  asPoints: boolean
  /** The box « Afficher comme des points » was ticked or not. */
  onAsPoints: (asPoints: boolean) => void
  /** A city's name was clicked: it is chosen. */
  onSelect: (id: string) => void
  /** A city's name was double-clicked, or ‹enter› pressed on it: its information box opens. */
  onOpen: (id: string) => void
}
