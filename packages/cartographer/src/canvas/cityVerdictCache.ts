import { cityVerdicts } from './cityVerdict'

import type { CityVerdict } from './cityVerdict'
import type { CityMark } from '../state/citiesSlice'
import type { YearDocument } from '@europe-historical-atlas/core/data/yearDocument'

/**
 * The cities' verdicts, kept for one state of the map (CARTO-485): `{Cities}` renders at every box ticked, and a
 * verdict tests each city of the year against the map. **Keyed on the document, its version and the cities judged**,
 * as `state/polityColourSource` is: the document is edited in place, so its identity alone does not say a border
 * moved — the version does — and two documents may both be at version 0.
 */
export interface CityVerdictCache {
  /**
   * The verdicts of the cities of the year open.
   * @param document - the year open
   * @param version - the edition's version counter
   * @param cities - the cities of that year
   * @returns each city's verdict, by its id — the same map while nothing of the three has changed
   */
  verdictsOf: (
    document: YearDocument,
    version: number,
    cities: readonly CityMark[]
  ) => ReadonlyMap<string, CityVerdict>
}

/**
 * A cache, empty.
 * @returns the cache
 */
export function createCityVerdictCache(): CityVerdictCache {
  let last: {
    document: YearDocument
    version: number
    cities: readonly CityMark[]
    verdicts: ReadonlyMap<string, CityVerdict>
  } | null = null
  return {
    verdictsOf: (document, version, cities) => {
      if (last?.document !== document || last.version !== version || last.cities !== cities) {
        last = { document, version, cities, verdicts: cityVerdicts(document, cities) }
      }
      return last.verdicts
    },
  }
}
