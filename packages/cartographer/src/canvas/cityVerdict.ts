import { polityAt } from '../geometry/fillHit'

import { projectedTerritories } from './paint/scene'

import type { CityAlert } from './paint/cityPainter'
import type { PolityRings } from '../geometry/fillHit'
import type { CityHolder, CityMark } from '../state/citiesSlice'
import type { ContentChainReading } from '@europe-historical-atlas/core/data/contentFormat'
import type { YearDocument } from '@europe-historical-atlas/core/data/yearDocument'

/**
 * Who holds a city, by the map and by the sources, and whether they agree (CARTO-193, the dev, 2026-11-02: *"if it is
 * not at the right place, say it is not at the right place; if the country does not exist on the map yet, say it"*).
 *
 * **Compared by Wikidata id**, the one key both sides carry: a map's polity has its `wikidata`, the sources' holder
 * its own (CMS-335). A wrong id in the map's registry therefore reads as a misplaced city — which is how such an id is
 * found (`files/plans/sources/1100/wikidata.md`).
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
  /** The map has another polity, or none, under the city — by its chain, one that is not in it (CARTO-435). */
  | 'misplaced'
  /**
   * The polity under the city is not in its chain, but the chain stops for want of a link — *beyond, we do not know*:
   * it may be higher (CARTO-435), so not shown wrong where a link is missing.
   */
  | 'incomplete'

/** Both answers and their comparison. */
export interface CityVerdict {
  /** The polity the map has under the city, or `null` over ground nobody claims. */
  readonly onMap: PolityOnMap | null
  /** The holder by the sources, or `null` while not entered. */
  readonly bySources: CityHolder | null
  /** Whether they agree, and if not, why. */
  readonly kind: CityVerdictKind
  /** The city's chain of vassalage it was judged by, or `null` when its sheet names no title (CARTO-435). */
  readonly chain: readonly ContentChainReading[] | null
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
 * The verdict of a city that has its chain of vassalage (CARTO-435, the dev's rule of 2026-11-15: *"if the duchy it lies
 * in is not in its chain, it is wrong"*): the polity under it is one of the chain's titles' territories, in any reading
 * — the sources diverging, each reading is a place it may rightly be. A polity with no Wikidata id cannot be looked for
 * (CARTO-450 will compare those by the territory's own id). Not found: wrong where every reading reaches its end, and
 * only *incomplete* where one stops for want of a link — the polity may lie above.
 * @param chain - the city's chain, every reading
 * @param onMap - the polity under it, or `null` over ground nobody claims
 * @returns the verdict
 */
export function byChain(
  chain: readonly ContentChainReading[],
  onMap: PolityOnMap | null
): CityVerdictKind {
  if (onMap === null) return 'misplaced'
  if (onMap.wikidata === null) return 'cannotCompare'
  const inChain = chain.some((reading) =>
    reading.titles.some((title) => title.wikidata === onMap.wikidata)
  )
  if (inChain) return 'agrees'
  return chain.some((reading) => reading.end === 'unknown') ? 'incomplete' : 'misplaced'
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
        { onMap, bySources, kind, chain: city.chain },
      ]
      if (city.chain !== null) return verdict(byChain(city.chain, onMap))
      if (bySources === null) return verdict('notEntered')
      if (bySources.wikidata === null) return verdict('cannotCompare')
      if (!declared.has(bySources.wikidata)) return verdict('toDeclare')
      return verdict(onMap?.wikidata === bySources.wikidata ? 'agrees' : 'misplaced')
    })
  )
}

/**
 * The alert a verdict raises, or none — only a city where all is well keeps its plain look. One that cannot be
 * compared, or whose chain stops short of the polity under it, is **uncertain**, never plain (the dev, 2026-11-15, on
 * the white points: *"we don't understand"* — « right » and « we don't know » looked alike).
 * @param kind - the verdict
 * @returns the alert, or `null`
 */
export function cityAlert(kind: CityVerdictKind): CityAlert | null {
  if (kind === 'notEntered') return 'missing'
  if (kind === 'misplaced' || kind === 'toDeclare') return 'toCorrect'
  if (kind === 'cannotCompare' || kind === 'incomplete') return 'uncertain'
  return null
}
