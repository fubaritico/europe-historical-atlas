import { polityAt } from '../geometry/fillHit'

import { projectedTerritories } from './paint/scene'

import type { CityAlert } from './paint/cityPainter'
import type { PolityRings } from '../geometry/fillHit'
import type { CityHolder, CityMark } from '../state/citiesSlice'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

/**
 * Who holds a city, by the map and by the sources, and whether they agree (CARTO-193, the dev, 2026-11-02: *"if it is
 * not at the right place, say it is not at the right place; if the country does not exist on the map yet, say it"*).
 *
 * **Compared by Wikidata id**, the one key both sides carry: a map's polity has its `wikidata`, the sources' holder
 * its own (CMS-335). A wrong id in the map's registry therefore reads as a misplaced city — which is how such an id is
 * found (`files/plans/sources/wikidata-1100.md`).
 */

/** The polity the map has under a city. */
export interface PolityOnMap {
  /** Its name, the registry's. */
  readonly name: string
  /** Its Wikidata id, or `null`. */
  readonly wikidata: string | null
}

/** What the comparison says. */
export type CityVerdictKind =
  /** Nobody has entered the holder yet. */
  | 'notEntered'
  /** The sources' holder has no Wikidata id: nothing to compare by. */
  | 'cannotCompare'
  /** No polity of the map carries the sources' holder's id: it has to be declared. */
  | 'toDeclare'
  /** The map has the sources' holder under the city. */
  | 'agrees'
  /** The map has another polity, or none, under the city. */
  | 'misplaced'

/** Both answers and their comparison. */
export interface CityVerdict {
  /** The polity the map has under the city, or `null` over ground nobody claims. */
  readonly onMap: PolityOnMap | null
  /** The holder by the sources, or `null` while not entered. */
  readonly bySources: CityHolder | null
  /** Whether they agree, and if not, why. */
  readonly kind: CityVerdictKind
}

/**
 * The polity the map has under a point: the territories' rings tested in longitude and latitude, where both the
 * anchors and the city are — the one painted last wins, as on the canvas. Mercator keeps a point inside or outside a
 * ring.
 * @param document - the year open, for the polities' names and ids
 * @param territories - its territories in longitude and latitude, in paint order
 * @param lonLat - the point, longitude first
 * @returns the polity, or `null` over ground nobody claims
 */
function polityOnMap(
  document: YearDocument,
  territories: readonly PolityRings[],
  lonLat: [number, number]
): PolityOnMap | null {
  const id = polityAt(territories, lonLat)
  if (id === null) return null
  const polity = document.polities.find((candidate) => candidate.id === id)
  // A claim naming a polity the registry lacks is never in the territories (`projectedTerritories`): the id stands in
  // only where that guard were broken, visibly an id rather than a plausible name — as `featureUnder` does.
  return { name: polity?.name ?? id, wikidata: polity?.wikidata ?? null }
}

/**
 * Compare, for each city, who holds it on the map with who holds it by the sources — the territories projected once
 * for them all.
 * @param document - the year open
 * @param cities - the cities of that year
 * @returns each city's verdict, by its id
 */
export function cityVerdicts(
  document: YearDocument,
  cities: readonly CityMark[]
): ReadonlyMap<string, CityVerdict> {
  const territories = projectedTerritories(document, document.anchors)
  const declared = new Set(
    document.polities.flatMap(({ wikidata }) => (wikidata === null ? [] : [wikidata]))
  )
  return new Map(
    cities.map((city) => {
      const onMap = polityOnMap(document, territories, [city.lon, city.lat])
      const bySources = city.holder
      const verdict = (kind: CityVerdictKind): [string, CityVerdict] => [
        city.id,
        { onMap, bySources, kind },
      ]
      if (bySources === null) return verdict('notEntered')
      if (bySources.wikidata === null) return verdict('cannotCompare')
      if (!declared.has(bySources.wikidata)) return verdict('toDeclare')
      return verdict(onMap?.wikidata === bySources.wikidata ? 'agrees' : 'misplaced')
    })
  )
}

/**
 * The alert a verdict raises, or none — a city where all is well, or one with nothing to compare by, keeps its look.
 * @param kind - the verdict
 * @returns the alert, or `null`
 */
export function cityAlert(kind: CityVerdictKind): CityAlert | null {
  if (kind === 'notEntered') return 'missing'
  if (kind === 'misplaced' || kind === 'toDeclare') return 'toCorrect'
  return null
}
