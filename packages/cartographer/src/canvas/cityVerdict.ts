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
  /**
   * The map draws no polity to check the city in: none carrying the holder's id — or, for a chain that reaches a
   * sovereign, none of the titles checked, from the level below the sovereign up to the sovereign itself.
   */
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
  /**
   * The title of its chain the polity under it must be, or lie under — the level below the sovereign, or, when the
   * map does not draw it, the next one up that it draws, the sovereign at last (the dev, 2026-11-16) — by its name;
   * `null` when the chain reaches no sovereign.
   */
  readonly expected: string | null
}

/** What the map says of its polities, for the level check: which ids it draws, and each one's rank. */
export interface MapPolities {
  /** The Wikidata ids its polities carry. */
  readonly declared: ReadonlySet<string>
  /**
   * The rank of the polity carrying an id.
   * @param wikidata - the id
   * @returns its rank, or `null`
   */
  readonly rankOf: (wikidata: string) => string | null
}

/** How far below the sovereign the check goes: an empire's kingdoms and duchies are two levels down, a kingdom's one. */
const LEVELS_BELOW: Readonly<Record<string, number>> = { empire: 2 }

/**
 * The verdict of a city whose chain reaches a sovereign (the dev, 2026-11-16): the check goes to the level below it —
 * n-1 under a kingdom (the duchy, or the viscounty of Bourges held of the king), n-2 under an empire (empire → kingdom
 * → duchy), n-1 where an empire has no level two below — **or, when the map does not draw that title, the next one up
 * it draws, the sovereign at last**. Right when the polity under the city is the title checked or one below it in the
 * chain; **to declare** (red) only when the map draws none of them, not even the sovereign; wrong (yellow) otherwise.
 * @param reading - the reading that ends on a sovereign
 * @param onMap - the polity under the city, or `null`
 * @param map - the map's polities
 * @returns the verdict and the title checked
 */
export function bySovereignLevel(
  reading: ContentChainReading,
  onMap: PolityOnMap | null,
  map: MapPolities
): { kind: CityVerdictKind; expected: string } {
  const level = drawnLevel(reading, checkedLevel(reading, map), map)
  const target = reading.titles[level]
  const expected = target?.name ?? ''
  if (liesWithin(reading, level, onMap)) return { kind: 'agrees', expected }
  const drawn = target?.wikidata ?? null
  if (drawn === null || !map.declared.has(drawn)) return { kind: 'toDeclare', expected }
  return { kind: 'misplaced', expected }
}

/**
 * The level actually checked: the one below the sovereign when the map draws it, else the next one up the chain the
 * map draws — up to the sovereign itself (the dev, 2026-11-16, on Laon: *"it depends directly on the kingdom of
 * France, so a circle has to be drawn around it?"* — no: a vassal too small to draw is checked in its suzerain).
 * @param reading - the reading that ends on a sovereign
 * @param from - the level below the sovereign
 * @param map - the map's polities
 * @returns the rank of the title checked
 */
function drawnLevel(reading: ContentChainReading, from: number, map: MapPolities): number {
  const top = reading.titles.length - 1
  for (let level = from; level < top; level += 1) {
    const id = reading.titles[level]?.wikidata ?? null
    if (id !== null && map.declared.has(id)) return level
  }
  return top
}

/**
 * Whether the polity under a city is the title checked, or one below it in the chain — by its Wikidata id, a polity
 * without one never.
 * @param reading - the reading
 * @param level - the rank of the title checked
 * @param onMap - the polity under the city, or `null`
 * @returns whether it lies within
 */
function liesWithin(
  reading: ContentChainReading,
  level: number,
  onMap: PolityOnMap | null
): boolean {
  const id = onMap?.wikidata ?? null
  return id !== null && reading.titles.slice(0, level + 1).some((title) => title.wikidata === id)
}

/**
 * The rank, from the holder's title up, of the title a chain ending on a sovereign is checked at: n-1 under a kingdom,
 * n-2 under an empire, n-1 where an empire has no level two below, the sovereign itself when it holds the city.
 * @param reading - the reading that ends on a sovereign
 * @param map - the map's polities, for the sovereign's rank
 * @returns the title's rank in the reading
 */
function checkedLevel(reading: ContentChainReading, map: MapPolities): number {
  const top = reading.titles.length - 1
  const sovereign = reading.titles[top]?.wikidata ?? null
  const rank = sovereign === null ? null : map.rankOf(sovereign)
  const wanted = (rank === null ? undefined : LEVELS_BELOW[rank]) ?? 1
  return Math.max(0, top - (top >= wanted ? wanted : 1))
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
  const map: MapPolities = {
    declared,
    rankOf: (wikidata) =>
      document.polities.find((polity) => polity.wikidata === wikidata)?.rank ?? null,
  }
  return new Map(
    cities.map((city) => {
      const onMap = polityOnMap(document, territories, [city.lon, city.lat])
      const bySources = city.holder
      const verdict = (
        kind: CityVerdictKind,
        expected: string | null = null
      ): [string, CityVerdict] => [city.id, { onMap, bySources, kind, chain: city.chain, expected }]
      const crowned = city.chain?.find((reading) => reading.end === 'sovereign')
      if (crowned !== undefined) {
        const { kind, expected } = bySovereignLevel(crowned, onMap, map)
        return verdict(kind, expected)
      }
      if (city.chain !== null) return verdict(byChain(city.chain, onMap))
      if (bySources === null) return verdict('notEntered')
      if (bySources.wikidata === null) return verdict('cannotCompare')
      if (!declared.has(bySources.wikidata)) return verdict('toDeclare')
      return verdict(onMap?.wikidata === bySources.wikidata ? 'agrees' : 'misplaced')
    })
  )
}

/**
 * The polity whose colour fills a city's dot, by its Wikidata id (the dev, 2026-11-16: *"well placed, it has the
 * colour of the country it is in"*). At the right place, the polity under it. Elsewhere, the one that holds it — by
 * its chain, the first title from the holder up that the map has drawn; without a chain, the sources' holder — so a
 * dot of one colour on another's ground shows at once (2026-11-05). `null` — a hollow dot — when the map has none.
 * @param verdict - the city's verdict
 * @param declared - the Wikidata ids the map's polities carry
 * @returns the Wikidata id to paint, or `null`
 */
export function paintedHolder(verdict: CityVerdict, declared: ReadonlySet<string>): string | null {
  if (verdict.kind === 'agrees') return verdict.onMap?.wikidata ?? null
  if (verdict.chain === null) return verdict.bySources?.wikidata ?? null
  for (const reading of verdict.chain) {
    const drawn = reading.titles.find(
      (title) => title.wikidata !== null && declared.has(title.wikidata)
    )
    if (drawn !== undefined) return drawn.wikidata
  }
  return null
}

/**
 * The alert a verdict raises, or none — the dev's rule, 2026-11-16 (*"a point not at the right place is yellow; a
 * technical problem is red; well placed, it has the colour of the country it is in"*): **yellow** for a city the map
 * does not put in its chain — misplaced, a holder not drawn yet, or a chain that stops short of the polity under it;
 * **red** for what the data cannot answer — no holder entered, a polity under it with no Wikidata id to compare, or
 * a title the check needs that the map has not drawn (*"red, when the duchy does not exist"*).
 * Only a city at the right place keeps its plain look. The slate of CARTO-435 is gone: it hid the yellow.
 * @param kind - the verdict
 * @returns the alert, or `null`
 */
export function cityAlert(kind: CityVerdictKind): CityAlert | null {
  if (kind === 'notEntered' || kind === 'cannotCompare' || kind === 'toDeclare') return 'missing'
  if (kind === 'misplaced' || kind === 'incomplete') return 'toCorrect'
  return null
}
