import { holderKey } from '../../../../state/citiesSlice'

import { holderDot } from './holderDot'

import type { HolderDot } from './holderDot'
import type { CityMark } from '../../../../state/citiesSlice'
import type { YearDocument } from '@europe-historical-atlas/core/data/yearDocument'

/**
 * The dots of a map's cities, **one per holder** (CARTO-485): thirteen thousand cities share a few hundred holders,
 * and a dot walks the registry — so a holder's dot is made at its first city and handed, the very same, to the others
 * and to every later ask. **For one state of the map**: the document is edited in place, so a new one is made at each
 * version (`useHolderDots`); kept longer, it would answer from the registry as it was.
 * @param document - the map
 * @param colours - each polity's colour, by id
 * @returns a city's dot
 */
export function holderDotsOf(
  document: YearDocument,
  colours: ReadonlyMap<string, string>
): (city: CityMark) => HolderDot {
  const byHolder = new Map<string, HolderDot>()
  return (city) => {
    // The name is part of the key: a dot's bubble says the holder's name as its sheet wrote it.
    const key = `${holderKey(city.holder)}|${city.holder?.name ?? ''}`
    let dot = byHolder.get(key)
    if (dot === undefined) {
      dot = holderDot(document, colours, city.holder)
      byHolder.set(key, dot)
    }
    return dot
  }
}
