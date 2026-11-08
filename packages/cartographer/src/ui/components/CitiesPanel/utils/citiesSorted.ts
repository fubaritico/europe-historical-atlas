import type { CityVerdict, CityVerdictKind } from '../../../../canvas/cityVerdict'
import type { CityMark, CitySort } from '../../../../state/citiesSlice'

/**
 * The rank of each verification, by verification: the map to correct first (the yellow of CARTO-386), then the cities
 * with no holder (the red), then those that cannot be compared, then those at the right place.
 */
const VERIFICATION_RANK: Readonly<Record<CityVerdictKind, number>> = {
  misplaced: 0,
  toDeclare: 1,
  notEntered: 2,
  cannotCompare: 3,
  agrees: 4,
}

/** Names compared as a reader would: accents and case ignored (« Évreux » beside « Evreux »). */
const NAMES = new Intl.Collator(undefined, { sensitivity: 'base' })

/**
 * The cities in the order chosen (CARTO-382). **A stable sort**: cities that compare equal — two of one holder, two of
 * one verification — keep the export's order between them, so a list does not shuffle as it is re-sorted.
 * @param cities - the cities found, in the export's order
 * @param sort - the order chosen
 * @param verdicts - each city's verdict, by id — for the order by verification
 * @returns a new list in that order; the export's order unchanged
 */
export function citiesSorted(
  cities: readonly CityMark[],
  sort: CitySort,
  verdicts: ReadonlyMap<string, CityVerdict>
): CityMark[] {
  const list = [...cities]
  switch (sort) {
    case 'export':
      return list
    case 'name':
      return list.sort((a, b) => NAMES.compare(a.name, b.name))
    case 'verification': {
      // A city with no verdict — none today, every city of the year has one — goes last, after those at the right place.
      const rank = (city: CityMark): number => {
        const kind = verdicts.get(city.id)?.kind
        return kind === undefined ? Number.POSITIVE_INFINITY : VERIFICATION_RANK[kind]
      }
      return list.sort((a, b) => rank(a) - rank(b))
    }
    case 'holder':
      // Grouped by the holder the sources give, the groups by name; the cities with no holder last.
      return list.sort((a, b) => {
        if (a.holder === null || b.holder === null)
          return Number(a.holder === null) - Number(b.holder === null)
        return NAMES.compare(a.holder.name, b.holder.name)
      })
  }
}
