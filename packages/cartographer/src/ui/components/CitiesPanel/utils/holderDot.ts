import { holderColour, polityCarrying } from '../../../../canvas/paint/scene'

import type { CityHolder } from '../../../../state/citiesSlice'
import type { CitiesPanelMessageKey } from '../i18n'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

/**
 * The dot of a city's row in `{Cities}` (CARTO-367, the dev, 2026-11-07): the colour of the polity holding it by the
 * sources — the same as its point on the canvas (`holderColour`) — and what its bubble says on hover.
 */

/** What the dot shows and says. */
export interface HolderDot {
  /** The holder's colour on the map, or `null` for a hollow ring: no holder entered, or none of the map carries it. */
  readonly colour: string | null
  /** The bubble's message. */
  readonly key: CitiesPanelMessageKey
  /** Its values. */
  readonly values: Readonly<Record<string, string>>
}

/**
 * The dot of one city: its holder by the sources, looked up in the map by Wikidata id as the verdict does, and its direct
 * suzerain read in the map's registry — the first tier only.
 * @param document - the year open
 * @param colours - each polity's colour, by id
 * @param holder - the city's holder by the sources, or `null` while not entered
 * @returns the colour and the bubble's message
 */
export function holderDot(
  document: YearDocument,
  colours: ReadonlyMap<string, string>,
  holder: CityHolder | null
): HolderDot {
  if (holder === null) return { colour: null, key: 'dotNotEntered', values: {} }
  if (holder.wikidata === null)
    return { colour: null, key: 'noWikidata', values: { name: holder.name } }
  const { wikidata } = holder
  const polity = polityCarrying(document, wikidata)
  if (polity === undefined) return { colour: null, key: 'dotOffMap', values: { name: holder.name } }
  const colour = holderColour(document, colours, wikidata)
  if (polity.suzerain === null) return { colour, key: 'dotHolder', values: { name: polity.name } }
  const suzerainId = polity.suzerain
  const suzerain = document.polities.find((each) => each.id === suzerainId)
  // A suzerain the registry lacks is a fault `documentFaults` already reports: its id stands in, visibly an id rather
  // than a plausible name — as `cityVerdict` and `featureUnder` do.
  return {
    colour,
    key: 'dotVassal',
    values: { name: polity.name, suzerain: suzerain?.name ?? suzerainId },
  }
}
