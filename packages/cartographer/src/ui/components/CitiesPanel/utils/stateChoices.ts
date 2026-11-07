import type { CityVerdict, CityVerdictKind } from './cityVerdict'
import type { CityMark } from '../../../../state/citiesSlice'

/**
 * « Par vérification » (my word, taken by the dev on 2026-11-07: « état » read as a State), the advanced filters' section of the
 * states — the map checked against the sources (CARTO-369, the dev, 2026-11-07: *"toutes les villes sans
 * détenteur"*, and the others): the yellow ones first, as CARTO-386 colours them — the map to correct — then the cities
 * that cannot be compared, then those at the right place. « Sans détenteur » is not here: it is already a box of the
 * holders' section (CARTO-370), and a second box for the same cities would filter them twice.
 */
export const STATE_ORDER = [
  'misplaced',
  'toDeclare',
  'cannotCompare',
  'agrees',
] as const satisfies readonly CityVerdictKind[]

/** A state the dialogue offers, and how many cities of the year are in it. */
export interface StateChoice {
  /** The state, a city's verdict. */
  readonly kind: (typeof STATE_ORDER)[number]
  /** How many cities of the year open are in it, before any filter. */
  readonly count: number
}

/**
 * The states the dialogue offers, each with how many cities of the year are in it — every one, an empty state too, so
 * the section does not change shape as the map is corrected.
 * @param cities - the cities of the year open
 * @param verdicts - each city's verdict, by id
 * @returns the states, in {@link STATE_ORDER}
 */
export function stateChoices(
  cities: readonly CityMark[],
  verdicts: ReadonlyMap<string, CityVerdict>
): StateChoice[] {
  const counts = new Map<string, number>()
  for (const { id } of cities) {
    const kind = verdicts.get(id)?.kind
    if (kind !== undefined) counts.set(kind, (counts.get(kind) ?? 0) + 1)
  }
  return STATE_ORDER.map((kind) => ({ kind, count: counts.get(kind) ?? 0 }))
}
