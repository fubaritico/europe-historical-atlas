import { NO_HOLDER, holderKey } from '../../../../state/citiesSlice'

import type { CityHolder, CityMark } from '../../../../state/citiesSlice'
import type { PolityRow } from '../../../utils/polityRows'

/** A polity of the map, as the advanced filters list it — a row of {Polities}, with what ticking it means. */
export interface MapHolderChoice {
  /** The polity's id in the map — the box's own key in the list. */
  readonly id: string
  /** Its name, verbatim. */
  readonly name: string
  /** How deep in the tree of groups, as {Polities} indents it. */
  readonly depth: number
  /** Its colour on the map, or `null` when the colour source has none. */
  readonly colour: string | null
  /** Its key in the filter ({@link holderKey}), or `null` without a Wikidata id: nothing to match the sources by. */
  readonly key: string | null
  /** How many cities of the year the sources give it. */
  readonly count: number
}

/** A holder the sources give that no polity of the map carries. */
export interface OffMapHolderChoice {
  /** Its key in the filter. */
  readonly key: string
  /** Its name, as entered. */
  readonly name: string
  /** How many cities of the year the sources give it. */
  readonly count: number
}

/** Everything the advanced filters offer for the year open. */
export interface HolderChoices {
  /** The polities of the map, in the order and tree of {Polities}. */
  readonly onMap: readonly MapHolderChoice[]
  /** The holders no polity of the map carries, by name. */
  readonly offMap: readonly OffMapHolderChoice[]
  /** How many cities of the year have no holder entered — « Sans détenteur ». */
  readonly noHolder: number
  /** Every key a box of the dialogue stands for: a key ticked outside it filters nothing. */
  readonly keys: ReadonlySet<string>
}

/**
 * What the advanced filters offer (CARTO-370, `s20`): the polities of the map as {Polities} lists them, then the holders
 * the sources give that no polity carries, then « Sans détenteur » — so that every city of the year can be reached.
 * Matched by Wikidata id, as the verdict is.
 * @param rows - the map's polities as {Polities} lists them (`polityRows`), each with its Wikidata id
 * @param cities - the cities of the year open
 * @returns the choices and how many cities each holds
 */
export function holderChoices(
  rows: readonly PolityRow[],
  cities: readonly CityMark[]
): HolderChoices {
  const counts = new Map<string, number>()
  const names = new Map<string, CityHolder>()
  for (const city of cities) {
    const key = holderKey(city.holder)
    counts.set(key, (counts.get(key) ?? 0) + 1)
    if (city.holder !== null && !names.has(key)) names.set(key, city.holder)
  }
  const onMap = rows.map((row): MapHolderChoice => {
    const key = row.wikidata === null ? null : holderKey({ name: row.name, wikidata: row.wikidata })
    return {
      id: row.id,
      name: row.name,
      depth: row.depth,
      colour: row.colour,
      key,
      count: key === null ? 0 : (counts.get(key) ?? 0),
    }
  })
  const mapKeys = new Set(onMap.flatMap(({ key }) => (key === null ? [] : [key])))
  const offMap = [...names]
    .filter(([key]) => !mapKeys.has(key))
    .map(([key, holder]) => ({ key, name: holder.name, count: counts.get(key) ?? 0 }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  return {
    onMap,
    offMap,
    noHolder: counts.get(NO_HOLDER) ?? 0,
    keys: new Set([...mapKeys, ...offMap.map(({ key }) => key), NO_HOLDER]),
  }
}
